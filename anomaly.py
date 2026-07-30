"""
anomaly.py
----------
Machine Learning Anomaly Detection Module for the ML Data Quality Engine.

Responsibilities
----------------
- Prepare a numeric feature matrix from the cleaned dataframe
- Run Isolation Forest anomaly detection
- Run Local Outlier Factor (LOF) anomaly detection
- Return consensus anomalies (flagged by both models), anomaly records,
  and a structured summary dict

Usage
-----
    from anomaly import run_ml_anomalies

    result = run_ml_anomalies(df_clean)
    # result["consensus_anomalies"] → int count
    # result["anomaly_records"]     → list of anomalous row dicts
"""

import logging
from typing import Any, Dict, List, Tuple

import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.neighbors import LocalOutlierFactor
from sklearn.preprocessing import StandardScaler

from config import (
    ANOMALY_CONTAMINATION,
    ANOMALY_RANDOM_STATE,
    LOG_FORMAT,
    LOF_N_NEIGHBORS,
)

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(level=logging.INFO, format=LOG_FORMAT)
logger = logging.getLogger("ml_engine.anomaly")


# ---------------------------------------------------------------------------
# Internal Helpers
# ---------------------------------------------------------------------------


def _prepare_feature_matrix(df: pd.DataFrame) -> Tuple[np.ndarray, List[str]]:
    """
    Extract, impute (median), and scale numeric features for anomaly detection.

    Also attempts to coerce object columns that are mostly numeric
    (e.g. Price stored as ``"$99.99"`` before cleaning) into float.

    Parameters
    ----------
    df : pd.DataFrame
        Cleaned dataframe (Price should already be numeric after cleaning).

    Returns
    -------
    tuple[np.ndarray, list[str]]
        Scaled feature matrix and the list of column names used.

    Raises
    ------
    ValueError
        If no usable numeric columns exist after imputation.
    """
    df_proc = df.copy()

    # Attempt to recover object columns that look numeric
    for col in df_proc.select_dtypes(include=["object"]).columns:
        parsed = pd.to_numeric(
            df_proc[col].astype(str).str.replace(r"[^\d.\-]", "", regex=True),
            errors="coerce",
        )
        # Only convert if > 30% of values are parseable
        if parsed.notna().sum() > 0.3 * len(df_proc):
            df_proc[col] = parsed

    num_cols = df_proc.select_dtypes(include=[np.number]).columns.tolist()
    if not num_cols:
        raise ValueError("No numeric columns found in DataFrame.")

    X = df_proc[num_cols].copy()

    # Median imputation — CoW-safe assignment
    for col in X.columns:
        if X[col].isna().any():
            X[col] = X[col].fillna(X[col].median())

    # Drop any column that is still entirely NaN
    X = X.dropna(axis=1)
    if X.empty:
        raise ValueError("All numeric columns are empty after imputation.")

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    logger.info("Feature matrix prepared: %d rows × %d features.", *X_scaled.shape)
    return X_scaled, X.columns.tolist()


# ---------------------------------------------------------------------------
# Model Runners
# ---------------------------------------------------------------------------


def run_isolation_forest(
    X_scaled: np.ndarray,
    contamination: float = ANOMALY_CONTAMINATION,
    random_state: int = ANOMALY_RANDOM_STATE,
) -> np.ndarray:
    """
    Apply Isolation Forest anomaly detection.

    Parameters
    ----------
    X_scaled : np.ndarray
        Pre-scaled feature matrix.
    contamination : float
        Expected proportion of anomalies (0–0.5). Default: 0.05.
    random_state : int
        Seed for reproducibility. Default: 42.

    Returns
    -------
    np.ndarray
        Labels: ``-1`` = anomaly, ``1`` = normal.
    """
    iso = IsolationForest(
        contamination=contamination,
        random_state=random_state,
        n_estimators=100,
    )
    labels = iso.fit_predict(X_scaled)
    logger.info("Isolation Forest: %d anomaly/anomalies detected.", int((labels == -1).sum()))
    return labels


def run_local_outlier_factor(
    X_scaled: np.ndarray,
    n_neighbors: int = LOF_N_NEIGHBORS,
    contamination: float = ANOMALY_CONTAMINATION,
) -> np.ndarray:
    """
    Apply Local Outlier Factor (LOF) anomaly detection.

    Parameters
    ----------
    X_scaled : np.ndarray
        Pre-scaled feature matrix.
    n_neighbors : int
        Number of neighbours for LOF. Default: 20.
    contamination : float
        Expected proportion of anomalies. Default: 0.05.

    Returns
    -------
    np.ndarray
        Labels: ``-1`` = anomaly, ``1`` = normal.
    """
    lof = LocalOutlierFactor(
        n_neighbors=min(n_neighbors, len(X_scaled) - 1),
        contamination=contamination,
    )
    labels = lof.fit_predict(X_scaled)
    logger.info("LOF: %d anomaly/anomalies detected.", int((labels == -1).sum()))
    return labels


# ---------------------------------------------------------------------------
# Orchestrator
# ---------------------------------------------------------------------------


def run_ml_anomalies(
    df: pd.DataFrame,
    contamination: float = ANOMALY_CONTAMINATION,
    random_state: int = ANOMALY_RANDOM_STATE,
) -> Dict[str, Any]:
    """
    Run both ML anomaly detection models and return a structured summary.

    Consensus anomalies are rows flagged as anomalous by **both** Isolation
    Forest and LOF simultaneously — this reduces false positives.

    Parameters
    ----------
    df : pd.DataFrame
        Cleaned dataframe. Numeric columns (Quantity, Price) must be present.
    contamination : float
        Expected proportion of anomalies. Default: 0.05.
    random_state : int
        Seed for Isolation Forest reproducibility. Default: 42.

    Returns
    -------
    dict
        ``features_used``               — columns used for detection
        ``total_rows_analysed``         — number of rows processed
        ``isolation_forest_anomalies``  — count from Isolation Forest
        ``isolation_forest_pct``        — percentage from Isolation Forest
        ``lof_anomalies``               — count from LOF
        ``lof_pct``                     — percentage from LOF
        ``consensus_anomalies``         — count flagged by both models
        ``consensus_pct``               — percentage flagged by both models
        ``consensus_indices``           — row indices of consensus anomalies
        ``anomaly_records``             — list of anomalous row dicts (up to 200)
    """
    if df.empty:
        logger.warning("Empty DataFrame provided; returning zero anomalies.")
        return {
            "features_used": [],
            "total_rows_analysed": 0,
            "isolation_forest_anomalies": 0,
            "isolation_forest_pct": 0.0,
            "lof_anomalies": 0,
            "lof_pct": 0.0,
            "consensus_anomalies": 0,
            "consensus_pct": 0.0,
            "consensus_indices": [],
            "anomaly_records": [],
        }

    try:
        X_scaled, feature_cols = _prepare_feature_matrix(df)
    except ValueError as exc:
        logger.error("Feature preparation failed: %s", exc)
        return {
            "error": str(exc),
            "features_used": [],
            "total_rows_analysed": len(df),
            "consensus_anomalies": 0,
            "consensus_pct": 0.0,
            "consensus_indices": [],
            "anomaly_records": [],
        }

    iso_labels = run_isolation_forest(
        X_scaled, contamination=contamination, random_state=random_state
    )
    lof_labels = run_local_outlier_factor(X_scaled, contamination=contamination)

    iso_mask = iso_labels == -1
    lof_mask = lof_labels == -1
    consensus_mask = iso_mask & lof_mask
    n_rows = len(df)

    consensus_indices = df.index[consensus_mask].tolist()

    # Collect up to 200 anomalous records as plain dicts
    anomaly_records: List[dict] = []
    for idx in consensus_indices[:200]:
        row_dict = {
            k: (v.isoformat() if hasattr(v, "isoformat") else v)
            for k, v in df.loc[idx].to_dict().items()
        }
        row_dict["anomaly_index"] = int(idx)
        anomaly_records.append(row_dict)

    return {
        "features_used": feature_cols,
        "total_rows_analysed": n_rows,
        "contamination_rate": contamination,
        "isolation_forest_anomalies": int(iso_mask.sum()),
        "isolation_forest_pct": round(float(iso_mask.sum() / n_rows * 100), 2),
        "lof_anomalies": int(lof_mask.sum()),
        "lof_pct": round(float(lof_mask.sum() / n_rows * 100), 2),
        "consensus_anomalies": int(consensus_mask.sum()),
        "consensus_pct": round(float(consensus_mask.sum() / n_rows * 100), 2),
        "consensus_indices": consensus_indices,
        "anomaly_records": anomaly_records,
    }
