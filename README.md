# 🤖 AI-Powered Data Quality & Anomaly Detection System

An enterprise-grade, full-stack platform for **automated dataset validation, intelligent data cleaning, statistical outlier detection, ML-based anomaly detection, AI-driven root cause explanations, and professional report generation** — all accessible through a modern React dashboard.

---

## 🏗️ Architecture Overview

```text
AI_Powered_Model/
│
├── src/                             # React Frontend (Vite + React 18 + Recharts + Lucide)
│   ├── components/                  # Reusable UI Components
│   │   ├── Navbar.jsx               # Top navigation bar
│   │   ├── Sidebar.jsx              # Side navigation panel
│   │   ├── MetricCard.jsx           # KPI metric display cards
│   │   ├── DataTable.jsx            # Sortable/filterable data tables
│   │   ├── ChartCard.jsx            # Chart container wrapper
│   │   ├── UploadBox.jsx            # Drag-and-drop file uploader
│   │   ├── Loader.jsx               # Loading state spinner
│   │   └── SeverityBadge.jsx        # Severity level indicator
│   ├── charts/                      # Visualization Components (Recharts)
│   ├── pages/                       # Application Views
│   │   ├── Home.jsx                 # Landing / overview page
│   │   ├── Upload.jsx               # Dataset upload interface
│   │   ├── Dashboard.jsx            # Main analytics dashboard
│   │   ├── Validation.jsx           # Data validation results
│   │   ├── Anomaly.jsx              # ML anomaly detection results
│   │   ├── Quality.jsx              # Quality scoring breakdown
│   │   ├── AIExplanation.jsx        # AI root cause explanations
│   │   └── Reports.jsx              # Report download center
│   ├── services/                    # Axios API Integrations
│   │   ├── api.js                   # Base Axios instance
│   │   ├── uploadApi.js             # Dataset upload endpoints
│   │   └── reportApi.js             # Report generation endpoints
│   ├── context/                     # React Context providers
│   ├── hooks/                       # Custom React hooks
│   ├── utils/                       # Utility functions
│   ├── App.jsx                      # Root app with React Router
│   └── main.jsx                     # Vite entry point
│
├── server/                          # Node.js / Express Backend API
│   ├── config/
│   │   ├── db.js                    # MongoDB connection (Mongoose)
│   │   └── multer.js                # Multer file storage config
│   ├── controllers/                 # Request handler logic
│   ├── routes/                      # API route definitions
│   │   ├── uploadRoutes.js          # POST /api/upload
│   │   ├── validationRoutes.js      # GET /api/validation
│   │   ├── reportRoutes.js          # GET /api/reports
│   │   └── dashboardRoutes.js       # GET /api/dashboard
│   ├── middleware/                  # Error handling & validation
│   ├── models/                      # Mongoose schemas (Dataset, Report, Anomaly)
│   ├── services/
│   │   ├── pythonService.js         # Python ML pipeline bridge
│   │   └── reportService.js         # Report generation service
│   ├── utils/                       # Server utility helpers
│   ├── app.js                       # Express app setup & middleware
│   └── server.js                    # HTTP server & DB initializer
│
├── ml_engine/                       # Python AI/ML Pipeline
│   ├── main.py                      # CLI pipeline orchestrator (entry point)
│   ├── config.py                    # Central constants, thresholds & paths
│   ├── cleaning.py                  # Date parsing, price normalisation, imputation
│   ├── validation.py                # 6 validation checks (nulls, schema, dtype, dates, payments, regex)
│   ├── rules.py                     # 5 business rules engine (negative qty/price, duplicate IDs)
│   ├── statistics.py                # Descriptive stats, Z-score & IQR outlier detection
│   ├── anomaly.py                   # IsolationForest + LOF consensus anomaly detection
│   ├── scoring.py                   # Quality scoring (Completeness 40% + Uniqueness 30% + Validity 30%)
│   ├── reports.py                   # Excel (6-sheet) + JSON report generation
│   ├── dashboard_charts.py          # Chart data generation for frontend
│   ├── data/                        # E-commerce transaction benchmark dataset
│   ├── models/                      # Trained model store
│   ├── notebooks/                   # Jupyter demo notebooks (per module)
│   └── requirements.txt             # Python ML dependencies
│
├── uploads/                         # Runtime uploaded datasets (auto-created)
├── reports/                         # Generated PDF/Excel/JSON reports (auto-created)
├── docs/                            # Architecture specs & PRDs
├── public/                          # Static frontend assets
├── dist/                            # Vite production build output
├── docker-compose.yml               # Multi-container Docker deployment
├── vite.config.js                   # Vite build configuration
└── package.json                     # Root frontend dependencies
```

---

## ✨ Feature Highlights

| Module | Feature | Description |
|--------|---------|-------------|
| 🧹 **Cleaning** | Data Standardisation | Date parsing, price normalisation, categorical standardisation, median imputation |
| ✅ **Validation** | 6 Checks | Null detection, schema validation, dtype profiling, date format checks, payment method validation, regex patterns |
| 📐 **Business Rules** | 5 Domain Rules | Negative quantity/price detection, duplicate order IDs, missing required fields |
| 📊 **Statistics** | Outlier Analysis | Descriptive stats, Z-score (threshold: 3.0) & IQR outlier detection, Pearson correlation matrix |
| 🤖 **Anomaly Detection** | ML Models | Isolation Forest + LOF consensus — reduces false positives; flags up to 200 anomaly records |
| 🏆 **Quality Scoring** | Weighted Score | Dataset Score (0–100): Completeness (40%) + Uniqueness (30%) + Validity (30%) + Anomaly Penalty |
| 📄 **Reports** | Multi-format Output | Formatted Excel (6 sheets) + structured JSON with pipeline timing |
| 💬 **AI Explanation** | Root Cause Narratives | LLM-powered summary narratives for anomalies and quality issues |

---

## 🚀 Quick Start Guide

### Prerequisites

| Tool | Version |
|------|---------|
| Node.js | v18+ |
| Python | v3.9+ |
| MongoDB | v6.0+ (or Docker Desktop) |

---

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/AI_Powered_Model.git
cd AI_Powered_Model
```

---

### 2. Frontend Setup (React + Vite)

```bash
# Install dependencies from root
npm install

# Start the dev server (http://localhost:5173)
npm run dev
```

---

### 3. Backend Server Setup (Node.js + Express)

```bash
cd server
npm install

# Create .env file
echo "PORT=5000" >> .env
echo "MONGO_URI=mongodb://localhost:27017/ai_powered_model" >> .env
echo "NODE_ENV=development" >> .env

# Start the server (http://localhost:5000)
npm run dev
```

---

### 4. ML Engine Setup (Python)

```bash
cd ml_engine

# Create and activate virtual environment
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS / Linux
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run the full ML pipeline
python main.py
```

**Expected output:**
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
============================================================
```

---

### 5. Explore Notebooks (Optional)

```bash
cd ml_engine
jupyter notebook notebooks/
```

Each notebook demonstrates a single pipeline module and links to the previous/next step.

---

## 🐳 Docker Deployment

Spin up MongoDB + Express server + React client in one command:

```bash
docker-compose up --build -d
```

| Service | Port | URL |
|---------|------|-----|
| React Client | 3000 | http://localhost:3000 |
| Express Server | 5000 | http://localhost:5000 |
| MongoDB | 27017 | mongodb://localhost:27017 |

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/upload` | Upload a CSV dataset |
| `GET` | `/api/dashboard` | Fetch dashboard summary metrics |
| `GET` | `/api/validation` | Retrieve validation results |
| `GET` | `/api/reports` | Download generated reports |

---

## 📊 Report Structure

### Excel Report (`audit_report_<timestamp>.xlsx`) — 6 Sheets

| Sheet | Contents |
|-------|----------|
| `Cleaned_Data` | Processed dataset (up to 10,000 rows) |
| `Validation` | Check name, rule, count, percentage, severity |
| `Business_Rules` | Rule, count, %, severity, sample indices (max 10) |
| `Anomalies` | IsolationForest / LOF / Consensus model comparison |
| `Quality_Scores` | Dataset score, column completeness, record stats |
| `Statistics` | Mean, median, std, skewness, kurtosis per numeric column |

> **Formatting**: Bold navy headers, auto-fit columns, frozen first row on every sheet.

### JSON Report (`pipeline_report_<timestamp>.json`)

```json
{
  "timestamp": "2026-08-10T17:00:00",
  "pipeline_execution_summary": {
    "total_stages": 8,
    "total_time_sec": 9.35,
    "status": "success"
  },
  "quality_scores": {
    "dataset": {
      "dataset_score": 92.89,
      "completeness_score": 83.33,
      "uniqueness_score": 99.0,
      "validity_score": 99.53,
      "anomaly_penalty": 5.0
    }
  }
}
```

---

## ⚙️ Configuration

All ML pipeline constants live in [`ml_engine/config.py`](ml_engine/config.py):

```python
DATA_PATH             = "data/dataset_ecommerce_transactions_data.csv"
REPORTS_DIR           = "reports/"
ANOMALY_CONTAMINATION = 0.05    # Expected anomaly rate (5%)
LOF_N_NEIGHBORS       = 20
ZSCORE_THRESHOLD      = 3.0
IQR_FACTOR            = 1.5     # Tukey fence multiplier
```

Override at runtime:
```bash
DATA_PATH=my_data.csv REPORTS_DIR=./output python main.py
```

---

## 🛠️ Tech Stack

### Frontend
| Package | Version | Purpose |
|---------|---------|---------|
| `react` | ^18.2 | UI framework |
| `react-router-dom` | ^6.18 | Client-side routing |
| `recharts` | ^2.9 | Data visualisations |
| `lucide-react` | ^0.292 | Icon library |
| `axios` | ^1.6 | HTTP client |
| `vite` | ^5.4 | Build tool & dev server |

### Backend
| Package | Version | Purpose |
|---------|---------|---------|
| `express` | ^4.18 | HTTP server framework |
| `mongoose` | ^7.5 | MongoDB ODM |
| `multer` | ^1.4.5 | File upload handling |
| `pdfkit` | ^0.13 | PDF generation |
| `xlsx` | ^0.18 | Excel file handling |

### ML Engine
| Package | Version | Purpose |
|---------|---------|---------|
| `pandas` | ≥ 2.0 | DataFrame operations |
| `scikit-learn` | ≥ 1.3 | IsolationForest, LOF, StandardScaler |
| `scipy` | ≥ 1.10 | Z-score computation |
| `openpyxl` | ≥ 3.1 | Excel generation & formatting |
| `reportlab` | ≥ 4.0 | PDF report generation |
| `python-pptx` | ≥ 0.6 | PowerPoint report generation |
| `plotly` | latest | Interactive chart generation |

---

## 🗺️ Application Pages

| Route | Page | Description |
|-------|------|-------------|
| `/` | Home | Landing page with project overview |
| `/upload` | Upload | Drag-and-drop CSV dataset uploader |
| `/dashboard` | Dashboard | Key metrics, charts, and pipeline summary |
| `/validation` | Validation | Detailed validation check results |
| `/anomaly` | Anomaly | ML anomaly detection results & flagged records |
| `/quality` | Quality | Quality score breakdown by dimension |
| `/ai-explanation` | AI Explanation | LLM-generated root cause narratives |
| `/reports` | Reports | Download Excel, JSON, and PDF reports |

---

## 📁 Environment Variables

Create a `.env` file inside the `server/` directory:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/ai_powered_model
NODE_ENV=development
```

---

## 👤 Author

Built as a **Machine Learning Engineer** portfolio project.

**Skills demonstrated:**
- Full-stack development (React + Node.js + Python)
- Modular Python ML pipeline design (8 independent modules + orchestrator)
- Unsupervised anomaly detection (IsolationForest + LOF consensus)
- Statistical analysis (Z-score, IQR, Pearson correlation)
- REST API design with Express + Mongoose
- Multi-format professional report generation (Excel, JSON, PDF, PPT)
- Docker multi-container deployment

---

## 📄 License

MIT License — free to use, modify, and distribute.
