#!/usr/bin/env bash
# Invenio — Start all development services
# Phase 2: Add nitro agent servers
echo "Starting Invenio development servers..."
trap 'kill %1 %2 2>/dev/null' EXIT

# Frontend (port 3000)
(cd frontend && npm run dev) &

# Backend (port 8000)
(cd backend && source .venv/bin/activate && uvicorn app.main:app --reload --port 8000) &

wait