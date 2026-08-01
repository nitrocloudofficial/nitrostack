# Lifeline

> During medical emergencies, choosing the nearest hospital is not always the safest option.

![Model Context Protocol](https://img.shields.io/badge/Model%20Context%20Protocol-MCP-blue) ![Built with NitroStack](https://img.shields.io/badge/Built%20with-NitroStack-0A66FF) ![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6)

**Lifeline** is a NitroStack MCP server for intelligent emergency hospital routing, built as a sample application demonstrating agentic tool-chaining, a live interactive widget, and graceful degradation patterns on the NitroStack MCP framework.

Track: **HealthTech & Life Sciences**

> ⚠️ All hospital data in `src/server/data/hospitals.json` is synthetic demo data (`data_type: "SYNTHETIC_DEMO"`) — it does not represent real facilities, capacity, or wait times. Do not use this project to make real emergency-care decisions.

## Table of Contents

- [Project Overview](#project-overview)
- [Features](#features)
- [Architecture](#architecture)
- [MCP Tools](#mcp-tools)
- [Widgets](#widgets)
- [Tech Stack](#tech-stack)
- [Folder Structure](#folder-structure)
- [Installation](#installation)
- [Build](#build)
- [Run](#run)
- [Demo](#demo)
- [Screenshots](#screenshots)
- [Future Improvements](#future-improvements)
- [Troubleshooting](#troubleshooting)
- [License](#license)

## Project Overview

Standard navigation only optimizes for distance and traffic — it has no concept of whether the destination hospital can actually treat the patient. During a real emergency, that gap can mean being routed to a hospital with no cardiac cath lab, no ICU beds, or a 40-minute ER queue, when a marginally farther hospital could treat the patient immediately.

Lifeline is an agentic MCP server that closes that gap: it triages free-form symptom text into a severity and required medical specialization, finds nearby hospitals, ranks them with a transparent multi-factor weighted score (specialization match, live ICU/ER bed counts, distance, ETA, and wait time — not just proximity), calculates a real ambulance route (with automatic fallback if the routing API is unavailable), and lets the AI reserve a bed before the patient arrives — all exposed as MCP tools an AI assistant can chain together, with a live map-and-dashboard widget rendered directly in the chat.

## Features

- 🧠 **Deterministic symptom triage** — rule-based severity/department classification with a documented, inspectable keyword engine (no black-box LLM call required for this step)
- 🏥 **Multi-factor hospital ranking** — a documented, weighted 0–100 score (specialization, ICU beds, ER beds, distance, ETA, wait time), not a simple nearest-match
- 🗺️ **Live interactive dashboard widget** — map, ranked hospital cards, a "why this hospital" explainability panel, and a live Golden Hour countdown, auto-launched by the `rank_hospitals` tool
- 🛣️ **Resilient routing** — real ETA/distance via OpenRouteService, with an automatic haversine-distance fallback if the API key is missing or the request fails — routing never blocks dispatch
- 🛏️ **Live bed reservation** — reserving a bed decrements real-time availability immediately, with a full confirmation flow (reference code, department, arrival instructions, hospital contact)
- 🩺 **Graceful degradation everywhere** — no hospitals in range, zero beds, invalid coordinates, and routing-API failure all produce clean, typed errors instead of crashes
- 🔌 **MCP-native** — works with any MCP-compatible client (Claude Desktop, Cursor, NitroStack Studio, and more)

## Architecture

Lifeline follows a strict layered architecture — **widgets call tools, tools call services, services own state and I/O**. Business logic never lives in a tool handler or a React component.

```
Widget (React)  ──callTool──▶  Tool (Controller)  ──▶  Service  ──▶  JSON mock DB / OpenRouteService
```

- **Services** (`src/server/services/`) are DI singletons and own all business logic and state (the in-memory hospital dataset, the reservation ledger, the ranking algorithm, the routing client, the triage classifier). They are framework-agnostic and fully unit-testable in isolation.
- **Tools** (`src/server/tools/`) are thin `@Controller`/`@Tool` classes. They validate input with Zod, delegate to exactly one service, and log — nothing else.
- **Widgets** (`src/widgets/app/`) are Next.js routes rendered inside the MCP client. They never read the hospital data or call services directly — only `callTool(...)`.
- **Shared** (`src/server/shared/`) holds cross-cutting error classes (`AppError` → `McpError`) and constants (tool names, capability vocabulary, ranking weights).
- **Interfaces** (`src/server/interfaces/`) are the single source of truth for every domain shape (`Hospital`, `Patient`, `Reservation`, `Route`, `RankedHospital`, `EmergencyAssessment`, …). `src/server/types/` re-exports them for convenience.

> **Dependency injection gotcha — read before adding a new service or controller.** `nitrostack-cli dev` runs source through `tsx` (esbuild), which does not emit TypeScript's `emitDecoratorMetadata`. Without it, the DI container has no `design:paramtypes` to resolve constructor parameters from, and a plain `constructor(private readonly x: XService) {}` silently receives `undefined` in dev mode (it works fine once compiled by real `tsc` for production, which is what makes this easy to miss). Every service/controller in this codebase therefore declares its dependencies explicitly with `@Injectable({ deps: [...] })` — including controllers, which must stack `@Injectable({ deps: [...] })` alongside `@Controller()` since `@Controller` has no `deps` option of its own. See `HospitalTools` in `src/server/tools/hospital.tools.ts` for the reference pattern. This was verified with a real `@modelcontextprotocol/sdk` `Client` driving the server over stdio, not just `tsc`/unit-level checks — that is the only way this class of bug reliably surfaces.

### Ranking Model

`rank_hospitals` scores every candidate 0–100. Every factor except specialization match is min-max normalized *across the current candidate set* before weighting, so scores stay meaningful whether the search radius was 5 km or 50 km.

| Factor | Weight | Scoring |
|---|---|---|
| Specialization match | 0.30 | `1.0` exact capability match · `0.3` General ER only · `0` no match |
| ICU beds available | 0.15 | min-max normalized |
| ER beds available | 0.15 | min-max normalized |
| Distance | 0.15 | inverse min-max normalized (closer scores higher) |
| ETA | 0.15 | inverse min-max normalized (faster scores higher) |
| ER wait time | 0.10 | inverse min-max normalized (shorter scores higher) |

Ties are broken by distance ascending. The configured weights are also returned in every `rank_hospitals` response (`ranking_weights`) for transparency. See `DEFAULT_RANKING_WEIGHTS` in [src/server/shared/constants.ts](src/server/shared/constants.ts).

## MCP Tools

| Tool | Description |
|---|---|
| `triage_symptoms` | Deterministic, rule-based classification of free-form symptom text into `severity`, `requiredDepartment`, and `confidence`. |
| `get_nearby_hospitals` | Hospitals within a radius of a location, optionally filtered by required capability. |
| `get_hospital_capabilities` | A hospital's specializations, languages, contact number, and verification status. |
| `check_resource_availability` | Live ER/ICU bed counts and estimated wait time for a hospital. |
| `calculate_route` | ETA, distance, and GeoJSON route between two points via OpenRouteService (falls back to a haversine estimate if unavailable). |
| `rank_hospitals` | Weighted ranking of a candidate hospital list — sorted best-first, auto-launches the `emergency-dispatch` widget. |
| `request_emergency_reservation` | Reserves an ER/ICU bed, decrements live availability, returns a confirmation code, department, and arrival instructions. |

Typical flow: `triage_symptoms` → `get_nearby_hospitals` (filtered by the triaged department) → `rank_hospitals` (renders the dashboard widget) → `calculate_route` (per selected hospital) → `request_emergency_reservation`.

## Widgets

### `EmergencyDispatchWidget` (route: `emergency-dispatch`)

Auto-launched by `rank_hospitals` (via `@Widget('emergency-dispatch')`) — the AI never needs to ask the user to open anything. It renders as a full dashboard, not a text response:

- **Severity banner** — severity level, emergency type, and a live Golden Hour countdown
- **Patient summary** — symptoms, age/gender when available, coordinates, AI diagnosis, and triage confidence
- **Interactive Leaflet map** — patient location, all candidate hospitals, the selected hospital highlighted and animated, the calculated route drawn and camera-fitted to both points
- **Featured hospital card** — the top (or currently selected) hospital's full profile: AI score, distance, ETA, ER wait, bed counts, capabilities, languages, contact number
- **Explainability panel** — an evidence-based, expandable "why this hospital was selected" breakdown (closest, fastest ETA, most beds, highest score, etc. — only the reasons that are actually true for that hospital)
- **Ranked hospital list** — every candidate, numbered by rank, each with its own Show Route / Details / Reserve actions
- **Reservation panel & modal** — full reservation flow with a loading state, a success view (confirmation code, department, arrival instructions, hospital contact), and a retry path on failure
- **Action dialogs** — a call-hospital dialog (copy number / call now) and a hospital-details modal (full profile, AI score breakdown, Google Maps link)
- **System status panel** — live status of the AI/MCP/map/route/reservation subsystems
- **Developer panel** — a collapsible log of every tool call *the widget itself* makes, with timing and payloads (upstream calls that already ran before the widget mounted, like `triage_symptoms`, are surfaced in the Patient Summary instead — MCP gives a widget no visibility into a conversation's prior tool-call history)

## Tech Stack

- **[NitroStack](https://nitrostack.ai) MCP Framework** — server bootstrap, DI container, `@Tool`/`@Controller`/`@Widget` decorators, transports
- **TypeScript** (strict mode, zero `any`) on both the server and the widget
- **[Zod](https://zod.dev)** — runtime input validation for every tool
- **Node.js 18+** — required for the built-in `fetch` API used by the routing service
- **React + Next.js** — the widget UI, statically exported (no Next.js server ever runs in production)
- **[Leaflet](https://leafletjs.com) + OpenStreetMap** — the interactive map (no API key required for tiles)
- **[OpenRouteService](https://openrouteservice.org)** — live driving routes/ETA, optional (haversine fallback otherwise)
- **UUID** — reservation ID generation
- **A JSON file (`hospitals.json`)** — the mock hospital database, loaded into memory at startup

## Folder Structure

```
src/
├── app.module.ts              # Root @McpApp / @Module
├── index.ts                   # Bootstrap entrypoint
├── health/
│   └── system.health.ts       # Liveness/memory health check
├── modules/
│   └── lifeline/
│       └── lifeline.module.ts # Registers all Lifeline controllers + services
├── server/
│   ├── interfaces/            # Source-of-truth domain contracts
│   ├── types/                 # Barrel re-export of interfaces/
│   ├── shared/                # AppError hierarchy, constants, ranking weights
│   ├── utils/                 # DistanceCalculator, GeoUtils, IdGenerator
│   ├── data/
│   │   └── hospitals.json     # Synthetic mock hospital database
│   ├── services/              # HospitalService, RoutingService, TriageService,
│   │                          # RankingService, ReservationService
│   └── tools/                 # One controller per tool domain
└── widgets/
    ├── app/
    │   └── emergency-dispatch/
    │       ├── page.tsx               # Orchestrator (state, callTool wiring)
    │       ├── MapView.tsx            # Leaflet map + camera control (no SSR)
    │       ├── HospitalList.tsx       # Ranked hospital cards
    │       ├── FeaturedHospitalCard.tsx
    │       ├── ExplainabilityPanel.tsx
    │       ├── SeverityBanner.tsx
    │       ├── PatientSummary.tsx
    │       ├── WorkflowTimeline.tsx
    │       ├── ReservationModal.tsx / ReservationPanel.tsx
    │       ├── CallHospitalDialog.tsx / HospitalDetailsModal.tsx
    │       ├── SystemStatusPanel.tsx / DeveloperPanel.tsx / Toast.tsx
    │       ├── types.ts               # Local mirror of tool output shapes
    │       └── utils.ts               # Tool-result parsing, URL builders, evidence logic
    └── widget-manifest.json
```

## Installation

```bash
npm run install:all
```

This runs `nitrostack-cli install`, which installs both the root MCP server dependencies and the `src/widgets` Next.js project's dependencies.

If you only need the root server:

```bash
npm install
npm --prefix src/widgets install
```

Then copy the environment template and (optionally) add your OpenRouteService key:

```bash
cp .env.example .env
```

See [`.env.example`](.env.example) for the full variable list. The only Lifeline-specific one is `ORS_API_KEY` (optional — `calculate_route` degrades to a haversine estimate without it).

## Build

```bash
npm run build
```

This runs `nitrostack-cli build`, which (1) bundles the widget with esbuild into a single self-contained `src/widgets/out/emergency-dispatch.html`, and (2) compiles `src/**/*.ts` to `dist/**/*.js` via `tsc`. A successful build prints `✓ Widgets bundled` and `✓ TypeScript compiled` with no error block.

## Run

**Development** (hot reload, STDIO transport):

```bash
npm run dev
```

**Production** (compiled, dual transport — builds first automatically):

```bash
npm start
```

To exercise the tools and preview the widget without a full chat client, use [NitroStack Studio](https://nitrostack.ai/studio): download it, point it at this project directory, and run `npm run dev` (or let Studio manage the dev process).

To connect a real MCP client (Claude Desktop, Cursor, etc.) over STDIO directly:

```json
{
  "mcpServers": {
    "lifeline": {
      "command": "npx",
      "args": ["tsx", "src/index.ts"],
      "cwd": "/absolute/path/to/lifeline"
    }
  }
}
```

In production (`NODE_ENV=production`), the server defaults to dual transport (STDIO + HTTP SSE on port 3000, configurable via `PORT`/`HOST`/`MCP_TRANSPORT_TYPE` in `.env`).

## Demo

Try the full agentic flow with a prompt like:

> *"My father is 58 with sudden crushing chest pain radiating to his left arm. We're near Coimbatore, at 11.0016, 76.9628."*

Watch it chain `triage_symptoms` → `get_nearby_hospitals` → `rank_hospitals` (the dashboard widget appears automatically) → `calculate_route` → `request_emergency_reservation`. More ready-to-use scenarios (stroke, road accident, child emergency, minor injury, zero-bed hospital) are documented inline in `src/server/data/hospitals.json` and the tool descriptions in [MCP Tools](#mcp-tools).

## Screenshots

_Not yet captured for this submission — run [Demo](#demo) locally via NitroStack Studio to see the live dashboard (map, ranked hospital cards, severity banner, reservation flow) in action. Contributions adding real screenshots/GIFs here are welcome._

## Future Improvements

- Real hospital directory integration (replacing the synthetic `hospitals.json` mock DB) with a live-updating bed-availability feed
- Turn-by-turn navigation instructions surfaced from the routing engine's step data (currently only distance/ETA/summary are parsed from OpenRouteService)
- Authenticated hospital-staff portal to confirm/reject reservations server-side instead of always auto-confirming
- Persistent reservation storage (currently an in-memory ledger, reset on restart) — a real database swap-in for `ReservationService`
- Multi-language triage and UI (the data model already tracks each hospital's supported `languages`)
- WebSocket/streaming bed-count updates instead of point-in-time tool calls
- A doctor/specialist directory and hospital photos per facility (explicitly out of scope for the current synthetic dataset)
- Automated test suite (unit tests for the ranking/triage services, integration tests for the MCP tool layer)

## Troubleshooting

**`Failed to instantiate provider "class OAuthModule ...": Cannot resolve token "OAUTH_CONFIG"` at startup.**
Known, benign log line from `@nitrostack/core`, not a Lifeline bug — this project uses no OAuth anywhere. The framework's own `OAuthModule` self-registers via `@Injectable()` the moment `@nitrostack/core` is imported (unavoidable in any NitroStack app), and `nitrostack-cli start`'s production bootstrap eagerly instantiates every registered provider, including this unconfigured built-in one. It's caught internally and logged at `error` level, but does **not** stop startup — `lifeline-server started successfully` follows immediately, with all 7 tools registered. Only appears under `nitrostack-cli start`, never `nitrostack-cli dev`. Safe to ignore.

**Build fails.** Run `npm run install:all` first — a missing `node_modules` in either project is the most common cause. Then re-run `npm run build` and read the first error block.

**Widget doesn't load / blank map.** Confirm `npm run dev` printed `Widget dev server running on :3001`. In production, confirm `src/widgets/out/emergency-dispatch.html` exists after `npm run build`.

**Map tiles don't load.** The map uses public OpenStreetMap tiles — requires outbound internet access from wherever the widget iframe renders. No API key needed.

**`calculate_route` always returns an estimate.** `ORS_API_KEY` is unset — expected fallback behavior, not an error.

**Port conflicts on `:3000`/`:3001`.** `:3000` is the production HTTP port (`PORT` env var); `:3001` is the widget dev server (`src/widgets/package.json`'s `dev` script).

## License

MIT — see [LICENSE](LICENSE).

## Credits

Originally built by **Team Kanya Rashi** (Amrita Vishwa Vidyapeetham, Coimbatore) for the HealthTech & Life Sciences track.
