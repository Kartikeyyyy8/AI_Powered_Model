"""
Inspect the generated JSON report to verify anomaly_summary structure.
"""
import json
import glob
import os

reports_dir = os.path.join(os.path.dirname(__file__), "reports")
reports = sorted(
    glob.glob(os.path.join(reports_dir, "pipeline_report_*.json")),
    key=os.path.getmtime,
    reverse=True,
)

if not reports:
    print("ERROR: No pipeline_report_*.json found in", reports_dir)
    exit(1)

latest = reports[0]
print("Report:", latest)
print()

with open(latest, "r", encoding="utf-8") as fh:
    report = json.load(fh)

anomaly_summary = report.get("anomaly_summary", {})
print("=== anomaly_summary keys ===")
for k, v in anomaly_summary.items():
    if k not in ("anomaly_records", "consensus_indices"):
        print(f"  {k:35s}: {v}")

print()
print("=== model_comparison ===")
mc = anomaly_summary.get("model_comparison", [])
if not mc:
    print("  ERROR: model_comparison is MISSING or empty!")
else:
    for m in mc:
        print("  Model        :", m["model"])
        print("  Anomalies    :", m["anomalies"])
        print("  Anomaly Pct  :", m["anomaly_pct"])
        print("  Exec Time    :", m["execution_time_sec"], "s")
        print("  Rows         :", m["rows_analysed"])
        print()

print("one_class_svm_anomalies in summary:", "one_class_svm_anomalies" in anomaly_summary)
print("model_comparison count            :", len(mc))
print("anomaly_records count             :", len(anomaly_summary.get("anomaly_records", [])))
