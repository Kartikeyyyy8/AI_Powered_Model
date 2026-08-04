# 🔍 AI-Powered ML Data Quality Engine

An end-to-end, modular **Machine Learning Data Quality Pipeline** built with Python and scikit-learn.  
Detects data quality issues, enforces business rules, runs ML-based anomaly detection, scores your dataset, and generates professional audit reports — all in a single command.

---

## ✨ Features at a Glance

| Feature | Description |
|---------|-------------|
| **Data Cleaning** | Date parsing, price normalisation, categorical standardisation |
| **Validation** | 6 checks including nulls, schema, dtype profile, dates, payments, regex |
| **Business Rules** | 5 domain-specific rules with count, percentage, and sample indices |
| **Statistical Analysis** | Descriptive stats, Z-score/IQR outlier detection, correlation matrix |
| **ML Anomaly Detection** | Isolation Forest + LOF consensus — reduces false positives |
| **Quality Scoring** | Completeness (40%) + Uniqueness (30%) + Validity (30%) with rules quality score |
| **Reports** | Formatted Excel (6 sheets) + structured JSON with pipeline timing |

---

## 🏗️ Architecture

```
                    ┌─────────────────────────────┐
                    │       main.py (CLI)         │
                    │   python main.py             │
                    └──────────────┬──────────────┘
                                   │
          ┌────────────────────────▼────────────────────────┐
          │              run_pipeline()                       │
          │                                                   │
          │  1. Load CSV   ──►  cleaning.py                  │
          │  2. Cleaning   ──►  clean_dates, parse_prices    │
          │  3. Validation ──►  validation.py (6 checks)     │
          │  4. Rules      ──►  rules.py (5 rules + score)   │
          │  5. Statistics ──►  statistics.py (stats+IQR)    │
          │  6. Anomaly    ──►  anomaly.py (IsoForest+LOF)   │
          │  7. Scoring    ──►  scoring.py (0-100 score)     │
          │  8. Reports    ──►  reports.py (Excel + JSON)    │
          └───────────────────────────────────────────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │         reports/             │
                    │  audit_report_<ts>.xlsx      │
                    │  pipeline_report_<ts>.json   │
                    └─────────────────────────────┘
```

**Data Flow:**
```
CSV File → [Clean] → [Validate] → [Rules] → [Statistics]
                                     ↓             ↓
                               [Anomaly Detection]
                                     ↓
                               [Quality Score]
                                     ↓
                     [Excel Report] + [JSON Report]
```

---

## 🗂️ Project Structure

```
ml_engine/
│
├── data/
│   └── dataset_ecommerce_transactions_data.csv    ← Input dataset
│
├── reports/                                        ← Generated reports (auto-created)
│   ├── audit_report_<timestamp>.xlsx
│   └── pipeline_report_<timestamp>.json
│
├── notebooks/                                      ← Demo notebooks (import from .py)
│   ├── cleaning.ipynb
│   ├── validation.ipynb
│   ├── rules.ipynb
│   ├── statistics.ipynb
│   ├── anomaly.ipynb
│   ├── scoring.ipynb
│   ├── reports.ipynb
│   └── run_pipeline.ipynb
│
├── config.py         ← Central constants (paths, lookup tables, thresholds)
├── cleaning.py       ← Data cleaning & standardisation
├── validation.py     ← 6 validation checks + pass/fail summary
├── rules.py          ← 5 business rules + quality score
├── statistics.py     ← Descriptive stats, Z-score, IQR, correlation
├── anomaly.py        ← IsolationForest + LOF consensus anomaly detection
├── scoring.py        ← Completeness/Uniqueness/Validity weighted scoring
├── reports.py        ← Excel (formatted) + JSON report generation
├── main.py           ← Pipeline orchestrator (CLI entry point)
└── requirements.txt
```

---

## 🚀 Quick Start

### 1. Set up the environment

```bash
# Create a virtual environment
python -m venv .venv

# Activate it (Windows)
.venv\Scripts\activate

# Activate it (macOS / Linux)
source .venv/bin/activate
```

### 2. Install dependencies

```bash
cd ml_engine
pip install -r requirements.txt
```

### 3. Run the complete pipeline

```bash
python main.py
```

Expected output:
```
============================================================
  Starting AI-Powered Data Quality & Anomaly Detection Engine
============================================================
  Status        : SUCCESS
  Total Time    : 9.35s

  Stage                   Status          Time
  ----------------------  ----------  --------
  load                    [OK]           0.17s
  cleaning                [OK]           0.28s
  validation              [OK]           0.29s
  business_rules          [OK]           0.08s
  statistics              [OK]           0.19s
  anomaly_detection       [OK]           6.13s
  scoring                 [OK]           0.17s
  reports                 [OK]           2.10s

  Dataset Score       : 92.89
  Completeness        : 83.33
  Uniqueness          : 99.0
  Validity            : 99.53
  Rules Quality Score : 14.59
  Anomaly Penalty     : 5.0%

  Reports saved:
    [EXCEL] ...\reports\audit_report_<ts>.xlsx
    [JSON]  ...\reports\pipeline_report_<ts>.json
============================================================
```

### 4. Explore individual notebooks

```bash
jupyter notebook notebooks/
```

Each notebook demonstrates one module and is linked with the previous/next step in the pipeline.

---

## 🔧 Configuration

All constants live in [`config.py`](config.py) — edit this file to customise:

```python
# File paths (can also be overridden via environment variables)
DATA_PATH   = "data/dataset_ecommerce_transactions_data.csv"
REPORTS_DIR = "reports/"

# Anomaly detection
ANOMALY_CONTAMINATION = 0.05   # Expected anomaly rate (5%)
LOF_N_NEIGHBORS       = 20

# Outlier detection thresholds
ZSCORE_THRESHOLD = 3.0
IQR_FACTOR       = 1.5         # Tukey fence multiplier

# Domain lookups
KNOWN_CATEGORIES        = {"Laptop", "Smartphone", "Headphones", ...}
PAYMENT_METHOD_MAP      = {"paypal": "PayPal", "creditcard": "Credit Card", ...}
```

Override paths at runtime:
```bash
DATA_PATH=my_data.csv REPORTS_DIR=./output python main.py
```

---

## 📊 Report Examples

### Excel Report (`audit_report_<timestamp>.xlsx`)

| Sheet | Contents |
|-------|----------|
| `Cleaned_Data` | Processed dataset (up to 10,000 rows) |
| `Validation` | Check name, rule, count, **percentage**, severity |
| `Business_Rules` | Rule, count, %, severity, **sample_indices (max 10)** |
| `Anomalies` | IsoForest / LOF / Consensus model comparison |
| `Quality_Scores` | Dataset score, column completeness, record stats |
| `Statistics` | Mean, median, std, skewness, kurtosis per numeric column |

> **Excel formatting**: Bold navy headers, auto-fit columns, frozen first row on every sheet.

### JSON Report (`pipeline_report_<timestamp>.json`)

```json
{
  "timestamp": "2026-07-30T17:15:00",
  "pipeline_execution_summary": {
    "total_stages": 8,
    "total_time_sec": 9.35,
    "status": "success",
    "stages": {
      "cleaning": { "status": "success", "elapsed_sec": 0.28 },
      "anomaly_detection": { "status": "success", "elapsed_sec": 6.13 }
    }
  },
  "validation_summary": {
    "total_checks": 6,
    "passed_checks": 3,
    "failed_checks": 3,
    "pass_rate": 50.0
  },
  "business_rules_summary": {
    "total_violation_types": 6,
    "total_affected_records": 85298,
    "rules_quality_score": 14.59,
    "violations": [
      {
        "rule": "Negative values in 'Quantity'",
        "count": 31619,
        "percentage": 31.62,
        "severity": "High",
        "sample_indices": [2, 7, 14, 21, 35, 42, 58, 63, 77, 89]
      }
    ]
  },
  "quality_scores": {
    "dataset": {
      "dataset_score": 92.89,
      "completeness_score": 83.33,
      "uniqueness_score": 99.0,
      "validity_score": 99.53,
      "rules_quality_score": 14.59,
      "anomaly_penalty": 5.0
    }
  }
}
```

---

## 🧪 Module API Reference

### `cleaning.py`
```python
from cleaning import load_dataset, run_cleaning

df_raw   = load_dataset("data/transactions.csv")
df_clean = run_cleaning(df_raw, impute=False)   # impute=True fills numeric NaNs with median
```

### `validation.py`
```python
from validation import run_validation

result = run_validation(df_clean)
# result["summary"]["pass_rate"]      → 50.0
# result["summary"]["passed_checks"]  → 3
# result["violations"][0]["percentage"] → 5.02
```

### `rules.py`
```python
from rules import run_business_rules, compute_rules_quality_score, rules_summary

violations = run_business_rules(df_clean)
score      = compute_rules_quality_score(violations, total_rows=len(df_clean))
summary    = rules_summary(violations, total_rows=len(df_clean))
# summary["rules_quality_score"]  → 14.59
# violations[0]["sample_indices"] → [2, 7, 14, 21, ...]  (max 10)
```

### `statistics.py`
```python
from statistics import run_statistics

report = run_statistics(df_clean)
# report["descriptive_stats"]  → per-column stats
# report["numeric_summary"]    → Z-score + IQR outliers
# report["correlation_matrix"] → Pearson correlation
```

### `anomaly.py`
```python
from anomaly import run_ml_anomalies

result = run_ml_anomalies(df_clean, contamination=0.05)
# result["consensus_anomalies"] → int
# result["consensus_pct"]       → float (%)
# result["anomaly_records"]     → list of flagged rows (up to 200)
```

### `scoring.py`
```python
from scoring import run_scoring

scores = run_scoring(df_clean, val_result=val, violations=v, anomaly_result=ar)
# scores["dataset"]["dataset_score"]       → 92.89
# scores["dataset"]["rules_quality_score"] → 14.59
# scores["dataset"]["anomaly_penalty"]     → 5.0
```

### `reports.py`
```python
from reports import run_reports

paths = run_reports(df_clean, violations=v, scores=s, val_result=vr,
                    anomaly_result=ar, stats_result=sr, results=pipeline_result)
# paths["exported"]["excel"] → "reports/audit_report_20260730.xlsx"
# paths["exported"]["json"]  → "reports/pipeline_report_20260730.json"
```

---

## 🛠️ Technologies

| Package | Version | Purpose |
|---------|---------|---------|
| `pandas` | ≥ 2.0 | DataFrame operations |
| `numpy` | ≥ 1.24 | Numerical computing |
| `scikit-learn` | ≥ 1.3 | IsolationForest, LocalOutlierFactor, StandardScaler |
| `scipy` | ≥ 1.10 | Z-score computation |
| `openpyxl` | ≥ 3.1 | Excel file generation + formatting |
| `jupyter` | ≥ 1.0 | Interactive notebook support |

---

## 🔮 Future Work

| Feature | Description |
|---------|-------------|
| **Data Drift Detection** | Compare current dataset stats against a baseline to detect distribution shifts |
| **Dashboard UI** | Interactive Streamlit or Dash dashboard for real-time quality monitoring |
| **Email Alerts** | Send report summaries via email when quality score drops below a threshold |
| **Database Support** | Load data directly from PostgreSQL / BigQuery instead of CSV |
| **ML Model Registry** | Save and version anomaly detection models with MLflow |
| **CI/CD Integration** | Run the pipeline on every data update via GitHub Actions |
| **Multi-Dataset Comparison** | Compare quality scores across multiple datasets or time periods |
| **Custom Rule DSL** | Allow non-technical users to define business rules via a YAML config |

---

## 👤 Author

Built as a **Fresher Machine Learning Engineer** portfolio project.

**Skills demonstrated:**
- Modular Python package design (8 independent modules + orchestrator)
- Data cleaning & validation pipelines
- Unsupervised ML anomaly detection (Isolation Forest + LOF)
- Statistical analysis (Z-score, IQR, correlation)
- Professional report generation (Excel + JSON)
- Clean code with type hints, docstrings, structured logging, and error isolation

---

## 📄 License

MIT License — free to use, modify, and distribute.
