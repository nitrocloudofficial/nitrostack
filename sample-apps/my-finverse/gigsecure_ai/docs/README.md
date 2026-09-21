# GigSecure AI - Complete Enterprise FinTech Platform

GigSecure AI solves three major financial problems for India's informal economy and gig workers:

1. **AI-Powered Cash-Flow Credit Underwriting**: Replaces traditional CIBIL requirement using XGBoost & GradientBoosting machine learning on daily earnings, expense ratios, ratings, and savings.
2. **Multi-Bank SHA-256 Duplicate Financing Prevention**: Central cryptographic ledger shared across 9 simulated banks (`State Bank of India`, `HDFC`, `ICICI`, `Axis`, etc.) rejecting duplicate invoice submissions with `HTTP 400 Duplicate Financing Detected`.
3. **Automated Succession & Nominee Asset Rescue**: RBI Account Aggregator discovery across 10 asset categories (Bank accounts, LIC policies, EPFO, Mutual Funds, SGBs, Digital Wallets) coupled with Civil Death Registry lookup and automated multi-institution claim generation.

---

## ⚡ Quick Start Instructions

### 1. Run with Docker Compose
```bash
docker-compose up --build
```
- **Frontend Dashboard**: http://localhost
- **FastAPI OpenAPI Swagger Docs**: http://localhost:8000/docs

### 2. Run Locally Without Docker

#### Backend & ML:
```bash
pip install -r backend/requirements.txt -r ml/requirements.txt
python ml/train_model.py
uvicorn backend.main:app --reload --port 8000
```

#### Frontend:
```bash
cd frontend
npm install
npm run dev
```
- Open http://localhost:5173
