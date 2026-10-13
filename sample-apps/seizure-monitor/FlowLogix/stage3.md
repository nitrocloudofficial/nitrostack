# 📦 Stage 3: Inventory Control, Telemetry & Holding

### What happens in this stage?
Once goods pass receiving and putaway, they sit in racks or specialized zones until customer demand triggers movement. During this "holding pattern," the warehouse faces constant hidden risks: food spoils if refrigeration fails, system records drift away from actual stock counts, high-value space gets cluttered with unsold "dead stock," and sudden demand spikes cause costly stockouts if reorder levels aren't constantly calculated.

---

## 🎭 The Roles of the Agents in Stage 3

* **The Orchestrator Agent**: Functions as the front gatekeeper. It ingests continuous IoT telemetry (like temperature/humidity spikes) and high-level manager queries, delegates complex analysis to sub-agents, and renders interactive UI widgets for Human-In-The-Loop (HITL) actions.
* **The Floor Operations Agent**: Manages the physical reality of stored inventory. It handles emergency physical stock relocations during environmental breaches, manages physical-vs-system inventory discrepancies, and assigns cycle-counting routines to floor staff.
* **The Supply Chain Agent**: The mathematical engine of holding. It constantly tracks inventory depletion trajectories, calculates Days of Supply (DOS) and Reorder Points (ROP), detects slow-moving carrying costs, and automatically triggers supplier purchase orders (POs).

---

## ⚡ Use Case 1: Cold Chain Environmental Excursion (IoT Emergency)

### The Problem
A refrigeration unit in Zone CC (Cold Storage) begins to fail, raising temperatures above the safe 8°C limit. If left unnoticed, thousands of dollars worth of temperature-sensitive pharmaceuticals or food items will spoil within hours.

### The Solution
The system captures live IoT MQTT telemetry, automatically identifies impacted high-value SKUs, verifies emergency backup rack space, and alerts certified workers to execute an immediate evacuation.

### Execution Flow
1. **Trigger**: Automated IoT sensor breach: *"Zone CC temperature spiked to 10.2°C (Threshold: 8.0°C)."*
2. **Orchestrator Wakes Up Floor Ops Agent**:
   * Calls `get_inventory_status(zone: "CC")` to flag all high-value perishable items at risk.
   * Calls `evaluate_rack_capacity(zone: "CC-2")` to confirm backup cold-storage availability.
   * Calls `assign_workers()` to issue an urgent evacuation transfer task to cold-chain certified workers.
3. **Orchestrator Wakes Up Supply Chain Agent / External Integration**:
   * Triggers an external Twilio MCP tool to dispatch an urgent SMS notification to the HVAC maintenance team.
4. **Orchestrator Output**:
   * Renders a `ColdChainAlertCard.tsx` widget displaying real-time telemetry graphs, financial stock value at risk ($35,000), and a one-click **[Approve Emergency Transfer]** HITL button.

---

## 🧪 Use Case 2: Dead Stock Identification & Space Clearance

### The Problem
Obsolete or slow-moving stock sits in prime rack locations for months, incurring heavy holding/carrying costs while blocking high-velocity goods from being slotted efficiently.

### The Solution
The AI regularly audits aging inventory against velocity metrics, highlights non-moving items, and generates actionable strategies (clearance pricing or move to overflow storage).

### Execution Flow
1. **Trigger**: Manager prompt: *"Is there any dead stock or inefficiently used storage space in the warehouse?"* (or automated weekly audit).
2. **Orchestrator Wakes Up Supply Chain Agent**:
   * Calls `get_inventory_status(critical_only=false)`.
   * **Backend Analytics Engine**: Evaluates item movement dates against carrying costs and flags SKUs unmoved for >90 days (e.g., SKU-009 sitting in Zone C for 94 days costing $420/mo in holding fees).
3. **Orchestrator Wakes Up Floor Ops Agent**:
   * Identifies candidate overflow bins (Zone F) to free up high-value Zone C racks.
4. **Orchestrator Output**:
   * Renders a `DeadStockAuditCard.tsx` widget detailing space inefficiency, monthly holding costs, and automated action triggers like **[Initiate Clearance Discount]** or **[Relocate to Deep Storage]**.

---

## ⚖️ Use Case 3: Real-Time Stockout & Inventory Drift Mitigation

### The Problem
Daily consumption causes stock levels to dip below safety limits, or physical theft/shrinkage causes the database count to differ from physical shelves. Undetected discrepancies lead to backorders and broken customer promises.

### The Solution
The AI continuously monitors stock depletion trends, detects inventory drift between physical and system counts via cycle counting, updates Available-to-Promise (ATP) numbers, and generates auto-replenishment triggers.

### Execution Flow
1. **Trigger**: Automated schedule check or post-cycle count audit detects low stock / count discrepancy for SKU-104.
2. **Orchestrator Wakes Up Supply Chain Agent**:
   * Calls `calculate_days_of_supply(sku: "SKU-104")` and identifies that current stock yields only 3 days of supply (below the 7-day safety threshold).
   * Calls `detect_stockouts()` to queue an automated Purchase Order (PO) draft for supplier reordering.
3. **Orchestrator Wakes Up Floor Ops Agent**:
   * Calls `log_inventory_discrepancy()` if cycle counts reveal missing units, adjusting ATP database records instantly to prevent mis-promising stock to customers.
4. **Orchestrator Output**:
   * Renders a `StockoutTicker.tsx` widget displaying live, color-coded progress bars for remaining Days of Supply across critical SKUs with immediate purchase order dispatch controls.

---

## 🛠️ The Tools You Will Build for Stage 3

Here are the specific NitroStack `@Tool` endpoints you will code in `src/tools/inventory.tool.ts` and `src/tools/telemetry.tool.ts`:

* **`get_inventory_status`**: Queries database for stock levels, location zones, and aging metrics across SKUs.
* **`calculate_days_of_supply`**: Analyzes historical daily consumption rates against current stock to determine depletion timelines.
* **`detect_stockouts`**: Identifies SKUs approaching critical safety thresholds and flags replenishment needs.
* **`log_inventory_discrepancy`**: Reconciles system database numbers with physical audit counts to correct ATP inventory.
* **`get_telemetry_alerts`**: Ingests and processes active IoT sensor threshold breaches (temperature, humidity, ambient conditions).
* **`relocate_inventory`**: Generates and executes urgent physical stock transfer instructions between warehouse bins.
