# Invenio — AI Research Operating System

> Connect scientific papers, datasets, repositories, patents, and natural phenomena to uncover research opportunities that traditional search cannot.

## Phase 1 — Architecture Foundation

This repository is the Phase 1 foundation of Project Invenio. It contains the complete architectural skeleton with no business logic, no AI, and no databases — only clean, documented structure ready for multiple developers to build on independently.

## Repository Structure

```
invenio/
├── .github/          — CI/CD workflows and PR templates
├── docs/             — Full project documentation
├── frontend/         — React + Vite + TypeScript application
├── backend/          — FastAPI Python backend
├── nitro/            — NitroStack AI agent workspace
├── shared/           — Cross-workspace types and constants
├── scripts/          — Dev environment bootstrap
└── tests/            — Integration test suites
```

## Quick Start

### Prerequisites

- Node.js 20+
- Python 3.11+
- Git

### Frontend Development

```bash
cd frontend
npm install
npm run dev
# → http://localhost:3000
```

### Backend Development

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate  # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload
# → http://localhost:8000
# Docs → http://localhost:8000/api/docs
```

### Full Stack (Phase 2+)

```bash
# Windows
scripts\setup.ps1

# Linux/Mac
bash scripts/setup.sh
```

## Documentation

| Document | Link |
|---|---|
| Vision | [docs/VISION.md](./docs/VISION.md) |
| Architecture | [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) |
| Development Phases | [docs/PHASES.md](./docs/PHASES.md) |
| AI Agents | [docs/AGENTS.md](./docs/AGENTS.md) |
| MCP Servers | [docs/MCP_SERVERS.md](./docs/MCP_SERVERS.md) |
| API Reference | [docs/API.md](./docs/API.md) |
| Coding Standards | [docs/CODING_STANDARDS.md](./docs/CODING_STANDARDS.md) |
| Changelog | [docs/CHANGELOG.md](./docs/CHANGELOG.md) |

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 5, TypeScript 5.5, TailwindCSS, shadcn/ui, Framer Motion |
| Backend | FastAPI, Python 3.11+, Pydantic v2 |
| Database | Supabase PostgreSQL |
| Graph | Neo4j |
| Cache | Redis |
| AI | NitroStack MCP |
| Testing | Vitest, Pytest |

## Contributing

1. Read [docs/CODING_STANDARDS.md](./docs/CODING_STANDARDS.md)
2. Check [docs/PHASES.md](./docs/PHASES.md) to understand the current phase
3. Create a branch: `feature/phase-2-your-feature`
4. Open a PR with the PR template

## Status

- **Phase 1** ✅ — Architecture Foundation (current)
- **Phase 2** 🔲 — Data Layer (planned)
- **Phase 3** 🔲 — Knowledge Graph (planned)
- **Phase 4** 🔲 — AI Agents (planned)

---

*Invenio — AI Research Operating System — v0.1.0*
