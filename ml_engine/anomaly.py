"""
anomaly.py
----------
Machine Learning Anomaly Detection Module for the ML Data Quality Engine.

Responsibilities
----------------
- Prepare a numeric feature matrix from the cleaned dataframe (float32 for memory efficiency)
- Run Isolation Forest anomaly detection
- Run Local Outlier Factor (LOF) anomaly detection
- Run One-Class SVM via SGDOneClassSVM (linear-time, safe for 100k+ rows)
- Measure per-model execution time
- Return a structured summary with:
    - per-model anomaly counts, percentages, and execution times
    - model_comparison list
    - consensus anomalies (flagged by >= 2 of 3 models)
    - anomaly_records (up to 200, enriched with models_flagged and vote_count)

Performance Notes
-----------------
- SGDOneClassSVM is used instead of kernel OneClassSVM — it is O(n) not O(n²),
  safe for datasets of 100,000+ rows.
- IsolationForest uses n_jobs=-1 (all CPU cores).
- Feature matrix is kept as float32 to halve memory vs float64.
- Dataframe is not copied unnecessarily.

Usage
-----
    from anomaly import run_ml_anomalies

    result = run_ml_anomalies(df_clean)
    # result["model_comparison"]       → list of per-model dicts
    # result["consensus_anomalies"]    → int count
    # result["anomaly_records"]        → list of anomalous row dicts (up to 200)
"""

import logging
import time
from typing import Any, Dict, List, Tuple

import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.linear_model import SGDOneClassSVM
from sklearn.neighbors import LocalOutlierFactor
from sklearn.preprocessing import StandardScaler

from config import (
    ANOMALY_CONTAMINATION,
    ANOMALY_RANDOM_STATE,
    LOG_FORMAT,
    LOF_N_NEIGHBORS,
    SVM_NU,
)

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(level=logging.INFO, format=LOG_FORMAT)
logger = logging.getLogger("ml_engine.anomaly")


# ---------------------------------------------------------------------------
# Internal Helpers
# ---------------------------------------------------------------------------


def _prepare_feature_matrix(
    df: pd.DataFrame,
    feature_cols: List[str] = None,
) -> Tuple[np.ndarray, List[str]]:
    """
    Extract, impute (median), scale, and cast to float32 the anomaly feature matrix.

    Parameters
    ----------
    df : pd.DataFrame
        Cleaned dataframe (Price should already be numeric after cleaning).
    feature_cols : list[str] | None
        Explicit list of columns to use as features. Defaults to
        ``["Quantity", "Price"]`` — the only columns that represent
        genuine behavioral measurements in this dataset.

        IMPORTANT: do NOT auto-detect numeric-looking object columns such as
        Transaction_ID or Customer_ID (e.g. "T0001" → 1, "C2205" → 2205).
        IDs are arbitrary assigned labels — they carry no behavioral signal.
        Always pass an explicit whitelist.

    Returns
    -------
    tuple[np.ndarray, list[str]]
        float32-scaled feature matrix and the list of column names used.

    Raises
    ------
    ValueError
        If no usable numeric columns exist after imputation.
    """
    if feature_cols is None:
        feature_cols = ["Quantity", "Price"]

    available = [c for c in feature_cols if c in df.columns]
    if not available:
        raise ValueError(
            f"None of the requested feature columns {feature_cols} are present in the DataFrame."
        )

    X = df[available].copy()
    for col in X.columns:
        X[col] = pd.to_numeric(X[col], errors="coerce")
        if X[col].isna().any():
            X[col] = X[col].fillna(X[col].median())

    X = X.dropna(axis=1)
    if X.empty:
        raise ValueError("All requested feature columns are empty after imputation.")

    scaler = StandardScaler()
    # Cast to float32 to reduce memory usage (safe for all three models)
    X_scaled = scaler.fit_transform(X).astype(np.float32)
    logger.info(
        "Feature matrix prepared: %d rows × %d features (%s).",
        *X_scaled.shape,
        list(X.columns),
    )
    return X_scaled, X.columns.tolist()


# ---------------------------------------------------------------------------
# Model Runners (each returns labels + elapsed seconds)
# ---------------------------------------------------------------------------


def run_isolation_forest(
    X_scaled: np.ndarray,
    contamination: float = ANOMALY_CONTAMINATION,
    random_state: int = ANOMALY_RANDOM_STATE,
) -> Tuple[np.ndarray, float]:
    """
    Apply Isolation Forest anomaly detection.

    Uses n_jobs=-1 to leverage all available CPU cores.

    Returns
    -------
    tuple[np.ndarray, float]
        Labels (``-1`` = anomaly, ``1`` = normal) and elapsed seconds.
    """
    t0 = time.perf_counter()
    iso = IsolationForest(
        contamination=contamination,
        random_state=random_state,
        n_estimators=100,
        n_jobs=-1,
    )
    labels = iso.fit_predict(X_scaled)
    elapsed = round(time.perf_counter() - t0, 3)
    n_anom = int((labels == -1).sum())
    logger.info("Isolation Forest: %d anomaly/anomalies detected in %.2fs.", n_anom, elapsed)
    return labels, elapsed


def run_local_outlier_factor(
    X_scaled: np.ndarray,
    n_neighbors: int = LOF_N_NEIGHBORS,
    contamination: float = ANOMALY_CONTAMINATION,
) -> Tuple[np.ndarray, float]:
    """
    Apply Local Outlier Factor (LOF) anomaly detection.

    Returns
    -------
    tuple[np.ndarray, float]
        Labels (``-1`` = anomaly, ``1`` = normal) and elapsed seconds.
    """
    t0 = time.perf_counter()
    lof = LocalOutlierFactor(
        n_neighbors=min(n_neighbors, len(X_scaled) - 1),
        contamination=contamination,
    )
    labels = lof.fit_predict(X_scaled)
    elapsed = round(time.perf_counter() - t0, 3)
    n_anom = int((labels == -1).sum())
    logger.info("LOF: %d anomaly/anomalies detected in %.2fs.", n_anom, elapsed)
    return labels, elapsed


def run_sgd_one_class_svm(
    X_scaled: np.ndarray,
    nu: float = SVM_NU,
    random_state: int = ANOMALY_RANDOM_STATE,
) -> Tuple[np.ndarray, float]:
    """
    Apply One-Class SVM anomaly detection using SGDOneClassSVM.

    SGDOneClassSVM is a linear-time (O(n)) approximation of the kernel
    One-Class SVM. It is safe for datasets with 100,000+ rows.
    The standard sklearn.svm.OneClassSVM uses an O(n²) kernel which
    would hang on large datasets — it is intentionally NOT used here.

    Parameters
    ----------
    X_scaled : np.ndarray
        Pre-scaled feature matrix (float32 is fine).
    nu : float
        Upper bound on the fraction of training errors and lower bound on
        the fraction of support vectors. Analogous to contamination rate.
    random_state : int
        Seed for reproducibility.

    Returns
    -------
    tuple[np.ndarray, float]
        Labels (``-1`` = anomaly, ``1`` = normal) and elapsed seconds.
    """
    t0 = time.perf_counter()

    # Use 'optimal' learning rate which auto-selects based on nu and the
    # data. max_iter=1000 ensures convergence on distributions with
    # a wide feature range (e.g. Price after cleaning retains negatives).
    svm = SGDOneClassSVM(
        nu=nu,
        random_state=random_state,
        shuffle=True,
        max_iter=1000,
        learning_rate="optimal",
        tol=1e-4,
    )
    svm.fit(X_scaled)
    labels = svm.predict(X_scaled)
    n_anom = int((labels == -1).sum())

    # Convergence guard: if 0 anomalies detected (degenerate boundary),
    # retry with inverted label convention — some versions of SGDOneClassSVM
    # produce all +1 labels when the hyperplane collapses. In that case,
    # score-based thresholding is used as a fallback.
    if n_anom == 0 and len(X_scaled) > 10:
        logger.warning(
            "SGDOneClassSVM detected 0 anomalies — applying score-based fallback."
        )
        scores = svm.score_samples(X_scaled)
        threshold = float(np.percentile(scores, nu * 100))
        labels = np.where(scores <= threshold, -1, 1)
        n_anom = int((labels == -1).sum())
        logger.info(
            "SGDOneClassSVM fallback: %d anomaly/anomalies via score percentile (nu=%.2f).",
            n_anom, nu
        )

    elapsed = round(time.perf_counter() - t0, 3)
    logger.info("SGD One-Class SVM: %d anomaly/anomalies detected in %.2fs.", n_anom, elapsed)
    return labels, elapsed


# ---------------------------------------------------------------------------
# Orchestrator
# ---------------------------------------------------------------------------


def run_ml_anomalies(
    df: pd.DataFrame,
    contamination: float = ANOMALY_CONTAMINATION,
    random_state: int = ANOMALY_RANDOM_STATE,
    feature_cols: List[str] = None,
) -> Dict[str, Any]:
    """
    Run all three ML anomaly detection models and return a structured summary.

    Models
    ------
    1. Isolation Forest   — ensemble tree-based, O(n log n)
    2. Local Outlier Factor — density-based, O(n * n_neighbors)
    3. One-Class SVM (SGDOneClassSVM) — linear kernel, O(n), safe for 100k rows

    Consensus
    ---------
    A row is a consensus anomaly if flagged by >= 2 of the 3 models.
    - vote_count = 1 → low confidence
    - vote_count = 2 → high confidence
    - vote_count = 3 → very high confidence

    Parameters
    ----------
    df : pd.DataFrame
        Cleaned dataframe. Numeric columns (Quantity, Price) must be present.
    contamination : float
        Expected proportion of anomalies. Default: 0.05.
    random_state : int
        Seed for Isolation Forest and SGDOneClassSVM reproducibility. Default: 42.
    feature_cols : list[str] | None
        Explicit feature columns to use. Defaults to ``["Quantity", "Price"]``.

    Returns
    -------
    dict
        ``features_used``               — columns used for detection
        ``total_rows_analysed``         — number of rows processed
        ``contamination_rate``          — contamination/nu parameter used
        ``isolation_forest_anomalies``  — count from Isolation Forest
        ``isolation_forest_pct``        — percentage from Isolation Forest
        ``lof_anomalies``               — count from LOF
        ``lof_pct``                     — percentage from LOF
        ``one_class_svm_anomalies``     — count from One-Class SVM
        ``one_class_svm_pct``           — percentage from One-Class SVM
        ``model_comparison``            — list of per-model dicts with timing
        ``consensus_anomalies``         — count flagged by >= 2 models
        ``consensus_pct``               — percentage flagged by >= 2 models
        ``consensus_indices``           — row indices of consensus anomalies
        ``anomaly_records``             — list of anomalous row dicts (up to 200)
    """
    # -----------------------------------------------------------------------
    # Empty DataFrame guard
    # -----------------------------------------------------------------------
    if df.empty:
        logger.warning("Empty DataFrame provided; returning zero anomalies.")
        _empty: Dict[str, Any] = {
            "features_used": [],
            "total_rows_analysed": 0,
            "contamination_rate": contamination,
            "isolation_forest_anomalies": 0,
            "isolation_forest_pct": 0.0,
            "lof_anomalies": 0,
            "lof_pct": 0.0,
            "one_class_svm_anomalies": 0,
            "one_class_svm_pct": 0.0,
            "model_comparison": [
                {"model": "Isolation Forest",   "anomalies": 0, "anomaly_pct": 0.0, "execution_time_sec": 0.0, "rows_analysed": 0},
                {"model": "Local Outlier Factor","anomalies": 0, "anomaly_pct": 0.0, "execution_time_sec": 0.0, "rows_analysed": 0},
                {"model": "One-Class SVM",       "anomalies": 0, "anomaly_pct": 0.0, "execution_time_sec": 0.0, "rows_analysed": 0},
            ],
            "consensus_anomalies": 0,
            "consensus_pct": 0.0,
            "consensus_indices": [],
            "anomaly_records": [],
        }
        return _empty

    # -----------------------------------------------------------------------
    # Feature preparation
    # -----------------------------------------------------------------------
    try:
        X_scaled, feature_cols_used = _prepare_feature_matrix(df, feature_cols=feature_cols)
    except ValueError as exc:
        logger.error("Feature preparation failed: %s", exc)
        return {
            "error": str(exc),
            "features_used": [],
            "total_rows_analysed": len(df),
            "contamination_rate": contamination,
            "isolation_forest_anomalies": 0,
            "isolation_forest_pct": 0.0,
            "lof_anomalies": 0,
            "lof_pct": 0.0,
            "one_class_svm_anomalies": 0,
            "one_class_svm_pct": 0.0,
            "model_comparison": [],
            "consensus_anomalies": 0,
            "consensus_pct": 0.0,
            "consensus_indices": [],
            "anomaly_records": [],
        }

    n_rows = len(df)

    # -----------------------------------------------------------------------
    # Run models
    # -----------------------------------------------------------------------
    iso_labels, iso_time = run_isolation_forest(
        X_scaled, contamination=contamination, random_state=random_state
    )
    lof_labels, lof_time = run_local_outlier_factor(
        X_scaled, contamination=contamination
    )
    svm_labels, svm_time = run_sgd_one_class_svm(
        X_scaled, nu=contamination, random_state=random_state
    )

    # -----------------------------------------------------------------------
    # Boolean masks
    # -----------------------------------------------------------------------
    iso_mask = iso_labels == -1
    lof_mask = lof_labels == -1
    svm_mask = svm_labels == -1

    # -----------------------------------------------------------------------
    # Consensus: vote_count >= 2 (any two or all three models agree)
    # -----------------------------------------------------------------------
    vote_counts = iso_mask.astype(np.int8) + lof_mask.astype(np.int8) + svm_mask.astype(np.int8)
    consensus_mask = vote_counts >= 2

    consensus_indices = df.index[consensus_mask].tolist()

    # -----------------------------------------------------------------------
    # Collect anomaly records (up to 200)
    # -----------------------------------------------------------------------
    # Determine all rows flagged by at least one model; prioritise consensus rows
    any_flag_mask = vote_counts >= 1
    all_flag_indices = df.index[any_flag_mask].tolist()

    # Sort so consensus rows appear first
    consensus_set = set(consensus_indices)
    sorted_indices = (
        [i for i in consensus_indices]
        + [i for i in all_flag_indices if i not in consensus_set]
    )
    sorted_indices = sorted_indices[:200]  # hard cap — never send 100k rows to frontend

    # Build model name lookup arrays (aligned with df.index)
    index_to_pos = {idx: pos for pos, idx in enumerate(df.index)}

    model_names = ["Isolation Forest", "Local Outlier Factor", "One-Class SVM"]
    model_masks = [iso_mask, lof_mask, svm_mask]

    anomaly_records: List[dict] = []
    for idx in sorted_indices:
        pos = index_to_pos[idx]
        flagging_models = [
            name for name, mask in zip(model_names, model_masks) if mask[pos]
        ]
        row_dict: Dict[str, Any] = {}
        for k, v in df.loc[idx].to_dict().items():
            row_dict[k] = v.isoformat() if hasattr(v, "isoformat") else v
        row_dict["anomaly_index"] = int(idx)
        row_dict["model_vote_count"] = int(vote_counts[pos])
        row_dict["models_flagged"] = flagging_models
        anomaly_records.append(row_dict)

    # -----------------------------------------------------------------------
    # Counts and percentages
    # -----------------------------------------------------------------------
    iso_count = int(iso_mask.sum())
    lof_count = int(lof_mask.sum())
    svm_count = int(svm_mask.sum())
    con_count = int(consensus_mask.sum())

    def _pct(count: int) -> float:
        return round(float(count / n_rows * 100), 2) if n_rows else 0.0

    model_comparison = [
        {
            "model": "Isolation Forest",
            "anomalies": iso_count,
            "anomaly_pct": _pct(iso_count),
            "execution_time_sec": iso_time,
            "rows_analysed": n_rows,
        },
        {
            "model": "Local Outlier Factor",
            "anomalies": lof_count,
            "anomaly_pct": _pct(lof_count),
            "execution_time_sec": lof_time,
            "rows_analysed": n_rows,
        },
        {
            "model": "One-Class SVM",
            "anomalies": svm_count,
            "anomaly_pct": _pct(svm_count),
            "execution_time_sec": svm_time,
            "rows_analysed": n_rows,
        },
    ]

    logger.info(
        "Consensus (>= 2/3 models): %d anomaly/anomalies (%.2f%%).",
        con_count,
        _pct(con_count),
    )

    return {
        "features_used": feature_cols_used,
        "total_rows_analysed": n_rows,
        "contamination_rate": contamination,
        "isolation_forest_anomalies": iso_count,
        "isolation_forest_pct": _pct(iso_count),
        "lof_anomalies": lof_count,
        "lof_pct": _pct(lof_count),
        "one_class_svm_anomalies": svm_count,
        "one_class_svm_pct": _pct(svm_count),
        "model_comparison": model_comparison,
        "consensus_anomalies": con_count,
        "consensus_pct": _pct(con_count),
        "consensus_indices": consensus_indices,
        "anomaly_records": anomaly_records,
    }
