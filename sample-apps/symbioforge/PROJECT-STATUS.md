# SymBioForge -- Project Status

**Last updated:** 2026-07-26

---

## What We've Built

### Core Architecture

- **8 autonomous AI agents** chaining via EventBus pub/sub, zero human-in-the-loop:
  - **Clerk** -- registers factories, generates SPCB Form V compliance PDFs
  - **Scout** -- profiles new/updated factories
  - **Profiler** -- classifies declared waste streams + infers undeclared ones using `INDUSTRY_WASTE_MAP` (15 industry types)
  - **Matchmaker** -- finds pairwise symbiotic matches (Haversine distance + composite scoring) and discovers multi-hop supply chains (A->B->C)
  - **Inventor** -- generates novel product concepts from waste streams
  - **Auditor** -- promotes top opportunities to "Blueprint Ready"
  - **Architect** -- plans step-by-step manufacturing pathways for promoted opportunities
  - **Sentinel** -- self-healing loop, volume monitoring (>25% deviation alerts), compliance deadline tracking (330-day warning, 365-day overdue)

- **Event chain:** `FACTORY_REGISTERED -> FACTORY_PROFILED -> MATCHES_DISCOVERED -> PRODUCTS_INVENTED -> IMPACT_AUDITED -> PATHWAYS_DESIGNED -> ECOSYSTEM_STABLE`
- Additional events: `SENTINEL_TRIGGERED`, `VOLUME_UPDATE`, `COMPLIANCE_DUE`, `FACTORY_UPDATED`

### MCP Tools (15 total)

| Tool | Purpose |
|------|---------|
| `register-factory` | Register a new factory, triggers full agent chain |
| `get-cluster-state` | Full live state -- factories, matches, products, logs |
| `get-ecosystem-map` | Factory network with symbiotic edges |
| `get-carbon-metrics` | CO2 avoided, water/energy saved, financial value, circular score |
| `get-opportunity-feed` | Ranked matches and product concepts |
| `get-product-concepts` | AI-invented products from waste streams |
| `get-waste-profiles` | Classified waste streams per factory |
| `get-pathway` | Step-by-step blueprint for a specific opportunity |
| `get-compliance-report` | Generate SPCB Form V Annual Environmental Statement PDF |
| `control-swarm` | Start, stop, or reset the autonomous agent swarm |
| `trigger-disruption` | Simulate factory shutdown, test Sentinel self-healing |
| `run-simulation` | SymbioSim: 12-month time machine simulation |
| `get-impact-story` | Human-readable environmental and economic impact equivalencies |
| `get-district-overview` | SPCB officer governance view with compliance and risk data |
| `ingest-telemetry` | IoT telemetry ingestion + bulk factory import |

### MCP Prompt Resource

| Prompt | Purpose |
|--------|---------|
| `ask_symbioforge` | AI persona -- judges ask natural questions and get data-driven answers about the ecosystem |

### Widgets (11 Next.js UIs)

- Agent Swarm Monitor -- live agent visualization with Start/Stop/Reset controls
- Ecosystem Map -- factory network graph
- Carbon Dashboard -- circular economy score gauge, CO2/water/energy/financial metrics
- Opportunity Feed -- ranked matches and products
- Product Cards -- product concept cards
- Waste Profiles -- factory waste stream details
- Pathway Viewer -- blueprint step-by-step viewer
- Compliance Dashboard -- SPCB Form V report viewer with PDF download
- SymbioSim Timeline -- 12-month simulation timeline
- Impact Story -- human-readable impact equivalencies
- District Dashboard -- SPCB officer governance view

### Web Application (`web/`)

Full-stack Next.js web application with:
- **Auth** -- login/signup via Supabase
- **Groq AI Chat** -- floating assistant with tool-calling for factory registration
- **API routes** -- REST endpoints for all MCP tools (factories, matches, products, carbon, compliance, etc.)
- **Full UI pages** -- factories, matches, carbon, waste-profiles, ecosystem, compliance, monitoring, blueprints, opportunities, agents, tools, docs, settings
- **shadcn/ui** component library
- **Production hardening** -- rate limiting, middleware, error handling, logging

### Frontend Dashboard (`frontend/`)

Standalone Next.js showcase dashboard designed for business executives:
- **Landing page** -- hero, 6 impact stats, event chain timeline, 8 agent cards, real-world impact, 15 MCP tools grid, tech stack
- **Executive Command Center** -- financial KPIs (savings, revenue, ROI, payback), opportunity pipeline ranked by value, SPCB compliance ring with overdue alerts, AI-invented products with CAPEX/margin/feasibility, factory leaderboard with utilization, 12-month projection chart, multi-hop supply chains, waste stream intelligence, system health with live activity feed

### Data & Business Logic

- 15 initial Coimbatore factories loaded from `factories-initial.json`
- 3 drip-feed factories added by Scheduler every 60s
- 45 waste material entries in `materials-db.json`
- 10 compatibility rules + 2 fallbacks in `compatibility-matrix.json`
- Emission factors for CO2, water, and energy savings
- Market data for 3 product recipes
- Real PDF generation via pdfkit for SPCB compliance reports
- Optional Supabase integration with graceful fallback

### Tests

- `src/__tests__/compliance-generator.test.ts` -- PDF generation verification
- `src/__tests__/state-manager.test.ts` -- singleton, factory CRUD, Supabase fallback
- `web/src/__tests__/api/api.test.ts` -- API route validation
- `web/src/__tests__/validations.test.ts` -- input validation schemas

### Code Quality

- Split monolithic 465-line `symbioforge.tools.ts` into 10 focused module files + `bootstrap.ts`
- Removed ~2,072 lines of dead code
- Single source of truth for all interfaces in `src/core/types.ts`
- EventBus integration in ingest tools for automatic agent re-evaluation
- Backward-compatible compliance generator rename (`generateSbcbReport` -> `generateSpcbReport`)

---

## Testing Results (2026-07-25)

Tested in NitroStudio with STDIO transport. All core features passed:

- Bootstrap: 18 factories, 57 symbiotic matches, 3 products, 5 blueprints, 11% circular score
- Agent Swarm Monitor: live activity log, Sentinel health checks every 30s
- Register Factory: full agent chain fires (Clerk -> Scout -> Profiler -> Matchmaker)
- Compliance Report: PDF generated with classified waste streams, CO2 and savings metrics
- Sentinel disruption: detected affected chains, re-triggered Matchmaker
- Scheduler drip feed: all 3 feed factories dripped successfully
- All widgets render correctly

---

## Hackathon Stretch Goals -- ALL COMPLETED

### ✅ Idea A -- "Ask SymbioForge" AI Persona
`ask_symbioforge` Prompt resource in `src/modules/symbioforge.prompts.ts`. Feeds live cluster state into AI so judges can ask natural questions and get data-driven answers.

### ✅ Idea B -- Government/SPCB Officer Dashboard
`get-district-overview` tool + `district-dashboard` widget. Compliance rates, deadline alerts, risk heatmap, carbon credits, Smart Cities alignment.

### ✅ Idea C -- Economic Multiplier / Impact Story
`get-impact-story` tool + `impact-story` widget. Translates metrics to human impact (cars off road, MSME loans funded, land saved, jobs created, tax revenue).

### ✅ Idea D -- SymbioSim Time Machine
`run-simulation` tool + `symbiosis-timeline` widget. 12-month ecosystem simulation with factory registration, match formation, disruption, and recovery.

---

## Git & Remotes

- `origin` -- VtanayDarshan/symbioforge
- `team` -- kuchipudiyokshith9999-eng/SymBioForge (primary, all changes pushed here)

---

## What's Left

### Must Do
1. **Deploy to NitroStack Cloud** -- click "+ Create Cloud App" in NitroStudio, configure, and deploy

### Nice To Have
2. Record a 2-minute demo video showing all features
3. Deploy `frontend/` to Vercel for a live dashboard preview
4. Run vitest test suite to verify nothing is broken
