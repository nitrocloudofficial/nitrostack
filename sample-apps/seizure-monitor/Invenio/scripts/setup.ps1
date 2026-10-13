# ══════════════════════════════════════════════════
# Invenio — Dev Environment Setup (Windows PowerShell)
# ══════════════════════════════════════════════════

Write-Host "🔬 Setting up Invenio development environment..." -ForegroundColor Cyan

# ── Frontend ──────────────────────────────────────
Write-Host "
📦 Installing frontend dependencies..." -ForegroundColor Yellow
Set-Location frontend
npm install --legacy-peer-deps
Set-Location ..

# ── Backend ───────────────────────────────────────
Write-Host "
🐍 Setting up Python virtual environment..." -ForegroundColor Yellow
Set-Location backend
python -m venv .venv
.\.venv\Scripts\pip install --upgrade pip
.\.venv\Scripts\pip install -r requirements.txt
Set-Location ..

# ── Environment ────────────────────────────────────
if (-not (Test-Path .env)) {
  Write-Host "
📋 Creating .env from .env.example..." -ForegroundColor Yellow
  Copy-Item .env.example .env
  Write-Host "⚠️  Edit .env with your actual values before running services." -ForegroundColor Red
}

Write-Host "
✅ Setup complete!" -ForegroundColor Green
Write-Host "
Next steps:"
Write-Host "  Frontend: cd frontend; npm run dev"
Write-Host "  Backend:  cd backend; .\.venv\Scripts\activate; uvicorn app.main:app --reload"
