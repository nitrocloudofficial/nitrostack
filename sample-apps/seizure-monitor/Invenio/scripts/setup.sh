#!/usr/bin/env bash
# ══════════════════════════════════════════════════
# Invenio — Dev Environment Setup (Linux/macOS)
# ══════════════════════════════════════════════════
set -euo pipefail

echo "🔬 Setting up Invenio development environment..."

# ── Frontend ──────────────────────────────────────
echo ""
echo "📦 Installing frontend dependencies..."
cd frontend && npm install --legacy-peer-deps && cd ..

# ── Backend ───────────────────────────────────────
echo ""
echo "🐍 Setting up Python virtual environment..."
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
deactivate
cd ..

# ── Environment ────────────────────────────────────
if [ ! -f .env ]; then
  echo ""
  echo "📋 Creating .env from .env.example..."
  cp .env.example .env
  echo "⚠️  Edit .env with your actual values before running services."
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "  Frontend: cd frontend && npm run dev"
echo "  Backend:  cd backend && source .venv/bin/activate && uvicorn app.main:app --reload"