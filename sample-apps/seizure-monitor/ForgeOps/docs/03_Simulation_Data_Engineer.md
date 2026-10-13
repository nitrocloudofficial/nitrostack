# Role 3: Simulation & Data Engineer

## Why this role exists
Everything the other two roles build — the agent's answers, the timeline, the graph, the what-if outputs, the recommendations — is only as credible as the data underneath it. The blueprint is explicit: *"The LLM should orchestrate tools and explain results; it should not fabricate sensor values, causal scores, or simulation outcomes."* You are the person who makes sure there's always real, structured ground truth for the AI to point to. You own the incident dataset, the simulation logic, and the reporting/decision-record output.

## Core mental model
You're building the **factory's memory and its "what-if" physics**, in miniature. Everything must be:
1. **Deterministic** for the demo (same incident, same replay, same numbers every run)
2. **Schema-consistent** so Role 1's MCP tools and Role 2's UI components don't have to guess field names
3. **Provenance-tagged** — every record has a source system, timestamp, and record ID, because the whole product's trust story depends on traceability

## Deliverables (hackathon-scoped)

### 1. Canonical Data Model
Design and populate a small but coherent schema covering:
- **Batches**: batch_id, product, line, plant, start/end time, yield %, status
- **Events** (the timeline spine): event_id, batch_id, source_system, event_type, timestamp, stage, severity, value, confidence
- **Machines**: machine_id, name, maintenance_state, alert_history
- **Sensor readings**: humidity, temperature, pressure, queue_delay, cycle_time — time series per batch
- **Quality/defect records**: inspection results, defect codes, pass/fail, linked batch/stage
- **Materials**: supplier, lot, formulation, storage condition
- Every record needs: `source`, `record_id`, `timestamp` — non-negotiable, this is what makes evidence "clickable" in the UI and traceable in the audit log

### 2. The Representative Incident (your golden demo path)
Build out the exact scenario from the blueprint in full, connected detail — this is what everyone demos against:
> Production yield falls from 96% to 82%. Humidity is elevated, queue delay increases, Machine 7 produces a maintenance alert, temperature drifts, defects appear, and the batch is rejected.

Populate a complete, internally-consistent event sequence for this batch (and one "healthy reference batch" for comparison/overlay). Every downstream module — Timeline, Replay, Graph, Simulator — should be able to run entirely off this one dataset without any live integration.

### 3. Analytical Layers (per the blueprint's 5-layer model)
You're implementing simplified versions of:
- **Descriptive**: reconstruct the incident from synchronized events (this is mostly just clean data + correct time-ordering)
- **Diagnostic**: detect anomalies/correlations/candidate causal paths (rules-based is fine — e.g. "if queue_delay > threshold AND humidity > threshold, correlation flag")
- **Counterfactual**: estimate outcomes under specific interventions (the What-if Simulator engine)
- **Prescriptive**: rank actions by technical + business objectives
- **Communicative**: feed clean, structured output to the report generator

Don't build ML models under time pressure — a well-designed deterministic/rules-based simulation that produces believable, consistent numbers is not just acceptable, it's *recommended* per the blueprint's own hackathon guidance.

### 4. What-if Simulation Engine
This is the computational core behind Module 4. It needs to:
- Accept a scenario: which variable(s) change, by how much, plus constraints (cost ceiling, time limit, no-supplier-change, etc.)
- Compare against the incident baseline
- Return a structured output: predicted metric change, confidence, cost, effort/disruption, and the assumptions used
- Be exposed as the `run_scenario` / `compare_scenarios` tool contract that Role 1's Simulation MCP server calls

Example contract shape to hand to Role 1:
```json
{
  "scenario_id": "sim_014",
  "inputs": {"queue_delay_minutes": 60},
  "baseline_yield": 0.82,
  "predicted_yield": 0.96,
  "confidence": 0.85,
  "cost_estimate": "low",
  "implementation_effort": "medium",
  "assumptions": ["Machine 7 condition held constant"],
  "in_validated_range": true
}
```
Include a check for `in_validated_range` — the blueprint requires the system to warn when a requested scenario falls outside what the (mock) model was calibrated for. This is an easy, high-credibility feature to include.

### 5. Recommendation Ranking Logic
Feed the Recommendation Panel (Role 2) with ranked interventions scored across: technical effectiveness, confidence, cost, speed, operational effort, business impact. A simple weighted-scoring function across your simulation outputs is enough — the important part is that every score traces back to a simulation run, not a hand-waved number.

### 6. Business Impact Translation
Convert engineering deltas into leadership-facing numbers: expected yield recovery, downtime avoided, cost/savings, loss avoided. Each number needs a visible "basis" (which simulation run, which assumption) — no naked numbers.

### 7. Reports & Decision Records
Generate the executive report structure defined in the blueprint:
- Incident summary (what/where/when/how performance changed)
- Root cause + contributing factors
- Evidence (timeline events, graph relationships, historical comparison)
- Simulation (scenarios tested, assumptions, uncertainty, predicted outcomes)
- Recommended action + rationale
- Business impact (yield, downtime, cost, savings, loss avoided)
- Risk assessment (implementation risk, residual risk, monitoring plan)
- Decision record (approver, selected action, timestamp, follow-up owner)

Produce both an engineer-facing (detailed) and manager-facing (summary) version — even a templated markdown/HTML export is sufficient for the demo; this is a "generate report" button, not a full document pipeline.

## Guardrails you must build into the data/sim layer itself
- Never let the simulator or data layer silently return a number without a confidence and assumption set attached
- Flag missing, stale, or conflicting inputs rather than interpolating silently
- Keep a hard-coded "validated operating range" per variable so the "outside calibration range" warning actually triggers on at least one demo scenario — it's a strong trust-building beat in a live demo

## Recommended stack for a hackathon
- Python (pandas/numpy) or TypeScript — whichever is faster for your team to iterate JSON/CSV fixtures in
- Store your dataset as structured JSON or SQLite — no need for a real time-series DB
- Simulation logic can be pure functions/rules — resist the urge to train anything under time pressure
- Reports: a simple templating approach (Jinja2/markdown → HTML, or a JS templating lib) is enough

## Build order (suggested)
1. Design the canonical schema — share with both teammates immediately, this is the shared contract for the whole team
2. Populate the golden-path incident dataset (failing batch) + one healthy reference batch
3. Build the rules-based diagnostic/correlation layer
4. Build the What-if Simulation Engine + expose the `run_scenario`/`compare_scenarios` contract to Role 1
5. Build the recommendation ranking + business impact translation
6. Build the report/decision-record generator last — it's mostly a formatting pass over data that already exists

## Interfaces you own with teammates
- **With Role 1 (MCP/Agent)**: the tool contracts for `run_scenario`/`compare_scenarios`, and the canonical data schema their MES/quality/maintenance mock servers will serve from
- **With Role 2 (Frontend)**: the exact shape of batch/event/machine/sensor records so Timeline, Replay, and Graph components can bind directly to your fixtures without translation layers

## What "done" looks like for the demo
Someone can ask "we can't change suppliers for a month, what should we do?" and get back a specific, numeric, assumption-qualified answer (e.g. "reduce queue delay below 60 minutes: 82% → 96% predicted yield, low cost") that traces cleanly to a simulation run — and a generated report that could plausibly be handed to a plant manager.
