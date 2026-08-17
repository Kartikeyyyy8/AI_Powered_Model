"""
anomaly.py
---------
Machine Learning Anomaly Detection Module for the ML Data Quality Engine.

Models:
    1. Isolation Forest
    2. Local Outlier Factor (LOF)
    3. SGD One-Class SVM

The models use independent decision boundaries instead of forcing
Isolation Forest and LOF to return exactly the same percentage of
anomalies.

Isolation Forest:
    contamination="auto"

LOF:
    contamination="auto"

One-Class SVM:
    nu=SVM_NU from config.py

The module also calculates:
    - per-model anomaly counts
    - anomaly percentages
    - execution time
    - model scores
    - pairwise model agreement
    - 2-out-of-3 consensus
    - anomaly records
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

logging.basicConfig(
    level=logging.INFO,
    format=LOG_FORMAT,
)

logger = logging.getLogger("ml_engine.anomaly")


# ---------------------------------------------------------------------------
# Feature Preparation
# ---------------------------------------------------------------------------

def _prepare_feature_matrix(
    df: pd.DataFrame,
    feature_cols: List[str] = None,
) -> Tuple[np.ndarray, List[str]]:
    """
    Prepare the numerical feature matrix.

    Default features:
        Quantity
        Price

    Steps:
        1. Select explicit feature columns
        2. Convert to numeric
        3. Median imputation
        4. Standard scaling
        5. Convert to float32
    """

    if feature_cols is None:
        feature_cols = ["Quantity", "Price"]

    available = [
        column
        for column in feature_cols
        if column in df.columns
    ]

    if not available:
        raise ValueError(
            f"None of the requested feature columns "
            f"{feature_cols} are present in the DataFrame."
        )

    X = df[available].copy()

    for column in X.columns:

        X[column] = pd.to_numeric(
            X[column],
            errors="coerce",
        )

        if X[column].isna().any():

            median_value = X[column].median()

            if pd.isna(median_value):
                median_value = 0.0

            X[column] = X[column].fillna(
                median_value
            )

    # Remove columns that are still unusable
    X = X.dropna(axis=1)

    if X.empty:
        raise ValueError(
            "All requested feature columns are empty after imputation."
        )

    scaler = StandardScaler()

    X_scaled = scaler.fit_transform(X).astype(
        np.float32
    )

    logger.info(
        "Feature matrix prepared: %d rows x %d features (%s).",
        *X_scaled.shape,
        list(X.columns),
    )

    return X_scaled, X.columns.tolist()


# ---------------------------------------------------------------------------
# Isolation Forest
# ---------------------------------------------------------------------------

def run_isolation_forest(
    X_scaled: np.ndarray,
    random_state: int = ANOMALY_RANDOM_STATE,
) -> Tuple[np.ndarray, np.ndarray, float]:
    """
    Run Isolation Forest using its own automatic threshold.

    IMPORTANT:
        contamination='auto' means the model is NOT forced
        to return exactly 5% anomalies.

    Returns:
        labels
        scores
        execution_time
    """

    t0 = time.perf_counter()

    model = IsolationForest(
        contamination="auto",
        random_state=random_state,
        n_estimators=100,
        n_jobs=-1,
    )

    labels = model.fit_predict(
        X_scaled
    )

    # Higher score = more normal
    # Lower score = more anomalous
    scores = model.decision_function(
        X_scaled
    )

    elapsed = round(
        time.perf_counter() - t0,
        3,
    )

    anomaly_count = int(
        (labels == -1).sum()
    )

    logger.info(
        "Isolation Forest: %d anomalies detected in %.3fs.",
        anomaly_count,
        elapsed,
    )

    return labels, scores, elapsed


# ---------------------------------------------------------------------------
# Local Outlier Factor
# ---------------------------------------------------------------------------

def run_local_outlier_factor(
    X_scaled: np.ndarray,
    n_neighbors: int = LOF_N_NEIGHBORS,
) -> Tuple[np.ndarray, np.ndarray, float]:
    """
    Run Local Outlier Factor using its own automatic threshold.

    IMPORTANT:
        contamination='auto' means LOF determines its own
        anomaly boundary instead of being forced to return
        exactly 5%.

    Returns:
        labels
        scores
        execution_time
    """

    t0 = time.perf_counter()

    model = LocalOutlierFactor(
        n_neighbors=min(
            n_neighbors,
            len(X_scaled) - 1,
        ),
        contamination="auto",
    )

    labels = model.fit_predict(
        X_scaled
    )

    # negative_outlier_factor_:
    # values closer to -1 = normal
    # more negative = more anomalous
    raw_scores = model.negative_outlier_factor_

    # Convert so higher = more anomalous.
    anomaly_scores = -raw_scores

    elapsed = round(
        time.perf_counter() - t0,
        3,
    )

    anomaly_count = int(
        (labels == -1).sum()
    )

    logger.info(
        "LOF: %d anomalies detected in %.3fs.",
        anomaly_count,
        elapsed,
    )

    return labels, anomaly_scores, elapsed


# ---------------------------------------------------------------------------
# SGD One-Class SVM
# ---------------------------------------------------------------------------

def run_sgd_one_class_svm(
    X_scaled: np.ndarray,
    nu: float = SVM_NU,
    random_state: int = ANOMALY_RANDOM_STATE,
) -> Tuple[np.ndarray, np.ndarray, float]:
    """
    Run SGD One-Class SVM.

    nu controls the expected fraction of anomalies/support vectors.

    Unlike Isolation Forest and LOF, One-Class SVM requires
    nu to define its decision boundary.

    Returns:
        labels
        anomaly scores
        execution_time
    """

    t0 = time.perf_counter()

    model = SGDOneClassSVM(
        nu=nu,
        random_state=random_state,
        shuffle=True,
        max_iter=1000,
        learning_rate="optimal",
        tol=1e-4,
    )

    model.fit(
        X_scaled
    )

    labels = model.predict(
        X_scaled
    )

    # decision_function:
    # positive = normal side
    # negative = anomaly side
    decision_scores = model.decision_function(
        X_scaled
    )

    # Convert so higher = more anomalous
    anomaly_scores = -decision_scores

    anomaly_count = int(
        (labels == -1).sum()
    )

    # Fallback for degenerate training
    if anomaly_count == 0 and len(X_scaled) > 10:

        logger.warning(
            "SGDOneClassSVM detected 0 anomalies. "
            "Applying score-based fallback."
        )

        raw_scores = model.score_samples(
            X_scaled
        )

        threshold = float(
            np.percentile(
                raw_scores,
                nu * 100,
            )
        )

        labels = np.where(
            raw_scores <= threshold,
            -1,
            1,
        )

        anomaly_scores = -raw_scores

        anomaly_count = int(
            (labels == -1).sum()
        )

    elapsed = round(
        time.perf_counter() - t0,
        3,
    )

    logger.info(
        "One-Class SVM: %d anomalies detected in %.3fs.",
        anomaly_count,
        elapsed,
    )

    return labels, anomaly_scores, elapsed


# ---------------------------------------------------------------------------
# Utility Functions
# ---------------------------------------------------------------------------

def _percentage(
    count: int,
    total: int,
) -> float:

    if total == 0:
        return 0.0

    return round(
        (count / total) * 100,
        2,
    )


def _safe_float(
    value: Any,
) -> float:

    try:
        value = float(value)

        if np.isnan(value):
            return 0.0

        if np.isinf(value):
            return 0.0

        return round(value, 6)

    except Exception:
        return 0.0


# ---------------------------------------------------------------------------
# Main ML Pipeline
# ---------------------------------------------------------------------------

def run_ml_anomalies(
    df: pd.DataFrame,
    contamination: float = ANOMALY_CONTAMINATION,
    random_state: int = ANOMALY_RANDOM_STATE,
    feature_cols: List[str] = None,
) -> Dict[str, Any]:
    """
    Run all three anomaly detection models.

    IMPORTANT:
        Isolation Forest and LOF use their own automatic
        anomaly thresholds.

        One-Class SVM uses SVM_NU.

    Therefore the three models are NOT forced to produce
    exactly the same number of anomalies.

    Consensus:
        vote_count >= 2
    """

    # -----------------------------------------------------------------------
    # Empty DataFrame
    # -----------------------------------------------------------------------

    if df.empty:

        logger.warning(
            "Empty DataFrame provided."
        )

        return {
            "features_used": [],
            "total_rows_analysed": 0,
            "contamination_rate": contamination,

            "isolation_forest_anomalies": 0,
            "isolation_forest_pct": 0.0,

            "lof_anomalies": 0,
            "lof_pct": 0.0,

            "one_class_svm_anomalies": 0,
            "one_class_svm_pct": 0.0,

            "model_comparison": [],

            "pairwise_agreement": {},

            "consensus_anomalies": 0,
            "consensus_pct": 0.0,

            "consensus_indices": [],

            "anomaly_records": [],
        }

    # -----------------------------------------------------------------------
    # Prepare Features
    # -----------------------------------------------------------------------

    try:

        X_scaled, feature_cols_used = (
            _prepare_feature_matrix(
                df,
                feature_cols=feature_cols,
            )
        )

    except ValueError as exc:

        logger.error(
            "Feature preparation failed: %s",
            exc,
        )

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

            "pairwise_agreement": {},

            "consensus_anomalies": 0,
            "consensus_pct": 0.0,

            "consensus_indices": [],

            "anomaly_records": [],
        }

    n_rows = len(df)

    # -----------------------------------------------------------------------
    # Run Models
    # -----------------------------------------------------------------------

    iso_labels, iso_scores, iso_time = (
        run_isolation_forest(
            X_scaled,
            random_state=random_state,
        )
    )

    lof_labels, lof_scores, lof_time = (
        run_local_outlier_factor(
            X_scaled,
        )
    )

    svm_labels, svm_scores, svm_time = (
        run_sgd_one_class_svm(
            X_scaled,
            nu=SVM_NU,
            random_state=random_state,
        )
    )

    # -----------------------------------------------------------------------
    # Convert Labels to Boolean Masks
    # -----------------------------------------------------------------------

    iso_mask = (
        iso_labels == -1
    )

    lof_mask = (
        lof_labels == -1
    )

    svm_mask = (
        svm_labels == -1
    )

    # -----------------------------------------------------------------------
    # Vote Count
    # -----------------------------------------------------------------------

    vote_counts = (
        iso_mask.astype(np.int8)
        + lof_mask.astype(np.int8)
        + svm_mask.astype(np.int8)
    )

    # At least two models agree
    consensus_mask = (
        vote_counts >= 2
    )

    consensus_indices = (
        df.index[consensus_mask].tolist()
    )

    # -----------------------------------------------------------------------
    # Individual Model Counts
    # -----------------------------------------------------------------------

    iso_count = int(
        iso_mask.sum()
    )

    lof_count = int(
        lof_mask.sum()
    )

    svm_count = int(
        svm_mask.sum()
    )

    consensus_count = int(
        consensus_mask.sum()
    )

    # -----------------------------------------------------------------------
    # Pairwise Agreement
    # -----------------------------------------------------------------------

    if_lof_mask = (
        iso_mask & lof_mask
    )

    if_svm_mask = (
        iso_mask & svm_mask
    )

    lof_svm_mask = (
        lof_mask & svm_mask
    )

    pairwise_agreement = {

        "isolation_forest_lof": {
            "records": int(
                if_lof_mask.sum()
            ),
            "percentage_of_dataset": _percentage(
                int(if_lof_mask.sum()),
                n_rows,
            ),
        },

        "isolation_forest_svm": {
            "records": int(
                if_svm_mask.sum()
            ),
            "percentage_of_dataset": _percentage(
                int(if_svm_mask.sum()),
                n_rows,
            ),
        },

        "lof_svm": {
            "records": int(
                lof_svm_mask.sum()
            ),
            "percentage_of_dataset": _percentage(
                int(lof_svm_mask.sum()),
                n_rows,
            ),
        },

        "all_three_models": {
            "records": int(
                (
                    iso_mask
                    & lof_mask
                    & svm_mask
                ).sum()
            ),
            "percentage_of_dataset": _percentage(
                int(
                    (
                        iso_mask
                        & lof_mask
                        & svm_mask
                    ).sum()
                ),
                n_rows,
            ),
        },
    }

    # -----------------------------------------------------------------------
    # Model Comparison
    # -----------------------------------------------------------------------

    model_comparison = [

        {
            "model": "Isolation Forest",
            "anomalies": iso_count,
            "anomaly_pct": _percentage(
                iso_count,
                n_rows,
            ),
            "execution_time_sec": iso_time,
            "rows_analysed": n_rows,
            "threshold_method": "auto",
        },

        {
            "model": "Local Outlier Factor",
            "anomalies": lof_count,
            "anomaly_pct": _percentage(
                lof_count,
                n_rows,
            ),
            "execution_time_sec": lof_time,
            "rows_analysed": n_rows,
            "threshold_method": "auto",
        },

        {
            "model": "One-Class SVM",
            "anomalies": svm_count,
            "anomaly_pct": _percentage(
                svm_count,
                n_rows,
            ),
            "execution_time_sec": svm_time,
            "rows_analysed": n_rows,
            "threshold_method": f"nu={SVM_NU}",
        },
    ]

    # -----------------------------------------------------------------------
    # Collect Records Flagged by At Least One Model
    # -----------------------------------------------------------------------

    any_flag_mask = (
        vote_counts >= 1
    )

    all_flag_indices = (
        df.index[any_flag_mask].tolist()
    )

    # Put consensus records first
    consensus_set = set(
        consensus_indices
    )

    sorted_indices = (
        list(consensus_indices)
        + [
            index
            for index in all_flag_indices
            if index not in consensus_set
        ]
    )

    # Maximum 200 records for frontend
    sorted_indices = sorted_indices[:200]

    # -----------------------------------------------------------------------
    # Index Mapping
    # -----------------------------------------------------------------------

    index_to_position = {
        index: position
        for position, index
        in enumerate(df.index)
    }

    model_names = [
        "Isolation Forest",
        "Local Outlier Factor",
        "One-Class SVM",
    ]

    model_masks = [
        iso_mask,
        lof_mask,
        svm_mask,
    ]

    model_scores = [
        iso_scores,
        lof_scores,
        svm_scores,
    ]

    # -----------------------------------------------------------------------
    # Build Anomaly Records
    # -----------------------------------------------------------------------

    anomaly_records: List[dict] = []

    for index in sorted_indices:

        position = index_to_position[index]

        flagging_models = [
            name
            for name, mask
            in zip(
                model_names,
                model_masks,
            )
            if mask[position]
        ]

        row_dict: Dict[str, Any] = {}

        for key, value in (
            df.loc[index].to_dict().items()
        ):

            if hasattr(
                value,
                "isoformat",
            ):
                row_dict[key] = (
                    value.isoformat()
                )

            elif isinstance(
                value,
                np.generic,
            ):
                row_dict[key] = (
                    value.item()
                )

            else:
                row_dict[key] = value

        # Model information
        row_dict["anomaly_index"] = int(
            index
        )

        row_dict["model_vote_count"] = int(
            vote_counts[position]
        )

        row_dict["models_flagged"] = (
            flagging_models
        )

        # Individual model scores
        row_dict[
            "isolation_forest_score"
        ] = _safe_float(
            iso_scores[position]
        )

        row_dict[
            "lof_score"
        ] = _safe_float(
            lof_scores[position]
        )

        row_dict[
            "one_class_svm_score"
        ] = _safe_float(
            svm_scores[position]
        )

        anomaly_records.append(
            row_dict
        )

    # -----------------------------------------------------------------------
    # Vote Distribution
    # -----------------------------------------------------------------------

    vote_distribution = {

        "one_model": int(
            (vote_counts == 1).sum()
        ),

        "two_models": int(
            (vote_counts == 2).sum()
        ),

        "three_models": int(
            (vote_counts == 3).sum()
        ),
    }

    # -----------------------------------------------------------------------
    # Logging
    # -----------------------------------------------------------------------

    logger.info(
        "Isolation Forest: %d anomalies (%.2f%%).",
        iso_count,
        _percentage(
            iso_count,
            n_rows,
        ),
    )

    logger.info(
        "LOF: %d anomalies (%.2f%%).",
        lof_count,
        _percentage(
            lof_count,
            n_rows,
        ),
    )

    logger.info(
        "One-Class SVM: %d anomalies (%.2f%%).",
        svm_count,
        _percentage(
            svm_count,
            n_rows,
        ),
    )

    logger.info(
        "Consensus >= 2/3: %d anomalies (%.2f%%).",
        consensus_count,
        _percentage(
            consensus_count,
            n_rows,
        ),
    )

    # -----------------------------------------------------------------------
    # Final Result
    # -----------------------------------------------------------------------

    return {

        # Basic information
        "features_used": feature_cols_used,
        "total_rows_analysed": n_rows,

        # Keep this field for compatibility
        # It now describes the SVM nu / previous configuration.
        "contamination_rate": contamination,

        # Individual model results
        "isolation_forest_anomalies": iso_count,
        "isolation_forest_pct": _percentage(
            iso_count,
            n_rows,
        ),

        "lof_anomalies": lof_count,
        "lof_pct": _percentage(
            lof_count,
            n_rows,
        ),

        "one_class_svm_anomalies": svm_count,
        "one_class_svm_pct": _percentage(
            svm_count,
            n_rows,
        ),

        # Comparison
        "model_comparison": model_comparison,

        # Agreement
        "pairwise_agreement": pairwise_agreement,

        "vote_distribution": vote_distribution,

        # Consensus
        "consensus_anomalies": consensus_count,

        "consensus_pct": _percentage(
            consensus_count,
            n_rows,
        ),

        "consensus_indices": consensus_indices,

        # Records
        "anomaly_records": anomaly_records,
    }