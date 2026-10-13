# 🏭 GearMind: Autonomous Industrial Plant Orchestration MCP Server

**GearMind** (by Semicolon Squad) is an autonomous multi-agent industrial supervisor platform built using the **NitroStack SDK** (Model Context Protocol).

It connects AI models (such as NitroStudio, ChatGPT, or Claude) directly to plant infrastructure, database storage (Supabase), and communication services (Gmail Nodemailer) to handle end-to-end inventory management, predictive maintenance, plant safety, quality control, and automated restocking.

---

## 📌 Features & Capabilities

- 📦 **Autonomous Inventory & Procurement** — Case-insensitive stock lookups in Supabase with auto-syncing purchase orders.
- 🛠️ **Predictive Machinery Maintenance** — Real-time telemetry monitoring, failure risk prediction, and automated dispatch of styled HTML Work Order emails via Gmail SMTP.
- 🚨 **Safety Sentinel & Escalation** — Plant-wide safety compliance auditing and emergency protocol triggers (line shutdown, evacuation).
- 📜 **Grounded Policy Resource** — Static MCP resource (`memo://manufacturing/inventory-rules`) enforcing industrial stock thresholds and supplier selection criteria.
- 🎯 **Master Multi-Domain Orchestration** — Pre-configured `@Prompt` template (`run_factory_supervisor`) coordinating multi-phase plant audits automatically.

---

## 🏗️ Architecture

The project follows a modular, dependency-injected architecture powered by NitroStack:

```
Semicolon_squad_nitrostack/
├── src/
│   ├── index.ts                      # App entrypoint (@McpApp bootstrap, HTTP port 3000 + STDIO)
│   ├── app.module.ts                 # Re-exports AppModule from modules
│   ├── maintenance.tools.ts          # Telemetry logic & Gmail SMTP Nodemailer handler
│   ├── safety.tools.ts               # Safety compliance & emergency protocol logic
│   └── modules/                      # Controller & Module Layer
│       ├── app.module.ts             # Root @Module linking all domain controllers
│       ├── app.controller.ts         # System utility controller (hello tool)
│       ├── inventory.controller.ts   # Inventory stock checking controller (@Tool)
│       ├── procurement.controller.ts # Catalog search & order placement with auto-inventory sync
│       ├── policy.controller.ts      # Manufacturing inventory rules resource (@Resource)
│       ├── maintenance.controller.ts # Machinery health & work order dispatch (@Tool)
│       ├── safety.controller.ts      # Hazard audit & emergency escalation (@Tool)
│       └── orchestrator.controller.ts # Master multi-domain prompt orchestrator (@Prompt)
├── dist/                             # Compiled JavaScript output
├── tsconfig.json                     # TypeScript config with experimentalDecorators enabled
├── package.json                      # Project dependencies & scripts
└── .env                              # Environment credentials (Supabase & Gmail)
```

---

## ⚙️ Prerequisites

- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **Supabase Account**: For database storage
- **Gmail Account**: For sending work order notifications (requires an App Password)

---

## 🚀 Installation Steps

**1. Clone the Repository**

```bash
git clone https://github.com/KIrItH27/Semicolon_squad_nitrostack.git
cd Semicolon_squad_nitrostack
```

**2. Install Dependencies**

```bash
npm install
```

**3. Verify TypeScript Configuration**

Ensure `tsconfig.json` has `experimentalDecorators` and `emitDecoratorMetadata` enabled:

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

---

## 🔑 Environment Setup (`.env`)

Create a `.env` file in the root of your project:

```env
# Supabase Backend Credentials
SUPABASE_URL="https://your-supabase-project-id.supabase.co"
SUPABASE_PUBLISHABLE_KEY="your-supabase-anon-or-service-key"

# Gmail SMTP Credentials for Maintenance Dispatch
GMAIL_USER="your-email@gmail.com"
GMAIL_PASS="your-16-character-app-password"
```

💡 **Generating a Gmail App Password:** Go to your Google Account ➔ Security ➔ 2-Step Verification ➔ App Passwords ➔ Create a password named "NitroStack" and paste the 16-character string into `GMAIL_PASS`.

---

## 🗄️ Database Setup (Supabase SQL)

Run the following SQL snippet in your Supabase SQL Editor to create the required tables:

```sql
-- 1. Inventory Table
CREATE TABLE IF NOT EXISTS inventory (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Supplier Catalog Table
CREATE TABLE IF NOT EXISTS supplier_catalog (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item_name TEXT NOT NULL,
  supplier_name TEXT NOT NULL,
  price_per_unit NUMERIC NOT NULL,
  delivery_days INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Order History Table
CREATE TABLE IF NOT EXISTS order_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item_name TEXT NOT NULL,
  supplier_name TEXT NOT NULL,
  quantity_ordered INTEGER NOT NULL,
  total_cost NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Seed Sample Data
INSERT INTO inventory (name, quantity)
VALUES ('Ball-bearing', 2), ('Servo Motor', 1), ('Hydraulic Oil', 10)
ON CONFLICT (name) DO NOTHING;

INSERT INTO supplier_catalog (item_name, supplier_name, price_per_unit, delivery_days)
VALUES
  ('Ball-bearing', 'Apex Industrial Supply', 15.50, 2),
  ('Ball-bearing', 'Global Parts Corp', 12.00, 5),
  ('Servo Motor', 'RoboDrive Systems', 450.00, 3)
ON CONFLICT DO NOTHING;
```

---

## 🛠️ Usage Instructions

### 1. Running the Development Server

Starts the server with live reloading via `tsx`:

```bash
npm run dev
```

- The NitroStack HTTP server starts at: `http://localhost:3000/mcp`
- Standard I/O (STDIO) transport is active for client binding.

### 2. Building for Production

Compiles TypeScript into `dist/`:

```bash
npm run build
```

### 3. Starting Production Build

```bash
npm start
```

---

## 🔌 Connecting to NitroStudio / AI Clients

1. Open NitroStudio or your preferred MCP client.
2. Connect to the HTTP endpoint: `http://localhost:3000/mcp` (or select STDIO mode).
3. The server will expose **9 active tools, 1 policy resource, and 1 master prompt**:

| Tool Name | Category | Function |
|---|---|---|
| `check_stock` | Inventory | Checks stock quantity in Supabase (case-insensitive). |
| `find_supplier` | Procurement | Queries supplier catalog for prices & lead times. |
| `place_order` | Procurement | Writes to `order_history` & increments inventory. |
| `check_machine_health` | Maintenance | Audits machine temperature & vibration telemetry. |
| `predict_failure` | Maintenance | Diagnostic prediction of machine component burnout risk. |
| `schedule_maintenance` | Maintenance | Creates work order & dispatches Gmail SMTP email. |
| `check_compliance_event` | Safety | Audits safety hazard levels across plant zones. |
| `escalate_incident` | Safety | Triggers emergency escalation & shutdown protocols. |

---

## 🧪 Quick Test Prompt

Paste this prompt into your MCP client to trigger the full multi-agent workflow:

```
You are the FactoryMind Autonomous Plant Supervisor.
1. Inspect policies at resource 'memo://manufacturing/inventory-rules'.
2. Call 'check_stock' for item "Ball-bearing". If below 5 units, call 'find_supplier' and 'place_order' to restock to 10 units.
3. Call 'check_machine_health' and 'predict_failure' for machine "MCH-212". Call 'schedule_maintenance' to email the technician.
4. Call 'check_compliance_event' for zone "ZONE-C-WELDING". Call 'escalate_incident' if hazards are present.
Provide a consolidated executive operations summary.
```
