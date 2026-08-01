# 🛒 Stage 4: Order Picking — Architectural Execution Flow

### What happens in this stage?
Customer orders drop into the system, and workers need to go into the aisles to grab the items. If workers pick one order at a time, they waste hours walking back and forth (the "zigzag" problem). Stage 4 is about path optimization, batching items together, and ensuring high-priority orders don't miss their shipping cutoffs.

---

## 🎭 The Roles of the Agents in Stage 4

* **The Orchestrator Agent**: Acts as the dispatcher. It receives raw orders from the ERP, routes them to the sub-agents for optimization, and presents optimal pick-paths to the human manager via UI widgets.
* **The Floor Operations Agent (The Navigator)**: Solves the "Traveling Salesperson Problem." It groups multiple orders together based on their physical shelf locations and draws the shortest walking path for the worker.
* **The Supply Chain Agent (The SLA Enforcer)**: Monitors the clock. It knows exactly when the FedEx/UPS trucks are leaving and forcefully bumps the priority of orders that are in jeopardy of shipping late.

---

## ⏳ Use Case 1: SLA Jeopardy & Emergency Pick Injection

### The Crisis
A VIP customer order (Tata Motors) is sitting at the bottom of the queue, but the FedEx truck leaves in 45 minutes. If it misses the truck, the warehouse pays a $5,000 SLA penalty.

### The Multi-Agent Execution Flow
1. **Trigger**: Supply Chain Agent runs a background CRON check: `audit_sla_deadlines()`. It flags the Tata Motors order as **CRITICAL**.
2. **Floor Ops Agent Takes Over**: 
   * Finds a worker who is currently walking down the exact aisle where the Tata Motors parts are stored.
   * Calls `inject_priority_pick()` to dynamically update the worker's RF scanner in real-time.
3. **Orchestrator (HITL)**: Renders a `PriorityPickCard.tsx` widget on the manager's dashboard showing the SLA risk and the rerouted worker. 
4. **Action**: The manager clicks **[Acknowledge]**, and a Slack MCP alert is fired to `#shipping-dock` to hold the FedEx truck for 10 extra minutes.

## 📦 Use Case 2: Zone Batch Picking (Efficiency)

### The Crisis
50 different customers ordered the exact same iPhone case. Sending 50 different workers to Bin A-12 throughout the day is a massive waste of labor.

### The Multi-Agent Execution Flow
1. **Trigger**: Floor Ops Agent runs `analyze_order_pool()`. 
2. **Execution**: It notices a high density of orders for SKU-IPHONE. It calls `generate_batch_pick_task()`, instructing one worker to go to Bin A-12, grab 50 cases at once, and bring them to the packing station to be split up later.
3. **Orchestrator Output**: Renders a `BatchEfficiencyReport.tsx` widget showing the manager how many walking miles were saved.

---

## 🛠️ The Tools You Will Build for Stage 4

Here are the specific NitroStack `@Tool` endpoints to code in `src/tools/picking.tool.ts`:

* **`audit_sla_deadlines`**: Checks outbound orders against carrier cutoff times.
* **`calculate_optimal_pick_path`**: Uses warehouse spatial data to map the shortest walking route.
* **`generate_batch_pick_task`**: Groups single-SKU orders into bulk picking tasks.
* **`inject_priority_pick`**: Interrupts a worker's current queue with an emergency task.