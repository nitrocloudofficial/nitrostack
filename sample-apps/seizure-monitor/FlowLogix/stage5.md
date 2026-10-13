# 🚚 Stage 5: Outbound & Shipping — Architectural Execution Flow

### What happens in this stage?
Picked items arrive at the packing station. They must be boxed, assigned a shipping label (FedEx, UPS, DHL), and loaded onto the correct outbound truck. This stage focuses on saving money through "Rate Shopping" and handling last-minute packing errors before a box leaves the building.

---

## 🎭 The Roles of the Agents in Stage 5

* **The Orchestrator Agent**: The final checkpoint. It handles the shipping UI, confirms labels, and triggers external MCPs (like emailing the customer their tracking number).
* **The Supply Chain Agent (The Broker)**: Compares live shipping rates across different carriers to find the cheapest way to ship a box while still meeting the delivery deadline.
* **The Floor Operations Agent (The Loader)**: Manages the outbound dock doors. It ensures that pallets going to New York are loaded onto Truck A, and pallets going to Texas are loaded onto Truck B.

---

## 💸 Use Case 1: Autonomous Carrier Rate Shopping

### The Crisis
The default carrier for a 50kg box is UPS Next Day Air ($120). But the customer is only one state away, meaning FedEx Ground ($30) would still arrive by tomorrow.

### The Multi-Agent Execution Flow
1. **Trigger**: Packer scans the finalized box. Orchestrator calls the Supply Chain Agent.
2. **Supply Chain Agent Takes Over**: 
   * Calls `rate_shop_carriers()`. It checks distance, weight, and SLA deadlines. 
   * Realizes FedEx Ground saves $90 and still meets the delivery promise.
3. **Orchestrator (HITL)**: Renders a `CarrierRateWidget.tsx` showing the $90 cost savings. 
4. **Action**: Manager clicks **[Print FedEx Label]**. The system updates the DB, and the Gmail MCP automatically emails the tracking link to the customer.

## ❌ Use Case 2: Short-Ship (Missing Item at Packing)

### The Crisis
A picker drops off a bin at the packing station. The packer scans the items, but one item is missing. 

### The Multi-Agent Execution Flow
1. **Trigger**: Packer hits "Shortage" on their screen. Orchestrator wakes Floor Ops Agent.
2. **Floor Ops Agent**: 
   * Calls `trigger_emergency_repick()` to immediately send a nearby worker to grab the missing item.
   * Calls `hold_outbound_dock()` to tell the truck driver not to leave yet.
3. **Orchestrator Output**: Renders a `PackingShortageCard.tsx` and sends a Slack MCP alert to the floor supervisor to investigate the original picker's route for dropped items.

---

## 🛠️ The Tools You Will Build for Stage 5

Here are the specific NitroStack `@Tool` endpoints to code in `src/tools/shipping.tool.ts`:

* **`rate_shop_carriers`**: Compares shipping costs vs. SLA deadlines to pick the best carrier.
* **`generate_shipping_label`**: Finalizes the shipment and generates a tracking number.
* **`trigger_emergency_repick`**: Handles missing items at the packing phase.
* **`assign_outbound_dock`**: Directs packed pallets to the correct truck door.