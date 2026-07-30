"""
main.py
-------
ML Data Quality Engine — Pipeline Orchestrator

Executes the complete end-to-end data quality pipeline:

    Load Dataset
         ↓
    Cleaning
         ↓
    Validation
         ↓
    Business Rules
         ↓
    Statistics
         ↓
    Anomaly Detection
         ↓
    Quality Scoring
         ↓
    Generate Reports (Excel + JSON)

Usage
-----
    python main.py

The pipeline reads from ``config.DATA_PATH`` and saves reports to
``config.REPORTS_DIR``. Both paths can be overridden via environment
variables ``DATA_PATH`` and ``REPORTS_DIR``.
"""

import json
import logging
import os
import sys
import time
from datetime import datetime
from typing import Any, Optional, Tuple

import pandas as pd

from config import DATA_PATH, LOG_FORMAT, REPORTS_DIR

# ---------------------------------------------------------------------------
# Logging — configure once at the top level
# ---------------------------------------------------------------------------
logging.basicConfig(level=logging.INFO, format=LOG_FORMAT)
logger = logging.getLogger("ml_engine.main")


# ---------------------------------------------------------------------------
# Pipeline Helpers
# ---------------------------------------------------------------------------


def _run_stage(name: str, fn, *args, **kwargs) -> Tuple[Any, float, Optional[str]]:
    """
    Execute a pipeline stage with timing and per-stage error isolation.

    A failed stage logs the error and returns ``None`` for the result,
    so the pipeline can continue with the remaining stages.

    Parameters
    ----------
    name : str
        Human-readable stage label (used in logs and the summary).
    fn : callable
        The stage function to call.
    *args, **kwargs
        Arguments forwarded to ``fn``.

    Returns
    -------
    tuple[Any, float, str | None]
        ``(result, elapsed_seconds, error_message)``
    """
    logger.info("=== Stage: %s — starting ===", name)
    t0 = time.perf_counter()
    try:
        result = fn(*args, **kwargs)
        elapsed = round(time.perf_counter() - t0, 3)
        logger.info("=== Stage: %s — completed in %.2fs ===", name, elapsed)
        return result, elapsed, None
    except Exception as exc:
        elapsed = round(time.perf_counter() - t0, 3)
        logger.error("=== Stage: %s — FAILED in %.2fs: %s ===", name, elapsed, exc)
        return None, elapsed, str(exc)


# ---------------------------------------------------------------------------
# Main Pipeline
# ---------------------------------------------------------------------------


def run_pipeline(
    data_path: str = DATA_PATH,
    output_dir: str = REPORTS_DIR,
    generate_reports: bool = True,
) -> dict:
    """
    Execute the complete ML Data Quality Engine pipeline.

    Stages
    ------
    1. Load data from CSV
    2. Clean (dates, prices, categoricals)
    3. Validate (nulls, schema, dtypes, dates, payments, regex)
    4. Business rules (negatives, future dates, duplicates, categories)
    5. Statistical analysis (descriptive stats, outliers, correlation)
    6. ML anomaly detection (Isolation Forest + LOF consensus)
    7. Quality scoring (completeness, uniqueness, validity)
    8. Report generation (Excel + JSON)

    Parameters
    ----------
    data_path : str
        Path to the input CSV file.
    output_dir : str
        Directory where report files are saved.
    generate_reports : bool
        Set to ``False`` to skip report generation (useful for testing).

    Returns
    -------
    dict
        Full pipeline result with stage-by-stage outputs, timings, and errors.
    """
    # Import modules here to avoid circular imports at module level
    import cleaning
    import validation
    import rules
    import statistics as stats_module
    import anomaly
    import scoring
    import reports

    pipeline_start = datetime.now().isoformat()
    logger.info("Pipeline starting at %s", pipeline_start)

    result: dict = {
        "pipeline_start": pipeline_start,
        "data_path": data_path,
        "stages": {},
        "status": "running",
    }

    # ------------------------------------------------------------------
    # Stage 1 — Load
    # ------------------------------------------------------------------
    logger.info("Loading dataset from: %s", data_path)
    if not os.path.exists(data_path):
        msg = f"Dataset not found at: {data_path}"
        logger.error(msg)
        result["status"] = "error"
        result["error"] = msg
        return result

    t0 = time.perf_counter()
    df_raw = pd.read_csv(data_path)
    load_time = round(time.perf_counter() - t0, 3)
    logger.info("Loaded %d rows, %d columns in %.2fs.", *df_raw.shape, load_time)
    result["stages"]["load"] = {
        "rows": len(df_raw),
        "columns": len(df_raw.columns),
        "elapsed_sec": load_time,
        "error": None,
    }

    df_clean = df_raw  # fallback if cleaning fails

    # ------------------------------------------------------------------
    # Stage 2 — Cleaning
    # ------------------------------------------------------------------
    cleaned, elapsed, err = _run_stage(
        "cleaning", cleaning.run_cleaning, df_raw, impute=False
    )
    if cleaned is not None:
        df_clean = cleaned
    result["stages"]["cleaning"] = {
        "rows_out": len(df_clean),
        "elapsed_sec": elapsed,
        "error": err,
    }

    # ------------------------------------------------------------------
    # Stage 3 — Validation
    # ------------------------------------------------------------------
    val_result, elapsed, err = _run_stage(
        "validation", validation.run_validation, df_clean
    )
    val_result = val_result or {}
    result["stages"]["validation"] = {
        "summary": val_result.get("summary", {}),
        "total_violations": len(val_result.get("violations", [])),
        "elapsed_sec": elapsed,
        "error": err,
    }

    # ------------------------------------------------------------------
    # Stage 4 — Business Rules
    # ------------------------------------------------------------------
    violations, elapsed, err = _run_stage(
        "business_rules", rules.run_business_rules, df_clean
    )
    violations = violations or []
    result["stages"]["business_rules"] = {
        "violation_types": len(violations),
        "total_affected_records": sum(v.get("count", 0) for v in violations),
        "violations": violations,
        "elapsed_sec": elapsed,
        "error": err,
    }

    # ------------------------------------------------------------------
    # Stage 5 — Statistics
    # ------------------------------------------------------------------
    stats_result, elapsed, err = _run_stage(
        "statistics", stats_module.run_statistics, df_clean
    )
    stats_result = stats_result or {}
    result["stages"]["statistics"] = {
        "numeric_columns": len(stats_result.get("descriptive_stats", {})),
        "elapsed_sec": elapsed,
        "error": err,
    }

    # ------------------------------------------------------------------
    # Stage 6 — Anomaly Detection
    # ------------------------------------------------------------------
    anomaly_result, elapsed, err = _run_stage(
        "anomaly_detection", anomaly.run_ml_anomalies, df_clean
    )
    anomaly_result = anomaly_result or {}
    result["stages"]["anomaly_detection"] = {
        "consensus_anomalies": anomaly_result.get("consensus_anomalies", 0),
        "consensus_pct": anomaly_result.get("consensus_pct", 0.0),
        "elapsed_sec": elapsed,
        "error": err,
    }

    # ------------------------------------------------------------------
    # Stage 7 — Quality Scoring
    # ------------------------------------------------------------------
    scores, elapsed, err = _run_stage(
        "scoring",
        scoring.run_scoring,
        df_clean,
        val_result=val_result,
        violations=violations,
        anomaly_result=anomaly_result,
    )
    scores = scores or {}
    result["stages"]["scoring"] = {
        "dataset_score":       scores.get("dataset", {}).get("dataset_score", 0.0),
        "completeness_score":  scores.get("dataset", {}).get("completeness_score", 0.0),
        "uniqueness_score":    scores.get("dataset", {}).get("uniqueness_score", 0.0),
        "validity_score":      scores.get("dataset", {}).get("validity_score", 0.0),
        "rules_quality_score": scores.get("dataset", {}).get("rules_quality_score", 0.0),
        "anomaly_penalty":     scores.get("dataset", {}).get("anomaly_penalty", 0.0),
        "elapsed_sec":         elapsed,
        "error":               err,
    }

    # ------------------------------------------------------------------
    # Finalise — set status and ended BEFORE reports so the JSON snapshot
    # captures the correct values (result is passed by reference).
    # ------------------------------------------------------------------
    _any_stage_failed = any(
        info.get("error") is not None
        for info in result["stages"].values()
    )
    result["pipeline_end"] = datetime.now().isoformat()
    result["status"] = "failed" if _any_stage_failed else "completed"

    # ------------------------------------------------------------------
    # Stage 8 — Reports
    # ------------------------------------------------------------------
    if generate_reports:
        report_paths, elapsed, err = _run_stage(
            "reports",
            reports.run_reports,
            df_clean,
            violations=violations,
            scores=scores,
            val_result=val_result,
            anomaly_result=anomaly_result,
            stats_result=stats_result,
            results=result,
            output_dir=output_dir,
        )
        result["stages"]["reports"] = {
            "result": report_paths,
            "elapsed_sec": elapsed,
            "error": err,
        }
        # If the report stage itself failed, reflect that in the status
        if err:
            result["status"] = "failed"

    # Total elapsed time across all stages (recalculated after reports)
    total_time = sum(
        info.get("elapsed_sec", 0.0)
        for info in result["stages"].values()
    )
    result["total_pipeline_time_sec"] = round(total_time, 3)

    logger.info(
        "Pipeline complete in %.2fs. Status: %s.",
        total_time,
        result["status"],
    )
    return result


# ---------------------------------------------------------------------------
# CLI Entry Point
# ---------------------------------------------------------------------------


def _print_summary(pipeline_result: dict) -> None:
    """Print a human-readable pipeline summary to stdout."""
    total_time = pipeline_result.get("total_pipeline_time_sec", 0.0)

    print("\n" + "=" * 60)
    print("  ML DATA QUALITY ENGINE — PIPELINE SUMMARY")
    print("=" * 60)
    print(f"  Status        : {pipeline_result.get('status', 'unknown').upper()}")
    print(f"  Started       : {pipeline_result.get('pipeline_start', '')}")
    print(f"  Ended         : {pipeline_result.get('pipeline_end', '')}")
    print(f"  Total Time    : {total_time:.2f}s")
    print()
    print(f"  {'Stage':<22}  {'Status':<10}  {'Time':>8}")
    print(f"  {'-'*22}  {'-'*10}  {'-'*8}")

    for stage, info in pipeline_result.get("stages", {}).items():
        err = info.get("error")
        elapsed = info.get("elapsed_sec", 0)
        status_str = "[OK]  " if err is None else "[FAIL]"
        print(f"  {stage:<22}  {status_str:<10}  {elapsed:>7.2f}s")

    print()

    # Quality scores
    scoring_info = pipeline_result.get("stages", {}).get("scoring", {})
    print(f"  Dataset Score       : {scoring_info.get('dataset_score', 'N/A')}")
    print(f"  Completeness        : {scoring_info.get('completeness_score', 'N/A')}")
    print(f"  Uniqueness          : {scoring_info.get('uniqueness_score', 'N/A')}")
    print(f"  Validity            : {scoring_info.get('validity_score', 'N/A')}")
    print(f"  Rules Quality Score : {scoring_info.get('rules_quality_score', 'N/A')}")
    print(f"  Anomaly Penalty     : {scoring_info.get('anomaly_penalty', 'N/A')}%")

    # Report paths
    report_info = pipeline_result.get("stages", {}).get("reports", {})
    if report_info and report_info.get("result"):
        exported = report_info["result"].get("exported", {})
        print()
        print("  Reports saved:")
        for fmt, path in exported.items():
            print(f"    [{fmt.upper()}] {path}")

    print("=" * 60 + "\n")


if __name__ == "__main__":
    # Allow DATA_PATH and REPORTS_DIR to be overridden via environment variables
    data_path = os.environ.get("DATA_PATH", DATA_PATH)
    output_dir = os.environ.get("REPORTS_DIR", REPORTS_DIR)

    print("=" * 60)
    print("  Starting AI-Powered Data Quality & Anomaly Detection Engine")
    print("=" * 60)

    try:
        pipeline_result = run_pipeline(
            data_path=data_path,
            output_dir=output_dir,
            generate_reports=True,
        )
        _print_summary(pipeline_result)

        if pipeline_result.get("status") != "completed":
            sys.exit(1)

    except Exception as exc:
        logger.exception("Unexpected error in pipeline.")
        print(f"\n[FATAL] {exc}")
        sys.exit(1)
