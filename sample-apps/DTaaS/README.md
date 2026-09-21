<h1 align="center">
  <br />
  DTaaS
  <br />
  <p align="center">
    <img src="./docs/dtaas-banner.png" width="100%">
  </p>
</h1>

<h4 align="center">Device-Twin-as-a-Service — MCP Server for IoT Telemetry, Analytics & 3D Digital Twins</h4>

<p align="center">
  <a href="https://github.com/blackflash-exe/DTaas/actions">
    <img src="https://img.shields.io/github/actions/workflow/status/blackflash-exe/DTaas/deploy.yml?style=flat-square&label=build" alt="Build Status" />
  </a>
  <a href="https://github.com/blackflash-exe/DTaas/blob/main/LICENSE">
    <img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="License" />
  </a>
  <img src="https://img.shields.io/badge/NitroStack-MCP%20Framework-6c63ff?style=flat-square" alt="NitroStack" />
  <img src="https://img.shields.io/badge/ThingsBoard-IoT%20Platform-brightgreen?style=flat-square" alt="ThingsBoard" />
  <img src="https://img.shields.io/badge/Neon-PostgreSQL-3ECF8E?style=flat-square" alt="Neon DB" />
  <img src="https://img.shields.io/badge/Three.js-3D%20Visualization-black?style=flat-square" alt="Three.js" />
  <img src="https://img.shields.io/badge/version-1.0.0-orange?style=flat-square" alt="Version" />
</p>

<p align="center">
  <a href="#overview">Overview</a> •
  <a href="#features">Features</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#tools-reference">Tools Reference</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#configuration">Configuration</a> •
  <a href="https://blackflash-docs.vercel.app/">Documentation</a>
</p>

---
## Overview

**DTaaS** is a production-ready [NitroStack](https://nitrostack.ai) MCP server that bridges your IoT infrastructure with AI agents. It continuously synchronizes device telemetry from [ThingsBoard](https://thingsboard.io) into a [Neon PostgreSQL](https://neon.tech) database, exposes rich historical analytics and ML dataset generation, and can render interactive **3D Digital Twin visualizations** of any device using its live telemetry data.

> Built for AI-native IoT applications. Connect once — query, analyze, and visualize forever.

```
  ThingsBoard IoT Platform
          │
          │  REST API
          ▼
  ┌───────────────────────┐
  │  Background Sync      │  ◄── Runs every 10s, incremental fetch
  │  (per-device timers)  │
  └──────────┬────────────┘
             │
             ▼
  ┌───────────────────────┐
  │  Neon PostgreSQL      │  ◄── Persistent telemetry store
  │  (device_telemetry)   │
  └──────────┬────────────┘
             │
    ┌────────┴────────┬──────────────┐
    ▼                 ▼              ▼
  Historical       Analytics     3D Digital Twin
  Queries          & ML Export   Visualization
    │                 │              │
    └────────┬────────┴──────────────┘
             │
             ▼
    NitroStack MCP Server
    (58 tools · HTTP + STDIO)
```

---

# Problem Statement

Industrial organizations generate enormous amounts of IoT telemetry, but transforming this data into useful Digital Twins remains difficult and fragmented.

Current Digital Twin platforms suffer from several limitations:

- Multiple disconnected platforms for telemetry, analytics, visualization, and simulation.
- Manual Digital Twin creation requiring domain experts.
- No standardized AI-assisted engineering workflow.
- Historical telemetry is difficult to reuse for analytics and machine learning.
- Simulation models require significant engineering effort.
- Existing platforms lack lifecycle management, version control, validation, and automated deployment.

These limitations increase engineering effort, slow deployment, reduce scalability, and make Digital Twin technology difficult to adopt across industries.

---

# Our Solution

DTaaS (Digital Twin as a Service) is an AI-powered Digital Twin platform built on the **Model Context Protocol (MCP)**.

Instead of manually engineering Digital Twins, users simply describe their requirements in natural language. AI Planner and Twin Engineer Agents automatically generate complete Digital Twins, simulation models, telemetry schemas, dashboards, and deployment configurations.

DTaaS unifies:

- ThingsBoard IoT
- Neon PostgreSQL
- AI Planning Agents
- Digital Twin Engineering
- Simulation Twins
- Historical Analytics
- ML Dataset Generation
- Interactive 3D Visualization
- MCP Tools

into one intelligent platform that dramatically reduces Digital Twin development time while making Digital Twin technology accessible through AI.

---

# Solution Architecture

The DTaaS platform consists of four major layers.

### Requirement Layer

Users define their requirements through:

- Natural language prompts
- Industry-specific templates

Example requests:

- Create a centrifugal pump Digital Twin
- Build a predictive maintenance model
- Simulate water tank heating
- Generate a Digital Twin for an HVAC system

---

### AI Engineering Layer

The AI layer transforms user requirements into deployable Digital Twins.

#### Planner Agent

Responsible for:

- Understanding business requirements
- Selecting Digital Twin templates
- Planning engineering tasks
- Defining implementation strategy

#### Twin Engineer Agent

Responsible for:

- Telemetry schema generation
- Asset relationships
- Simulation model creation
- Dashboard generation
- Monitoring rules
- Deployment configuration

---

### Digital Twin Platform

The generated Digital Twin is deployed onto the DTaaS platform which provides:

- Continuous ThingsBoard synchronization
- Neon PostgreSQL telemetry storage
- Historical analytics
- ML dataset generation
- Simulation engine
- Interactive 3D Digital Twin visualization
- MCP tool interface

---


# Future direction

DTaaS follows an AI-driven engineering workflow that automates the complete Digital Twin lifecycle.

### Workflow

1. **User Requirement**
   - Users describe their Digital Twin using natural language or predefined templates.

2. **Planner Agent**
   - Converts business requirements into a structured engineering plan.

3. **Twin Engineer Agent**
   - Generates telemetry schemas, Digital Twin models, asset relationships, dashboards, and simulation logic.

4. **Twin Graph Library**
   - Reuses existing engineering templates, Digital Twin components, and best practices.

5. **Project Digital Twin**
   - A complete Digital Twin is automatically assembled.

6. **Engineering Validation**
   - Engineers review and validate AI-generated Digital Twins before deployment.

7. **Optimization & AI Recommendations**
   - AI continuously improves simulation quality, telemetry mappings, and Digital Twin performance.

8. **User Approval / Modification**
   - Users review, modify, or approve the generated Digital Twin.

9. **Version Control**
   - Every Digital Twin revision is stored with complete version history for traceability.

10. **Deployment**
    - Approved Digital Twins are automatically deployed using deployment adapters.

11. **Live Digital Twin**
    - The deployed Digital Twin continuously synchronizes telemetry, executes simulations, monitors assets, and delivers intelligent insights in real time.

---

## Features

### 🔄 Continuous Device Synchronization
Register any ThingsBoard device for automatic, incremental background telemetry sync. The service respects per-device intervals, prevents overlapping executions, and isolates failures so a single bad device never blocks others. Includes a self-healing circuit breaker that automatically pauses synchronization for any device after 3 consecutive failures to prevent server log spam.

### 📊 Historical Analytics & Statistics
Query any time range of stored telemetry directly from the Neon database — never hitting ThingsBoard again. Compute aggregate statistics (`min`, `max`, `avg`, `median`, `stdDev`, `count`) in a single database query.

### 🤖 ML Dataset Generation
Combine telemetry from multiple devices and metrics into structured CSV or JSON datasets, chunked and sorted chronologically. Ready to feed directly into ML training pipelines.

### 🧊 3D Digital Twin Visualization
Generate interactive Three.js 3D scenes for any device type using AI-powered mapping. Map live telemetry metrics to 3D part properties (rotation speed, color, scale, opacity) — no WebGL code required.

### 🏗️ Full IoT Platform Toolkit
A complete set of ThingsBoard management tools covering devices, assets, customers, dashboards, rule chains, alarms, users, and notifications — all exposed as MCP tools for AI agents.

---

## Architecture

### Module Overview

```
src/
├── modules/
│   ├── sync/                     # Core telemetry sync engine
│   │   ├── background-sync.service.ts   # Scheduler (OnApplicationBootstrap)
│   │   ├── sync-registry.service.ts     # Device registry (Neon)
│   │   ├── device-data.service.ts       # Schema + telemetry persistence
│   │   ├── thingsboard-client.service.ts# ThingsBoard REST client
│   │   └── sync.tools.ts                # MCP tool definitions
│   ├── thingsboard/              # ThingsBoard management API wrapper
│   ├── dashboard/                # Dashboard & widget management
│   ├── rule-chain/               # Rule chain orchestration
│   ├── digital-twin/             # Digital twin lifecycle
│   └── analytics/                # Statistics & dataset generation
└── visualization/                # 3D twin engine
    ├── telemetry-schema.service.ts
    ├── visual-mapping.service.ts
    ├── visual-mapping-agent.service.ts  # Gemini AI mapper
    └── scene-builder.ts                 # Three.js HTML generator
```

### Database Schema

| Table | Purpose |
|---|---|
| `device_sync_registry` | Registered devices, sync intervals, last-sync timestamps |
| `device_telemetry` | Time-series telemetry readings (metric, value, timestamp) |
| `telemetry_schemas` | Per-device-type metric schemas with expected value ranges |
| `visual_mappings` | 3D part-to-metric binding configurations |

---

## Tools Reference

DTaaS exposes **58 MCP tools** across 6 modules. Below is a summary.

### 🔁 Sync & Registry (8 tools)

| Tool | Description |
|---|---|
| `register_device_for_sync` | Register a device for continuous background sync |
| `unregister_device_for_sync` | Remove a device from the sync registry |
| `pause_device_sync` | Temporarily suspend sync for a device |
| `resume_device_sync` | Resume sync for a paused device |
| `get_device_sync_status` | Get registry entry and last sync state |
| `sync_device_now` | Force an immediate manual sync |
| `backfill_device_history` | Backfill a historical time window |
| `query_device_history` | Query stored telemetry by time range |

### 📈 Analytics & Export (3 tools)

| Tool | Description |
|---|---|
| `get_device_statistics` | Compute min/max/avg/median/stdDev aggregates |
| `create_training_dataset` | Generate a multi-device JSON/CSV ML dataset |
| `export_device_csv` | Export telemetry as a CSV file to disk |

### 🧊 3D Visualization (3 tools)

| Tool | Description |
|---|---|
| `generate_visual_mapping` | Use Gemini AI to generate a 3D part-metric binding |
| `preview_visual_mapping` | Preview a 3D scene using midpoint values (no live data needed) |
| `get_device_3d_view` | Render a live 3D HTML scene for a device using real telemetry |

### 🧠 Simulation Twin (4 tools)

| Tool | Description |
|---|---|
| `generate_simulation_model` | Use Gemini AI to generate a simulation model (equations/rates/rules) |
| `create_simulation_model` | Manually define a simulation model, bypassing Gemini API |
| `approve_simulation_model` | Mark a model as reviewed/trusted and configure overrides |
| `run_simulation` | Run the math integration engine and get time-series results |

### 🏗️ ThingsBoard Management (44 tools)

Full CRUD coverage for: **Devices**, **Assets**, **Customers**, **Users**, **Dashboards**, **Widgets**, **Rule Chains**, **Alarms**, **Notifications**, **Entity Groups**, and **Device Profiles**.

---

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org) >= 18
- [NitroStack CLI](https://nitrostack.ai) (`npm install -g @nitrostack/cli`)
- A [ThingsBoard](https://thingsboard.io) instance (cloud or self-hosted)
- A [Neon](https://neon.tech) PostgreSQL database

### 1. Clone & Install

```bash
git clone https://github.com/blackflash-exe/DTaas.git
cd DTaas
npm install
```

### 2. Configure Environment

Create `src/.env`:

```env
# ThingsBoard
TB_BASE_URL=https://your-thingsboard-host.com
TB_API_KEY=your_thingsboard_api_key

# Neon PostgreSQL
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require

# Gemini AI (for 3D visual mapping generation)
GEMINI_API_KEY=your_gemini_api_key
```

### 3. Run in Development

```bash
npm run dev
```

The server starts in dual mode — Streamable HTTP on `http://localhost:3000/mcp` and STDIO.

### 4. Deploy to NitroStack Cloud

```bash
git push origin main
```

Then deploy via the [NitroStack Cloud](https://nitrostack.ai) dashboard. Add the environment variables above in project settings.

---

## Configuration

### Sync Intervals

Each device can have its own sync interval:

```
register_device_for_sync(
  deviceId: "your-device-uuid",
  syncIntervalSeconds: 30     # default: 30s, minimum: 10s
)
```

### Sync Strategies

| Method | Use When |
|---|---|
| Background auto-sync | Continuous IoT monitoring |
| `sync_device_now` | Before an ad-hoc analytics query |
| `backfill_device_history` | Recovering data gaps or importing history |

---

## Simulation Twin Capability

The Simulation Twin module supports AI-assisted generation of a simulation model from a plain-language requirement, followed by safe, deterministic execution of that model.

### Configuration

Add `GEMINI_API_KEY` to your `.env` file:
```bash
GEMINI_API_KEY=your_google_gemini_api_key
```

### Model Lifecycle
1. **Draft:** When generated via `generate_simulation_model`, models start in `draft` status.
2. **Reviewed/Trusted:** Models requiring expert review (`requiresExpertReview: true`) must be reviewed and approved via `approve_simulation_model` before they can run.
3. **Approved:** Approved models can be safely executed.

### Tools

#### 1. `generate_simulation_model`
Uses AI to draft a simulation model (equations/rates/rules) from a plain-language requirement.
* **Inputs:**
  * `requirement` (string): Description of simulation behavior.
  * `domain` (string, optional): Contextual domain hint.

#### 2. `create_simulation_model`
Manually creates and saves a simulation model without using AI (ideal fallback for Gemini rate limits or outages).
* **Inputs:**
  * `domain` (string): Contextual domain (e.g. `physics`, `finance`).
  * `mode` (string): Execution mode (`equations`, `rates`, or `rules`).
  * `stateVars` (array): List of state variable names.
  * `params` (object): Parameter starting/constant values mapping.
  * `equations` (object, optional): Closed-form mathematical formulas.
  * `rates` (object, optional): Integration rate derivative formulas.
  * `rules` (array, optional): List of conditional actions.

#### 3. `run_simulation`
Runs a previously generated simulation model and returns the time-series result.
* **Inputs:**
  * `modelId` (string): UUID of the model to run.
  * `steps` (number, default: 24): Number of steps.
  * `dt` (number, default: 1): Step size.
  * `paramOverrides` (object, optional): Overrides for model params.

#### 4. `approve_simulation_model`
Marks a simulation model as reviewed/trusted, optionally correcting its equations.
* **Inputs:**
  * `modelId` (string): UUID of the model.
  * `reviewedBy` (string): Reviewer name.
  * `equationOverrides` (object, optional): Formula overrides to fix model rates/equations.

---

## Example Agent Prompts

Once connected to an MCP client (e.g. Claude Desktop, NitroStack Studio):

**Sync & Registry**
```
"Register device abc-123 for sync every 60 seconds."
"Show me the sync status of all my devices."
"Backfill the last 7 days of data for pump-01."
```

**Analytics**
```
"What was the average temperature of device abc-123 last week?"
"Show me the min and max RPM for the centrifugal pump yesterday."
"Generate a CSV of all sensor readings from the past month."
```

**3D Visualization & Simulation**
```
"Generate a 3D visual twin for device type centrifugal_pump."
"Show me the live 3D view of pump device abc-123."
"Draft a simulation model for a water tank heating up under constant solar radiation."
"Manually create a simulation model for thermodynamics mode rates..."
"Run simulation model model-uuid-123 for 50 steps."
```

**ThingsBoard Management**
```
"Create a new temperature sensor device in ThingsBoard."
"Add an alarm rule to alert when temperature exceeds 80°C."
"Create a dashboard with a telemetry timeseries widget for pump-01."
```

---

## Documentation

| Guide | Description |
|---|---|
| [Device Synchronization & Analytics](./docs/device-synchronization-analytics.md) | Full sync engine reference, registry API, analytics tools |
| [3D Twin Visualization & Mapping](./docs/3d-twin-visualization-mapping.md) | Visual mapping schema, Three.js scene builder, AI mapping |
| [Simulation Twin Guide](./docs/simulation-twin-guide.md) | AI-assisted simulation model generator & execution engine |
| [Dashboard Integration](./docs/dashboard-integration.md) | Dashboard & widget management tools reference |

> 📘 Full documentation website: _Coming soon_

---

## Tech Stack

| Layer | Technology |
|---|---|
| MCP Framework | [NitroStack](https://nitrostack.ai) |
| IoT Platform | [ThingsBoard](https://thingsboard.io) |
| Database | [Neon Serverless PostgreSQL](https://neon.tech) |
| 3D Rendering | [Three.js](https://threejs.org) (via CDN) |
| AI Mapping | [Gemini 2.5 Flash](https://deepmind.google/gemini) |
| Language | TypeScript (ESM) |
| Transport | HTTP Streamable + STDIO (dual mode) |

---

## Community
- Discord: <https://discord.gg/uVWey6UhuD>
- X: <https://x.com/nitrostackai>
- YouTube: <https://www.youtube.com/@nitrostackai>
- LinkedIn: <https://linkedin.com/company/nitrostack-ai/>
- GitHub: <https://github.com/nitrostackai>

---

## License

MIT © [blackflash-exe](https://github.com/blackflash-exe)

---

<p align="center">
  Built with ❤️ on <a href="https://nitrostack.ai">NitroStack</a>
</p>
