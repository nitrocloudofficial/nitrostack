# AI Production Planner MCP (`auto-planner-mcp`)

An Industry 4.0 AI Production Planning MCP (Model Context Protocol) Server for automotive manufacturing lines. This system provides unified assembly queue management, intelligent build plan resequencing, Just-In-Sequence (JIS) inventory tracking, Overall Equipment Effectiveness (OEE) analytics, and financial downtime impact calculations.

---

## 📐 System Architecture & Structure

```text
auto-planner-mcp/
├── data/                      # Industry 4.0 Mock Datasets
│   ├── assembly_queue.json    # Active vehicle assembly queue (VINs, models, seat types)
│   ├── inventory_jit.json     # Just-In-Time/Sequence parts inventory & ETA tracking
│   └── station_oee.json       # Assembly station efficiency & operational status
├── teammates/                 # Core Production Logic Engines
│   ├── dev_a/                 # Assembly Queue & Resequencing Module
│   │   ├── __init__.py
│   │   └── logic.py
│   └── dev_b/                 # Inventory & OEE Analytics Module
│       ├── __init__.py
│       └── logic.py
├── package.json               # NitroStack MCP server configuration
└── tsconfig.json              # TypeScript configuration
```

---

## ✨ Features & Production Tools

### 🚘 Assembly Queue & Resequencing Module
- **`get_assembly_sequence(shift_id: str, line_id: str)`**
  - Retrieves the active build queue for a specified shift and assembly line.
- **`resequence_build_plan(delay_reason: str, missing_option: str)`**
  - Dynamically resequences the assembly line schedule when part shortages occur (e.g., missing seat trims) by prioritizing available vehicle configurations and shifting delayed VINs to the end of the queue.

### 🏭 Inventory & Equipment Analytics Module
- **`check_jis_inventory(part_number: str, vin_sequence: str = None)`**
  - Checks stock levels, supplier ETAs, and shortage indicators for required JIS automotive components.
- **`calculate_station_oee(station_id: str)`**
  - Calculates Overall Equipment Effectiveness ($OEE = Availability \times Performance \times Quality$) for assembly stations (e.g., `STATION_WELDING`).
- **`estimate_downtime_cost(stopped_station_id: str)`**
  - Computes estimated financial losses based on station downtime duration (assumes $\$22,000/\text{min}$ for non-running stations).

---

## 📊 Data Schemas

| Dataset | File Path | Key Attributes |
| :--- | :--- | :--- |
| **Assembly Queue** | `data/assembly_queue.json` | `vin`, `model`, `trim`, `seat_type`, `status` |
| **JIT Inventory** | `data/inventory_jit.json` | `stock`, `supplier_eta`, `shortage` |
| **Station OEE** | `data/station_oee.json` | `availability`, `performance`, `quality`, `status` |

---

## 🚀 Running the MCP Server

```bash
# Start in development mode
npm run dev

# Build the project
npm run build

# Start production server
npm start
```
