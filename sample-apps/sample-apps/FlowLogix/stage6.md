# 👥 Stage 6: Workforce Management — Architectural Execution Flow

### What happens in this stage?
Warehouses run on humans. Stage 6 is about managing shift rosters, monitoring worker fatigue, handling labor shortages, and making sure workers have the right safety certifications (like forklift licenses) before operating machinery.

---

## 🎭 The Roles of the Agents in Stage 6

* **The Orchestrator Agent**: The HR/Supervisor interface. It presents labor allocation dashboards, handles overtime requests, and sends shift updates via Slack MCP.
* **The Floor Operations Agent (The Shift Boss)**: Tracks where every worker is physically located. It dynamically moves workers between departments (e.g., from Picking to Receiving) if a bottleneck forms.
* **The Supply Chain Agent (The Accountant)**: Calculates the financial cost of labor. If overtime is required, it calculates the budget impact.

---

## 🏃‍♂️ Use Case 1: Dynamic Labor Reallocation (The Dock Swarm)

### The Crisis
Three unannounced trucks arrive at the Receiving Dock simultaneously. The dock is drowning in pallets, while the Picking team currently has no orders to process.

### The Multi-Agent Execution Flow
1. **Trigger**: Floor Ops Agent runs `analyze_labor_demand()`. It detects a massive spike in dock congestion and a lull in picking.
2. **Floor Ops Agent Takes Over**: 
   * Calls `reallocate_workers(from: 'Picking', to: 'Receiving', count: 5)`.
3. **Orchestrator (HITL)**: Renders a `LaborReallocationCard.tsx` showing the bottleneck. 
4. **Action**: Manager clicks **[Approve Reassignment]**. The Slack MCP instantly sends a message to the `#picking-team` channel: *"Attention: 5 pickers please report to the Receiving Dock immediately to assist with unloading."*

## ⚠️ Use Case 2: Fatigue & Safety Monitoring

### The Crisis
A worker has walked 15 miles today during picking and is at risk of extreme fatigue, increasing the likelihood of workplace accidents.

### The Multi-Agent Execution Flow
1. **Trigger**: Floor Ops Agent monitors worker telemetry via `monitor_worker_fatigue()`. 
2. **Execution**: It flags the worker as exhausted. It looks at the shift roster and finds a stationary task (e.g., working at the Packing Station).
3. **Orchestrator Output**: Renders a `SafetyAlertCard.tsx` suggesting the manager swap the fatigued picker with a fresh packer.

## 🛑 Use Case 3: Expired Forklift Certification

### The Crisis
A manager tries to assign an emergency Putaway task to a worker, but their forklift certification expired yesterday.
### Execution Flow
Floor Ops runs `check_certifications()`. The NitroStack backend blocks the assignment, preventing a massive OSHA safety violation, and dynamically re-routes the task to a certified driver.

---

## 🛠️ The Tools You Will Build for Stage 6

Here are the specific NitroStack `@Tool` endpoints to code in `src/tools/workforce.tool.ts`:

* **`analyze_labor_demand`**: Compares current workload (trucks/orders) against active workers in each zone.
* **`reallocate_workers`**: Shifts employees between departments (Picking vs. Packing vs. Receiving).
* **`monitor_worker_fatigue`**: Tracks physical exertion/hours worked to suggest breaks or stationary roles.
* **`check_certifications`**: Verifies OSHA/safety compliance before assigning machinery tasks.