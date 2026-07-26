# FactoryOS — Simulation Dataset

## What's in here

```
data/
  state.json                  <- single source of truth, ALL agents read/write this
  state.baseline.json         <- auto-created on first run, used by "reset"
  apply_scenario.js           <- merges a crisis patch into state.json
  generate_business_metadata.py <- Faker generator for names/IDs (already run once)
  business_metadata.json      <- output of the above: supplier/customer/tech name pools

  scenarios/
    index.json                 <- list of all 5 scenarios (for your UI dropdown/buttons)
    bearing_failure.json        <- PRIMARY rehearsed demo (matches the pitch deck)
    overheating.json            <- backup scenario 1
    inventory_stockout.json     <- backup scenario 2
    supplier_delay.json         <- backup scenario 3
    safety_breach.json          <- backup scenario 4

  maintenance-model/
    ai4i2020.csv                <- REAL AI4I 2020 dataset (UCI ML Repository, 10,000 rows)
    train_model.py               <- trains RandomForest on it (run once before demo)
    predict_failure.py           <- the actual predict_failure MCP tool backend
    failure_model.pkl            <- trained model (output of train_model.py)
    type_encoder.pkl             <- label encoder for machine Type (L/M/H)
    model_metrics.json            <- accuracy/precision/recall you can quote in your pitch
```

## What's real vs. handcrafted vs. Faker — and why

| Layer | Source | Why |
|---|---|---|
| Maintenance (`predict_failure`) | **Real AI4I 2020 dataset**, RandomForest trained on it | Judges may probe this specific tool ("is this a real model?"). It's the one place a genuine trained-on-real-data answer earns its keep. |
| Inventory, Production, Safety, Crisis scenarios | **Handcrafted JSON** | You need deterministic, rehearsable numbers — real data is noisy and won't hit "92°C" exactly when you click the demo button. |
| Suppliers, technicians, customers (names only) | **Faker**, seeded (`Faker.seed(42)`) | Purely cosmetic — judges won't check if a supplier is real, but a real-sounding name beats "Supplier A". All logic-relevant fields (price, delivery time, id) are still handcrafted and untouched by Faker. |

This matches the 90/10 split you described: ~90% of what actually drives the
simulation (telemetry→prediction, inventory logic, production routing, safety
rules, crisis timing) is either real data or deliberately handcrafted; ~10%
(the label text on suppliers/technicians/customers) is Faker.

## Setup — run these once before the hackathon demo

```bash
# 1. Train the real model (takes ~10 seconds)
cd maintenance-model
pip install scikit-learn pandas joblib --break-system-packages
python3 train_model.py

# 2. (Already done, but if you want to regenerate names)
cd ..
pip install faker --break-system-packages
python3 generate_business_metadata.py
```

## How the crisis simulation works

1. Judge/demo operator picks a scenario from `scenarios/index.json`.
2. Backend calls `applyScenario(scenarioId)` from `apply_scenario.js`.
3. This merges that scenario's `patch` object into `state.json` (dot-path keys,
   e.g. `"machines.M12.temperature_c": 92` sets `state.machines.M12.temperature_c = 92`).
   Each machine also has a `sensors` block (`air_temperature_k`, `process_temperature_k`,
   `rotational_speed_rpm`, `torque_nm`, `tool_wear_min`, `type`) shaped exactly like the
   AI4I dataset's columns — the crisis patches update these too, so the real model has
   real-shaped input to score.
4. Your Supervisor agent detects the change and kicks off the 5 agents in sequence.
5. The Maintenance agent's `predict_failure(machine_id)` call runs
   `maintenance-model/predict_failure.py`, which reads that machine's `sensors` block
   and returns a genuine model-scored probability (verified: `bearing_failure` → M12
   scores 98.3%, matching a real high-confidence failure row from the actual dataset;
   `overheating` → M21 correctly scores only 2.8%, since it's a coolant issue, not a
   mechanical one — the model isn't just reacting to temperature).
6. Each scenario file's `expected_agent_flow` array is your **cheat sheet** for what
   every other agent's MCP tool call and reasoning output should look like. Use these
   strings as few-shot examples in your agent prompts.
7. To reset for the next run/rehearsal: `node apply_scenario.js reset`.

## Wiring into MCP tools

| MCP Tool | Reads | Writes |
|---|---|---|
| `get_machine_health` | `machines.*` | — |
| `predict_failure` | `machines.*.sensors` → `maintenance-model/predict_failure.py` (real model) | — |
| `check_inventory` | `inventory.*` | — |
| `list_suppliers` | `suppliers[]` | — |
| `negotiate_supplier` | `suppliers[]` | — |
| `create_purchase_order` | `inventory.*` | new PO record (use `business_metadata.json` → `purchase_order_ids_pool` for a real-looking PO number if you want variety beyond `PO-5001` etc.) |
| `reroute_production` | `production.*`, `machines.*.produces_parts` | `production.*` |
| `assign_technician` | `technicians[]` | `technicians[].available` |
| `generate_safety_report` | `safety.*` | `safety.open_incidents`, `safety.compliance_status` |
| `estimate_business_impact` | `finance.*`, `production.*` | — |
| `create_incident_timeline` | all of the above | — (for your Incident Center UI replay) |

## Demo-day tips

- **Rehearse `bearing_failure` until it's smooth** — it's your primary live demo,
  matching the pitch deck story beat-for-beat, and it's tuned to a real 98%-confidence
  failure signature from the actual dataset.
- If a judge asks "what if it's a different kind of crisis" or "is that model real",
  you now have two strong answers ready: trigger a different scenario live, and point
  to `model_metrics.json` for real accuracy/precision/recall numbers.
- Always run `node apply_scenario.js reset` between rehearsals and before the real
  demo starts, so machines start green.
- If you add SQLite later, keep `state.json` as the seed data you `INSERT` from —
  don't rewrite the schema, just migrate the shape as-is.
- Dataset citation if anyone asks: S. Matzka, "Explainable Artificial Intelligence
  for Predictive Maintenance Applications," 2020 (AI4I 2020, UCI ML Repository).
