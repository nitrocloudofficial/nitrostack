# Role 1: MCP / Agent Orchestration Engineer
### (The "Nitrostack Heavy" Workflow Owner)

## Why this role exists
ForgeOps's entire pitch hinges on one idea: MCP turns "one engineer question" into a coordinated, inspectable, multi-system investigation. If this layer is weak, the demo becomes "just a dashboard with a chatbot bolted on." Your job is to make the AI Engineer Assistant a *real orchestrator*, not a wrapper around a single LLM call. This is the most technically dense role on the team — hence the heavy stack.

## Core mental model
You are building the **brain and nervous system**, not the face. The face (Workbench UI) shows results; you decide *what gets retrieved, in what order, from where, and why*, and you make that decision process auditable.

Every user question flows through this pipeline:
```
User question (NL)
   → Intent Parser (extract: KPI, incident, options being compared, constraints)
   → Orchestration Planner (decide which MCP servers/tools to call, in what order)
   → MCP Tool Calls (parallel where possible)
   → Result Aggregator (merge MES + quality + maintenance + material data)
   → Simulation Engine Call (if what-if is involved)
   → Response Composer (conclusion + evidence refs + confidence + assumptions)
   → Audit Log Write (question, tools, params, record refs, sim version, output, decision)
```

## Deliverables (hackathon-scoped)

### 1. MCP Server Landscape (mocked but realistic)
Build lightweight MCP servers that expose tool contracts mimicking real factory systems. You do **not** need real MES/ERP integration — you need believable, schema-consistent mock servers with tool definitions an agent can call.

Minimum set:
- **MES MCP Server** — tools: `get_batch_history`, `get_production_path`, `get_queue_events`
- **Maintenance MCP Server** — tools: `get_machine_alerts`, `get_maintenance_state`
- **Quality MCP Server** — tools: `get_defect_records`, `get_inspection_results`
- **Materials MCP Server** — tools: `get_supplier_lot_info`, `get_material_constraints`
- **Simulation MCP Server** — tools: `run_scenario`, `compare_scenarios` (talks to Role 3's simulation engine)

Each tool should return structured JSON with a `source`, `record_id`, `timestamp` — this is what makes the evidence "clickable" and provenance-traceable in the UI later.

### 2. Agent Service
This is the orchestration layer that:
- Interprets the decision question (target KPI, options, constraints) — few-shot prompt or structured function-calling schema
- Builds an execution plan (which servers/tools, sequence, parallelism)
- Executes tool calls against your MCP servers
- Combines results into a single "decision context" object
- Calls the Simulation Engine when a what-if or comparison is requested
- Passes everything to a Response Composer that produces the final structured output (not free text — see contract below)

### 3. Audit Trail / Traceability Log
Every agent run must produce a record containing:
- The original question
- Selected tools + their parameters
- Retrieved record references (not raw dumps — IDs/pointers)
- Simulation version used
- Assumptions made
- Final output
- User's decision/action taken

This is a **judge-visible feature**, not backend plumbing — plan to literally show this log in the demo ("MCP reveal" moment).

## Response Contract (agree this with Role 2 early — this is your API surface)
Don't return plain text to the frontend. Return something like:
```json
{
  "conclusion": "Queue delay reduction is the strongest lever (82% -> 96% predicted yield)",
  "confidence": 0.87,
  "evidence_refs": ["timeline:evt_2291", "graph:node_queue_delay", "sim:run_014"],
  "assumptions": ["Machine 7 condition held constant", "No supplier change within 30 days"],
  "actions_available": ["run_comparison", "open_evidence", "generate_report"],
  "tool_trace": [ {"tool": "get_queue_events", "server": "mes", "params": {...}} ]
}
```
This lets the frontend render highlights, confidence badges, and clickable evidence without re-parsing natural language — critical for the "AI highlights relevant workbench regions" interaction the blueprint describes.

## Guardrails you must enforce in code, not just prompt instructions
- The LLM **orchestrates and explains** — it must never fabricate sensor values, causal scores, or simulation outcomes. All numeric claims must trace back to a tool result.
- Distinguish and tag: observed correlation vs. model-estimated influence vs. counterfactual/simulated evidence.
- Any action affecting production, maintenance, procurement, or external comms (e.g. "Notify Manager") must be flagged as requiring explicit human approval — do not auto-execute.
- If a scenario in a what-if request falls outside the validated operating range of your (mocked) simulation, return a warning rather than a confident number.

## Recommended stack for a hackathon
- **Runtime**: Node/TypeScript or Python (pick whatever your team is fastest in)
- **MCP servers**: lightweight — you can implement them as simple HTTP services exposing tool schemas; you don't need full MCP SDK compliance if time is short, but structure them *as if* they were real MCP servers (tool name, input schema, output schema) so the "MCP reveal" story holds up
- **Agent orchestration**: function-calling via your LLM provider, or a simple deterministic planner if time is tight (a rules-based router is a perfectly legitimate hackathon shortcut — judges care about the *architecture story*, not whether it's a "real" autonomous agent)
- **Caching**: pre-cache MCP responses for your demo's golden-path incident so the live demo never depends on flaky live calls

## Build order (suggested)
1. Define the tool contracts (schemas) for all 5 mock MCP servers — do this first, share with Role 3 immediately since they own the underlying data/sim logic
2. Stub the servers with static/deterministic JSON responses for your one demo incident
3. Build the intent parser + planner for the 3-4 question types you'll demo ("show me evidence", "why was X ruled out", "compare options", "what should we do given constraint Y")
4. Wire in the Response Composer with the JSON contract above
5. Add the audit log
6. Only after the golden path works end-to-end: add robustness (partial failures, loading states, fallback messaging)

## Interfaces you own with teammates
- **With Role 2 (Frontend)**: the JSON response contract above; also agree on how "highlight this evidence" maps to specific IDs in the timeline/graph/chart components
- **With Role 3 (Simulation/Data)**: the tool contracts for `run_scenario`/`compare_scenarios`, and the canonical data schema for batches, events, and machines

## What "done" looks like for the demo
A judge can ask (or you can trigger) 3-4 natural language questions, watch the workbench visually respond (not just text), and then you can pull up the tool-trace/audit log and say: "here's exactly what the agent queried and why" — turning the AI from a black box into an inspectable system.
