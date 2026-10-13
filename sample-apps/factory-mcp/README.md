

# FactoryLens MCP

FactoryLens is a [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server for smart factory operations. It exposes machine telemetry, maintenance records, equipment manuals, and production schedules as structured MCP tools, resources, and prompts so AI assistants can run a full equipment failure investigation—from sensor anomaly detection through root cause analysis, business impact estimation, work order creation, and report generation—without switching between spreadsheets, log exports, and PDF manuals.

Built for the [Factory MCP Hackathon](https://github.com/janakir2006/Factory-mcp-Hackathon) on the [NitroStack](https://nitrostack.ai) SDK.

---

## The Problem

When a machine triggers a telemetry alert, plant operators typically pull data from several disconnected sources: CSV sensor exports, SQLite or ERP maintenance logs, plain-text or PDF manuals, and production scheduling spreadsheets. Each hop adds delay, and it is difficult to connect a temperature spike on the shop floor to a specific production line's revenue exposure.

FactoryLens consolidates that workflow behind a single MCP server. An AI client (Cursor, Claude Desktop, NitroStudio, or any MCP-compatible host) can chain seven investigation tools in sequence, read factory data through four resources, and use role-specific prompts to communicate findings to technicians and managers—all from the chat interface.

---

## Key Features

- **Sensor anomaly analysis** — Parses CSV telemetry (`timestamp`, `temperature`, `vibration`, `current`, `voltage`) and flags readings against configurable safety thresholds (65 °C, 2.5 mm/s, 4.0–5.5 A).
- **Maintenance history lookup** — Queries SQLite for repair logs by machine ID, ordered by date.
- **Manual search** — Full-text search across machine operating manuals with contextual line snippets (supports MCH-001 through MCH-005).
- **Root cause synthesis** — Combines sensor anomalies, maintenance history, manual excerpts, and live weather from [Open-Meteo](https://open-meteo.com) (factory coordinates: Kerala, India) into a diagnosis with confidence score, evidence, and recommendations.
- **Business impact prediction** — Estimates downtime hours, production loss in INR, and risk level from the production schedule and severity input.
- **Work order management** — Inserts maintenance tickets into SQLite and sets machine status to `critical` for high or emergency urgency.
- **Investigation reports** — Compiles a Markdown failure report returned in the tool response and saved to `uploads/` when the filesystem is writable.
- **Interactive widgets** — Seven NitroStack widgets (Next.js) render tool output inside MCP ext-apps clients.
- **Role-specific prompts** — Pre-built prompts for field technicians, plant managers, and emergency shutdown advisories.
- **Demo frontend** — A standalone React console that walks through the MCH-004 conveyor failure scenario with charts and a NitroChat-style interface (uses simulated data, not the live MCP server).

---

## Tech Stack

| Layer | Technologies |
|---|---|
| MCP Server | [NitroStack](https://nitrostack.ai) (`@nitrostack/core`, `@nitrostack/cli`) |
| Language | TypeScript |
| Validation | Zod |
| Database | SQLite3 (`database/factory.db`, auto-created and seeded) |
| Widgets | Next.js 14, React 18, `@nitrostack/widgets`, `@modelcontextprotocol/ext-apps` |
| Frontend Demo | React 19, Vite 8, Tailwind CSS v4, Chart.js, Lucide icons |
| External Data | Open-Meteo forecast API (weather, no API key required) |
| Protocol | [Model Context Protocol](https://modelcontextprotocol.io) |

---

## Architecture

<img width="559" height="590" alt="Screenshot 2026-07-18 at 12 55 51 PM" src="https://github.com/user-attachments/assets/6d56f6c6-7f4d-4d1a-ac1d-2c7e2d509ad8" />



### Module layout

The server follows NitroStack's NestJS-style module pattern:

- **`AppModule`** — Root module; registers `ConfigModule`, `FactoryModule`, and `SystemHealthCheck`.
- **`FactoryModule`** — Feature module registering `FactoryTools`, `FactoryResources`, `FactoryPrompts`, and `DatabaseService`.
- **`DatabaseService`** — Injectable SQLite service that creates tables and seeds demo data on first run.

### Investigation workflow

The intended MCP tool chain for a failure event:

1. `analyze_sensor_data` — Upload or read sensor CSV; detect threshold breaches.
2. `get_maintenance_history` — Pull recent repairs for the affected machine.
3. `search_machine_manual` — Find relevant manual sections (e.g. E101, overheating).
4. `analyze_root_cause` — Synthesize a diagnosis from the above inputs plus live weather.
5. `predict_business_impact` — Estimate downtime and revenue loss.
6. `create_work_order` — Log a maintenance ticket and update machine status.
7. `generate_investigation_report` — Produce a Markdown report for stakeholders.

<img width="620" height="669" alt="Screenshot 2026-07-18 at 11 44 27 AM" src="https://github.com/user-attachments/assets/0c8417b1-e270-4fff-8136-aea169525e67" />


The primary demo scenario centers on **MCH-004** (Conveyor System, Packaging Line 1). Sample sensor data in `database/sensor.csv` shows rising temperature, vibration, and current that point to drive belt slippage—the same pattern the rule engine in `analyze_root_cause` is designed to detect.

---

## Folder Structure

```
Factory-mcp-Hackathon/
├── src/                              # MCP server source (compiled to dist/)
│   ├── index.ts                      # Server bootstrap (McpApplicationFactory)
│   ├── app.module.ts                 # Root NitroStack module
│   ├── database/
│   │   └── db.ts                     # SQLite service, schema, and seed data
│   ├── health/
│   │   └── system.health.ts          # Memory and uptime health check
│   ├── modules/factory/
│   │   ├── factory.module.ts         # Factory feature module
│   │   ├── factory.tools.ts          # MCP tools (7)
│   │   ├── factory.resources.ts      # MCP resources (4)
│   │   └── factory.prompts.ts        # MCP prompts (3)
│   └── widgets/                      # NitroStack interactive widgets (Next.js)
│       ├── app/
│       │   ├── sensor-anomaly-dashboard/
│       │   ├── root-cause-investigation/
│       │   ├── maintenance-history/
│       │   ├── manual-search/
│       │   ├── business-impact/
│       │   ├── work-order/
│       │   └── investigation-report/
│       └── widget-manifest.json
├── frontend/                         # Standalone demo React app (simulated workflow)
│   └── src/App.tsx                   # FactoryLens investigation console
├── database/
│   ├── factory.db                    # SQLite database (auto-created on first run)
│   └── sensor.csv                    # Sample telemetry for MCH-004
├── resources/manuals/
│   ├── MCH-001-manual.txt            # CNC Milling Machine manual
│   ├── MCH-002-manual.txt            # Robotic Welder manual
│   ├── MCH-003-manual.txt            # Injection Molder manual
│   ├── MCH-004-manual.txt            # CS-400 conveyor maintenance manual
│   └── MCH-005-manual.txt            # Hydraulic Press manual
├── uploads/                          # Uploaded CSVs and generated reports
├── .env.example                      # Environment variable template
├── package.json                      # MCP server dependencies and scripts
├── tsconfig.json                     # TypeScript config (excludes src/widgets)
└── start-mcp.cmd                     # Windows production start helper
```

---

## Prerequisites

- **Node.js** 18+ (22 recommended)
- **npm** 9+
- Network access for live weather lookups in `analyze_root_cause` (falls back to static values if Open-Meteo is unreachable)

---

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/janakir2006/Factory-mcp-Hackathon.git
cd Factory-mcp-Hackathon
```

### 2. Install MCP server dependencies

```bash
npm install
```

Or use the NitroStack installer to pull server and widget dependencies together:

```bash
npm run install:all
```

### 3. Configure environment

```bash
cp .env.example .env
```

Edit `.env` only if you need to change transport mode, port, or log level (see [Environment Variables](#environment-variables) below).

### 4. (Optional) Frontend demo

```bash
cd frontend
npm install
cd ..
```

### 5. (Optional) Widgets

```bash
cd src/widgets
npm install
cd ../..
```

---

## Running the Project

### MCP server (development)

Starts the server over STDIO, which is the default for local MCP clients:

```bash
npm run dev
```

On first start, SQLite creates `database/factory.db` and seeds five machines (MCH-001 through MCH-005) with maintenance logs and production schedules.

### MCP server (production)

Builds TypeScript to `dist/` and starts with dual transport (STDIO + HTTP SSE):

```bash
npm run build
npm run start:prod
```

Alternatively:

```bash
npm start
```

This runs `build` then `start:prod` in one step.

On Windows, `start-mcp.cmd` wraps `npm run start:prod` (update the `cd` path inside the script to match your local checkout).

### Frontend demo console

```bash
cd frontend
npm run dev
```

Open the URL Vite prints (typically `http://localhost:5173`). The frontend runs a **simulated** investigation flow for MCH-004 with hardcoded telemetry charts and mock tool outputs—it does not call the MCP server directly.

### Widgets (for NitroStack / MCP ext-apps)

```bash
cd src/widgets
npm run dev
```

Widgets serve on port **3001**. Each tool that declares a `@Widget(...)` decorator maps to a page under `src/widgets/app/`.

### Testing with NitroStudio

[NitroStudio](https://nitrostack.ai/studio) is the recommended way to exercise tools, resources, prompts, and widgets during development.

---

## Environment Variables

Copy `.env.example` to `.env` and adjust as needed:

| Variable | Default | Description |
|---|---|---|
| `NITRO_LOG_LEVEL` | `info` | Server log verbosity |
| `NITROSTACK_APP_MODE` | `openai` | NitroStack app mode |
| `MCP_TRANSPORT_TYPE` | `stdio` (dev) / `dual` (prod) | Transport: `stdio`, `http`, or `dual` |
| `PORT` | `3000` | HTTP port when using HTTP or dual transport |
| `HOST` | `localhost` | HTTP bind address |
| `ENABLE_CORS` | — | Enable CORS for HTTP transport |
| `NODE_ENV` | — | Set to `production` to enable dual transport and use `/tmp/factorylens-uploads` for file uploads |

No API keys are required for the core server. All factory data is local (SQLite + text files). Weather data is fetched from Open-Meteo without authentication.

---

## MCP Server Reference

**Server name:** `factory-mcp-server`  
**Version:** `1.0.0`

### Tools and tasks

| Tool | Description | Widget |
|---|---|---|
| `analyze_sensor_data` | Parse sensor CSV and detect anomalies (temp > 65 °C, vibration > 2.5 mm/s, current outside 4.0–5.5 A) | `sensor-anomaly-dashboard` |
| `get_maintenance_history` | Fetch maintenance logs for a machine from SQLite | `maintenance-history` |
| `search_machine_manual` | Search manuals for error codes and troubleshooting text | `manual-search` |
| `analyze_root_cause` | Diagnose failure from anomalies, history, manual matches, and live weather | `root-cause-investigation` |
| `predict_business_impact` | Estimate downtime, production loss (INR), and risk level | `business-impact` |
| `create_work_order` | Insert a maintenance ticket; set machine status to `critical` for high/emergency urgency | `work-order` |
| `generate_investigation_report` | Compile and save a Markdown investigation report | `investigation-report` |

### Resources

| URI | Description |
|---|---|
| `factory://manuals/{machine_id}` | Machine operating manual (plain text) |
| `factory://maintenance/{machine_id}` | Maintenance history (JSON) |
| `factory://production/schedule` | Active production schedules with machine status |
| `factory://machines/specs` | Fleet inventory and status |

### Prompts

| Prompt | Purpose |
|---|---|
| `explain_to_technician` | Field advisory with LOTO guidelines and corrective steps |
| `summarize_for_manager` | Executive summary with downtime, cost, and priority |
| `emergency_shutdown_recommendation` | Critical shutdown advisory with safety commands |

### Sample data

On first run, SQLite is seeded with five machines, fifteen maintenance log entries, and five production schedules. Sample sensor telemetry lives at `database/sensor.csv`. Equipment manuals for all five machines are in `resources/manuals/`.

---

## Connecting an MCP Client

Build the server first, then point your client at the compiled entry point.

Example Cursor MCP config (STDIO):

```json
{
  "mcpServers": {
    "factory-lens": {
      "command": "node",
      "args": ["dist/index.js"],
      "cwd": "/path/to/Factory-mcp-Hackathon"
    }
  }
}
```

For development, you can also use `npm run dev` via your client's preferred command wrapper.

For HTTP transport, set `MCP_TRANSPORT_TYPE=http` or `dual` and configure your client to connect to `http://localhost:3000` (default port).

---

## Future Improvements

- **Live frontend ↔ MCP integration** — Wire the React demo console to the MCP server over HTTP instead of mock data and `setTimeout` simulations.
- **Real-time sensor ingestion** — Stream telemetry from MQTT or OPC-UA instead of CSV uploads.
- **LLM-driven root cause analysis** — Replace the rule-based diagnosis in `analyze_root_cause` with model inference while keeping structured tool outputs.
- **Multi-machine correlation** — Detect failures that span production lines or shared utilities.
- **Authentication and RBAC** — Role-based access for operators, engineers, and managers.
- **Dedicated work order schema** — Separate pending work orders from completed maintenance history records.
- **Alert webhooks** — Notify Slack or Teams when anomalies or emergency work orders are created.
- **Configurable thresholds** — Move safety limits (65 °C, 2.5 mm/s, etc.) to environment variables or per-machine specs.

---

## Team

Built for the Factory MCP Hackathon.

| Name | GitHub |
|------|--------|
| Janaki R | [@janakir2006](https://github.com/janakir2006) |
| Mokshitha Yarlagadda | [@Mokshitha2007](https://github.com/Mokshitha2007) |
| Ajalya TM | [@ajalya](https://github.com/ajalya) |
| Praneeth Kothamaddi | [@k-praneeth567](https://github.com/k-praneeth567) |

Repository: [github.com/janakir2006/Factory-mcp-Hackathon](https://github.com/janakir2006/Factory-mcp-Hackathon)

---

## License

MIT License — see project footer in the frontend demo.

---


## 🚀 Live Deployment

🌐 **NitroChat:**  
https://nitrochat-factory-metaminds-amrita-university-amritapuri-campus.app.nitrocloud.ai/

⚙️ **MCP Server:**  
https://factory-mcp-6a5a6-metaminds-amrita-university-amritapuri-campus.app.nitrocloud.ai/



## Related Links

- [NitroStack Documentation](https://docs.nitrostack.ai)
- [NitroStudio](https://nitrostack.ai/studio) — MCP testing and debugging
- [Model Context Protocol](https://modelcontextprotocol.io)
- [Open-Meteo API](https://open-meteo.com) — Weather data used in root cause analysis
```

