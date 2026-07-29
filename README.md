# AI-Powered Data Quality & Anomaly Detection System

An enterprise-grade platform for automated dataset validation, cleaning, statistical anomaly detection, business rules engine, machine learning diagnostics (Isolation Forest, LOF, DBSCAN), AI-driven root cause explanations, and PDF/PPT/Excel summary reporting.

---

## 🏗️ Project Architecture Overview

```text
AI_Powered_Model/
│
├── client/                          # React Frontend (Vite + CSS + Recharts + Lucide)
│   ├── public/
│   ├── src/
│   │   ├── components/              # Reusable UI Components (Navbar, Sidebar, MetricCard, DataTable, etc.)
│   │   ├── charts/                  # Visualizations (QualityChart, OutlierChart, MissingChart, CategoryChart)
│   │   ├── pages/                   # View Pages (Home, Upload, Dashboard, Validation, Anomaly, Quality, AIExplanation, Reports)
│   │   ├── services/                # Axios API Integrations (api.js, uploadApi.js, reportApi.js)
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
│
├── server/                          # Node.js / Express Backend API
│   ├── config/                      # DB (db.js) & Multer Storage (multer.js)
│   ├── controllers/                 # Controllers (upload, validation, report, dashboard)
│   ├── routes/                      # API Endpoints (uploadRoutes, validationRoutes, reportRoutes, dashboardRoutes)
│   ├── middleware/                  # Error Handling & Validation Middleware
│   ├── models/                      # Mongoose Models (User, Dataset, Report, Anomaly)
│   ├── services/                    # Python Bridge (pythonService.js) & Report Engine (reportService.js)
│   ├── app.js                       # Express Application Setup
│   ├── server.js                    # HTTP Server & DB Connection Initializer
│   └── package.json
│
├── ml_engine/                       # Python AI/ML Pipeline & Notebooks
│   ├── validation.ipynb             # Nulls, duplicates, data types, date formats, pattern regex
│   ├── cleaning.ipynb               # Imputation, date repair, standardisation, price parsing
│   ├── rules.ipynb                  # Business rules engine (negative qty/price, duplicate IDs)
│   ├── statistics.ipynb             # Outlier detection (Z-Score & Interquartile Range)
│   ├── anomaly.ipynb                # ML Models (Isolation Forest, LOF, DBSCAN)
│   ├── scoring.ipynb                # Quality scoring (Dataset Score, Record Score, Completeness Index)
│   ├── ai_explanation.ipynb         # LLM/GPT Summary narrative generation
│   ├── reports.ipynb                # Automated PDF, Excel, and PPT generation
│   ├── run_pipeline.ipynb           # Master pipeline orchestrator notebook
│   ├── data/                        # E-commerce transaction benchmark dataset
│   ├── models/                      # Trained model store
│   └── requirements.txt             # Python ML dependencies
│
├── uploads/                         # Runtime uploaded datasets
├── reports/                         # Generated downloadable PDF/PPT/Excel reports
├── docs/                            # Architectural specification PDFs & PRDs
├── docker-compose.yml               # Multi-container containerization
└── README.md
```

---

## ⚡ Quick Start Guide

### Prerequisites
- Node.js (v18+)
- Python (v3.9+)
- MongoDB (v6.0+) or Docker Desktop

### 1. Backend Server Setup
```bash
cd server
npm install
npm run dev
```

### 2. Frontend React Client Setup
```bash
cd client
npm install
npm run dev
```

### 3. ML Engine Setup
```bash
cd ml_engine
pip install -r requirements.txt
python -m jupyter nbconvert --execute run_pipeline.ipynb
```

---

## 🐳 Docker Deployment

```bash
docker-compose up --build -d
```
