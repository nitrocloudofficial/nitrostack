# 🏭 Decision Twin — Multi-Agent MCP System (NitroStack TypeScript)

> **An Agentic AI Operating System for Manufacturing & Industry 4.0**  
> Built for the **NitroStack × Amrita University Agentic AI Hackathon** using the official **NitroStack TypeScript SDK (`@nitrostack/core`)**.

---

## 📌 Project Overview

**Decision Twin** models how a smart manufacturing plant makes real-time, high-stakes operational decisions. When hardware anomalies occur (e.g. spindle bearing wear, vibration spikes, thermal runaway), **Decision Twin** dynamically coordinates a team of **12 specialized AI agents** across 5 layers to gather evidence, query historical precedents via RAG, score financial downtime risks, stress-test proposals through self-critique, enforce **SOP Safety Rule Vetoes**, simulate counterfactual actions, and generate executable maintenance work orders.

---

## 🏗️ System Architecture (5-Layer Multi-Agent OS)

```
                           [ IoT Sensor Anomaly Event ]
                                        │
                                 PlannerAgent
                         (Goal Decomposition: 6 goals)
                                        │
                               PlantManagerAgent
                          (Phase-Based Meta-Dispatch)
                                        │
    ┌───────────────────────────────────┼───────────────────────────────────┐
    │                                   │                                   │
┌───┴─────────────┐           ┌─────────┴──────────┐            ┌───────────┴────────────┐
│ EVIDENCE LAYER  │           │ REFLECTION LAYER   │            │ SIMULATION LAYER       │
│ • Sensor        │           │ • Devil's Advocate │            │ • Scenario Simulation  │
│ • Maintenance   │ ────────> │ • Safety (SOP Veto)│ ─────────> │ • Quality Defect       │
│ • Memory (RAG)  │           │ • Composite Risk   │            └───────────┬────────────┘
│ • Production    │           │ • Renegotiation    │                        │
│ • Inventory     │           └────────────────────┘                        │
│ • Finance       │                                                         │
└─────────────────┘                                                         │
                                        │                                   │
                               PlantManagerAgent <──────────────────────────┘
                              (Final Convergence)
                                        │
                       [ Executable Work Order & UI Widget ]
```

### Agents (12 total across 5 layers)

| Layer | Agents | Role & Responsibilities |
| :--- | :--- | :--- |
| **Planning** | `PlannerAgent`, `PlantManagerAgent` | Dynamic goal decomposition, sub-goal routing & phase-based meta-dispatch. |
| **Evidence** | `SensorAgent`, `MaintenanceAgent`, `MemoryAgent`, `ProductionAgent`, `InventoryAgent`, `FinanceAgent` | Autonomous tool execution, live telemetry validation, TF-IDF RAG precedent lookup, inventory bin checks, & financial downtime modeling ($50k repair vs $390k delay). |
| **Reflection** | `DevilsAdvocateAgent`, `SafetyAgent`, `RiskAgent`, `RenegotiateAgent` | Round-1 self-critique challenge loop, **SOP Safety Rule Vetoes** (`SOP-MFG-042`), composite risk scoring, and Round-2 proposal revision. |
| **Simulation** | `ScenarioSimulationAgent`, `QualityAgent` | Counterfactual action scoring (`immediate_repair`, `delay_repair`, `reduced_capacity`) & downstream quality defect projection. |
| **Output** | `WorkOrder`, `SupervisorNotification` | Generation of executable work orders with priority levels, assigned technicians, reserved warehouse bins (`Warehouse B - Bin 14-C`), and LOTO safety protocols. |

---

## 🎨 Interactive Next.js Glassmorphic UI Widget (`@Widget`)

Decision Twin includes a custom, interactive dark-mode control center widget ([`src/widgets/app/decision-twin-result/page.tsx`](src/widgets/app/decision-twin-result/page.tsx)) automatically rendered in **NitroStack Studio**:

- 📊 **Overview & Telemetry Tab**: Real-time gauge cards for Vibration ($8.4\text{ mm/s}$), Bearing Temp ($94.2^\circ\text{C}$), Health Score ($38\%$), and Hydraulic Pressure.
- 🤖 **12-Agent Matrix Tab**: Interactive collaboration graph mapping all 12 active agents, their tools, and evidence outputs.
- 🛡️ **Safety & Dissent Tab**: Full audit log tracking Round-1 Devil's Advocate Challenges and Round-2 Safety SOP approvals.
- 🔮 **Counterfactual AI Tab**: Interactive strategy comparison charts ($85\%$ Immediate Repair vs $20\%$ Delay).
- 🖥️ **Live Execution Trace Console**: Expandable step-by-step reasoning transcript.

---

## 🛠️ NitroStack MCP Decorators Specification

All MCP elements are implemented with type-safe Zod schema validation using `@nitrostack/core`:

| MCP Feature | Decorator / File | Description |
| :--- | :--- | :--- |
| **MCP Tools** | `@Tool()` in [`decision-twin.tools.ts`](src/modules/decision-twin/decision-twin.tools.ts) | Exposes `run_decision_twin_orchestrator`, `get_sensor_data`, `check_machine_health`, `check_inventory`, `estimate_downtime_cost`, `calculate_risk`, `generate_work_order`, `search_incident_history`, `simulate_scenario`. |
| **UI Widgets** | `@Widget('decision-twin-result')` | Links tool outputs directly to the Next.js visual dashboard. |
| **MCP Resources** | `@Resource()` in [`decision-twin.resources.ts`](src/modules/decision-twin/decision-twin.resources.ts) | Exposes `sensor://m004/telemetry` and `sop://manufacturing/safety-rules`. |
| **MCP Prompts** | `@Prompt()` in [`decision-twin.prompts.ts`](src/modules/decision-twin/decision-twin.prompts.ts) | Exposes `investigate_machine_anomaly`. |

---

## ⚙️ Quick Start & Testing Commands

```bash
# 1. Install dependencies
npm install

# 2. Run unit & integration tests (Vitest)
npm test

# 3. Verify all 6 NitroStack MCP Tools
npx tsx test-tools.ts

# 4. Run full 12-Agent Decision Twin Orchestrator Demo
npx tsx test-demo.ts

# 5. Preview UI Widget standalone in Web Browser
npm --prefix src/widgets run dev -- -p 3008
# Open http://localhost:3008/decision-twin-result

# 6. Build production bundle (TypeScript + Bundled Widgets)
npm run build

# 7. Start local NitroStack MCP Server in dev mode
npm run dev
```

---

## 📂 Project Structure

```
.
├── src/
│   ├── app.module.ts                   # Root NitroStack application module (@McpApp)
│   ├── index.ts                        # MCP server entry point (McpApplicationFactory)
│   ├── health/                         # System health checks
│   ├── reflection_memory/              # Reflection, RAG & Safety module implementations
│   ├── modules/
│   │   └── decision-twin/
│   │       ├── decision-twin.data.ts           # In-memory Industry 4.0 Digital Twin database
│   │       ├── decision-twin.module.ts         # NitroStack Decision Twin module
│   │       ├── decision-twin.orchestrator.ts    # Multi-agent state machine engine
│   │       ├── decision-twin.planner.ts         # PlannerAgent (Goal decomposition)
│   │       ├── decision-twin.plant-manager.ts   # PlantManagerAgent (Dispatch & convergence)
│   │       ├── decision-twin.sub-agents.ts      # 11 Evidence, Reflection & Simulation agents
│   │       ├── decision-twin.tools.ts         # NitroStack @Tool definitions & Zod schemas
│   │       ├── decision-twin.resources.ts     # NitroStack @Resource definitions
│   │       ├── decision-twin.prompts.ts       # NitroStack @Prompt definitions
│   │       └── scenario_simulation_agent.ts   # Counterfactual action scoring engine
│   └── widgets/                            # Next.js UI Widget Application (@Widget)
│       └── app/decision-twin-result/page.tsx # Glassmorphic 5-tab dashboard
├── test-demo.ts                        # 12-Agent orchestrator demo runner
├── test-tools.ts                       # MCP Tools test runner
├── package.json                        # Dependencies (@nitrostack/core, zod, vitest)
└── tsconfig.json                       # TypeScript configuration
```

---

## 🏆 Hackathon Compliance Checklist

- [x] **100% TypeScript**: Built with official **NitroStack TypeScript SDK (`@nitrostack/core`)**.
- [x] **25% UI Score**: Features a 5-tab glassmorphic control dashboard widget.
- [x] **15 Code Review Feedback Items Resolved**: Dynamic re-planning, self-critique challenge loops, confidence scores, SOP safety vetoes, RAG memory retrieval, and counterfactual simulation.
- [x] **Zero Secrets/Env files in Git**: Clean `.gitignore`.
- [x] **Production Verified**: Production bundle compiled and verified cleanly (`npm run build`).

---

## 🚀 NitroStack Studio Import & Deployment

1. Start local dev server: `npm run dev`
2. Open **NitroStack Studio**.
3. Select **Import Project** and choose `c:\Users\vishn\metamindz_hackathon_agenticai`.
4. Run `run_decision_twin_orchestrator` in Studio to experience the visual multi-agent workflow!
