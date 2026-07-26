# QuantumSolve AI

> **Optimization Intelligence Platform** — Describes any combinatorial optimization problem, researches solution strategies, assesses quantum advantage, and recommends whether classical, hybrid, or quantum computing is the right tool — powered by a live NitroStack MCP server.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Browser  (Next.js 16 · TypeScript · Tailwind · shadcn) │
│  /workspace  →  7-stage animated pipeline                │
└───────────────────────┬─────────────────────────────────┘
                        │  HTTP (fetch)
┌───────────────────────▼─────────────────────────────────┐
│  FastAPI Backend  (Python 3.10 · SQLModel · SQLite)      │
│  POST /analyze-problem  /research  /strategy             │
│  POST /generate-solution  /simulate  /benchmark  /report │
│  POST /run  (composite — all 7 stages in one call)       │
└───────────────────────┬─────────────────────────────────┘
                        │  Streamable HTTP (MCP protocol)
┌───────────────────────▼─────────────────────────────────┐
│  NitroStack MCP Server  (NitroCloud)                     │
│  research · quantum · optimization · benchmark           │
│  knowledge · report  (18 tools total)                    │
└─────────────────────────────────────────────────────────┘
```

---

## Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- Git

### 1. Clone & enter project

```bash
git clone <repo-url>
cd hackathon
```

### 2. Start the Backend

```bash
cd backend/backend

# Create virtual environment (first time only)
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # macOS / Linux

pip install -r requirements.txt

# Run
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Backend is ready at **http://localhost:8000**  
API docs at **http://localhost:8000/docs**

### 3. Start the Frontend

```bash
cd fe
npm install
npm run dev
```

Frontend is ready at **http://localhost:3000**

---

## Environment Variables

### Backend (`backend/backend/.env`)

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `sqlite:///./quantumsolve.db` | SQLite (local) or PostgreSQL URL |
| `ORCHESTRATOR_MODE` | `mcp` | `mcp` for real MCP calls, `mock` for canned data |
| `MCP_SERVERS` | See `.env` | JSON map: capability → MCP server URL |
| `MCP_API_KEY` | See `.env` | API key for NitroCloud authentication |
| `MCP_TIMEOUT_SECONDS` | `15` | Per-call timeout |
| `CORS_ORIGINS` | `["http://localhost:3000"]` | Allowed frontend origins |

### Frontend (`fe/.env.local`)

| Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:8000` | FastAPI backend URL |

---

## One-Command Docker Launch

```bash
# From project root
docker compose up --build
```

- Backend: http://localhost:8000
- Frontend: http://localhost:3000

---

## MCP Server Details

**Deployed on**: NitroCloud  
**URL**: `https://quantumsolve-ai-6a649dba-cortexai-amrita-university-coimbatore.app.nitrocloud.ai/mcp`

All 6 capability namespaces (`research`, `quantum`, `optimization`, `benchmark`, `knowledge`, `report`) point at this single server. Tools available:

| Capability | Tools |
|---|---|
| research | `search_algorithms`, `search_papers` |
| quantum | `evaluate_quantum_feasibility`, `estimate_quantum_advantage`, `generate_qiskit_solution` |
| optimization | `solve_with_ortools`, `solve_with_pulp`, `solve_with_scipy` |
| benchmark | `estimate_runtime`, `compare_methods` |
| knowledge | `query_knowledge_base` |
| report | `generate_pdf_report` |

> Note: The 3 `solve_with_*` tools require a Python subprocess bridge unavailable on NitroCloud. Repoint `optimization` to a Railway/local deployment of `QuantumSolveAI/QuantumSolveAI` to enable them.

---

## Demo Problems

Try these in the workspace:

| Domain | Example Prompt |
|---|---|
| **Fleet Routing** | "Optimize delivery routes for 40 vehicles across a metro area to minimize total distance while respecting 8-hour shift limits." |
| **Nurse Scheduling** | "Build a weekly schedule for 25 nurses across 3 hospital wards satisfying coverage and shift-length regulations." |
| **Ticket Assignment** | "Assign 60 support tickets to 12 engineers based on skill match and workload to minimize resolution time." |
| **Portfolio** | "Optimize a portfolio of 50 assets to maximize Sharpe ratio under a $1M budget and sector exposure limits." |
| **Job Shop** | "Schedule 20 jobs across 5 machines minimizing makespan with setup times between job families." |

---

## Project Structure

```
hackathon/
├── QuantumSolveAI/          # MCP server source (deployed on NitroCloud)
│   └── QuantumSolveAI/
│       ├── main.py          # CLI entry point
│       ├── agents/          # Supervisor + specialist agents
│       ├── quantum/         # Quantum module
│       └── ...
├── backend/
│   └── backend/
│       ├── app/
│       │   ├── api/routes/  # 8 FastAPI route modules (+ composite /run)
│       │   ├── integrations/
│       │   │   ├── mcp/     # McpClient + McpGateway (transport layer)
│       │   │   └── mcp_orchestrator.py  # Pipeline logic
│       │   ├── models/      # SQLModel table definitions
│       │   └── schemas/     # Pydantic request/response schemas
│       └── requirements.txt
└── fe/                      # Next.js 16 frontend
    └── src/
        ├── app/             # Next.js App Router pages
        ├── components/      # UI components (pipeline, results, charts, landing)
        ├── hooks/           # use-pipeline-runner, use-api-base-url, …
        ├── lib/api/         # Typed fetch client + endpoint definitions
        └── stores/          # Zustand pipeline-store
```

---

## Hackathon Submission Checklist

- [x] MCP deployed on NitroCloud with 18 tools
- [x] FastAPI backend with 8 REST endpoints
- [x] Next.js frontend with live pipeline animation
- [x] Full end-to-end integration verified
- [x] Auth (API key) working on NitroCloud
- [x] Docker support
- [x] README with setup guide
