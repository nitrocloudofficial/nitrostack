# FactoryBrain AI — Step-by-Step Build Guide

This is the execution plan: the order to build things in, and exactly what each agent needs to do internally. Pairs with `FactoryBrain-AI-System-Architecture.md` (the architecture diagrams) and the corrected datasets (`machines_v2_FIXED.csv`, `sensor_data_realistic_FIXED.csv`).

---

## 0. Prerequisites

- [ ] Node.js + TypeScript environment
- [ ] NitroStack CLI / NitroStudio installed
- [ ] MongoDB instance (local or Atlas)
- [ ] Redis instance (for cache + agent event queue)
- [ ] LLM access configured in NitroStudio (GPT-5.5 or supported alternative)
- [ ] The two corrected CSVs on hand for seeding: `machines_v2_FIXED.csv`, `sensor_data_realistic_FIXED.csv`

---

## 1. Step-by-Step Build Order

### Step 1 — Project scaffolding
1. Initialize the NitroStack project: `nitrostack init factorybrain`.
2. Create the folder structure exactly as planned:
   ```
   src/modules/{machine,maintenance,inventory,purchase,production,manager,monitoring,notification}/
   src/widgets/{dashboard,supplier-card,machine-card,production-chart}/
   src/services/{database.service.ts,ai.service.ts,queue.service.ts,auth.service.ts}
   src/resources/
   src/prompts/
   ```
3. Set up `app.module.ts` to register each feature module (decorators for tools/resources/prompts/widgets).

### Step 2 — Data layer
1. Stand up MongoDB, create the collections: `machines`, `sensor_data`, `maintenance_logs`, `inventory`, `suppliers`, `employees`, `production_orders`, `purchase_requests`, `alerts`, `approvals`, `notifications`, `agent_events`.
2. Seed `machines` from `machines_v2_FIXED.csv` — this is your source of truth for `healthScore`, `riskLevel`, `failureProfile`, `alternateMachine`, `maintenanceTeam`, etc.
3. Seed `sensor_data` from `sensor_data_realistic_FIXED.csv`, or better, replay it through a small ingest script that pushes rows in timestamp order to simulate a live telemetry feed (5-min cadence, or sped up for a demo).
4. Write `database.service.ts`: a thin repository layer (one method per collection: `findMachine`, `getRecentReadings`, `upsertInventory`, etc.) — every agent goes through this, never touches Mongo directly.
5. Write `queue.service.ts` (Redis/BullMQ): one queue per agent handoff (e.g. `machine→maintenance`, `maintenance→inventory`, `inventory→purchase`, …) so a slow step doesn't block the pipeline and failed steps can retry.

### Step 3 — AI service layer
1. Write `ai.service.ts`: a single wrapper around the LLM call (model, prompt, tool-calling), used by every agent. Keeps model choice and retry/timeout logic in one place.
2. Load the 5 MCP prompt templates (Failure Analysis, Maintenance Planning, Purchase Recommendation, Production Optimization, Manager Summary) here as versioned template strings.

### Step 4 — Build agents in pipeline order
Build and unit-test each agent **in the order data flows through them** (see Section 2 for what each one does):
1. Machine Agent
2. Maintenance Agent
3. Inventory Agent
4. Purchase Agent
5. Production Planning Agent
6. Manager Agent
7. Notification Agent
8. Monitoring Agent

Test each agent standalone (mock its inputs) before wiring it to the next one — don't build the whole chain and debug it end-to-end at once.

### Step 5 — Wire the orchestrator
1. Implement the Observe → Reason → Collaborate → Execute → Monitor → Report loop in `app.module.ts` / an `orchestrator.service.ts`.
2. Orchestrator listens for a Machine Agent alert event, and drives the handoff sequence through the queue, agent by agent, per the sequence diagram in the architecture doc.
3. Log every transition to `agent_events` (this is your audit trail and demo narration).

### Step 6 — Widgets
1. Build the 6 React widgets (Machine Health Dashboard, Inventory Card, Supplier Comparison, Production Timeline, Manager Approval Panel, Factory KPI Dashboard), each reading from its agent's output via the gateway API or WebSocket push.
2. Wire `notifyTeams()` output to a WebSocket channel so the dashboard updates live instead of polling.

### Step 7 — Gateway & Auth
1. Stand up the API gateway (REST for reads, WebSocket for push).
2. Add `auth.service.ts`: JWT-based auth with 3 roles — Manager, Technician, Viewer. Gate `approvePurchase()` behind the Manager role.

### Step 8 — End-to-end test
1. Run the seeded scenario: Machine 7 / Bearing X45 style failure (use M002 or M003 from the corrected dataset, since those now carry a real, consistent anomaly signature).
2. Confirm the full chain fires: alert → ticket → inventory check → supplier comparison → production replan → manager report → approval → notifications → live tracking.
3. Check `agent_events` shows a clean, explainable trace.

### Step 9 — Deploy
1. Deploy to NitroCloud.
2. Point the synthetic telemetry generator (or the replayed CSV) at the deployed instance for the live demo.

---

## 2. What Each Agent Needs To Do

### 1. Machine Agent
**Input:** live sensor rows (`airTemperature`, `processTemperature`, `rpm`, `torque`, `vibration`, `pressure`, `humidity`, `voltage`, `current`, `powerConsumption`, `toolWear`, `operatingHours`).

**Tasks:**
- Maintain a rolling window (e.g. last 15–20 readings, ~75–100 min) per machine — don't judge on a single row, use the sustained-anomaly pattern from the corrected data (require several consecutive out-of-range readings before acting, exactly like the `maintenanceRequired` fix).
- Compare live readings against that machine's own baseline (mean/std from its healthy period), not a single global threshold — different machine types run at different normal ranges.
- Run `predictFailure()`: combine the sensor deviation with the machine's registry prior (`healthScore`, `riskLevel` from `machines_v2_FIXED.csv`) to produce a failure probability.
- Determine urgency (Low/Medium/High/Critical) from probability + `criticality` field in the registry (a Critical-criticality machine at 60% probability should outrank a Medium-criticality machine at 70%).
- Map the anomaly pattern to a likely cause using `failureProfile`/`primaryPart` (e.g. rising vibration + temp → Bearing Wear; falling pressure → Hydraulic Leak) — this mapping only works now because the pressure/vibration signatures were corrected to match the right machines.
- Emit a structured alert: `{ machineId, failureProbability, urgency, likelyCause, primaryPart, timestamp }` to the Maintenance Agent.
- Write the reading and the alert to `sensor_data` / `alerts` collections.

### 2. Maintenance Agent
**Input:** Machine Agent alert.

**Tasks:**
- Look up `maintenance://history` and `maintenance_logs` for this machine/part combo — has this failed before, what fixed it, how long did it take.
- Confirm/refine the required part against `primaryPart` in the registry.
- Estimate repair time and assign a technician team from `maintenanceTeam` in the registry (don't hardcode — read it per machine, since teams differ: Mechanical, Hydraulic, Robotics, Electrical, etc.).
- Call `createMaintenanceTicket()` with: machine, likely cause, required part, estimated time, assigned team.
- Pass the required part downstream to the Inventory Agent.

### 3. Inventory Agent
**Input:** required part from Maintenance Agent.

**Tasks:**
- Call `checkInventory()` against the `inventory` collection for that part.
- Return quantity on hand and warehouse location.
- If in stock: skip straight to Production Planning Agent (no purchase needed) — don't always assume a purchase is required.
- If out of stock (or below `reorderThreshold`): forward the part request to the Purchase Agent.
- Update `inventory` with a "reserved" or "pending" state so two simultaneous failures don't double-allocate the same part.

### 4. Purchase Agent
**Input:** out-of-stock part request.

**Tasks:**
- Call `findSuppliers()` against `supplier://suppliers` — pull price, delivery time, rating for the part.
- Score/rank suppliers against the factory's procurement policy (e.g. weight delivery time higher when urgency is High/Critical, weight price higher when urgency is Low).
- Produce a ranked recommendation (not just cheapest — show the tradeoff, like Supplier A $120/2 days vs Supplier B $145/same-day).
- Create a `purchase_request` record with the recommendation, and pass it + the urgency-adjusted delivery estimate to the Production Planning Agent (so it knows how long the machine will realistically be down) and to the Manager Agent (for approval).

### 5. Production Planning Agent
**Input:** machine down (or degrading) + expected repair/part-arrival time.

**Tasks:**
- Call `planProduction()`: check `orders://today` and `production://schedule`.
- Look up the machine's `alternateMachine` from the registry (now symmetric and same-line, so this is a valid reroute target) — check its current load before assuming it can take the job.
- Decide: reroute affected orders to the alternate machine, delay low-priority jobs, or absorb the impact with no change.
- Estimate delay impact per affected order (`Move Order O125: Machine7 → Machine3, Delay: 0 hours` style output).
- Pass the finalized plan + delay estimate to the Manager Agent.

### 6. Manager Agent
**Input:** outputs from Maintenance, Inventory, Purchase, and Production Planning Agents.

**Tasks:**
- Call `generateExecutiveReport()`: assemble machine failure, root cause, estimated cost/loss, supplier recommendation, production impact into one summary.
- Estimate loss (downtime cost basis × estimated hours, adjustable per factory).
- Call `approvePurchase()`: auto-approve if the purchase is below the factory's approval threshold; otherwise route to a human Manager via the Approval Panel widget and wait for a real decision — **don't auto-approve everything**, this human-in-the-loop step is what makes the autonomy defensible.
- Once approved (auto or human), hand off to Notification Agent.

### 7. Notification Agent
**Input:** approved plan.

**Tasks:**
- Call `notifyTeams()`: send the maintenance ticket to the assigned team, the purchase order to procurement, the approval outcome to the requester, and the production change to the floor supervisor.
- Push updates to the dashboard over WebSocket (not polling) so managers see it live.
- Log each notification (channel, recipient, status) to `notifications`.

### 8. Monitoring Agent
**Input:** the approved, notified plan.

**Tasks:**
- Call `trackWorkflow()`: watch the lifecycle — Purchase Approved → Supplier Accepted → Part Shipped → Repair Started → Machine Running.
- Poll or subscribe to status updates from procurement/maintenance sources (mocked for the hackathon, but structure it so a real integration slots in later).
- Update `alerts`/`agent_events` as each stage completes, and flag if a stage stalls past its expected duration (e.g. part not shipped within X hours) — this is what turns "monitoring" into something more than a passive log.
- Feed final state back to the Factory KPI Dashboard widget.

---

## 3. Build Order Sanity Check

If you're short on time (hackathon constraint), the **minimum defensible demo path** is:

```
Machine Agent → Maintenance Agent → Inventory Agent → Purchase Agent
→ Production Planning Agent → Manager Agent → Notification Agent
```

Monitoring Agent can be the first thing cut if you run out of time — it's valuable for realism but not required to prove the multi-agent MCP story to judges. Widgets can also be trimmed to just: Machine Health Dashboard, Supplier Comparison, and Manager Approval Panel — those three alone tell the whole story end-to-end.
