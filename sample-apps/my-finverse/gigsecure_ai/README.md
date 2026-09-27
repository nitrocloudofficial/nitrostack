# GigSecure AI - Enterprise AI-Powered Fintech Platform

> **Solves India's Informal Economy Financial Vulnerabilities**
> 1. AI Cash-Flow Credit Underwriting (Replaces CIBIL requirement for Gig Workers)
> 2. SHA-256 Multi-Bank Invoice Fingerprinting & Duplicate Financing Fraud Shield
> 3. Smart-Pause Dynamic Daily UPI AutoPay Micro-Loans
> 4. Automated Nominee Succession & Account Aggregator Asset Rescue

---

## 🛠️ Architecture & Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Recharts, Lucide Icons, Glassmorphism UI
- **Backend**: FastAPI (Python), SQLAlchemy, Pydantic v2, PyJWT, Passlib (bcrypt), Uvicorn
- **ML / AI**: Scikit-Learn / XGBoost Machine Learning Underwriting Engine (5,200+ trained samples)
- **Security**: SHA-256 Invoice Hashing, Multi-Bank Central Ledger, JWT Authentication, Role-Based Access Control
- **Database**: PostgreSQL (Production) / SQLite (Local Zero-Config Run)
- **Deployment**: Docker, Docker Compose, NGINX

---

## 🚀 How to Run Locally

### Option 1: Fast Python Run (Local)
1. Install Python dependencies:
   ```bash
   pip install -r backend/requirements.txt
   ```
2. Train/Verify ML Underwriting Model:
   ```bash
   python ml/train_model.py
   ```
3. Launch FastAPI Backend Server:
   ```bash
   uvicorn backend.main:app --reload --port 8000
   ```
4. Access API Docs & Interactive Swagger:
   - **Swagger UI**: `http://localhost:8000/docs`
   - **ReDoc**: `http://localhost:8000/redoc`

### Option 2: Run via Docker Compose (Enterprise Full-Stack)
```bash
docker-compose up --build
```
- **Frontend App**: `http://localhost`
- **Backend API**: `http://localhost:8000`

---

## 🧪 Running Automated Tests
```bash
pytest backend/tests/
```
