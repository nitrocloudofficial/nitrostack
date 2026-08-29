# Handoff Guide — 4-Agent Pipeline (Role 1 / MCP & Agent Engineer)

> **Branch**: `main` | **Directory**: `backend/`
> **GitHub**: https://github.com/shalcoder/ZenOps/blob/main/HANDOFF_AGENTS_PIPELINE.md

Role 3 (Simulation & Data Engineer) has built and wired the complete **4-Agent pipeline backend** in `backend/` on `main`. Everything is ready for Role 1 to connect their LLM orchestration layer or call the FastAPI endpoints directly.

---

## What Was Built

```
Engineer Query
      │
      ▼
┌─────────────────────────────────────────────────────────┐
│ Agent 1 — Planner                                       │
│ Intent classifier + task breakdown + server routing     │
│ backend/agents/planner/planner.py                       │
└───────────────────┬─────────────────────────────────────┘
                    │ ExecutionPlan
                    ▼
┌─────────────────────────────────────────────────────────┐
│ Agent 2 — Research                                      │
│ Calls forgeops-mcp HTTP endpoints, returns EvidenceBundle│
│ backend/agents/research/research.py                     │
└───────────────────┬─────────────────────────────────────┘
                    │ EvidenceBundle
                    ▼
┌─────────────────────────────────────────────────────────┐
│ Agent 3 — Analysis                                      │
│ Root cause + simulations + recommendation ranking       │
│ backend/agents/analysis/analysis.py                     │
└───────────────────┬─────────────────────────────────────┘
                    │ AnalysisResult
                    ▼
┌─────────────────────────────────────────────────────────┐
│ Agent 4 — Execution                                     │
│ UI actions + assistant message + reports + audit log    │
│ backend/agents/execution/execution.py                   │
└───────────────────┬─────────────────────────────────────┘
                    │ ExecutionOutput
                    ▼
        ForgeOps Decision Workbench
```

---

## How to Run the Backend

```bash
# From ZenOps/ root
pip3 install fastapi uvicorn pydantic --break-system-packages

# Start the 4-agent FastAPI backend
python3 -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

> [!NOTE]
> The backend uses fallback stubs if `forgeops-mcp` is not running on port 8787. Start `forgeops-mcp` first for live data:
> ```bash
> cd forgeops-mcp && npm run api
> ```

---

## API Endpoints

### `POST /api/agent/pipeline` — Main Entry Point

Send any natural language engineering query. The 4-agent chain runs automatically.

```bash
curl -X POST http://localhost:8000/api/agent/pipeline \
  -H "Content-Type: application/json" \
  -d '{"query": "Show me the evidence."}'
```

**Request body:**
```json
{
  "query": "We cannot change suppliers. What should we do?",
  "incident_id": "INC-2407-001",
  "batch_id": "B-2407-184",
  "constraints": {
    "no_supplier_change": true
  }
}
```

**Response (ExecutionOutput):**
```json
{
  "assistant_message": "With supplier change frozen for 30 days, the best feasible action is reducing queue delay below 60 minutes — predicted yield: 96.0%, confidence: 96%.",
  "conclusion": "...",
  "confidence": 0.91,
  "evidence_refs": [
    "timeline:evt_2291",
    "timeline:evt_2292",
    "graph:node_queue_delay",
    "graph:node_humidity",
    "sim:run_014"
  ],
  "assumptions": [
    "Queue delay reduced below 60 minutes via priority staging dispatch"
  ],
  "ui_actions": [
    {"action": "OPEN_SIMULATION", "target_id": null},
    {"action": "OPEN_RECOMMENDATIONS", "target_id": null},
    {"action": "HIGHLIGHT_NODE", "target_id": "queue_delay"}
  ],
  "actions_available": ["open_evidence", "run_comparison", "generate_report"],
  "tool_trace": [
    {"server": "MES", "tool": "get_queue_events", "status": "complete", "durationMs": 124},
    {"server": "Quality", "tool": "get_inspection_results", "status": "complete", "durationMs": 96},
    {"server": "Maintenance", "tool": "get_machine_alerts", "status": "complete", "durationMs": 108},
    {"server": "Simulation", "tool": "compare_scenarios", "status": "complete", "durationMs": 342}
  ]
}
```

### `GET /api/audit/log` — Agent Audit Trail

Returns the full audit log of every pipeline run — visible to judges as the "MCP reveal" moment.

```bash
curl http://localhost:8000/api/audit/log
```

### `GET /api/health`

```bash
curl http://localhost:8000/api/health
```

---

## Intent Classification (Planner Agent)

The Planner detects intent from the query using rules-based pattern matching (no LLM needed for hackathon reliability):

| Query Pattern | Intent | Agents Invoked | MCP Servers |
|---|---|---|---|
| "Show me the evidence" | `show_evidence` | Research → Analysis → Execution | MES, Quality, Orchestrator |
| "Why was Machine 7 ruled out?" | `explain_exclusion` | Research → Analysis → Execution | MES, Maintenance, Simulation |
| "Compare Option A vs B" | `compare_options` | Research → Analysis → Execution | MES, Maintenance, Quality, Simulation |
| "We cannot change suppliers…" | `constraint_query` | Research → Analysis → Execution | Materials, Simulation |
| "Generate a report" | `generate_report` | Research → Analysis → Execution | Orchestrator, Simulation |
| "What if we reduce queue delay?" | `simulate` | Research → Analysis → Execution | Simulation, MES |

---

## Pydantic Interface Contracts (Agent Boundaries)

These are the typed schemas connecting all 4 agents. Import them directly:

```python
from backend.schemas.planner_models import PlannerInput, ExecutionPlan
from backend.schemas.research_models import ResearchInput, EvidenceBundle
from backend.schemas.analysis_models import AnalysisInput, AnalysisResult
from backend.schemas.execution_models import ExecutionInput, ExecutionOutput, UIAction
```

### UIAction Shape (for Role 2 Frontend)
```python
class UIAction(BaseModel):
    action: str      # OPEN_TIMELINE | HIGHLIGHT_NODE | OPEN_GRAPH | OPEN_SIMULATION | OPEN_COMPARISON_VIEW
    target_id: str   # e.g. "queue_delay", "machine_7", "humidity"
    params: dict
```

Frontend simply dispatches:
```typescript
dispatch(uiActions)  // ExecutionOutput.ui_actions
```

---

## Calling the Pipeline Directly (Python)

```python
from backend.pipeline import run_pipeline

output = run_pipeline(
    user_query="Why was Machine 7 ruled out?",
    constraints={"no_supplier_change": True}
)

print(output.conclusion)
print([a.action for a in output.ui_actions])
print(output.tool_trace)
```

---

## File Reference

| File | Description |
|---|---|
| [`backend/pipeline.py`](https://github.com/shalcoder/ZenOps/blob/main/backend/pipeline.py) | 4-agent chain entry point |
| [`backend/main.py`](https://github.com/shalcoder/ZenOps/blob/main/backend/main.py) | FastAPI app (start here) |
| [`backend/agents/planner/planner.py`](https://github.com/shalcoder/ZenOps/blob/main/backend/agents/planner/planner.py) | Agent 1 — Intent classifier |
| [`backend/agents/research/research.py`](https://github.com/shalcoder/ZenOps/blob/main/backend/agents/research/research.py) | Agent 2 — MCP evidence retrieval |
| [`backend/agents/analysis/analysis.py`](https://github.com/shalcoder/ZenOps/blob/main/backend/agents/analysis/analysis.py) | Agent 3 — Root cause + simulation |
| [`backend/agents/execution/execution.py`](https://github.com/shalcoder/ZenOps/blob/main/backend/agents/execution/execution.py) | Agent 4 — UI actions + reports |
| [`backend/mcp/base_client.py`](https://github.com/shalcoder/ZenOps/blob/main/backend/mcp/base_client.py) | HTTP client to `forgeops-mcp` with stubs |
| [`backend/database/audit_log.py`](https://github.com/shalcoder/ZenOps/blob/main/backend/database/audit_log.py) | SQLite audit trail |
| [`backend/schemas/`](https://github.com/shalcoder/ZenOps/tree/main/backend/schemas) | All Pydantic models |
| [`backend/tests/test_agent_pipeline.py`](https://github.com/shalcoder/ZenOps/blob/main/backend/tests/test_agent_pipeline.py) | 10 tests — all passing ✅ |

---

## Integration with `forgeops-mcp` (Role 1's TypeScript MCP servers)

The Research Agent (`backend/mcp/base_client.py`) calls these `forgeops-mcp` endpoints:

| Endpoint | Data Returned |
|---|---|
| `GET /api/incident` | Batch + incident summary |
| `GET /api/timeline` | All timeline events (filterable by source/severity) |
| `GET /api/graph` | Causal graph nodes + edges + confidence |
| `GET /api/recommendations` | Ranked action recommendations |
| `GET /api/business-impact` | Financial ROI metrics |
| `POST /api/simulate` | What-if scenario result |

> [!IMPORTANT]
> If `forgeops-mcp` is not running, the backend automatically falls back to deterministic static stubs so the demo never breaks.

---

## Test Suite

```bash
python3 -m unittest backend/tests/test_agent_pipeline.py -v

# Result: Ran 10 tests in 0.035s — OK ✅
```
