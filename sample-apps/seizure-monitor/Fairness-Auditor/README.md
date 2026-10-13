# AFO — Bias-Audit Multi-Agent System

AFO is a multi-agent system for automated bias auditing of AI-powered services.

## Services

| Service         | Port | URL                      |
|-----------------|------|--------------------------|
| target-service  | 3002 | http://localhost:3002    |
| orchestrator    | 8000 | http://localhost:8000    |

> ⚠️ **Ports are locked for the day.** Do **not** change without updating this table and notifying the team.

## Architecture

- **target-service** — TypeScript / Nitro HTTP API. The system under test that the orchestrator audits.
- **orchestrator** — Python / LangGraph / FastMCP multi-agent pipeline. Runs bias-detection scans, applies mitigations, enforces CI gates.
- **Postgres 16** (port 5432) — Shared relational store (scan runs, findings, policies, CI results).
- **Redis 7** (port 6379) — Shared cache / message broker.

## Quick Start

### 1. Start infrastructure
```bash
docker compose up -d
```

### 2. Start target-service
```bash
cd target-service
npm install
npm run dev   # runs on :3002
```

### 3. Start orchestrator
```bash
cd orchestrator
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --port 8000
```

## Environment Variables

Copy `orchestrator/.env` and fill in the real `GROQ_API_KEY` — **never commit real keys**.

## Database Schema

Schema is at [`orchestrator/db/schema.sql`](orchestrator/db/schema.sql).  
To re-apply: `docker exec -i afo-postgres psql -U postgres -d afo < orchestrator/db/schema.sql`
