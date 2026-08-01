# 🎬 FlowLogix Demo Recording Script

This script provides a 10-step narrative to showcase the capabilities of the FlowLogix Hierarchical Multi-Agent System. It highlights how the AI seamlessly integrates with external systems (Slack & Gmail) to handle real-world supply chain and warehouse emergencies.

To record the demo, copy and paste the "User Prompt" into your chat UI, and watch the Orchestrator delegate to the correct sub-agent and execute the tools!

---

## 🚚 Scenario 1: The Inbound Delay
*The Floor Ops agent detects a truck delay via IoT GPS and reschedules the dock door.*

### 1. `check_inbound_delays`
**Goal:** Detect any incoming trucks that are currently stuck in traffic.
**User Prompt:** "Can you check Samsara GPS to see if there are any delays with inbound trucks?"
**Expected Tool Input (JSON):**
```json
{
  "provider": "Samsara"
}
```

### 2. `reschedule_dock_slot`
**Goal:** Reschedule the delayed truck and notify the dock team via Slack.
**User Prompt:** "TRK-001 is delayed by 45 minutes. Please reschedule its dock slot so it doesn't block other arrivals."
**Expected Tool Input (JSON):**
```json
{
  "truck_id": "TRK-001",
  "delay_minutes": 45
}
```

---

## ☢️ Scenario 2: The Hazmat Putaway
*The Floor Ops agent isolates dangerous goods and alerts the safety team.*

### 3. `replan_putaway`
**Goal:** Assign a special zone for a hazardous material and alert `#warehouse-safety` on Slack.
**User Prompt:** "We just received a 600kg pallet of CHEM-X. It is considered hazardous material. Plan the putaway for it."
**Expected Tool Input (JSON):**
```json
{
  "sku": "CHEM-X",
  "weight": 600,
  "is_hazmat": true
}
```

---

## ❄️ Scenario 3: The Cold Chain Breach
*The Floor Ops agent detects an IoT temperature spike, sends a Slack alert, and files an official email report via Gmail.*

### 4. `get_telemetry_alerts`
**Goal:** Monitor the cold storage fridge for temperature excursions.
**User Prompt:** "Pull the latest IoT telemetry alerts for Zone CC. Are there any temperature breaches?"
**Expected Tool Input (JSON):**
```json
{
  "zone": "CC"
}
```

---

## 📉 Scenario 4: The Imminent Stockout
*The Supply Chain agent calculates days of supply and warns the procurement team.*

### 5. `calculate_days_of_supply`
**Goal:** Calculate how many days of inventory remain before a stockout.
**User Prompt:** "Can you calculate the days of supply for SKU-104? We've been consuming it pretty fast."
**Expected Tool Input (JSON):**
```json
{
  "sku": "SKU-104"
}
```

---

## 🚨 Scenario 5: The SLA Emergency
*The Supply Chain agent flags an order in jeopardy, emails the VIP customer, and the Floor Ops agent interrupts a worker to pick it.*

### 6. `audit_sla_deadlines`
**Goal:** Find orders at risk of missing the carrier cutoff time.
**User Prompt:** "Run an audit on our SLA deadlines for the next 60 minutes. Are there any VIP orders in jeopardy of missing the truck?"
**Expected Tool Input (JSON):**
```json
{
  "time_horizon_minutes": 60
}
```

### 7. `inject_priority_pick`
**Goal:** Interrupt a worker's queue to save the Tata Motors order.
**User Prompt:** "The Tata Motors order (ORD-TATA-999) is in critical jeopardy! Inject a priority pick task to the Outbound Dock zone immediately."
**Expected Tool Input (JSON):**
```json
{
  "order_id": "ORD-TATA-999",
  "zone": "Outbound Dock"
}
```

---

## 📦 Scenario 6: The Smart Shipper
*The Supply Chain agent rate-shops carriers to save money, then generates the label.*

### 8. `rate_shop_carriers`
**Goal:** Compare UPS Next Day vs FedEx Ground to save $90.
**User Prompt:** "Can you rate shop carriers for ORD-101? The box weighs 15kg and is heading to zip 90210."
**Expected Tool Input (JSON):**
```json
{
  "order_id": "ORD-101",
  "weight_kg": 15,
  "destination_zip": "90210"
}
```

### 9. `generate_shipping_label`
**Goal:** Finalize the shipment and email the customer the tracking number via Gmail.
**User Prompt:** "Generate a shipping label for ORD-101 using FedEx Ground and email the tracking info to customer@example.com."
**Expected Tool Input (JSON):**
```json
{
  "order_id": "ORD-101",
  "carrier": "FedEx Ground",
  "customer_email": "customer@example.com"
}
```

---

## 🛑 Scenario 7: The Safety Guardrail
*The Floor Ops agent prevents an uncertified worker from operating heavy machinery.*

### 10. `check_certifications`
**Goal:** Block worker W-109 due to an expired forklift license.
**User Prompt:** "We need a forklift driver. Can you check if worker W-109 has an active FORKLIFT_CLASS_A certification?"
**Expected Tool Input (JSON):**
```json
{
  "worker_id": "W-109",
  "required_cert": "FORKLIFT_CLASS_A"
}
```
