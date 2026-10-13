# SymBioForge

**Autonomous Circular Manufacturing Intelligence Platform**

---

## The Problem

India generates **62 million tonnes** of industrial waste annually. Most of it ends up in landfills, incinerators, or illegal dump sites. Factories operate in isolation, unaware that their waste could be another factory's raw material.

The core challenges:

- **No visibility** -- factories don't know what waste their neighbours produce or need
- **No matching** -- even if they knew, finding compatible waste-to-feedstock pairs across industries requires deep material science knowledge
- **No compliance automation** -- SPCB (State Pollution Control Board) filings are manual, error-prone, and often delayed
- **No circular economy incentives** -- without measurable CO2/cost savings data, there's no business case for symbiosis

## Our Solution

SymBioForge is an **AI-powered industrial symbiosis platform** that autonomously discovers waste-to-resource connections between manufacturing factories, invents new products from waste streams, and generates regulatory compliance reports.

**8 autonomous AI agents** work as a swarm -- no human-in-the-loop required:

| Agent | Role |
|-------|------|
| **Clerk** | Registers factories, validates data, generates SPCB compliance reports |
| **Scout** | Profiles new factories, discovers capabilities |
| **Profiler** | Classifies waste streams using a 44-material database |
| **Matchmaker** | Finds waste-to-feedstock matches using Haversine distance + composite scoring |
| **Inventor** | Generates novel circular product concepts from waste streams |
| **Auditor** | Validates impact claims, promotes top opportunities |
| **Architect** | Designs step-by-step manufacturing blueprints with equipment specs and CAPEX |
| **Sentinel** | Monitors ecosystem health, self-heals disrupted supply chains |

**Key outcomes:**
- Waste diverted from landfills into circular supply chains
- CO2 emissions reduced through material reuse
- Revenue generated from waste-derived products
- Automated SPCB Form V compliance reporting
- Real-time ecosystem monitoring with self-healing

---

## Architecture

```
                         Event Bus (Pub/Sub)
                               |
  Clerk --> Scout --> Profiler --> Matchmaker --> Inventor
                                                    |
                                   Auditor <--------+
                                      |
                                  Architect --> Sentinel
                                                  |
                                         (self-healing loop)

  State Manager (singleton)  <--- all agents read/write cluster state
  Scheduler (singleton)      --- drip feed (60s) + health checks (30s)
```

**Event chain:**
```
FACTORY_REGISTERED -> FACTORY_PROFILED -> WASTES_CLASSIFIED -> MATCHES_FOUND
-> PRODUCTS_INVENTED -> AUDIT_COMPLETE -> BLUEPRINTS_READY -> ECOSYSTEM_STABLE
```

**Two interfaces:**
1. **MCP Server** (NitroStudio) -- 14 tools with 9 interactive widgets
2. **Web Dashboard** (Next.js) -- standalone full-stack web app with REST API

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| MCP Server | NitroStack Framework (`@nitrostack/core`) |
| Web Frontend | Next.js 14, Tailwind CSS, Lucide icons |
| Web API | Next.js API Routes (wraps core engine) |
| Language | TypeScript (ES Modules, strict mode) |
| Validation | Zod schemas on all MCP tool inputs |
| MCP Widgets | Next.js + `@nitrostack/widgets` SDK |
| Protocol | Model Context Protocol (MCP) |

---

## Getting Started

### Prerequisites

- **Node.js** 18+ (LTS recommended)
- **npm** 9+
- **Git**

### Clone & Install

```bash
git clone https://github.com/kuchipudiyokshith9999-eng/SymBioForge.git
cd SymBioForge
```

---

## Running the MCP Server (Backend)

The MCP server exposes 14 tools and 9 interactive widgets via the Model Context Protocol.

### Install & Build

```bash
npm install
npm run build
```

### Run with NitroStudio (Recommended)

1. Download [NitroStudio](https://nitrostack.ai/studio)
2. Open NitroStudio, create a new project pointing to this directory
3. The server connects automatically -- you'll see 14 tools in the chat panel

### Run in Development Mode

```bash
npm run dev
```

### Available MCP Tools

| Tool | Description | Widget |
|------|-------------|--------|
| `get-cluster-state` | Live cluster state -- factories, matches, products, logs | Agent Swarm Monitor |
| `control-swarm` | Start, stop, or reset the autonomous agent swarm | Agent Swarm Monitor |
| `trigger-disruption` | Simulate a factory shutdown, watch Sentinel self-heal | Agent Swarm Monitor |
| `get-ecosystem-map` | Factory network with symbiotic waste flow edges | Ecosystem Map |
| `get-opportunity-feed` | Ranked matches and product concepts by score | Opportunity Feed |
| `get-carbon-metrics` | CO2 avoided, landfill diverted, water saved, financial value | Carbon Dashboard |
| `get-product-concepts` | AI-invented products from waste streams | Product Cards |
| `get-waste-profiles` | Per-factory classified waste streams | Waste Profiles |
| `get-pathway` | Step-by-step manufacturing blueprint for an opportunity | Pathway Viewer |
| `register-factory` | Register a new factory, triggers full agent chain | Compliance Dashboard |
| `get-compliance-report` | Generate SPCB Form V report for a factory | Compliance Dashboard |
| `calculate` | Basic arithmetic operations | Calculator |
| `convert_temperature` | Temperature unit conversion | Calculator |

---

## Running the Web Dashboard (Frontend)

The web dashboard is a standalone Next.js app with its own REST API layer, reusing the same business logic and data.

### Install & Run

```bash
cd web
npm install
npm run dev
```

Open **http://localhost:3000** in your browser.

### Web Dashboard Pages

| Page | URL | Description |
|------|-----|-------------|
| **Dashboard** | `/` | Stat cards, activity log, swarm controls |
| **Ecosystem Map** | `/ecosystem` | SVG factory network with symbiotic edges |
| **Factories** | `/factories` | Searchable factory card grid with filters |
| **Opportunities** | `/opportunities` | Ranked matches + products feed |
| **Products** | `/products` | Product concept cards with feasibility gauges |
| **Waste Profiles** | `/waste-profiles` | Per-factory waste stream cards |
| **Carbon Impact** | `/carbon` | Circular score gauge, impact metrics, before/after comparison |
| **Compliance** | `/compliance` | Factory compliance table with status tracking |

### Web API Endpoints

All endpoints are at `http://localhost:3000/api/`:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/cluster` | GET | Full cluster state with aggregate metrics |
| `/api/factories` | GET | All factories with waste streams |
| `/api/factories` | POST | Register a new factory |
| `/api/matches` | GET | All symbiotic matches |
| `/api/products` | GET | All product concepts |
| `/api/ecosystem` | GET | Nodes + edges for map visualization |
| `/api/carbon` | GET | Carbon and impact metrics |
| `/api/waste-profiles` | GET | Factories with classified waste streams |
| `/api/opportunities` | GET | Ranked opportunity feed |
| `/api/blueprints/:id` | GET | Blueprint by opportunity ID |
| `/api/swarm` | POST | Swarm control (`start` / `stop` / `reset`) |

---

## Project Structure

```
SymBioForge/
|
|-- src/                            # MCP Server (NitroStack)
|   |-- agents/                     #   8 autonomous agents
|   |   |-- clerk.agent.ts          #     factory registration + compliance
|   |   |-- scout.agent.ts          #     factory profiling
|   |   |-- profiler.agent.ts       #     waste stream classification
|   |   |-- matchmaker.agent.ts     #     symbiosis discovery
|   |   |-- inventor.agent.ts       #     product innovation
|   |   |-- auditor.agent.ts        #     impact validation
|   |   |-- architect.agent.ts      #     blueprint design
|   |   `-- sentinel.agent.ts       #     self-healing monitor
|   |
|   |-- core/                       #   Business logic engines
|   |   |-- types.ts                #     all interfaces
|   |   |-- waste-classifier.ts     #     44-material waste classification
|   |   |-- compatibility-matrix.ts #     waste-to-industry matching rules
|   |   |-- matching-algorithm.ts   #     Haversine + composite scoring
|   |   |-- product-generator.ts    #     circular product invention
|   |   |-- impact-calculator.ts    #     CO2, water, financial metrics
|   |   |-- pathway-planner.ts      #     manufacturing blueprints
|   |   `-- compliance-generator.ts #     SPCB Form V generation
|   |
|   |-- orchestrator/               #   Coordination layer
|   |   |-- event-bus.ts            #     pub/sub event system
|   |   |-- state-manager.ts        #     singleton cluster state
|   |   |-- scheduler.ts            #     drip feed + health checks
|   |   `-- agent-chain.ts          #     agent pipeline definition
|   |
|   |-- modules/                    #   NitroStack MCP tool modules
|   |-- widgets/                    #   9 Next.js widget UIs (for NitroStudio)
|   `-- data/                       #   JSON fixture data (15 factories, 44 materials)
|
|-- web/                            # Web Dashboard (Next.js)
|   |-- src/
|   |   |-- app/                    #   Pages (dashboard, ecosystem, factories, etc.)
|   |   |   `-- api/                #   REST API routes
|   |   |-- components/             #   Reusable UI components
|   |   `-- lib/                    #   Data layer + engine
|   |-- package.json
|   `-- tsconfig.json
|
|-- package.json                    # MCP server dependencies
|-- tsconfig.json                   # TypeScript config
`-- .gitignore
```

---

## Demo Walkthrough (5 minutes)

### Via NitroStudio

1. **`get-cluster-state`** -- Show the Agent Swarm Monitor with all 8 agents and live activity logs
2. **`get-ecosystem-map`** -- Show 15 factories connected by symbiotic waste flows
3. **`get-carbon-metrics`** -- Show circular economy score, CO2 avoided, financial value
4. **`get-opportunity-feed`** -- Show ranked matches and products sorted by score
5. **`register-factory`** with:
   ```json
   {
     "id": "fact_19",
     "name": "Demo Furniture Co",
     "industryType": "Furniture Manufacturing",
     "address": "SIDCO Phase III, Coimbatore",
     "lat": 11.025, "lng": 76.945,
     "productionCapacity": "2 tons/day furniture",
     "rawMaterials": ["Wood", "Adhesives", "Varnish"],
     "declaredWastes": ["Sawdust", "Wood scraps", "Varnish waste"]
   }
   ```
   Watch all agents chain in real time.
6. **`trigger-disruption`** with `{"factoryId": "fact_1"}` -- Watch Sentinel self-heal

### Via Web Dashboard

1. Open [https://sym-bio-forge.vercel.app](https://sym-bio-forge.vercel.app) (or `http://localhost:3000` locally) -- See the dashboard with cluster stats
2. Navigate to **Ecosystem Map** -- Click factory nodes to see details
3. Navigate to **Opportunities** -- Expand matches to see scoring details
4. Navigate to **Carbon Impact** -- See before/after environmental metrics
5. Navigate to **Compliance** -- See SPCB filing status for all factories

---

## Data

The platform ships with realistic fixture data for a Coimbatore, India industrial cluster:

- **15 factories** spanning textile, chemical, food processing, leather, paper, steel, and more
- **3 feed factories** dripped in by the scheduler during live demos
- **44 waste materials** with category, physical form, contamination levels, and reuse potential
- **10 compatibility rules** mapping waste categories to target industries
- **Emission factors** for CO2, water, and energy calculations
- **3 market data entries** for product generation

---

## Team

Built for the NitroStack hackathon by a 4-member team from Amrita University.

| Member | Role |
|--------|------|
| Member 1 | Lead Architect -- agents, orchestrator, core engine |
| Member 2 | Discovery Agent Development -- scout, profiler, matchmaker |
| Member 3 | Creation Agent Development -- inventor, auditor, architect |
| Member 4 | Widget & Data Development -- all 9 widgets, fixture data |

---

## Live Deployments

| Service | URL |
|---------|-----|
| **Frontend (Vercel)** | https://sym-bio-forge.vercel.app/ |
| **Backend MCP Server (NitroCloud)** | https://symbioforge-6a655bbb-tanays-org-0dcaa497.app.nitrocloud.ai |

---

## Links

- **GitHub**: https://github.com/kuchipudiyokshith9999-eng/SymBioForge
- **NitroStack**: https://nitrostack.ai
- **NitroStudio**: https://nitrostack.ai/studio
- **NitroStack Docs**: https://docs.nitrostack.ai
