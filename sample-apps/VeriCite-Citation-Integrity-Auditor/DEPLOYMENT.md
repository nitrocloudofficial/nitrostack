# VeriCite — Deployment

## Requirements

- Node.js ≥ 20 (developed on 22)
- npm ≥ 10
- Outbound HTTPS to `api.crossref.org`, `api.openalex.org`, `api.semanticscholar.org`, `api.groq.com`

## Install

```bash
npm install                        # server
npm --prefix src/widgets install   # widget
cp .env.example .env
```

## Environment

| Variable | Required | Default | Effect if unset |
|---|---|---|---|
| `CONTACT_EMAIL` | recommended | — | No polite-pool access; lower rate limits |
| `GROQ_API_KEY` | **yes for full function** | — | No support verdict; every claim → `NOT_ENOUGH_EVIDENCE` |
| `SEMANTIC_SCHOLAR_API_KEY` | optional | — | HTTP 429 on most calls; degrades to two providers |
| `VERICITE_OFFLINE` | no | `false` | Live providers |
| `VERICITE_CONCURRENCY` | no | `5` | Claims in parallel (1–32) |
| `VERICITE_API_TIMEOUT_MS` | no | `10000` | Per-provider timeout (1s–120s) |
| `VERICITE_CLAIM_BUDGET_MS` | no | `90000` | Per-claim budget (5s–600s) |
| `VERICITE_MAX_CITATIONS_PER_CLAIM` | no | `3` | Fan-out cap (1–10) |
| `VERICITE_CACHE_TTL_MS` | no | `1800000` | `0` disables caching |
| `VERICITE_MAX_CACHE_ENTRIES` | no | `5000` | Memory bound (16–100000) |
| `NITRO_LOG_LEVEL` | no | `info` | NitroStack verbosity |
| `LOG_LEVEL` | no | `info` | Verification engine verbosity |

Out-of-range values are clamped and logged; malformed values fall back to the default. Startup never fails on configuration.

> **Save `.env` with LF line endings.** A CRLF file puts a trailing `\r` inside every value. Interpolated into a `User-Agent` header that throws `Invalid character in header content` and Crossref fails on **100%** of requests. VeriCite strips control characters defensively, but fix the file.
>
> Placeholder addresses (`your_email@domain.com`, anything `@example.com`) are detected and ignored — VeriCite then sends no contact at all, because a fake address attributed to real traffic is worse than anonymous.

## Build

```bash
npm run typecheck                # tsc --noEmit
npm run build                    # nitrostack-cli build -> dist/
npm --prefix src/widgets run build
npm test                         # 132 tests
```

Or all at once: `npm run verify`

## Run

```bash
npm run start:prod               # build already done
# or
npm start                        # build + start
```

Transport is controlled by `MCP_TRANSPORT_TYPE` (`stdio` | `http` | `dual`). Defaults to `stdio` in development and `dual` in production.

## Smoke test

Confirms the live path end to end. Expect ~30 s for a paper with a dozen references.

```bash
VERICITE_OFFLINE=false npm run dev
```

Then call `run_full_audit` with a document from `Test cases/` and check:

1. `offlineMode: false`
2. `summary.resolvedCitations > 0` — providers reachable
3. At least one result with `metadata.source` naming a real provider
4. At least one `SUPPORTED` or `CONTRADICTED` — the Groq key is working

If everything is `NOT_ENOUGH_EVIDENCE`, `GROQ_API_KEY` is missing or invalid.

For a network-free check:

```bash
VERICITE_OFFLINE=true npm run dev
```

## Docker

```dockerfile
FROM node:22-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY dist ./dist
COPY src/widgets/out ./src/widgets/out
ENV NODE_ENV=production MCP_TRANSPORT_TYPE=dual PORT=3000
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

Build artefacts first (`npm run build && npm --prefix src/widgets run build`). Pass secrets at runtime, never bake them into the image.

## Operational notes

**Health.** `SystemHealthCheck` reports heap and uptime every 30 s, degrading above 90% heap.

**Memory.** The verification cache is capped at `VERICITE_MAX_CACHE_ENTRIES` with TTL expiry and LRU eviction. Steady-state footprint is bounded regardless of uptime.

**Rate limits.** Crossref and OpenAlex give higher limits with `CONTACT_EMAIL`. Semantic Scholar's unauthenticated tier (~100 req / 5 min) will 429 under any real load — get a key or accept two-provider operation.

**Cost.** One Groq call per (claim, citation) pair, `llama-3.3-70b-versatile`, temperature 0.1, 512 max tokens. Cached for `VERICITE_CACHE_TTL_MS`, so repeated references cost nothing.

**Scaling.** Raise `VERICITE_CONCURRENCY` only alongside provider rate limits; more parallelism against an unauthenticated tier produces more 429s, not more throughput.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `Invalid character in header content` | CRLF `.env` | Convert to LF |
| All claims `NOT_ENOUGH_EVIDENCE` | Missing/invalid `GROQ_API_KEY` | Check startup notices |
| Constant HTTP 429 | No Semantic Scholar key | Add key or ignore — degrades gracefully |
| `resolvedCitations: 0` | No network, or references unparseable | Try `VERICITE_OFFLINE=true` to isolate |
| Widget shows amber "OFFLINE MODE" | `VERICITE_OFFLINE=true` | Unset it |
| Widget build fails on stale types | Cached `.next` referencing deleted routes | `rm -rf src/widgets/.next` |
| Everything `CRITICAL` offline | Fixture corpus covers only 8 works | Expected — use live mode for real papers |
