# Handoff: Role 1 — MCP Agent Engineer (`Vishal` Branch)

## Overview
This document serves as the official handoff from **Role 1 (MCP Agent Engineer)** to **Role 2 (Frontend Workbench Engineer / Vaishak Branch)** and **Role 3 (Simulation Data Engineer / kv Branch)** for the **ForgeOps AI Decision Workbench**.

The MCP Server backend has been fully implemented using the **NitroStack TypeScript SDK (`@nitrostack/core`)** at `e:\ZenOps-1\forgeops-mcp` and directly integrates Role 3's canonical dataset and simulation physics engine.

---

## 🛠 Project Structure & Architecture

```
ZenOps-1/ (Branch: Vishal)
├── HANDOFF_ROLE1_MCP_ENGINEER.md     # Role 1 Handoff Document
├── HANDOFF_ROLE3_SIMULATION_ENGINEER.md # Role 3 Handoff Document
├── data/
│   └── canonical_dataset.json         # Role 3 Canonical Dataset & Golden-Path Incident (B-2407-184)
├── simulation/
│   ├── engine.ts                      # Standalone Simulation Engine (TS)
│   └── engine.py                      # Standalone Simulation Engine (Python)
├── test_role3_simulation.ts           # Standalone Role 3 Verification Script
└── forgeops-mcp/                      # Role 1 NitroStack MCP Server
    ├── package.json
    ├── tsconfig.json
    └── src/
        ├── index.ts                   # MCP Server Entry Point
        ├── app.module.ts              # Root Application Module (wires 6 domain modules)
        ├── data/
        │   └── incident-data.ts       # Cached Golden-Path Incident Dataset
        ├── services/
        │   └── simulation-engine.ts   # Integrated Role 3 Simulation Engine Service
        ├── modules/
        │   ├── mes/                   # Manufacturing Execution System Module
        │   ├── maintenance/           # Machine Health & Alerts Module
        │   ├── quality/               # Quality Inspection & Defects Module
        │   ├── materials/             # Supply Chain & Procurement Module
        │   ├── simulation/            # Simulation Engine Module (uses simulation-engine.ts)
        │   └── orchestrator/          # High-Level Copilot Aggregation Module
        └── test-tools.ts              # Automated Verification Suite (17 Tests)
```

---

## 🔌 Complete MCP Tools Reference (14 Tools Across 6 Modules)

| Domain Module | MCP Tool Name | Description | Inputs | Output Provenance & Key Fields |
|---|---|---|---|---|
| **MES** | `get_batch_history` | Batch genealogy, route, yield, material tracing | `{ batch_id: string }` | `source: "mes"`, `yield_percent: 82.0`, `status: "rejected"` |
| **MES** | `get_production_path` | Stage-by-stage cycle times, parameters, anomalies | `{ batch_id: string }` | `source: "mes"`, `stages[]`, `anomalies[]`, `failure_reason` |
| **MES** | `get_queue_events` | Queue wait times & delay anomalies | `{ batch_id: string, line_id?: string }` | `source: "mes"`, `wait_time_minutes: 198.0`, `severity: "critical"` |
| **Maintenance** | `get_machine_alerts` | Machine vibration & temperature alerts | `{ machine_id: string, time_range?: string }` | `source: "maintenance"`, `alerts[]` (vibration 4.7 mm/s, temp 31.4°C) |
| **Maintenance** | `get_maintenance_state` | Machine health score, service history, work orders | `{ machine_id: string }` | `source: "maintenance"`, `health_score: 72.0`, `service_history[]` |
| **Quality** | `get_defect_records` | Dimensional & surface defect measurements | `{ batch_id: string }` | `source: "quality"`, `defects[]` (bore +0.08mm, Ra 0.62μm) |
| **Quality** | `get_inspection_results` | Quality scores, criteria, pass/fail results | `{ batch_id: string }` | `source: "quality"`, `quality_score: 62.3`, `criteria` |
| **Materials** | `get_supplier_lot_info` | Supplier lot specs & intake conditions | `{ lot_id: string }` | `source: "materials"`, `supplier_name: "Tata Steel Ltd"` |
| **Materials** | `get_material_constraints` | Lead times, change freezes & alternatives | `{ material_type: string }` | `source: "materials"`, `lead_time_days: 14`, `change_freeze_until` |
| **Simulation** | `run_scenario` | Counterfactual simulation scenario runner | `{ scenario_name: string, parameters?: dict }` | `predicted_yield`, `confidence`, `in_validated_range`, `warning` |
| **Simulation** | `compare_scenarios` | Side-by-side scenario comparison & deltas | `{ scenario_names: string[] }` | `recommended_scenario`, `deltas[]`, `baseline` |
| **Orchestrator** | `get_incident_summary` | Executive summary of incident INC-2407-001 | `{ incident_id?: string }` | `kpi_change: "Yield 96% → 82%"`, `causal_chain[]`, `status` |
| **Orchestrator** | `get_timeline` | Unified event stream across MES, IoT, Maintenance, Quality | `{ batch_id?: string, filters?: dict }` | `events[]` (10 ordered events with timestamps) |
| **Orchestrator** | `get_causal_graph` | Root cause graph with nodes, edges, influence | `{ batch_id?: string }` | `nodes[]` (Queue delay influence 0.89), `edges[]` |
| **Orchestrator** | `get_recommendations` | Ranked action recommendations | `{ batch_id?: string }` | `recommendations[]` (Rank 1: Reduce queue delay → 96% yield) |
| **Orchestrator** | `get_business_impact` | Financial & operational impact translation | `{ batch_id?: string }` | `monthly_loss_exposure_inr: 1800000`, `monthly_savings_inr: 1500000` |

---

## 🎯 Full Alignment & Integration with Role 3

Role 1 has fully integrated Role 3's data and simulation physics:

1. **Direct Service Delegation**: `SimulationTools` in `forgeops-mcp/src/modules/simulation/simulation.tools.ts` delegates scenario execution directly to `src/services/simulation-engine.ts`.
2. **Out-of-Range Guardrails**: When a requested scenario exceeds calibration limits (e.g. `extreme_speed_1000`), the tool returns `in_validated_range: false` and a safety warning.
3. **Traceability**: Every record returned across all 14 MCP tools contains `source`, `record_id`, and ISO `timestamp` for complete UI provenance matching Role 3's schema.

---

## 🤝 Handoff Instructions for Role 2 (Frontend Workbench Engineer)

Role 2 can connect to Role 1's NitroStack MCP Server using:

### Option 1: Running Dev Server (HTTP SSE / REST / STDIO)
```bash
cd e:\ZenOps-1\forgeops-mcp
npm run dev
```

### Option 2: Direct Import of Tool Controllers in Node/Next.js
```typescript
import { OrchestratorTools } from './forgeops-mcp/src/modules/orchestrator/orchestrator.tools.js';
import { SimulationTools } from './forgeops-mcp/src/modules/simulation/simulation.tools.js';

const orchestrator = new OrchestratorTools();
const simulation = new SimulationTools();

// 1. Get incident summary for header
const summary = await orchestrator.getIncidentSummary({});

// 2. Get root cause graph & timeline for decision canvas
const graph = await orchestrator.getCausalGraph({});
const timeline = await orchestrator.getTimeline({});

// 3. Run what-if simulation scenario
const simResult = await simulation.runScenario({ scenario_name: 'reduce_queue_delay' });
```

---

## 🧪 Verification & Build Status

- **Tool Test Suite (`src/test-tools.ts`)**: **17 Passed, 0 Failed**
- **Role 3 Simulation Test Suite (`test_role3_simulation.ts`)**: **All Tests Passed**
- **Production Build (`npm run build`)**: **`✓ Build Complete`** (TypeScript compiled & widgets bundled cleanly).

---

## 🚀 Quick Execution Commands

```bash
# 1. Run MCP server tool verification suite
cd e:\ZenOps-1\forgeops-mcp
npx tsx src/test-tools.ts

# 2. Build production bundle
npm run build

# 3. Start development server
npm run dev
```
