"""
scoring.py
----------
Data Quality Scoring Module for the ML Data Quality Engine.

Responsibilities
----------------
- Compute dataset-level quality score (completeness, uniqueness, validity)
- Include the business-rule quality score from rules.py
- Include an anomaly penalty reflecting ML-detected anomalies
- Compute per-column completeness scores
- Compute per-record completeness scores
- Accept actual pipeline outputs (validation, rules, anomaly) to calculate
  a fully data-driven overall quality score

Scoring Formula
---------------
When violations/anomaly data is available (full mode):
    Validity = proportion of records free from rule violations & anomalies
    Overall  = Completeness × 0.40 + Uniqueness × 0.30 + Validity × 0.30

Without violations/anomaly data (basic mode):
    Overall  = Completeness × 0.60 + Uniqueness × 0.40

Usage
-----
    from scoring import run_scoring

    result = run_scoring(df_clean, val_result=val_result,
                         violations=violations, anomaly_result=anomaly_result)
    # result["dataset"]            → overall quality scores + rules_quality_score
    # result["columns"]            → per-column completeness
    # result["record_score_stats"] → summary stats of per-row scores
"""

import logging
from typing import Any, Dict, List, Optional

import numpy as np
import pandas as pd

from config import LOG_FORMAT

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(level=logging.INFO, format=LOG_FORMAT)
logger = logging.getLogger("ml_engine.scoring")


# ---------------------------------------------------------------------------
# Individual Scoring Functions
# ---------------------------------------------------------------------------


def compute_dataset_scores(
    df: pd.DataFrame,
    val_result: Optional[Dict] = None,
    violations: Optional[List[dict]] = None,
    anomaly_result: Optional[Dict] = None,
) -> Dict[str, Any]:
    """
    Compute dataset-level quality metrics using actual pipeline outputs.

    Scoring dimensions
    ------------------
    - **Completeness**        = (1 − mean null rate) × 100
    - **Uniqueness**          = (1 − duplicate ratio) × 100
    - **Validity**            = (1 − ratio of violated/anomalous records) × 100
    - **Rules Quality Score** = business-rule quality score from rules.py
    - **Anomaly Penalty**     = percentage of rows flagged as anomalous (0 = no penalty)
    - **Overall**             = Completeness × 0.40 + Uniqueness × 0.30 + Validity × 0.30

    Parameters
    ----------
    df : pd.DataFrame
        Cleaned dataframe.
    val_result : dict | None
        Output from ``validation.run_validation()``.
    violations : list | None
        Output from ``rules.run_business_rules()``.
    anomaly_result : dict | None
        Output from ``anomaly.run_ml_anomalies()``.

    Returns
    -------
    dict
        ``dataset_score``, ``completeness_score``, ``uniqueness_score``,
        ``validity_score``, ``rules_quality_score``, ``anomaly_penalty``,
        ``total_rows``, ``total_columns``.
    """
    if df.empty:
        logger.warning("Empty DataFrame: returning zero scores.")
        return {
            "dataset_score": 0.0,
            "completeness_score": 0.0,
            "uniqueness_score": 0.0,
            "validity_score": 0.0,
            "rules_quality_score": 0.0,
            "anomaly_penalty": 0.0,
            "total_rows": 0,
            "total_columns": 0,
        }

    total_rows = len(df)
    completeness = float((1 - df.isnull().mean().mean()) * 100)
    uniqueness   = float((1 - df.duplicated().sum() / total_rows) * 100)

    # ------------------------------------------------------------------
    # Business-rule quality score (from rules.py helper)
    # ------------------------------------------------------------------
    # Import here to avoid circular import at module level; rules.py imports config only.
    from rules import compute_rules_quality_score, get_unique_violation_indices  # type: ignore

    rules_quality_score = compute_rules_quality_score(violations or [], total_rows, df=df)

    # ------------------------------------------------------------------
    # Anomaly penalty — percentage of rows flagged by consensus model
    # ------------------------------------------------------------------
    anomaly_penalty = 0.0
    if anomaly_result and isinstance(anomaly_result, dict):
        anomaly_penalty = round(
            float(anomaly_result.get("consensus_pct", 0.0)), 2
        )

    # ------------------------------------------------------------------
    # Validity — % of rows with NO rule violation AND NOT a consensus anomaly.
    # Uses the unique-row union (get_unique_violation_indices), not a sum of
    # per-rule counts — a row failing multiple rules used to get counted
    # once per rule it failed, which could overstate how many rows are
    # actually affected and understate the true validity score.
    # ------------------------------------------------------------------
    unique_violated_rows = set(get_unique_violation_indices(df))
    if anomaly_result and isinstance(anomaly_result, dict):
        unique_violated_rows |= set(anomaly_result.get("consensus_indices", []))

    if violations or anomaly_result:
        validity = max(
            0.0, float((1.0 - len(unique_violated_rows) / total_rows) * 100)
        )
        overall = completeness * 0.40 + uniqueness * 0.30 + validity * 0.30
    else:
        # No violation data — basic scoring
        validity = 100.0
        overall  = completeness * 0.60 + uniqueness * 0.40

    scores = {
        "dataset_score":        round(overall, 2),
        "completeness_score":   round(completeness, 2),
        "uniqueness_score":     round(uniqueness, 2),
        "validity_score":       round(validity, 2),
        "rules_quality_score":  rules_quality_score,
        "anomaly_penalty":      anomaly_penalty,
        "total_rows":           total_rows,
        "total_columns":        len(df.columns),
    }

    logger.info(
        "Dataset scores — overall: %.2f | completeness: %.2f | "
        "uniqueness: %.2f | validity: %.2f | rules_quality: %.2f | anomaly_penalty: %.2f%%.",
        overall,
        completeness,
        uniqueness,
        validity,
        rules_quality_score,
        anomaly_penalty,
    )
    return scores


def compute_column_scores(df: pd.DataFrame) -> Dict[str, float]:
    """
    Compute per-column completeness scores (0 – 100).

    A score of 100 means the column has no missing values.
    A score of 0 means the column is entirely null.

    Parameters
    ----------
    df : pd.DataFrame

    Returns
    -------
    dict[str, float]
        Column name → completeness percentage.
    """
    scores = {
        col: round(float((1 - df[col].isnull().mean()) * 100), 2)
        for col in df.columns
    }
    logger.info("Column-level scores computed for %d column(s).", len(scores))
    return scores


def compute_record_scores(df: pd.DataFrame) -> pd.Series:
    """
    Compute per-record completeness score (% of non-null fields per row).

    A score of 100 means the row has no missing values.
    A score of 0 means every field in the row is null.

    Parameters
    ----------
    df : pd.DataFrame

    Returns
    -------
    pd.Series
        Float scores in range [0, 100], one per row.
    """
    scores = (df.notna().sum(axis=1) / len(df.columns) * 100).round(2)
    logger.info(
        "Record scores — mean: %.2f, min: %.2f, max: %.2f.",
        float(scores.mean()),
        float(scores.min()),
        float(scores.max()),
    )
    return scores


# ---------------------------------------------------------------------------
# Orchestrator
# ---------------------------------------------------------------------------


def run_scoring(
    df: pd.DataFrame,
    val_result: Optional[Dict] = None,
    violations: Optional[List[dict]] = None,
    anomaly_result: Optional[Dict] = None,
) -> Dict[str, Any]:
    """
    Run the complete scoring pipeline and return a structured report.

    Parameters
    ----------
    df : pd.DataFrame
        Cleaned dataframe.
    val_result : dict | None
        Validation output from ``validation.run_validation()``.
    violations : list | None
        Business rule violations from ``rules.run_business_rules()``.
    anomaly_result : dict | None
        Anomaly detection output from ``anomaly.run_ml_anomalies()``.

    Returns
    -------
    dict
        ``dataset``            — dataset-level quality scores (incl. rules_quality_score)
        ``columns``            — per-column completeness scores
        ``record_score_stats`` — summary stats of per-row completeness scores
    """
    logger.info("Starting scoring pipeline on %d rows.", len(df))
    record_scores = compute_record_scores(df)

    report = {
        "dataset": compute_dataset_scores(
            df,
            val_result=val_result,
            violations=violations,
            anomaly_result=anomaly_result,
        ),
        "columns": compute_column_scores(df),
        "record_score_stats": {
            "mean":        round(float(record_scores.mean()), 2),
            "median":      round(float(record_scores.median()), 2),
            "min":         round(float(record_scores.min()), 2),
            "max":         round(float(record_scores.max()), 2),
            "pct_below_50": round(
                float((record_scores < 50).sum() / len(record_scores) * 100), 2
            ),
        },
    }

    logger.info("Scoring pipeline complete.")
    return report
