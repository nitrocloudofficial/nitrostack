# 🤖 FlowLogix: AI-Native Warehouse Management System

## Project Context: Agentic AI Hackathon 2026
**FlowLogix** is built for the Manufacturing & Industry 4.0 track of the Agentic AI Hackathon 2026. 

Traditional warehouse managers waste hours cross-referencing disconnected software silos: Warehouse Management Systems (WMS) for rack space, ERPs for procurement, shift schedulers for labor, and logistics trackers for shipping. 

**FlowLogix** acts as a unified AI Operational Overlay. By leveraging the **Model Context Protocol (MCP)**, FlowLogix connects to all these disparate databases and external APIs (Slack, Gmail, Airtable, Twilio). An LLM Orchestrator translates natural language queries (or proactive IoT telemetry alerts) into deterministic backend tool executions using the **NitroStack framework** (`@nitrostack/core` and `@nitrostack/widgets`).

---

## 🏗️ The Hierarchical Multi-Agent Architecture

To operate efficiently under strict LLM token constraints (Sub-5 Million tokens), FlowLogix uses a **Hierarchical Multi-Agent Architecture**. 

Instead of a single monolithic agent that has access to all 15+ tools—which increases token consumption and the risk of hallucination—FlowLogix uses a **3-Agent System**: an Orchestrator and two specialized Sub-Agents. 

**How Execution Works (Situation-Dependent Routing):**
The Orchestrator Agent intercepts all user queries and system alerts. It analyzes the intent and **only wakes up the specific sub-agent required for the task**. For example, if a query involves a supplier delay, only the Supply Chain Agent is activated. If a query involves a forklift driver calling in sick, only the Floor Operations Agent is activated.

### 1. The Orchestrator Agent (The Boss)
**Role:** The main conversational interface and intent router.
* **Function:** Analyzes user prompts, reads persistent memory rules, delegates tasks to sub-agents, and enforces Human-in-the-Loop (HITL) approvals.
* **Wake Condition:** Always active (listens to chat inputs and system alerts).
* **Tools Accessible:**
  * `get_warehouse_summary`: Pulls the master RED/AMBER/GREEN status.
  * `read_persistent_memory`: Checks rules set by the manager.
  * `route_to_supply_chain`: Delegates procurement tasks.
  * `route_to_floor_ops`: Delegates physical movement tasks.
* **Widget Output:** Master Dashboard (`WarehouseHealthSummary.tsx`).

### 2. The Supply Chain Agent (The Buyer)
**Role:** Manages inbound freight, stock levels, reorder points, and supplier communication. 
* **Function:** Defends against stockouts and order breaches.
* **Wake Condition:** Woken by the Orchestrator when a query involves inventory, purchasing, or supplier delays.
* **Tools Accessible:**
  * `detect_stockouts`: Calculates Days of Supply.
  * `check_order_impact`: Runs ATP (Available-to-Promise) math for customer orders.
  * `find_alternate_supplier`: Queries the Airtable MCP for backup vendors.
  * `raise_purchase_order`: Drafts POs, posts to Slack, emails via Gmail.
* **Widget Outputs:** * `ShipmentIncidentCard.tsx` 
  * `EmergencyPOApproval.tsx` (HITL gatekeeper for spending money)

### 3. The Floor Operations Agent (The Floor Manager)
**Role:** Manages where physical boxes go, who is working which shift, and shipping out trucks.
* **Function:** Optimizes physical space, labor, and dispatch logistics.
* **Wake Condition:** Woken by the Orchestrator when a query involves worker schedules, dock doors, or rack space.
* **Tools Accessible:**
  * `replan_putaway`: Calculates shelf slotting based on ABC velocity and Hazmat isolation.
  * `check_worker_roster`: Reads schedules for shift absences.
  * `assign_workers`: Matches worker certifications to active tasks.
  * `get_shipping_prices`: Connects to ShipEngine MCP for outbound freight costs.
* **Widget Outputs:**
  * `InventoryHeatmap.tsx` 
  * `RosterGrid.tsx`

---

## 🧠 Core System Design Principles

1. **No LLM Math (Zero Hallucinations):** AI models are poor at math. The agents in FlowLogix do not calculate safety stock or delivery dates. They execute deterministic TypeScript functions built in the NitroStack `/services` backend, ensuring perfect mathematical accuracy.
2. **Strict Zod Guardrails:** All agent tool calls are guarded by strict Zod input validation schemas to prevent the LLM from passing incorrect data types.
3. **Human-in-the-Loop (HITL):** Agents cannot execute destructive actions (e.g., spending company money, penalizing suppliers, or sending external emails) autonomously. The Orchestrator pauses execution and renders a React UI Widget requiring the human manager to click **[Approve]**.
4. **Persistent Memory:** The Orchestrator retains managerial rules (e.g., "Always prioritize Tata Motors orders") in a persistent context layer, applying them to future decisions across all sub-agents.

---

## 🏭 The 6-Stage Warehouse Pipeline Overview

The Multi-Agent architecture manages the warehouse across 6 distinct physical stages.

### Stage 1: Inbound & Receiving (Supply Chain Agent)
* **What it is:** Trucks arriving, unloading pallets, and matching goods to Purchase Orders.
* **Key Use Cases:** * **Damaged Freight Dispute:** An OCR scan of crushed boxes triggers the agent to find a backup supplier and draft an emergency replacement PO before a customer order is missed.
  * **Inbound Traffic Delay:** GPS telemetry detects a delayed truck, prompting the agent to reschedule dock doors.

### Stage 2: Putaway & Storage Slotting (Floor Operations Agent)
* **What it is:** Moving received goods from the dock to specific rack shelves.
* **Key Use Cases:** * **Opportunity Cross-Docking:** Bypassing storage entirely by routing inbound goods directly to an awaiting outbound truck.
  * **Dynamic Zone Rebalancing:** Shifting items to overflow zones if the primary shelf is 90% full, while strictly isolating Hazmat goods.

### Stage 3: Inventory Control & Holding (Supply Chain / Floor Ops)
* **What it is:** Monitoring goods sitting on racks for environmental safety and turnover.
* **Key Use Cases:** * **Cold Chain IoT Breach:** A temperature sensor detects the medicine fridge is too warm; the agent immediately dispatches a certified worker to move the goods.
  * **Dead Stock Auditing:** Proactively identifying items that haven't moved in 90 days to free up expensive rack space.

### Stage 4: Picking & Packing (Supply Chain Agent)
* **What it is:** Fulfilling customer sales orders based on Available-to-Promise (ATP) math.
* **Key Use Cases:** * **Demand Surge Recalibration:** Detecting a spike in e-commerce orders and automatically recalculating the Reorder Point (ROP) to trigger an early purchase order.

### Stage 5: Workforce & Shift Management (Floor Operations Agent)
* **What it is:** Ensuring the right workers with the right safety certifications are assigned to active tasks.
* **Key Use Cases:** * **Skill-Matrix Rebalancing:** Detecting an unannounced worker absence (e.g., a forklift driver) and autonomously reassigning a qualified worker from a lower-priority task to prevent dock congestion.

### Stage 6: Dispatch & Logistics (Floor Operations Agent)
* **What it is:** Shipping packed boxes out via freight carriers.
* **Key Use Cases:** * **Multi-Carrier Rate Shopping:** Querying multiple shipping APIs to find the cheapest freight carrier that still guarantees delivery before the customer's SLA deadline.


nitrostack docs: https://docs.nitrostack.ai/