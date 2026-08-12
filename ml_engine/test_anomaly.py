"""
Test script: verify three-model anomaly detection works correctly.
Run with: uv run --directory ml_engine python test_anomaly.py
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

import pandas as pd
import numpy as np

np.random.seed(42)
n = 300
df = pd.DataFrame({
    "Quantity": list(np.random.randint(1, 20, n - 5)) + [999, 888, 777, 1000, 500],
    "Price": list(np.random.uniform(5, 500, n - 5)) + [99999.0, 88888.0, 0.001, 0.0001, 77777.0],
})

print("Testing anomaly module with {} rows...".format(len(df)))

from anomaly import run_ml_anomalies

result = run_ml_anomalies(df)

print()
print("=== MODEL COMPARISON ===")
for mc in result["model_comparison"]:
    print("  {:25s}: {:5d} anomalies  {:5.2f}%  {}s".format(
        mc["model"], mc["anomalies"], mc["anomaly_pct"], mc["execution_time_sec"]
    ))

print()
print("isolation_forest_anomalies  : {}".format(result["isolation_forest_anomalies"]))
print("lof_anomalies               : {}".format(result["lof_anomalies"]))
print("one_class_svm_anomalies     : {}".format(result["one_class_svm_anomalies"]))
print("consensus_anomalies         : {}".format(result["consensus_anomalies"]))
print("consensus_pct               : {}".format(result["consensus_pct"]))
print("features_used               : {}".format(result["features_used"]))
print("anomaly_records count       : {}".format(len(result["anomaly_records"])))

if result["anomaly_records"]:
    r = result["anomaly_records"][0]
    print("First record models_flagged : {}".format(r["models_flagged"]))
    print("First record vote_count     : {}".format(r["model_vote_count"]))

print()
# Assertions
assert "one_class_svm_anomalies" in result, "MISSING: one_class_svm_anomalies"
assert len(result["model_comparison"]) == 3, "model_comparison has {} items, expected 3".format(
    len(result["model_comparison"])
)
assert result["features_used"] == ["Quantity", "Price"], "Wrong features: {}".format(
    result["features_used"]
)

# Verify NO DBSCAN — check model names
model_names = [m["model"] for m in result["model_comparison"]]
assert "DBSCAN" not in str(model_names), "DBSCAN found in model names!"
assert "Isolation Forest" in model_names, "Isolation Forest missing!"
assert "Local Outlier Factor" in model_names, "LOF missing!"
assert "One-Class SVM" in model_names, "One-Class SVM missing!"

print("ALL ASSERTIONS PASSED")
print()
print("Models confirmed: {}".format(model_names))
print("NO DBSCAN: confirmed")
