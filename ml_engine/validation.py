"""
validation.py
-------------
Data Validation Module for the ML Data Quality Engine.

Responsibilities
----------------
- Check for missing values and duplicate rows
- Validate schema (expected columns present)
- Validate data types per column
- Validate date formats and ranges
- Validate payment method and transaction status values
- Validate regex patterns on ID columns
- Return a structured validation result with passed/failed checks and pass rate

Usage
-----
    from validation import run_validation

    result = run_validation(df)
    # result["violations"]      → flat list of all violation dicts
    # result["summary"]         → counts by severity, pass/fail stats
    # result["nulls_and_duplicates"] → detail of null/dup check
    # result["schema"]          → missing/extra columns
    # result["dtypes"]          → column dtype profile
    # result["dates"]           → date check result
    # result["payment_methods"] → payment/status check result
    # result["regex"]           → regex pattern check result
"""

import logging
from typing import Any, Dict, List, Optional

import numpy as np
import pandas as pd

from config import (
    ALLOWED_PAYMENT_METHODS,
    ALLOWED_STATUSES,
    EXPECTED_COLUMNS,
    LOG_FORMAT,
    REQUIRED_COLUMNS,
)

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(level=logging.INFO, format=LOG_FORMAT)
logger = logging.getLogger("ml_engine.validation")

# Number of example bad values to include in violations (kept small to avoid
# bloating reports).
_MAX_EXAMPLE_VALUES: int = 5


# ---------------------------------------------------------------------------
# Internal Helper
# ---------------------------------------------------------------------------


def _violation(
    check: str,
    rule: str,
    column: str,
    count: int,
    total_rows: int,
    severity: str,
    sample_indices: Optional[List[int]] = None,
    **extra: Any,
) -> dict:
    """
    Build a standardised violation dict with count AND percentage.

    Parameters
    ----------
    check : str     Check category (e.g. "null_check").
    rule : str      Human-readable rule description.
    column : str    Column the rule applies to.
    count : int     Number of affected rows.
    total_rows : int  Dataset row count (used for percentage).
    severity : str  "High", "Medium", or "Low".
    sample_indices : list[int] | None
        Up to 10 example row indices illustrating the violation.
        Omitted from the result when None or empty.
    **extra         Additional key-value pairs appended to the dict.

    Returns
    -------
    dict
    """
    v: Dict[str, Any] = {
        "check": check,
        "rule": rule,
        "column": column,
        "count": count,
        "percentage": round(float(count / total_rows * 100), 2) if total_rows else 0.0,
        "severity": severity,
    }
    if sample_indices:  # omit field entirely when empty / None
        v["sample_indices"] = sample_indices[:10]
    v.update(extra)
    return v


# ---------------------------------------------------------------------------
# Individual Validation Checks
# ---------------------------------------------------------------------------


def validate_nulls_and_duplicates(df: pd.DataFrame) -> Dict[str, Any]:
    """
    Check for missing values and fully-duplicate rows.

    Parameters
    ----------
    df : pd.DataFrame

    Returns
    -------
    dict
        ``null_counts``    — per-column null counts
        ``duplicate_rows`` — number of fully-duplicate rows
        ``violations``     — list of violation dicts (each with count & percentage)
    """
    total_rows = len(df)
    null_counts = {col: int(v) for col, v in df.isnull().sum().items()}
    duplicate_count = int(df.duplicated().sum())

    violations: List[dict] = []
    for col, cnt in null_counts.items():
        if cnt > 0:
            null_idx = df.index[df[col].isnull()].tolist()[:10]
            violations.append(
                _violation(
                    check="null_check",
                    rule=f"Missing values in '{col}'",
                    column=col,
                    count=cnt,
                    total_rows=total_rows,
                    severity="High" if col in REQUIRED_COLUMNS else "Medium",
                    sample_indices=null_idx if null_idx else None,
                )
            )
    if duplicate_count > 0:
        dup_idx = df.index[df.duplicated()].tolist()[:10]
        violations.append(
            _violation(
                check="duplicate_check",
                rule="Fully duplicate rows",
                column="All Columns",
                count=duplicate_count,
                total_rows=total_rows,
                severity="High",
                sample_indices=dup_idx if dup_idx else None,
            )
        )

    logger.info(
        "Null/duplicate check — %d column(s) with nulls, %d duplicate row(s).",
        sum(1 for v in null_counts.values() if v > 0),
        duplicate_count,
    )
    return {
        "null_counts": null_counts,
        "duplicate_rows": duplicate_count,
        "violations": violations,
    }


def validate_schema(df: pd.DataFrame) -> Dict[str, Any]:
    """
    Check that all expected columns are present in the DataFrame.

    Parameters
    ----------
    df : pd.DataFrame

    Returns
    -------
    dict
        ``missing_columns``  — list of expected columns that are absent
        ``extra_columns``    — list of columns present but not expected
        ``violations``       — violation dicts for missing columns
    """
    total_rows = len(df)
    actual = set(df.columns.tolist())
    expected = set(EXPECTED_COLUMNS)
    missing = sorted(expected - actual)
    extra = sorted(actual - expected)

    violations: List[dict] = []
    for col in missing:
        violations.append(
            _violation(
                check="schema_check",
                rule=f"Expected column '{col}' is missing",
                column=col,
                count=total_rows,  # all rows are "affected" by a missing column
                total_rows=total_rows,
                severity="High" if col in REQUIRED_COLUMNS else "Medium",
            )
        )

    logger.info(
        "Schema check — %d missing column(s), %d unexpected column(s).",
        len(missing),
        len(extra),
    )
    return {
        "missing_columns": missing,
        "extra_columns": extra,
        "violations": violations,
    }


def validate_dtypes(df: pd.DataFrame) -> Dict[str, Any]:
    """
    Profile each column's dtype, unique value count, and missing percentage.

    This check is informational and does not produce violations.

    Parameters
    ----------
    df : pd.DataFrame

    Returns
    -------
    dict
        ``column_profile`` — per-column dtype summary
        ``violations``     — always empty for this check
    """
    profile: Dict[str, Any] = {}
    for col in df.columns:
        profile[col] = {
            "dtype": str(df[col].dtype),
            "unique_values": int(df[col].nunique()),
            "missing_percentage": round(float(df[col].isnull().mean() * 100), 2),
        }
    logger.info("Dtype profile computed for %d columns.", len(profile))
    return {"column_profile": profile, "violations": []}


def validate_dates(
    df: pd.DataFrame, date_col: str = "Transaction_Date", raw_df: Optional[pd.DataFrame] = None
) -> Dict[str, Any]:
    """
    Validate that the date column contains parseable, non-future dates.

    Parameters
    ----------
    df : pd.DataFrame
        The (possibly already-cleaned) dataframe used for the future-date check.
    date_col : str
        Name of the date column. Default: ``"Transaction_Date"``.
    raw_df : pd.DataFrame | None
        The RAW, pre-cleaning dataframe. Required to detect invalid dates
        correctly: if ``df[date_col]`` has already been parsed by
        ``cleaning.clean_dates()``, invalid dates are already NaT, and
        comparing ``pd.to_datetime(df[date_col])`` against itself always
        yields zero — this check would silently never fire. Passing the
        raw dataframe lets us compare "originally missing" against
        "unparseable after parsing" and get a real count. If not provided,
        falls back to checking ``df`` directly (only meaningful if ``df``
        is itself the raw, unparsed data).

    Returns
    -------
    dict
        ``invalid_dates`` — count of unparseable (but non-null) dates
        ``future_dates``  — count of dates after today
        ``violations``    — violation dicts with count & percentage
    """
    violations: List[dict] = []
    total_rows = len(df)

    if date_col not in df.columns:
        logger.debug("Column '%s' not found; skipping date validation.", date_col)
        return {"invalid_dates": 0, "future_dates": 0, "violations": violations}

    source = raw_df if raw_df is not None else df
    parsed = pd.to_datetime(source[date_col], errors="coerce", dayfirst=True)
    invalid_count = max(0, int(parsed.isna().sum() - source[date_col].isna().sum()))

    today = pd.Timestamp.now().normalize()
    # Future-date check uses the already-cleaned column if available (it's the same values, just typed)
    date_series = df[date_col] if pd.api.types.is_datetime64_any_dtype(df[date_col]) else parsed
    future_count = int((date_series > today).sum())

    if invalid_count > 0:
        invalid_idx = source.index[parsed.isna() & source[date_col].notna()].tolist()[:10]
        violations.append(
            _violation(
                check="date_check",
                rule=f"Unparseable dates in '{date_col}'",
                column=date_col,
                count=invalid_count,
                total_rows=total_rows,
                severity="Medium",
                sample_indices=invalid_idx if invalid_idx else None,
            )
        )
    if future_count > 0:
        future_idx = df.index[(date_series > today)].tolist()[:10]
        violations.append(
            _violation(
                check="date_check",
                rule=f"Future dates in '{date_col}'",
                column=date_col,
                count=future_count,
                total_rows=total_rows,
                severity="Medium",
                sample_indices=future_idx if future_idx else None,
            )
        )

    logger.info(
        "Date validation — %d invalid, %d future date(s).", invalid_count, future_count
    )
    return {
        "invalid_dates": invalid_count,
        "future_dates": future_count,
        "violations": violations,
    }


def validate_payment_methods(df: pd.DataFrame) -> Dict[str, Any]:
    """
    Validate that Payment_Method and Transaction_Status contain allowed values.

    Parameters
    ----------
    df : pd.DataFrame
        Should be the **cleaned** dataframe so values are already standardised.

    Returns
    -------
    dict
        ``invalid_payment_methods`` — count of rows with unrecognised payment values
        ``invalid_statuses``        — count of rows with unrecognised status values
        ``violations``              — violation dicts with count & percentage
    """
    violations: List[dict] = []
    result: Dict[str, Any] = {}
    total_rows = len(df)

    # Payment_Method
    if "Payment_Method" in df.columns:
        non_null = df["Payment_Method"].dropna()
        invalid_pm = non_null[~non_null.isin(ALLOWED_PAYMENT_METHODS)]
        count_pm = len(invalid_pm)
        result["invalid_payment_methods"] = count_pm
        if count_pm > 0:
            violations.append(
                _violation(
                    check="payment_check",
                    rule="Unrecognised Payment_Method values",
                    column="Payment_Method",
                    count=count_pm,
                    total_rows=total_rows,
                    severity="Medium",
                    example_values={
                        str(k): int(v)
                        for k, v in invalid_pm.value_counts()
                        .head(_MAX_EXAMPLE_VALUES)
                        .items()
                    },
                )
            )
    else:
        result["invalid_payment_methods"] = 0

    # Transaction_Status
    if "Transaction_Status" in df.columns:
        non_null = df["Transaction_Status"].dropna()
        invalid_st = non_null[~non_null.isin(ALLOWED_STATUSES)]
        count_st = len(invalid_st)
        result["invalid_statuses"] = count_st
        if count_st > 0:
            st_idx = invalid_st.index.tolist()[:10]
            violations.append(
                _violation(
                    check="status_check",
                    rule="Unrecognised Transaction_Status values",
                    column="Transaction_Status",
                    count=count_st,
                    total_rows=total_rows,
                    severity="Medium",
                    sample_indices=st_idx if st_idx else None,
                    example_values={
                        str(k): int(v)
                        for k, v in invalid_st.value_counts()
                        .head(_MAX_EXAMPLE_VALUES)
                        .items()
                    },
                )
            )
    else:
        result["invalid_statuses"] = 0

    logger.info(
        "Payment/status validation — %d bad payment method(s), %d bad status(es).",
        result.get("invalid_payment_methods", 0),
        result.get("invalid_statuses", 0),
    )
    result["violations"] = violations
    return result


def validate_regex_patterns(
    df: pd.DataFrame,
    id_col: str = "Transaction_ID",
    id_pattern: str = r"^T\d+$",
) -> Dict[str, Any]:
    """
    Check that ID columns match an expected regex pattern.

    Parameters
    ----------
    df : pd.DataFrame
    id_col : str
        Column to validate. Default: ``"Transaction_ID"``.
    id_pattern : str
        Regex pattern that valid IDs must match. Default: ``r"^T\\d+$"``
        (this dataset's actual format, e.g. ``"T0001"``, ``"T12488"`` — a
        single "T" prefix, not "TXN").

    Returns
    -------
    dict
        ``pattern_violations`` — count of IDs failing the pattern
        ``violations``         — violation dicts with count & percentage
    """
    violations: List[dict] = []
    total_rows = len(df)

    if id_col not in df.columns:
        logger.debug("Column '%s' not found; skipping regex validation.", id_col)
        return {"pattern_violations": 0, "violations": violations}

    non_null = df[id_col].dropna().astype(str)
    invalid_mask = ~non_null.str.match(id_pattern)
    count = int(invalid_mask.sum())

    if count > 0:
        regex_idx = non_null[invalid_mask].index.tolist()[:10]
        violations.append(
            _violation(
                check="regex_check",
                rule=f"'{id_col}' values not matching pattern '{id_pattern}'",
                column=id_col,
                count=count,
                total_rows=total_rows,
                severity="Low",
                sample_indices=regex_idx if regex_idx else None,
                example_values={
                    str(k): int(v)
                    for k, v in non_null[invalid_mask]
                    .value_counts()
                    .head(_MAX_EXAMPLE_VALUES)
                    .items()
                },
            )
        )
        logger.warning(
            "Regex check: %d (%.1f%%) '%s' values fail pattern '%s'.",
            count,
            count / total_rows * 100,
            id_col,
            id_pattern,
        )
    else:
        logger.info("Regex check: all '%s' values match pattern.", id_col)

    return {"pattern_violations": count, "violations": violations}


# ---------------------------------------------------------------------------
# Orchestrator
# ---------------------------------------------------------------------------


def run_validation(df: pd.DataFrame, raw_df: Optional[pd.DataFrame] = None) -> Dict[str, Any]:
    """
    Run all validation checks and return a combined structured result.

    The ``summary`` section now includes:
    - ``total_checks``   — number of checks performed
    - ``passed_checks``  — checks that found zero violations
    - ``failed_checks``  — checks that found at least one violation
    - ``pass_rate``      — percentage of checks that passed (0–100)
    - ``total_violations`` — total number of violation entries
    - ``high_severity``  — violations with severity "High"
    - ``medium_severity`` — violations with severity "Medium"
    - ``low_severity``   — violations with severity "Low"

    Parameters
    ----------
    df : pd.DataFrame
        Cleaned dataframe to validate (used for most checks).
    raw_df : pd.DataFrame | None
        The raw, pre-cleaning dataframe. Passed to ``validate_dates`` so it
        can distinguish genuinely-missing dates from calendar-invalid ones,
        which is only possible before ``cleaning.clean_dates()`` has already
        converted invalid dates to NaT. If omitted, the date-invalidity
        check will not be able to detect anything (see ``validate_dates``
        docstring) — always pass the raw dataframe when available.

    Returns
    -------
    dict
        Keys: ``violations``, ``summary``, ``nulls_and_duplicates``,
              ``schema``, ``dtypes``, ``dates``, ``payment_methods``, ``regex``.
    """
    logger.info("Starting validation on %d rows, %d columns.", *df.shape)

    # Run all individual checks
    nulls_result   = validate_nulls_and_duplicates(df)
    schema_result  = validate_schema(df)
    dtypes_result  = validate_dtypes(df)
    dates_result   = validate_dates(df, raw_df=raw_df)
    payment_result = validate_payment_methods(df)
    regex_result   = validate_regex_patterns(df)

    # Each check result has a "violations" list; empty = passed.
    check_results = [
        ("null_and_duplicate_check", nulls_result["violations"]),
        ("schema_check",             schema_result["violations"]),
        ("dtype_check",              dtypes_result["violations"]),   # always passes
        ("date_check",               dates_result["violations"]),
        ("payment_method_check",     payment_result["violations"]),
        ("regex_check",              regex_result["violations"]),
    ]

    total_checks  = len(check_results)
    passed_checks = sum(1 for _, viols in check_results if len(viols) == 0)
    failed_checks = total_checks - passed_checks
    pass_rate     = round(float(passed_checks / total_checks * 100), 2) if total_checks else 0.0

    # Flatten all violations into a single list
    all_violations: List[dict] = []
    for _, viols in check_results:
        all_violations.extend(viols)

    summary: Dict[str, Any] = {
        "total_checks":    total_checks,
        "passed_checks":   passed_checks,
        "failed_checks":   failed_checks,
        "pass_rate":       pass_rate,
        "total_violations": len(all_violations),
        "high_severity":   sum(1 for v in all_violations if v.get("severity") == "High"),
        "medium_severity": sum(1 for v in all_violations if v.get("severity") == "Medium"),
        "low_severity":    sum(1 for v in all_violations if v.get("severity") == "Low"),
    }

    logger.info(
        "Validation complete — %d/%d checks passed (%.1f%%), "
        "%d violation(s) found (%d High, %d Medium, %d Low).",
        passed_checks,
        total_checks,
        pass_rate,
        summary["total_violations"],
        summary["high_severity"],
        summary["medium_severity"],
        summary["low_severity"],
    )

    return {
        "violations":           all_violations,
        "summary":              summary,
        "nulls_and_duplicates": nulls_result,
        "schema":               schema_result,
        "dtypes":               dtypes_result,
        "dates":                dates_result,
        "payment_methods":      payment_result,
        "regex":                regex_result,
    }
