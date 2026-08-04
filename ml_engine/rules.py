"""
rules.py
--------
Business Rule Validation Engine for the ML Data Quality Engine.

Responsibilities
----------------
- Quantity and Price must be > 0 (no negative values)
- Transaction_ID must be unique and non-null
- Required fields (Transaction_ID, Customer_ID, Product_Name) must not be null
- Transaction dates must not be in the future
- Product_Name must belong to the known category set
- Return a structured list of rule violations with count, percentage, sample_indices
- Compute a business-rule quality score (0–100)

Usage
-----
    from rules import run_business_rules, compute_rules_quality_score

    violations = run_business_rules(df_clean)
    score      = compute_rules_quality_score(violations, total_rows=len(df_clean))
"""

import logging
from typing import Any, Dict, List, Optional

import numpy as np
import pandas as pd

from config import KNOWN_CATEGORIES, LOG_FORMAT, REQUIRED_COLUMNS

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(level=logging.INFO, format=LOG_FORMAT)
logger = logging.getLogger("ml_engine.rules")

# Maximum number of sample row indices included in each violation dict.
# Keeping this small prevents bloated reports / JSON files.
_MAX_SAMPLE_INDICES: int = 10


# ---------------------------------------------------------------------------
# Internal Helper
# ---------------------------------------------------------------------------


def _build_violation(
    rule: str,
    column: str,
    affected_index: "pd.Index",
    severity: str,
    total_rows: int,
    **extra_fields: Any,
) -> dict:
    """
    Build a standardised violation dictionary.

    Instead of storing up to 50 affected indices (which can be very large),
    we store:
    - ``count``         — total number of affected rows
    - ``percentage``    — percentage of total rows affected (rounded to 2 dp)
    - ``sample_indices`` — up to 10 row indices as a compact sample

    Parameters
    ----------
    rule : str
        Human-readable rule description.
    column : str
        Column name the rule applies to.
    affected_index : pd.Index
        Index of rows that violate the rule.
    severity : str
        "High", "Medium", or "Low".
    total_rows : int
        Total number of rows in the dataset (used to compute percentage).
    **extra_fields
        Any additional fields to include (e.g. ``unknown_values``).

    Returns
    -------
    dict
    """
    count = len(affected_index)
    violation: Dict[str, Any] = {
        "rule": rule,
        "column": column,
        "count": count,
        "percentage": round(float(count / total_rows * 100), 2) if total_rows else 0.0,
        "severity": severity,
        "sample_indices": affected_index.tolist()[:_MAX_SAMPLE_INDICES],
    }
    violation.update(extra_fields)
    return violation


# ---------------------------------------------------------------------------
# Individual Rule Checks
# ---------------------------------------------------------------------------


def check_negative_values(df: pd.DataFrame) -> List[dict]:
    """
    Flag numeric columns that contain negative values.

    Business constraint: Quantity and Price must always be positive.

    Parameters
    ----------
    df : pd.DataFrame

    Returns
    -------
    list[dict]
        One violation entry per offending column.
        Each entry includes ``count``, ``percentage``, and ``sample_indices``.
    """
    violations: List[dict] = []
    total_rows = len(df)

    for col in df.select_dtypes(include=[np.number]).columns:
        mask = df[col] < 0
        count = int(mask.sum())
        if count > 0:
            violations.append(
                _build_violation(
                    rule=f"Negative values in '{col}'",
                    column=col,
                    affected_index=df.index[mask],
                    severity="High",
                    total_rows=total_rows,
                )
            )
            logger.warning(
                "Rule violation: %d (%.1f%%) negative value(s) in '%s'.",
                count,
                count / total_rows * 100,
                col,
            )
    return violations


def check_future_dates(
    df: pd.DataFrame, date_col: str = "Transaction_Date"
) -> List[dict]:
    """
    Flag rows where the transaction date is in the future.

    Parameters
    ----------
    df : pd.DataFrame
    date_col : str
        Name of the date column. Default: ``"Transaction_Date"``.

    Returns
    -------
    list[dict]
        Empty list if no violations found.
    """
    if date_col not in df.columns:
        logger.debug("Column '%s' not found; skipping future-date check.", date_col)
        return []

    parsed = pd.to_datetime(df[date_col], errors="coerce")
    today = pd.Timestamp.now().normalize()
    future_mask = parsed > today
    count = int(future_mask.sum())

    if count > 0:
        logger.warning(
            "Rule violation: %d (%.1f%%) future date(s) in '%s'.",
            count,
            count / len(df) * 100,
            date_col,
        )
        return [
            _build_violation(
                rule=f"Future dates in '{date_col}'",
                column=date_col,
                affected_index=df.index[future_mask],
                severity="Medium",
                total_rows=len(df),
            )
        ]
    return []


def check_duplicate_ids(
    df: pd.DataFrame, id_col: str = "Transaction_ID"
) -> List[dict]:
    """
    Flag duplicate Transaction IDs (excludes null values from the check).

    Parameters
    ----------
    df : pd.DataFrame
    id_col : str
        Name of the ID column. Default: ``"Transaction_ID"``.

    Returns
    -------
    list[dict]
    """
    if id_col not in df.columns:
        logger.debug("Column '%s' not found; skipping duplicate ID check.", id_col)
        return []

    non_null = df[df[id_col].notna()]
    duplicates = non_null[non_null.duplicated(subset=[id_col], keep=False)]
    count = len(duplicates)

    if count > 0:
        logger.warning(
            "Rule violation: %d (%.1f%%) duplicate '%s' value(s).",
            count,
            count / len(df) * 100,
            id_col,
        )
        return [
            _build_violation(
                rule=f"Duplicate '{id_col}' values",
                column=id_col,
                affected_index=duplicates.index,
                severity="High",
                total_rows=len(df),
            )
        ]
    return []


def check_unknown_categories(
    df: pd.DataFrame,
    category_col: str = "Product_Name",
    known_categories: Optional[set] = None,
) -> List[dict]:
    """
    Flag product names that are not in the known category list.

    Parameters
    ----------
    df : pd.DataFrame
    category_col : str
        Name of the category column. Default: ``"Product_Name"``.
    known_categories : set | None
        Set of valid category values. Defaults to ``config.KNOWN_CATEGORIES``.

    Returns
    -------
    list[dict]
    """
    if category_col not in df.columns:
        logger.debug("Column '%s' not found; skipping category check.", category_col)
        return []

    categories = known_categories if known_categories is not None else KNOWN_CATEGORIES
    unknown_mask = ~df[category_col].isin(categories) & df[category_col].notna()
    count = int(unknown_mask.sum())

    if count > 0:
        # Top 10 unknown values for diagnostics
        unknown_vals = (
            df.loc[unknown_mask, category_col]
            .value_counts()
            .head(10)
            .to_dict()
        )
        logger.warning(
            "Rule violation: %d (%.1f%%) unknown category/categories in '%s'.",
            count,
            count / len(df) * 100,
            category_col,
        )
        return [
            _build_violation(
                rule=f"Unrecognised values in '{category_col}'",
                column=category_col,
                affected_index=df.index[unknown_mask],
                severity="Low",
                total_rows=len(df),
                unknown_values={str(k): int(v) for k, v in unknown_vals.items()},
            )
        ]
    return []


def check_missing_required_fields(
    df: pd.DataFrame,
    required_cols: Optional[List[str]] = None,
) -> List[dict]:
    """
    Flag rows where required fields are null.

    Parameters
    ----------
    df : pd.DataFrame
    required_cols : list[str] | None
        Columns that must not be null. Defaults to ``config.REQUIRED_COLUMNS``.

    Returns
    -------
    list[dict]
    """
    if required_cols is None:
        required_cols = REQUIRED_COLUMNS

    violations: List[dict] = []
    for col in required_cols:
        if col not in df.columns:
            continue
        null_mask = df[col].isna()
        count = int(null_mask.sum())
        if count > 0:
            violations.append(
                _build_violation(
                    rule=f"Missing required field '{col}'",
                    column=col,
                    affected_index=df.index[null_mask],
                    severity="High",
                    total_rows=len(df),
                )
            )
            logger.warning(
                "Rule violation: %d (%.1f%%) missing value(s) in required column '%s'.",
                count,
                count / len(df) * 100,
                col,
            )
    return violations


# ---------------------------------------------------------------------------
# Quality Score
# ---------------------------------------------------------------------------


def get_unique_violation_indices(df: pd.DataFrame) -> "pd.Index":
    """
    Return the union of row indices affected by ANY business rule violation.

    ``compute_rules_quality_score`` and ``scoring.compute_dataset_scores``
    previously summed per-rule violation counts directly, which
    double-counts any row that trips more than one rule (e.g. a row with
    both a negative Price AND a duplicate Transaction_ID gets counted
    twice). This computes the true unique-row impact instead, so the
    resulting score reflects "what fraction of rows have at least one
    problem," not an inflated sum that can overstate how bad the dataset is.

    Parameters
    ----------
    df : pd.DataFrame
        Cleaned dataframe (same one passed to ``run_business_rules``).

    Returns
    -------
    pd.Index
        Index of rows affected by at least one rule violation.
    """
    mask = pd.Series(False, index=df.index)

    for col in df.select_dtypes(include=[np.number]).columns:
        mask |= df[col] < 0

    if "Transaction_Date" in df.columns:
        parsed = pd.to_datetime(df["Transaction_Date"], errors="coerce", dayfirst=True)
        today = pd.Timestamp.now().normalize()
        mask |= parsed > today

    if "Transaction_ID" in df.columns:
        non_null_mask = df["Transaction_ID"].notna()
        mask |= non_null_mask & df["Transaction_ID"].duplicated(keep=False)

    if "Product_Name" in df.columns:
        mask |= ~df["Product_Name"].isin(KNOWN_CATEGORIES) & df["Product_Name"].notna()

    for col in REQUIRED_COLUMNS:
        if col in df.columns:
            mask |= df[col].isna()

    return df.index[mask]


def compute_rules_quality_score(
    violations: List[dict], total_rows: int, df: Optional[pd.DataFrame] = None
) -> float:
    """
    Compute a business-rule quality score (0 – 100).

    The score reflects what proportion of records are free from any business
    rule violation, counting each affected row once even if it trips
    multiple rules.

    Score = (1 − unique_violated_rows / total_rows) × 100

    Parameters
    ----------
    violations : list[dict]
        Output from :func:`run_business_rules`. Used as a fallback when
        ``df`` isn't provided (summed counts — may double-count).
    total_rows : int
        Total number of rows in the dataset.
    df : pd.DataFrame | None
        The cleaned dataframe. When provided, uses the accurate
        unique-row count via :func:`get_unique_violation_indices` instead
        of summing potentially-overlapping violation counts.

    Returns
    -------
    float
        Score between 0.0 (all rows violated) and 100.0 (no violations).
    """
    if total_rows == 0:
        return 0.0
    if not violations:
        return 100.0

    if df is not None:
        unique_violated = len(get_unique_violation_indices(df))
        score = max(0.0, float((1.0 - unique_violated / total_rows) * 100))
        return round(score, 2)

    # Fallback: no dataframe provided, so we can't compute the unique-row
    # union — sum counts as a conservative (may double-count) estimate.
    total_issues = sum(v.get("count", 0) for v in violations)
    score = max(0.0, float((1.0 - min(total_issues, total_rows) / total_rows) * 100))
    return round(score, 2)


def rules_summary(violations: List[dict], total_rows: int, df: Optional[pd.DataFrame] = None) -> Dict[str, Any]:
    """
    Return a compact summary of all business rule violations.

    Parameters
    ----------
    violations : list[dict]
        Output from :func:`run_business_rules`.
    total_rows : int
        Total number of rows in the dataset.
    df : pd.DataFrame | None
        Cleaned dataframe, passed through to :func:`compute_rules_quality_score`
        for accurate (non-double-counted) scoring.

    Returns
    -------
    dict
        ``total_violation_types`` — number of distinct rule types violated
        ``total_affected_records`` — sum of counts across all violations
        ``rules_quality_score``   — 0–100 quality score
        ``severity_breakdown``    — counts by severity level
        ``violations``            — the original violation list (compact form)
    """
    total_affected = sum(v.get("count", 0) for v in violations)
    quality_score = compute_rules_quality_score(violations, total_rows, df=df)

    severity_counts: Dict[str, int] = {"High": 0, "Medium": 0, "Low": 0}
    for v in violations:
        sev = v.get("severity", "Medium")
        severity_counts[sev] = severity_counts.get(sev, 0) + 1

    return {
        "total_violation_types": len(violations),
        "total_affected_records": total_affected,
        "rules_quality_score": quality_score,
        "severity_breakdown": severity_counts,
        "violations": violations,
    }


# ---------------------------------------------------------------------------
# Orchestrator
# ---------------------------------------------------------------------------


def run_business_rules(df: pd.DataFrame) -> List[dict]:
    """
    Execute all business rule checks and return a combined list of violations.

    Each violation dict contains:
    - ``rule``          — human-readable description
    - ``column``        — column the rule applies to
    - ``count``         — number of affected records
    - ``percentage``    — percentage of total records affected
    - ``severity``      — "High", "Medium", or "Low"
    - ``sample_indices`` — up to 10 row indices as a diagnostic sample

    Rules applied
    -------------
    1. Missing required fields (Transaction_ID, Customer_ID, Product_Name)
    2. Negative numeric values (Quantity, Price)
    3. Future transaction dates
    4. Duplicate Transaction IDs
    5. Unknown product categories

    Parameters
    ----------
    df : pd.DataFrame
        Cleaned dataframe.

    Returns
    -------
    list[dict]
    """
    logger.info("Running business rules on %d rows.", len(df))
    violations: List[dict] = []

    violations.extend(check_missing_required_fields(df))
    violations.extend(check_negative_values(df))
    violations.extend(check_future_dates(df))
    violations.extend(check_duplicate_ids(df))
    violations.extend(check_unknown_categories(df))

    total_affected = sum(v["count"] for v in violations)
    quality_score = compute_rules_quality_score(violations, len(df))

    logger.info(
        "Business rules complete — %d violation type(s), %d affected record(s), "
        "quality score: %.2f.",
        len(violations),
        total_affected,
        quality_score,
    )
    return violations
