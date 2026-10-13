# RIVA — Ride Intelligence & Virtual Assistance

RIVA is a conversational mobility copilot built on NitroStack MCP. It helps
**riders** discover, compare, and plan rides, and helps **drivers** decide
whether to accept a trip, gauge demand, and track earnings — all through
natural conversation, with rich inline widgets for every result.

## What RIVA does

**Rider tools** — ride discovery & comparison, preferences, nearby drivers,
return-fare forecasting, travel concierge (deadline-driven trip planning),
ride-later fare forecasting, multi-stop trip planning, car-pooling
simulation, SOS safety simulation, and booking lifecycle simulation.

**Driver tools** — trip-acceptance profitability analysis, destination
demand estimation, next-zone suggestions, a nearby ride-request
marketplace, and an earnings summary.

**Mode switching** — a `start_conversation` prompt and `set_user_mode` tool
let the assistant ask "Customer or Driver?" at the start of a conversation
and tailor which tools are relevant.

Uber and Ola are simulation-only providers; Rapido is a hybrid provider
(Apify scraper primary, deterministic simulation fallback). Location
resolution and routing use [Geoapify](https://www.geoapify.com/); both
gracefully fall back to a deterministic local estimate if no API key is
configured, so the server always starts and works without any external
credentials.

## Requirements

- Node.js 20+
- `@nitrostack/core` ^1.0.14 and `@nitrostack/cli` ^1.0.15 (already listed
  in `package.json`)

## Setup

```bash
npm install
npm --prefix src/widgets install
cp .env.example .env   # optional — fill in real keys for live geocoding/routing
npm run dev
```

### Optional environment variables

See `.env.example` for the full list. None are required to run RIVA —
everything degrades gracefully to simulation/estimates without them:

- `GEOAPIFY_API_KEY` / `GEOAPIFY_COUNTRY_CODE` — live geocoding, routing,
  and static map generation via Geoapify
- `APIFY_API_TOKEN` / `APIFY_RAPIDO_ACTOR_ID` — live Rapido fare scraping

## Development

```bash
npx tsc --noEmit        # type-check the backend
npm run build            # build backend + widgets
npm run dev               # start the MCP server (stdio by default in dev)
npm run start:prod       # build then start in production mode
```

Widget sources live under `src/widgets/app/<widget-name>/page.tsx` and build
to `dist/widgets/out/<widget-name>/`.

## Project structure

```
src/
  app.module.ts           Root module — wires Rides, Driver, Session, Journey modules
  domain/types.ts         Shared domain types
  services/               Shared services (maps, ranking, forecast, ride search, etc.)
  providers/               Uber/Ola/Rapido ride provider adapters
  modules/
    rides/                Rider ride discovery, comparison, preferences, recommendations
    driver/                Driver trip analysis, demand, zone suggestions, earnings
    journey/               Travel concierge, pooling, multi-stop, booking, SOS safety
    session/               Rider/driver mode switch
  widgets/                Next.js widget frontends + widget-manifest.json
```

## Important notes

- **Advisory / simulation only.** RIVA does not perform real bookings,
  payments, or emergency-service dispatch. `sos_emergency` and
  `booking_simulation` are explicitly simulated and say so in every
  response.
- **No accounts.** Rider preferences and the current mode are process-wide,
  in-memory state (no persistence, no multi-user separation) — a deliberate
  simplification for this MVP, not a bug.
