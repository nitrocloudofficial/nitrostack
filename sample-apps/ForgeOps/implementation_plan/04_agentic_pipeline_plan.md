# Agent Build Task — Implementation Plan

## Analysis of `agent-buildtasl.md`

The spec defines **4 agents** in a multi-agent pipeline for the ForgeOps AI Decision Workbench:

```
Engineer → Planner Agent → Research Agent → Analysis Agent → Execution Agent → ForgeOps Workbench
```

---

## What Already Exists in `forgeops-mcp/`

The existing `forgeops-mcp` project is a **TypeScript + Nitrostack** MCP server with:
- ✅ 6 MCP module servers: `mes`, `maintenance`, `quality`, `materials`, `simulation`, `orchestrator`
- ✅ A simulation engine (`services/simulation-engine.ts`)
- ✅ An HTTP API (`http-api.ts`) exposing `/api/agent/query`, `/api/simulate`, `/api/timeline`, etc.
- ✅ Incident data fixtures (`data/incident-data.ts`)

**Gap**: There is NO 4-agent pipeline inside `forgeops-mcp`. The current `orchestrator` is a single flat module, not a multi-layer Planner → Research → Analysis → Execution pipeline.

---

## Proposed Architecture

We will build the **4-agent system as a `backend/` directory** alongside `forgeops-mcp/`, in **Python (FastAPI)** to match the spec's recommended stack (FastAPI, Python, Pydantic, NetworkX, Pandas).

The existing `forgeops-mcp` TypeScript project remains the **MCP server layer** that the Research Agent calls via HTTP.

```
ZenOps/
├── forgeops-mcp/          ← EXISTING: MCP servers (TypeScript / Nitrostack)
├── backend/               ← NEW: 4-Agent System (Python / FastAPI)
│   ├── agents/
│   │   ├── planner/       ← Agent 1: Intent + task planning
│   │   ├── research/      ← Agent 2: MCP tool calls + evidence retrieval
│   │   ├── analysis/      ← Agent 3: Root cause, simulation, ranking
│   │   └── execution/     ← Agent 4: UI actions, reports, notifications
│   ├── mcp/               ← HTTP clients that talk to forgeops-mcp servers
│   ├── api/               ← FastAPI routes exposed to frontend
│   ├── schemas/           ← Pydantic shared models (interfaces between agents)
│   ├── database/          ← Audit log store (SQLite for hackathon)
│   └── main.py            ← Entry point
├── src/                   ← Role 3's simulation Python modules
├── data/                  ← Role 3's canonical JSON fixtures
└── implementation_plan/   ← Planning docs
```

---

## Shared Interfaces Between Agents (Pydantic Schemas)

```
schemas/
├── planner_models.py      ← PlannerInput, ExecutionPlan, Task
├── research_models.py     ← ResearchInput, EvidenceBundle
├── analysis_models.py     ← AnalysisInput, AnalysisResult
├── execution_models.py    ← ExecutionInput, ExecutionOutput, UIAction
└── shared_models.py       ← ChatMessage, Incident, UIState, MCPToolCall
```

---

## Agent Implementations

### Agent 1 — Planner (`backend/agents/planner/`)
- `models.py`: PlannerInput, ExecutionPlan TypedDicts
- `prompt.md`: System prompt — intent classification, task breakdown
- `planner.py`: Intent parser + rules-based task planner (no LLM needed for hackathon)
- `service.py`: FastAPI service wrapper

### Agent 2 — Research (`backend/agents/research/`)
- `models.py`: ResearchInput, EvidenceBundle
- `mcp_client.py`: HTTP clients to `forgeops-mcp` endpoints
- `retriever.py`: Parallel data retrieval orchestrator
- `research.py`: Main research agent logic

### Agent 3 — Analysis (`backend/agents/analysis/`)
- `models.py`: AnalysisInput, AnalysisResult
- `root_cause.py`: Correlation scoring (calls Role 3's `diagnostic_engine.py`)
- `simulator.py`: What-if scenario runner (calls Role 3's `simulation_engine.py`)
- `recommender.py`: Ranking & business impact (calls Role 3's `recommendation_engine.py`)
- `analysis.py`: Main analysis agent logic

### Agent 4 — Execution (`backend/agents/execution/`)
- `models.py`: ExecutionInput, ExecutionOutput, UIAction
- `ui_actions.py`: UI action generator (OPEN_TIMELINE, HIGHLIGHT_QUEUE_DELAY, etc.)
- `report_generator.py`: Thin wrapper over Role 3's report_generator.py
- `execution.py`: Main execution agent logic

---

## MCP HTTP Clients (`backend/mcp/`)
- `mes_client.py`: Calls `GET /api/timeline`, `GET /api/incident`
- `quality_client.py`: Calls `GET /api/recommendations`
- `maintenance_client.py`: Calls `GET /api/incident` (maintenance fields)
- `simulation_client.py`: Calls `POST /api/simulate`, `GET /api/graph`
- `base_client.py`: Shared HTTP client with caching

---

## FastAPI Routes (`backend/api/`)
- `POST /api/agent/pipeline` — Full 4-agent pipeline run
- `POST /api/agent/planner` — Planner only (debug)
- `POST /api/agent/research` — Research only (debug)
- `POST /api/agent/analyze` — Analysis only (debug)
- `POST /api/agent/execute` — Execution only (debug)
- `GET /api/audit/log` — Audit trail
- `GET /api/health` — Health check

---

## Audit Trail / Database (`backend/database/`)
- `audit_log.py`: SQLite-based audit log (question, tools used, record refs, output, timestamp)

---

## Build Order (Hackathon Priority)

1. **[P0] Create full folder structure** with all `__init__.py` and module stubs
2. **[P0] Pydantic schemas** — shared interfaces agreed between all agents
3. **[P1] Agent 2 (Research)** — MCP HTTP clients against `forgeops-mcp` endpoints
4. **[P1] Agent 3 (Analysis)** — wire to Role 3's Python simulation/diagnostic/recommendation engines
5. **[P1] Agent 4 (Execution)** — UI actions + report generator
6. **[P1] Agent 1 (Planner)** — intent classifier maps query to execution plan
7. **[P2] FastAPI pipeline endpoint** — chains all 4 agents
8. **[P2] Audit log** — SQLite record of every pipeline run
9. **[P3] Full pipeline integration test**

---

## Verification Plan

- `tests/test_agent_pipeline.py`: End-to-end pipeline test with 4 golden path queries
- `tests/test_planner.py`: Intent classification correctness
- `tests/test_research.py`: Evidence bundle completeness
- `tests/test_analysis.py`: Simulation + ranking output shape
- `tests/test_execution.py`: UI actions + report export
