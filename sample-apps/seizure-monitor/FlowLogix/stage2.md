# 📦 Stage 2: Putaway & Storage Slotting

### What happens in this stage?
The truck has been unloaded at the dock. Now, forklift drivers need to know exactly which shelf to put the pallets on. If they guess, items get lost, heavy items break weak shelves, and dangerous chemicals get stored next to food.

---

## 🎭 The Roles of the Agents in Stage 2

* **The Orchestrator Agent**: Reads the incoming task (e.g., *"Park these 10 pallets of chemicals"*). It renders the UI maps for the human manager and routes the work.
* **The Floor Operations Agent (The Star of Stage 2)**: This agent handles the 3D puzzle of the warehouse. It checks rack weight limits, enforces Hazmat (Hazardous Material) rules, and tells the forklift driver exactly where to go.
* **The Supply Chain Agent (Supporting Role)**: It wakes up only to check if an item should skip the shelves entirely because a customer is waiting for it right now.

---

## ⚡ Use Case 1: Opportunity Cross-Docking (Bypassing the Shelf)

### The Problem
A forklift driver spends 20 minutes putting a pallet of iPhones on a high shelf in Zone C. Ten minutes later, a picker spends 20 minutes bringing that exact same pallet down to ship it to a customer. Total waste of 40 minutes.

### The Solution (Cross-Docking)
The AI realizes a customer needs the item right now and routes it directly from the Receiving Dock to the Shipping Dock.

### Execution Flow
1. **Trigger**: A worker scans a pallet of SKU-002 at Dock #1 and asks the Orchestrator, *"Where does this go?"*
2. **Orchestrator Wakes Up Supply Chain Agent**:
   * Calls `check_cross_dock_opportunity()`.
   * The backend checks if there is an active Outbound Order waiting for SKU-002.
   * **Result**: Yes, Order #ORD-901 for Tata Motors is waiting for SKU-002 at Shipping Dock #4.
3. **Orchestrator Wakes Up Floor Ops Agent**:
   * Calls `generate_cross_dock_directive()`. The agent cancels the standard "putaway to shelf" instruction.
4. **Orchestrator Output**:
   * Renders a `CrossDockRoutingCard.tsx` widget. It tells the worker: *"Skip storage. Drive this pallet directly from Dock 1 to Dock 4."*

---

## 🧪 Use Case 2: Dynamic Zone Rebalancing & Hazmat Constraints

### The Problem
Fast-moving items (Class A) should go near the front door. But what if the front door shelves (Zone A) are 95% full? What if the item is flammable?

### The Solution
The AI acts as a Tetris master, dynamically finding the next best slot while enforcing strict safety rules.

### Execution Flow
1. **Trigger**: Automated system alert: *"ASN received for 5 pallets of Industrial Solvent (Hazmat-Class-3)."*
2. **Orchestrator Wakes Up Floor Ops Agent**:
   * Calls `evaluate_rack_capacity(zone: "A")`. Learns that Zone A is full.
   * Calls `replan_putaway(sku: "Solvent", is_hazmat: true)`.
   * **Backend Math Service**: The TypeScript code strictly blocks the AI from putting the solvent in Zone B (general goods). It routes it to Zone H (Hazardous/Ventilated), Bin H-12.
3. **Orchestrator Output**:
   * Renders an `InventoryHeatmap.tsx` widget. The manager sees a visual map of the warehouse with Bin H-12 glowing green, proving the AI safely isolated the chemicals.

---

## ⚖️ Use Case 3: Heavy Freight / Physics Routing

### The Problem
If a worker puts a 1,000kg pallet of steel on the top rack (Level 5), the rack will collapse.

### The Solution
The AI enforces weight-based slotting constraints.

### Execution Flow
1. **Trigger**: Worker scans an oversized pallet of steel rods. *"Where to putaway PO-3310?"*
2. **Orchestrator Wakes Up Floor Ops Agent**:
   * Calls `get_sku_dimensions()`. Discovers the pallet weighs 1,200kg.
   * Calls `replan_putaway(weight: 1200)`.
   * **Backend Math Service**: The code filters out any rack above Level 1. It finds an empty ground-level floor slot (Slot G-04).
3. **Orchestrator Output**:
   * Replies in chat: *"WARNING: Pallet exceeds 500kg safety limit for vertical racks. Proceed to Ground Slot G-04."*

---

## 🚶‍♂️ Use Case 4: Consolidated Putaway (Batching Labor)

### The Problem
A worker takes a small box to Zone C. They drive all the way back to the dock, grab another small box, and drive back to Zone C.

### The Solution
The AI batches tasks so the worker takes multiple items going to the same zone in one single trip.

### Execution Flow
1. **Trigger**: Manager prompt: *"Clear the dock staging area."*
2. **Orchestrator Wakes Up Floor Ops Agent**:
   * Calls `analyze_staging_area()`. Sees 4 different small SKUs waiting to be put away.
   * Calls `generate_batch_putaway_route()`.
   * **Backend Logic**: The system looks at the final shelf locations for all 4 items. It groups the 3 items going to Zone B together into one forklift trip.
   * Calls `assign_putaway_worker()` to ping an available driver.
3. **Orchestrator Output**:
   * Renders a `WorkerTaskBatchCard.tsx` widget showing a highly efficient, single-trip route for the driver.

---

## 🛠️ The Tools You Will Build for Stage 2

Here are the specific NitroStack `@Tool` endpoints you will code in `src/tools/putaway.tool.ts`:

* **`check_cross_dock_opportunity`**: Checks active outbound orders for matches against inbound SKUs.
* **`generate_cross_dock_directive`**: Issues the dock-to-dock routing instruction.
* **`evaluate_rack_capacity`**: Checks Airtable database for available bin slots in specific zones.
* **`replan_putaway`**: The core routing engine (handles Hazmat, weight, and ABC velocity logic).
* **`generate_batch_putaway_route`**: Groups multiple small items by destination zone.
* **`assign_putaway_worker`**: Connects to worker roster to dispatch the task.