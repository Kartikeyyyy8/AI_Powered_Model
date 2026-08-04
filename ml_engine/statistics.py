"""
statistics.py
-------------
Statistical Analysis Module for the ML Data Quality Engine.

Responsibilities
----------------
- Compute descriptive statistics (mean, median, std, min, max, skew, kurtosis)
- Compute numeric column summary with Z-score outlier detection
- Compute categorical column summary (value counts, cardinality)
- Compute missing value summary across all columns
- Compute correlation matrix for numeric columns
- Return all results as a structured dict

Usage
-----
    from statistics import run_statistics

    report = run_statistics(df_clean)
    # report["descriptive_stats"]    → per-column statistics
    # report["numeric_summary"]      → numeric cols with outlier counts
    # report["categorical_summary"]  → categorical column breakdowns
    # report["missing_summary"]      → null rates per column
    # report["correlation_matrix"]   → numeric correlation matrix
"""

import logging
from typing import Any, Dict

import numpy as np
import pandas as pd
from scipy import stats

from config import IQR_FACTOR, LOG_FORMAT, ZSCORE_THRESHOLD

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(level=logging.INFO, format=LOG_FORMAT)
logger = logging.getLogger("ml_engine.statistics")


# ---------------------------------------------------------------------------
# Individual Stat Functions
# ---------------------------------------------------------------------------


def compute_descriptive_stats(df: pd.DataFrame) -> Dict[str, Any]:
    """
    Compute descriptive statistics for all numeric columns.

    Returns
    -------
    dict[str, dict]
        Per-column: mean, median, std, min, max, skewness, kurtosis, count.
    """
    results: Dict[str, Any] = {}
    for col in df.select_dtypes(include=[np.number]).columns:
        col_data = df[col].dropna()
        if len(col_data) == 0:
            continue
        results[col] = {
            "mean": round(float(col_data.mean()), 4),
            "median": round(float(col_data.median()), 4),
            "std": round(float(col_data.std()), 4),
            "min": round(float(col_data.min()), 4),
            "max": round(float(col_data.max()), 4),
            "skewness": round(float(col_data.skew()), 4),
            "kurtosis": round(float(col_data.kurtosis()), 4),
            "non_null_count": int(len(col_data)),
        }
    logger.info("Descriptive stats computed for %d numeric column(s).", len(results))
    return results


def compute_numeric_summary(
    df: pd.DataFrame,
    zscore_threshold: float = ZSCORE_THRESHOLD,
    iqr_factor: float = IQR_FACTOR,
) -> Dict[str, Any]:
    """
    Compute a numeric summary combining Z-score and IQR outlier detection.

    Parameters
    ----------
    df : pd.DataFrame
    zscore_threshold : float
        Z-score threshold for flagging outliers (default 3.0).
    iqr_factor : float
        IQR fence multiplier (default 1.5 — Tukey fences).

    Returns
    -------
    dict[str, dict]
        Per-column: z-score outlier count/pct, IQR outlier count/pct, fences.
    """
    results: Dict[str, Any] = {}
    for col in df.select_dtypes(include=[np.number]).columns:
        col_data = df[col].dropna()
        if len(col_data) < 3:
            logger.debug("Column '%s': too few values for outlier detection.", col)
            continue

        # Z-score
        try:
            z_scores = np.abs(stats.zscore(col_data))
            z_count = int(np.sum(z_scores > zscore_threshold))
        except Exception as exc:
            logger.warning("Z-score failed for column '%s': %s", col, exc)
            z_count = 0

        # IQR
        try:
            q25 = float(np.percentile(col_data, 25))
            q75 = float(np.percentile(col_data, 75))
            iqr = q75 - q25
            lower = q25 - iqr_factor * iqr
            upper = q75 + iqr_factor * iqr
            iqr_count = int(((col_data < lower) | (col_data > upper)).sum())
        except Exception as exc:
            logger.warning("IQR failed for column '%s': %s", col, exc)
            q25 = q75 = iqr = lower = upper = 0.0
            iqr_count = 0

        results[col] = {
            "zscore_outliers": z_count,
            "zscore_outlier_pct": round(float(z_count / len(col_data) * 100), 2),
            "zscore_threshold": zscore_threshold,
            "iqr_outliers": iqr_count,
            "iqr_outlier_pct": round(float(iqr_count / len(col_data) * 100), 2),
            "iqr_lower_fence": round(lower, 4),
            "iqr_upper_fence": round(upper, 4),
            "q25": round(q25, 4),
            "q75": round(q75, 4),
            "iqr": round(iqr, 4),
        }

    logger.info("Numeric summary computed for %d column(s).", len(results))
    return results


def compute_categorical_summary(df: pd.DataFrame, top_n: int = 10) -> Dict[str, Any]:
    """
    Compute summary statistics for categorical (object) columns.

    Parameters
    ----------
    df : pd.DataFrame
    top_n : int
        Number of top value counts to include per column. Default: 10.

    Returns
    -------
    dict[str, dict]
        Per-column: cardinality, top values, null rate.
    """
    results: Dict[str, Any] = {}
    for col in df.select_dtypes(include=["object", "category"]).columns:
        top_values = df[col].value_counts().head(top_n).to_dict()
        results[col] = {
            "cardinality": int(df[col].nunique()),
            "null_rate": round(float(df[col].isnull().mean() * 100), 2),
            "top_values": {str(k): int(v) for k, v in top_values.items()},
        }
    logger.info(
        "Categorical summary computed for %d column(s).", len(results)
    )
    return results


def compute_missing_summary(df: pd.DataFrame) -> Dict[str, Any]:
    """
    Compute missing value counts and percentages for every column.

    Parameters
    ----------
    df : pd.DataFrame

    Returns
    -------
    dict[str, dict]
        Per-column: null_count, null_percentage.
    """
    results: Dict[str, Any] = {}
    for col in df.columns:
        null_count = int(df[col].isna().sum())
        results[col] = {
            "null_count": null_count,
            "null_percentage": round(float(null_count / len(df) * 100), 2),
        }
    logger.info("Missing summary computed for %d column(s).", len(results))
    return results


def compute_correlation_matrix(df: pd.DataFrame) -> Dict[str, Any]:
    """
    Compute the Pearson correlation matrix for all numeric columns.

    Parameters
    ----------
    df : pd.DataFrame

    Returns
    -------
    dict
        ``matrix`` — nested dict of column → column → correlation value.
    """
    num_df = df.select_dtypes(include=[np.number])
    if num_df.empty or len(num_df.columns) < 2:
        logger.debug("Not enough numeric columns for correlation matrix.")
        return {"matrix": {}}

    corr = num_df.corr().round(4)
    # Convert to plain dict (JSON-serialisable)
    matrix = {
        col: {c: float(v) for c, v in row.items()}
        for col, row in corr.to_dict().items()
    }
    logger.info(
        "Correlation matrix computed for %d numeric column(s).", len(num_df.columns)
    )
    return {"matrix": matrix}


# ---------------------------------------------------------------------------
# Orchestrator
# ---------------------------------------------------------------------------


def run_statistics(
    df: pd.DataFrame,
    zscore_threshold: float = ZSCORE_THRESHOLD,
    iqr_factor: float = IQR_FACTOR,
) -> Dict[str, Any]:
    """
    Run the complete statistical analysis pipeline.

    Parameters
    ----------
    df : pd.DataFrame
        Cleaned dataframe.
    zscore_threshold : float
        Z-score outlier detection threshold.
    iqr_factor : float
        IQR fence multiplier.

    Returns
    -------
    dict
        Keys: ``descriptive_stats``, ``numeric_summary``, ``categorical_summary``,
              ``missing_summary``, ``correlation_matrix``.
    """
    logger.info("Starting statistical analysis on %d rows.", len(df))

    report = {
        "descriptive_stats": compute_descriptive_stats(df),
        "numeric_summary": compute_numeric_summary(
            df, zscore_threshold=zscore_threshold, iqr_factor=iqr_factor
        ),
        "categorical_summary": compute_categorical_summary(df),
        "missing_summary": compute_missing_summary(df),
        "correlation_matrix": compute_correlation_matrix(df),
    }

    logger.info("Statistical analysis complete.")
    return report
