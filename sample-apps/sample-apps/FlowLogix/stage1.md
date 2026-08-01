# 🎭 The Roles of the Agents in Stage 1

Before looking at the use cases, here is exactly what each agent is allowed to do when a truck arrives:

* **The Orchestrator Agent (The Gatekeeper)**: It acts as the front desk. It reads uploaded photos (OCR), listens for GPS alerts, decides which sub-agent needs to work, and presents the React UI widgets to the human manager for approval.
* **The Supply Chain Agent (The Buyer)**: It handles the paperwork and the money. It matches truck contents to Purchase Orders (POs), finds backup suppliers if goods are broken, and writes new POs.
* **The Floor Operations Agent (The Traffic Cop)**: It manages the physical dock doors. It changes truck schedules, opens up emergency dock slots, and moves receiving workers around if a truck is late.

---

## 🚨 Use Case 1: Damaged Freight Dispute & Emergency Sourcing

### The Crisis
A truck arrives with 50 crushed boxes of critical bearings.

### The Multi-Agent Execution Flow
1. **Worker Input**: A worker on the dock takes a photo of the crushed boxes and the delivery receipt and uploads it to FlowLogix.
2. **Orchestrator Wakes Up**: 
   * Calls `read_delivery_receipt_ocr` (Vision MCP) to read the photo. 
   * Extracts data: PO-9941, SKU-001, Damaged Qty: 50. 
   * Realizes this is an inventory/procurement crisis. It wakes up the Supply Chain Agent.
3. **Supply Chain Agent Takes Over**: 
   * Calls `check_order_impact()`. The NitroStack backend calculates Available-to-Promise (ATP) math and realizes a major customer order for Tata Motors will now be missed. 
   * Calls `find_alternate_supplier(SKU-001, 50, 2_days)`. Airtable MCP finds a backup vendor. 
   * Drafts a replacement PO via `raise_emergency_po()` but stops. It passes the draft back to the Orchestrator.
4. **Orchestrator (HITL)**: Takes the drafted PO and renders the `ShipmentIncidentCard.tsx` widget on the manager's screen. The manager sees the OCR photo, the Tata Motors risk, and clicks **[Approve Emergency PO]**. Only after the click, the Orchestrator fires the Slack alert and Gmail email.

---

## 🚚 Use Case 2: Inbound Traffic Delay & Dock Re-scheduling

### The Crisis
A GPS system detects that a massive supplier truck is stuck in highway traffic and will miss its 2:00 PM dock slot, leaving workers standing around doing nothing.

### The Multi-Agent Execution Flow
1. **System Trigger**: A GPS webhook (TomTom MCP) sends an alert to FlowLogix: Truck TRK-882 is delayed by 2 hours.
2. **Orchestrator Wakes Up**: Reads the alert. Realizes this is a scheduling and labor issue. It wakes up the Floor Operations Agent.
3. **Floor Operations Agent Takes Over**: 
   * Calls `check_inbound_delays()` to see which other trucks are arriving at 2:00 PM. 
   * Calls `reschedule_dock_slot()` to find an empty dock door for when the delayed truck finally arrives at 4:00 PM. 
   * Calls `reassign_dock_workers()`. The backend checks the roster and temporarily moves the idle 2:00 PM receiving workers to Picking duties so labor isn't wasted.
4. **Orchestrator**: Renders the `DockScheduleTracker.tsx` widget showing a visual timeline of the shifted truck slots and the reassigned workers.

---

## ❓ Use Case 3: Blind Receiving (Unannounced Truck Arrival)

### The Crisis
A truck shows up at the gate. The driver doesn't have an Advance Shipment Notice (ASN) barcode, just a generic manifest. The warehouse doesn't know what the truck is carrying or where to park it.

### The Multi-Agent Execution Flow
1. **Worker Input**: *"A truck from 'Acme Corp' is here but has no ASN. License plate XYZ-123. Fix this."*
2. **Orchestrator Wakes Up**: Realizes it needs to find the PO (Supply Chain) and find a place to park the truck (Floor Ops). It wakes up both sub-agents sequentially.
3. **Supply Chain Agent Executes**: 
   * Calls `query_erp_for_po(vendor: "Acme Corp", date: "today")`. 
   * Searches the Airtable MCP and successfully finds a pending Purchase Order for Acme Corp that was supposed to arrive today. 
   * Passes the PO data to the Orchestrator.
4. **Floor Operations Agent Executes**: Now that the Orchestrator knows what the truck is carrying, it asks the Floor Ops agent to park it. 
   * Calls `create_emergency_dock_slot()`. 
   * Finds the least busy dock door (e.g., Dock #4) and assigns the truck there.
5. **Orchestrator**: Merges the info and replies to the worker: *"This truck is carrying PO-4422 (Metal Fasteners). Send them to Dock 4."*

---

## ❌ Use Case 4: Quality Control (QC) Failure & Supplier Penalization

### The Crisis
The boxes look fine on the outside, but when the worker opens them, the parts are painted the wrong color (they fail the QC check).

### The Multi-Agent Execution Flow
1. **Worker Input**: *"PO-5511 arrived but failed QC. Parts are painted blue instead of black."*
2. **Orchestrator Wakes Up**: Routes the issue to the Supply Chain Agent because it involves supplier quality.
3. **Supply Chain Agent Takes Over**: 
   * Calls `log_qc_failure()`. This triggers a mathematical service in the NitroStack backend that lowers the supplier's "Reliability Score" in Airtable (e.g., drops their score from 98% to 92%). 
   * Calls `generate_rma_document()` to draft the official Return Merchandise Authorization paperwork so the truck can take the bad parts back.
4. **Orchestrator (HITL)**: Renders a UI card asking the manager to click **[Approve RMA & Penalize Supplier]**. Once clicked, the Airtable score drops and an email is fired via the Gmail MCP to the supplier's sales rep.

---

## 📝 Summary of Why This Impresses Judges

If you explain Stage 1 like this, the judges will see that:
* **You aren't wasting tokens**: The LLM isn't trying to do everything at once.
* **You understand real enterprise problems**: "Blind receiving" and "dock scheduling" are massive real-world headaches that standard chatbots can't fix.
* **You have safety nets**: The Orchestrator's HITL UI widgets prove that your AI is safe enough to deploy in a real business because it doesn't spend money or penalize partners without a human clicking "Approve".