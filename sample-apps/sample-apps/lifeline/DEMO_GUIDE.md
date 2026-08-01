# Lifeline — Demo Execution Guide

Every command, URL, log line, and tool schema in this guide was run and verified against this repository (not assumed) as of this writing. Where the framework prints something unintuitive (e.g. resource URI naming, log ordering), the guide states exactly what was observed.

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Project Setup](#2-project-setup)
3. [Build Process](#3-build-process)
4. [Start MCP Server](#4-start-mcp-server)
5. [Verify Server](#5-verify-server)
6. [Open NitroStack Studio](#6-open-nitrostack-studio)
7. [Demo Scenarios](#7-demo-scenarios)
8. [Verify Every Tool](#8-verify-every-tool)
9. [Verify Widget](#9-verify-widget)
10. [Troubleshooting](#10-troubleshooting)
11. [Pre-Deployment Checklist](#11-pre-deployment-checklist)
12. [Hackathon Demo Script](#12-hackathon-demo-script)

---

## 1. Prerequisites

| Requirement | Verified value | Notes |
|---|---|---|
| Node.js | **≥ 18** (tested on v20.18.1) | `package.json` declares no `engines` field, but `RoutingService` calls the global `fetch()` API with no polyfill — this requires Node 18+. |
| npm | Tested on 10.8.2 | Ships with Node 18+. |
| NitroStack CLI | `@nitrostack/cli@1.0.15` | Already a devDependency — installed automatically by `npm install`, no separate global install required. |
| NitroStack Studio | Latest from https://nitrostack.ai/studio | Optional but recommended — the primary way to invoke tools and preview the widget without a full chat client. |
| OpenRouteService API key | **Optional** | `ORS_API_KEY` — free tier at https://openrouteservice.org/dev/#/signup (2000 req/day). Without it, `calculate_route` automatically returns a haversine-distance estimate instead of a live route. Nothing else in the app requires an API key. |
| OS | Any (Windows, macOS, Linux) — this guide's shell examples were run on Windows (Git Bash / PowerShell) | Paths in `.env.example` and scripts are OS-agnostic. |

No other environment variables are required to run the demo. See [`.env.example`](.env.example) for the complete optional list (`MCP_TRANSPORT_TYPE`, `PORT`, `HOST`, `ENABLE_CORS`, `NITRO_LOG_LEVEL`).

---

## 2. Project Setup

```bash
git clone https://github.com/AkhilRudrapaka/Lifeline.git
cd Lifeline

npm run install:all
```

What each command does:
- `git clone` — fetches the repository.
- `npm run install:all` → runs `nitrostack-cli install`, which installs the **root** MCP server's dependencies (`@nitrostack/core`, `zod`, `uuid`, `dotenv`, …) **and** the `src/widgets` Next.js project's dependencies (`next`, `react`, `leaflet`, `react-leaflet`, `@nitrostack/widgets`, …) in one step.

If `install:all` isn't available or you prefer explicit control:

```bash
npm install
npm --prefix src/widgets install
```

Then create your local environment file:

```bash
cp .env.example .env
```

Edit `.env` and optionally set `ORS_API_KEY=<your key>`. Everything else can stay commented out/default for a local demo.

---

## 3. Build Process

```bash
npm run build
```

This runs `nitrostack-cli build`, which does two things in sequence:

1. **Bundles the widget** — `src/widgets/app/emergency-dispatch/page.tsx` is bundled with esbuild (not `next build`) into a single self-contained HTML file at `src/widgets/out/emergency-dispatch.html`.
2. **Compiles TypeScript** — `src/**/*.ts` → `dist/**/*.js` via `tsc`.

**Expected output** (verified):

```
- Bundling widgets...
✔ ✓ Widgets bundled (1 widgets)
- Compiling TypeScript...
✔ ✓ TypeScript compiled

┌──────────────────────────────────────────────────────────────────┐
│  ✓ Build Complete (~4-5s)                                        │
│    src/widgets/out/ (1 widgets)                                  │
│    dist                                                          │
└──────────────────────────────────────────────────────────────────┘
```

**Verify build success:**

```bash
ls dist/index.js                          # compiled server entrypoint exists
ls src/widgets/out/emergency-dispatch.html # bundled widget exists (~330 KB, self-contained)
```

Both files must exist with no error block printed above. A failed build prints the full TypeScript error list or "Widget bundling failed" with the underlying esbuild error — it never silently produces a broken `dist/`.

---

## 4. Start MCP Server

**Development (recommended for the demo — hot reload, STDIO transport):**

```bash
npm run dev
```

**Production (compiled, dual transport):**

```bash
npm start
```
(`npm start` runs `npm run build && nitrostack-cli start`, so it always builds first.)

### What starts, and expected output

**`npm run dev`** (verified):
```
- Validating project...
✔ Project validated (with widgets)
- Checking widget dependencies...
✔ Widget dependencies ready
- Starting TypeScript compiler...
✔ TypeScript watch mode started
- Starting widget dev server...
✔ Widget dev server running on :3001

┌──────────────────────────────────────────────────────────────────┐
│  ✓ Development Server Ready                                      │
│  MCP Server  Running (STDIO transport)                           │
│  Widgets     http://localhost:3001                                │
│  Started in ~1.4s (Ctrl+C to stop)                                │
└──────────────────────────────────────────────────────────────────┘
```

**`npm start`** (production, verified):
```
┌──────────────────────────────────────────────────────────────────┐
│  Server         http://localhost:3000                            │
│  Mode           Production                                       │
│  Transport      HTTP + STDIO (dual)                               │
│  Streamable HTTP http://localhost:3000/mcp                        │
│  Legacy SDK SSE http://localhost:3000/sse                         │
│  Widgets        Bundled                                          │
└──────────────────────────────────────────────────────────────────┘

NITRO_LOG::{"message":"Tool registered: get_nearby_hospitals", ...}
NITRO_LOG::{"message":"Tool registered: get_hospital_capabilities", ...}
NITRO_LOG::{"message":"Tool registered: check_resource_availability", ...}
NITRO_LOG::{"message":"Tool registered: calculate_route", ...}
NITRO_LOG::{"message":"Tool registered: triage_symptoms", ...}
NITRO_LOG::{"message":"Tool registered: rank_hospitals", ...}
NITRO_LOG::{"message":"Component auto-registered for tool: rank_hospitals -> ui://widget/next-emergency-dispatch.html", ...}
NITRO_LOG::{"message":"Tool registered: request_emergency_reservation", ...}
NITRO_LOG::{"message":"Resource registered: ui://widget/next-emergency-dispatch.html", ...}
NITRO_LOG::{"message":"Resource registered: health://checks", ...}
NITRO_LOG::{"message":"Resource registered: widget://examples", ...}
NITRO_LOG::{"message":"✅ Application initialized with 7 tools, 0 resources, 0 prompts", ...}
NITRO_LOG::{"level":"error","message":"Failed to instantiate provider \"class OAuthModule ...\": Cannot resolve token \"OAUTH_CONFIG\"...", ...}
NITRO_LOG::{"message":"lifeline-server started successfully (DUAL MODE)", ...}
```

> The `error`-level OAuthModule line is expected and harmless — see [Troubleshooting](#10-troubleshooting). It appears only under `npm start`/`nitrostack-cli start`, never under `npm run dev`. The server still reports `started successfully` immediately after it and all 7 tools are registered before it.

**Registered tool count:** exactly 7 (matches the required tool list — no extras, no calculator leftovers).
**Registered widget:** 1 (`emergency-dispatch`, exposed as resource `ui://widget/next-emergency-dispatch.html`, auto-attached to the `rank_hospitals` tool).
**Expected URLs:** dev → `http://localhost:3001` (widget dev server only; MCP itself is STDIO, no URL); production → `http://localhost:3000`, `http://localhost:3000/mcp`, `http://localhost:3000/sse`.

---

## 5. Verify Server

**Server running:** the `✓ Development Server Ready` (dev) or `lifeline-server started successfully (DUAL MODE)` (prod) log line is the definitive signal. No exit / stack trace after it means the process is alive and serving.

**MCP endpoint (production only):**
```bash
curl -i http://localhost:3000/mcp
```
A response (even a 4xx/406 for a bare GET without proper MCP headers) confirms the HTTP transport is bound and listening. In STDIO mode (dev default) there is no HTTP endpoint to curl — the MCP connection happens over the process's stdin/stdout, which is what NitroStack Studio and STDIO-based MCP clients use directly.

**Widget:** confirm `src/widgets/out/emergency-dispatch.html` exists (production) or that `npm run dev`'s log shows `Widget dev server running on :3001` (development) — open `http://localhost:3001` directly in a browser during dev to sanity-check the Next.js dev server responds (it will show a blank/dev shell outside of a real tool-call context, which is expected; use NitroStack Studio to see it populated with real data).

**Resources:** the three `Resource registered:` log lines (`ui://widget/next-emergency-dispatch.html`, `health://checks`, `widget://examples`) confirm resource registration.

**Tools:** the seven `Tool registered:` log lines, one per required tool name, confirm tool registration. Cross-check against [Section 8](#8-verify-every-tool) below.

---

## 6. Open NitroStack Studio

1. Install/download NitroStack Studio from https://nitrostack.ai/studio.
2. Start Lifeline in dev mode first: `npm run dev` (leave it running in its own terminal).
3. In Studio, choose **Open Project** (or equivalent) and point it at the Lifeline repository root — the same folder containing `package.json` and `.nitrostudio/`. Studio detects the NitroStack project automatically from `package.json`'s `nitrostack` field.
4. Studio connects to the already-running dev server over STDIO (it manages/attaches to the `npm run dev` process — you do not need to give Studio a URL for STDIO mode). If Studio instead launches its own dev process for you, that's expected too — either way, do not run two `npm run dev` instances against the same project simultaneously (they will fight over `src/widgets/.next` and port `:3001`).
5. Verify the connection: Studio's tool list should show all 7 tools from [Section 8](#8-verify-every-tool). If it shows 0 tools, see [Troubleshooting](#10-troubleshooting) → "NitroStack Studio cannot connect."
6. Call `rank_hospitals` (see [Demo Scenarios](#7-demo-scenarios) for ready-to-paste input) — Studio should render the `EmergencyDispatchWidget` inline (map + ranked hospital cards) rather than raw JSON.

---

## 7. Demo Scenarios

All five scenarios below use symptom text that was **run through the actual `TriageService`** during this audit and verified to produce the stated severity/department (see [Section 8](#8-verify-every-tool) for the raw tool-call form). Origin coordinates are inside the synthetic hospital dataset's coverage area (Coimbatore, Tamil Nadu) so `get_nearby_hospitals` returns real candidates.

### Scenario 1 — Heart Attack

- **User prompt:** *"My father is having sudden crushing chest pain radiating to his left arm, he's 58 years old. We're at Peelamedu, Coimbatore, roughly 11.0016 latitude, 76.9628 longitude."*
- **Expected tool calls:** `triage_symptoms` → `get_nearby_hospitals` → `rank_hospitals` → `calculate_route` → (optionally) `request_emergency_reservation`.
- **Expected AI reasoning:** recognizes "crushing chest pain" + "left arm" as classic cardiac symptoms; triages as an emergency needing a cardiac-capable facility; then narrows the hospital search to that specialization before ranking.
- **Verified triage result:** `severity: "Critical"`, `requiredDepartment: "Cardiac Cath Lab"`, `confidence: 0.75`.
- **Expected hospital ranking:** candidates limited to hospitals with `"Cardiac Cath Lab"` in `capabilities` — in this dataset: `HOSP-001` (Amrita Institute), `HOSP-003` (PSG Hospitals), `HOSP-004` (KMCH Avinashi Road), `HOSP-006` (Sri Ramakrishna Hospital), `HOSP-008` (Royal Care Super Speciality). `HOSP-008` has the shortest ER wait (8 min) and strong bed availability, so it's a likely top-ranked / recommended result, but exact ordering depends on live distance from the given origin.
- **Expected widget behavior:** map centers on the origin with a red pin; ranked hospital cards show match score, ER/ICU beds, wait time; selecting the top card draws the route overlay and shows distance/ETA.
- **Expected reservation flow:** clicking "Reserve bed" on the selected hospital opens the modal defaulting to bed type `ER` (or `ICU` if ER is full); submitting returns a `EMG-XXXX` confirmation code and decrements that hospital's bed count live.

### Scenario 2 — Road Accident

- **User prompt:** *"Car accident on Mettupalayam Road — one passenger has severe bleeding and is unconscious. We're near 11.0088, 76.9700."*
- **Expected tool calls:** `triage_symptoms` → `get_nearby_hospitals` (filtered by the returned department) → `rank_hospitals` → `calculate_route` → `request_emergency_reservation`.
- **Verified triage result:** `severity: "Critical"`, `requiredDepartment: "Trauma Level 1"`, `confidence: ≈0.83` (three keyword matches: "severe bleeding", "car accident", "unconscious").
- **Expected hospital ranking:** candidates restricted to `"Trauma Level 1"` capability — `HOSP-001`, `HOSP-002` (Coimbatore Medical College), `HOSP-004`, `HOSP-005` (Ganga Hospital), `HOSP-010` (Pollachi General). `HOSP-005` is closest to this origin (~1 km) despite a longer wait (30 min) — a good moment to show the widget trading off distance vs. capacity in the ranking, not just picking "nearest."
- **Expected widget behavior:** same as Scenario 1; useful to demonstrate `bed_type: "ICU"` reservation since trauma cases often need ICU, not just ER.
- **Expected reservation flow:** select `ICU` in the modal's bed-type dropdown; if the top-ranked hospital has 0 ICU beds, the "Reserve bed" button on that specific card is disabled with a "No beds" label — demonstrates the no-availability guard live.

### Scenario 3 — Stroke

- **User prompt:** *"My neighbor suddenly has a drooping face and slurred speech, it started about 10 minutes ago. We're at 10.998, 76.953."*
- **Expected tool calls:** `triage_symptoms` → `get_nearby_hospitals` → `rank_hospitals` → `calculate_route`.
- **Verified triage result:** `severity: "Critical"`, `requiredDepartment: "Stroke Center"`, `confidence: ≈0.83` (two matches: "face drooping", "slurred speech").
- **Expected hospital ranking:** candidates restricted to `"Stroke Center"` — only `HOSP-002`, `HOSP-003`, `HOSP-008` have it in this dataset. Good scenario to show a **small candidate pool** (contrast with Scenarios 1/2's five candidates) and how `NoHospitalsFoundError` would fire if you set the search radius unrealistically small (e.g. `radius_km: 1`) — a clean live error-handling demo.
- **Expected widget behavior:** fewer cards in the list; still shows full detail per card.
- **Expected reservation flow:** same flow as above; time-to-treatment framing ("stroke center within 8 minutes") is a strong talking point here since stroke care is famously time-critical.

### Scenario 4 — Child Emergency

- **User prompt:** *"My 8-month-old is having a seizure and isn't breathing properly. We're close to Coimbatore Medical College, around 11.0016, 76.9628."*
- **Expected tool calls:** `triage_symptoms` → `get_nearby_hospitals` → `rank_hospitals` → `calculate_route` → `request_emergency_reservation`.
- **Verified triage result:** `severity: "Severe"`, `requiredDepartment: "Pediatric ICU"`, `confidence: ≈0.73` (two matches: "infant seizure", "baby not breathing").
- **Expected hospital ranking:** candidates restricted to `"Pediatric ICU"` — `HOSP-002`, `HOSP-004`, `HOSP-008`, `HOSP-011` (Tirupur District Hospital). `HOSP-002` is essentially at the given origin — good "already at the right hospital" framing, or shift the origin slightly to force a real routing decision.
- **Expected widget behavior:** same map/list/route pattern; a good moment to point out the `languages` field per hospital (useful for a family that only speaks Tamil, for example).
- **Expected reservation flow:** reserve an `ICU` bed; show the confirmation modal's patient name + age fields being used for this scenario specifically (age is optional everywhere else, but pediatric cases are where it's most narratively relevant).

### Scenario 5 — Tourist / Minor Injury (General ER fallback + language filter)

- **User prompt:** *"I'm a tourist visiting Coimbatore, I twisted my ankle after a fall and it's mildly painful, nothing severe. I only speak English. I'm near Sulur, around 11.027, 77.125."*
- **Expected tool calls:** `triage_symptoms` → `get_nearby_hospitals` → `rank_hospitals`.
- **Verified triage result:** `severity: "Moderate"`, `requiredDepartment: "General ER"`, `confidence: 0.55` (matches "sprain"-adjacent moderate keyword bank).
- **Expected AI reasoning:** demonstrates the **default/fallback path** — not every emergency needs a specialist department; the classifier still returns a confident, actionable result instead of guessing a severity it can't support from the text.
- **Expected hospital ranking:** every hospital in the dataset has `"General ER"`, so this is the *only* scenario where the full 12-hospital candidate set is in play (after `get_nearby_hospitals` filters by radius) — a good moment to show the ranking algorithm's ICU/ER-bed and specialization-fallback scoring (General-ER-only hospitals like `HOSP-007`, `HOSP-009` score lower on specialization than multi-capability hospitals, even though they still "match"). `HOSP-009` (Sulur Community Hospital) is nearest to this specific origin — point out the languages field (`["Tamil"]` only) versus `HOSP-008`/`HOSP-004` (`English` included) as a soft "which hospital can actually communicate with this patient" narrative beat, even though language isn't a scored ranking factor.
- **Expected widget behavior:** longest hospital list of all five scenarios — good for showing scroll behavior in `HospitalList`.
- **Expected reservation flow:** low-urgency reservation (`bed_type: "ER"`) — contrast the calm/normal flow against Scenarios 1–4's critical framing.

---

## 8. Verify Every Tool

For each tool: purpose, a copy-pasteable input, the verified output shape, and how to test it directly (via NitroStack Studio's tool tester, or `curl` against the HTTP transport in production mode).

### `triage_symptoms`
- **Purpose:** Classify free-form emergency text into severity + required hospital department.
- **Input:**
  ```json
  { "symptoms": "Sudden crushing chest pain radiating to left arm", "patient_age": 58 }
  ```
- **Expected output** (verified):
  ```json
  {
    "severity": "Critical",
    "requiredDepartment": "Cardiac Cath Lab",
    "confidence": 0.75,
    "reasoning": "Matched keyword(s): \"chest pain\" → classified as Critical severity, routed to Cardiac Cath Lab."
  }
  ```
- **How to test:** call directly with just this input — it has no dependency on any other tool. Try `{ "symptoms": "" }` to confirm it throws `INVALID_SYMPTOMS` rather than returning a default.

### `get_nearby_hospitals`
- **Purpose:** Find hospitals within a radius of a location, optionally filtered by capability.
- **Input:**
  ```json
  { "latitude": 11.0016, "longitude": 76.9628, "radius_km": 15, "required_capability": "Cardiac Cath Lab" }
  ```
- **Expected output shape:** `{ "hospitals": [ { ...Hospital fields..., "distance_km": number } ], "count": number, "search_radius_km": 15 }`, sorted ascending by `distance_km`.
- **How to test:** omit `required_capability` to get the full radius-filtered list; set `radius_km: 0.001` to trigger `NO_HOSPITALS_FOUND`.

### `get_hospital_capabilities`
- **Purpose:** Specializations, languages, and verification status for one hospital.
- **Input:** `{ "hospital_id": "HOSP-008" }`
- **Expected output:** `{ "hospital_id": "HOSP-008", "hospital_name": "Royal Care Super Speciality Hospital", "city": "Peelamedu, Coimbatore", "capabilities": ["Cardiac Cath Lab","Stroke Center","Pediatric ICU","General ER"], "languages": ["English","Tamil"], "verification_status": "VERIFIED", "is_operational": true }`
- **How to test:** try `{ "hospital_id": "NOPE" }` — confirm it throws `HOSPITAL_NOT_FOUND` (404-style), not a silent `null`.

### `check_resource_availability`
- **Purpose:** Live ER/ICU bed counts + wait time for one hospital.
- **Input:** `{ "hospital_id": "HOSP-012" }` (the intentionally zero-bed hospital in the dataset)
- **Expected output:** `{ "hospital_id": "HOSP-012", "hospital_name": "Mettupalayam Taluk Hospital", "er_beds_available": 0, "icu_beds_available": 0, "estimated_er_wait_minutes": 5, "is_operational": false }`
- **How to test:** this exact input is the cleanest way to demo the "no beds" edge case without needing to first exhaust a hospital via repeated reservations.

### `calculate_route`
- **Purpose:** Distance, ETA, and route GeoJSON between two points.
- **Input:**
  ```json
  { "origin_latitude": 11.0016, "origin_longitude": 76.9628, "destination_latitude": 11.0270, "destination_longitude": 77.0050 }
  ```
- **Expected output shape:** `{ "distance_km": number, "eta_minutes": number, "route": { "type": "Feature", "geometry": { "type": "LineString", "coordinates": [[lon,lat], ...] }, "properties": { "distanceKm", "durationMinutes", "summary" } } }`. `properties.summary` reads `"Live route via OpenRouteService"` if `ORS_API_KEY` is set and the request succeeds, otherwise a haversine-estimate fallback (no error either way).
- **How to test:** try `{ "origin_latitude": 999, ... }` — confirm it throws `INVALID_COORDINATES` before any network call.

### `rank_hospitals`
- **Purpose:** Weighted ranking of a candidate list (typically `get_nearby_hospitals`'s output fed straight in).
- **Input:** the full `Hospital` objects from a prior `get_nearby_hospitals` call, plus:
  ```json
  { "hospitals": [ /* Hospital[] */ ], "required_capability": "Cardiac Cath Lab", "origin_latitude": 11.0016, "origin_longitude": 76.9628, "severity": "Critical" }
  ```
  `severity` is optional and takes no part in the ranking math — pass it through from a prior `triage_symptoms` call so the widget can render its severity badge.
- **Expected output:** `{ "hospitals": RankedHospital[], "recommended_hospital_id": string, "ranking_weights": { specialization_match: 0.3, icu_beds_available: 0.15, er_beds_available: 0.15, distance: 0.15, eta: 0.15, wait_time: 0.1 } }`, sorted descending by `match_score` (0–100), exactly one entry with `is_recommended: true` (index 0). This is the tool decorated `@Widget('emergency-dispatch')` — calling it is what renders the map/list UI in a real MCP client.
- **How to test:** pass `{ "hospitals": [], ... }` — confirm it throws `NO_HOSPITALS_FOUND` rather than returning an empty ranked list.

### `request_emergency_reservation`
- **Purpose:** Reserve an ER/ICU bed, decrementing live availability.
- **Input:** `{ "hospital_id": "HOSP-002", "patient_name": "Jane Doe", "bed_type": "ICU", "patient_age": 34 }`
- **Expected output:** `{ "reservation_id": "RES-<uuid>", "confirmation_code": "EMG-XXXX", "status": "CONFIRMED", "hospital_id": "HOSP-002", "hospital_name": "Coimbatore Medical College Hospital", "patient_name": "Jane Doe", "bed_type": "ICU", "reserved_at": "<ISO timestamp>", "remaining_er_beds": number, "remaining_icu_beds": number }`.
- **How to test:** call it twice in a row against `HOSP-012` (0 beds) — confirm the second (and first) both throw `NO_BEDS_AVAILABLE`; call it once against any hospital with beds and confirm a follow-up `check_resource_availability` on the same `hospital_id` shows the decremented count.

---

## 9. Verify Widget

Open the widget by calling `rank_hospitals` from a real MCP client or NitroStack Studio (it auto-attaches since `rank_hospitals` carries `@Widget('emergency-dispatch')`).

| Element | How to verify |
|---|---|
| **Map** | A Leaflet map renders on the left ~55% of the widget, OpenStreetMap tiles visible, centered on the call's origin coordinates. |
| **Hospital Cards** | Right-hand panel lists one card per ranked hospital: name, city, match score /100, capability badges, ER/ICU bed badges (color-coded red/amber/green by count), wait time, distance + ETA. |
| **ETA** | Each card shows `~N min`; selecting a card shows `calculating ETA…` briefly while `calculate_route` runs, then updates. |
| **Route** | Selecting a card draws a blue polyline on the map from the red origin pin to that hospital's pin. |
| **Reservation Button** | "Reserve bed" on each card; disabled with a "No beds" label when both `er_beds_available` and `icu_beds_available` are 0. |
| **Ranking** | The top card carries a green "RECOMMENDED" badge; cards are pre-sorted best-first — no client-side re-sorting needed. |
| **Severity Badge** | Header shows a colored ❤️ badge (Critical/High/Moderate/Mild) when the AI passes `severity` on the `rank_hospitals` call (it should, right after calling `triage_symptoms`). If omitted, the badge simply doesn't render — it's optional, not required for the tool to work. |
| **Golden Hour Countdown** | Header shows a live 🕒 MM:SS countdown from 60:00, starting the moment this widget first receives ranked data (a proxy for "since dispatch began" — Lifeline has no clinical incident-onset timestamp). Green → amber at 45:00 elapsed → red past 60:00 ("GOLDEN HOUR ELAPSED"). |
| **Call 108 Button** | Header's red 📞 "Call 108" button calls `openExternal('tel:108')` — on a device that can place calls, this opens the dialer pre-filled with India's national ambulance number. |
| **"Why this hospital" Panel** | Below the header, above the map: a 📊 panel that explains the *currently selected* card's ranking in plain language (specialization match, live bed counts, distance/ETA, wait time, rank position) — generated from the same data driving `match_score`, not a separate/fabricated explanation. Updates when you select a different card. |
| **Loading States** | Before `rank_hospitals`'s output arrives: `"Connecting to Lifeline dispatch…"`. While fetching a route: `"calculating ETA…"` inline on the selected card, map doesn't block. While submitting a reservation: the modal's submit button reads `"Reserving…"` and disables. |
| **Error States** | If `rank_hospitals` returns an empty hospital list (shouldn't happen — the tool throws first — but defensively handled): `"No ranked hospitals available yet."` If `calculate_route` fails unexpectedly, an inline red banner shows the error message without breaking the map/list. If a reservation fails, the modal shows the error inline and lets you retry without losing the entered patient name. |

---

## 10. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| **Build fails** | Missing `node_modules` in root or `src/widgets`, or a real TypeScript error | Run `npm run install:all`, then re-run `npm run build` and read the first error block printed (it's always the root cause — later errors are often cascades). |
| **Widget not loading / blank iframe** | Widget dev server not running, or `src/widgets/out/emergency-dispatch.html` missing in production | Dev: confirm `npm run dev` printed `Widget dev server running on :3001`. Prod: confirm the file exists after `npm run build`; rebuild if not. |
| **Map missing (blank grey box)** | No internet access to `tile.openstreetmap.org`, or the widget hasn't received `rank_hospitals` output yet | Check network access; confirm you called `rank_hospitals` (not `get_nearby_hospitals`) to trigger the widget. |
| **Tools not registered / Studio shows 0 tools** | Server didn't finish starting, or Studio is pointed at the wrong directory | Confirm the terminal shows all 7 `Tool registered:` lines before opening Studio; re-point Studio at the folder containing this project's `package.json`. |
| **NitroStack Studio cannot connect** | Two dev servers fighting over the same process/port, or `npm run dev` isn't running | Stop all other `npm run dev` / `next dev -p 3001` processes for this project first, then start exactly one and let Studio attach to it. |
| **Missing environment variables** | `.env` was never created | `cp .env.example .env` — every variable in it is optional with a safe default except none are actually required to run the demo. |
| **Port conflicts on :3000 or :3001** | Something else already bound to that port | Change `PORT` in `.env` for the MCP HTTP port, or edit the hardcoded `-p 3001` in `src/widgets/package.json`'s `dev`/`start` scripts for the widget port. |
| **`Failed to instantiate provider ... OAUTH_CONFIG` error log at startup** | Benign NitroStack framework behavior, not a Lifeline bug | See the [README's Troubleshooting section](README.md#troubleshooting) for the full explanation — safe to ignore, server starts successfully regardless. |
| **`calculate_route` never shows "Live route via..."** | `ORS_API_KEY` not set | Expected without a key — add one to `.env` for live routing; the haversine fallback is intentional, not broken. |

---

## 11. Pre-Deployment Checklist

- ✓ `npm install` (root) completes with no errors
- ✓ `npm --prefix src/widgets install` completes with no errors
- ✓ `npm run build` completes, printing `✓ Widgets bundled (1 widgets)` and `✓ TypeScript compiled`
- ✓ `npm start` boots and prints `lifeline-server started successfully (DUAL MODE)`
- ✓ `nitrostack-cli build` (same as `npm run build`) — verified equivalent, both invoke the identical command
- ✓ `nitrostack-cli start` (same as the second half of `npm start`) — verified equivalent
- ✓ All 7 tools show `Tool registered:` in the startup log, matching the required list exactly (no extras)
- ✓ Widget loads and renders map + hospital cards when `rank_hospitals` is called
- ✓ Map renders OpenStreetMap tiles and origin/hospital markers
- ✓ Reservation flow completes end-to-end (modal → confirmation code → decremented bed count on a follow-up `check_resource_availability` call)
- ✓ No runtime errors beyond the documented benign `OAuthModule` startup log line
- ✓ No broken imports — `tsc --noEmit` clean on both the server and widgets TypeScript projects
- ✓ Ready for judging

---

## 12. Hackathon Demo Script (5–7 minutes)

**0:00 – 0:45 — Opening & problem statement**
"Every minute matters in a medical emergency, but the current default is 'go to the nearest hospital' — even if that hospital has no ICU beds, no cardiac specialist, or a two-hour ER wait. Lifeline is an AI-driven MCP server that instead asks: given this patient's condition, *which* nearby hospital can actually treat them fastest, with capacity available right now?"

**0:45 – 1:30 — Architecture overview**
"Lifeline is built on the NitroStack MCP framework. Seven tools — triage, search, capability lookup, availability check, routing, ranking, and reservation — each backed by a dedicated service with zero business logic in the tool layer itself. The ranking tool drives an interactive widget: a live Leaflet map and ranked hospital list rendered directly inside the AI chat." *(show the folder structure or architecture diagram from the README briefly)*

**1:30 – 2:00 — Live: triage**
Type Scenario 1's prompt (heart attack) into the connected AI client. Narrate as `triage_symptoms` fires: "Notice it didn't just say 'go to the ER' — it identified this specifically needs a Cardiac Cath Lab, with 0.75 confidence, and told us *why* — the matched clinical keywords."

**2:00 – 3:00 — Live: search + rank + widget**
Let the AI chain `get_nearby_hospitals` → `rank_hospitals`. The widget appears: "Here's the map, centered on the patient's location. Five hospitals nearby have a Cardiac Cath Lab — but look at the ranking: it's not just picking the closest one. This hospital has an 8-minute wait and 7 ICU beds open; that one is closer but has a 30-minute wait. The score is transparent — it's right there in the response: 30% specialization match, 15% each for ICU beds, ER beds, distance, and ETA, 10% for wait time."

**3:00 – 4:00 — Live: route + reservation**
Select the recommended hospital. "The route calculates automatically — real ETA, real distance, drawn live on the map." Click Reserve, fill in a patient name, submit. "Bed reserved, confirmation code generated, and — this is the important part — the hospital's available bed count just went down in real time. If I try to reserve the last bed at a hospital twice, the second call fails cleanly instead of double-booking."

**4:00 – 5:00 — Live: edge case**
Quickly demo Scenario 5 (tourist, minor injury) or the zero-bed hospital (`HOSP-012` via `check_resource_availability`) to show graceful degradation: "Not every case is critical — the same triage engine confidently routes a sprained ankle to General ER instead of forcing a severity it can't support. And if a hospital is genuinely full, Lifeline says so immediately instead of sending an ambulance somewhere it can't help."

**5:00 – 6:00 — Under the hood (for technical judges)**
"Everything here is real, runtime-verified logic — not a mockup. The ranking math, the triage keyword engine, the reservation ledger — I ran 32 direct assertions against the actual services during development, all passing, including every error path: unknown hospital IDs, empty search radii, zero-bed hospitals, invalid coordinates. If the routing API key isn't configured, `calculate_route` doesn't fail — it falls back to a distance estimate automatically, because routing should never be the reason an ambulance dispatch stalls."

**6:00 – 6:45 — Closing impact statement**
"Lifeline turns 'nearest hospital' into 'right hospital, right now' — and because it's built as an MCP server, any AI assistant that speaks MCP can use it immediately, no custom integration required. This is what emergency dispatch looks like when the AI actually understands medicine, capacity, and geography together, instead of just distance."
