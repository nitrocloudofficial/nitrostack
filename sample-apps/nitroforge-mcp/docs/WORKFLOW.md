# NitroForge — Build Workflow

Six phases, four sync points. Read this once; then work from your `build/BUILD-W{n}.md`.

---

## The phase gates

```
P0  FOUNDATION      ~45m   contracts frozen · scaffold · discrepancies resolved
     ═══ SYNC 1 ═══        nobody writes feature code before this closes
P1  STUB SURFACE    ~1.5h  every tool/resource/prompt exists and is callable
     ═══ SYNC 2 ═══        ★ DEMOABLE FROM HERE ON
P2  REAL GUTS       ~2h    parser · emitter · store/console — all against fixtures
     ═══ SYNC 3 ═══
P3  CONVERGENCE     ~1h    real implementations replace stubs, end-to-end
     ═══ SYNC 4 ═══        ★ CORE DONE
P4  POLISH + SHIP   ~1.5h  replay · widget · list_changed · Docker · deploy
P5  DEMO LOCK       ~1h    video · rehearsal · freeze
```

---

## P1 is the most important gate, and it's counter-intuitive

**By end of Phase 1, the entire MCP surface exists and returns fixture data.** All 3 tools callable, all 3 resources readable, both prompts invocable, Studio showing everything.

None of it is real. That's the point.

From hour two onward **you always have something to demo.** Every later phase upgrades a working system instead of racing to assemble one. Teams that build depth-first have nothing at hour five when something breaks; teams that build the surface first degrade gracefully.

Do not let anyone skip ahead to "the real logic" during P1.

---

## Phase detail

### P0 — FOUNDATION · all three · ~45 min

| Task | Owner |
|---|---|
| `src/contracts/*.ts` written and **frozen** | Lead |
| Hand-write `fixtures/irs/demo.ir.json` | Lead |
| Resolve the 4 doc discrepancies (see README) — post answers in chat | First to scaffold |
| `npx @nitrostack/cli init` · `nitrostack-cli install` · NitroStudio connected | W3 |
| `CLAUDE.md` = the SDK reference, in repo root | W3 |
| Vet both specs **with a script**, not by reading them into an AI context | W1 |
| `templates/skeleton/` pre-warmed `node_modules` | W2 |

**SYNC 1 — closes when:** contracts are pushed, `npm run dev` boots, and the discrepancy answers are in the chat.

### P1 — STUB SURFACE · ~1.5h

| | Delivers |
|---|---|
| **W1** | `ingest.module.ts` + `parse_spec` / `plan_tool_surface` returning fixtures |
| **W2** | `forge.module.ts` + `forge_server` returning a fixture report, with Tasks progress streaming |
| **W3** | App shell, all modules wired, 3 resources + 2 prompts **real** (they read the store) |

**SYNC 2 — closes when:** Studio lists 3 tools, 3 resources, 2 prompts, and every one of them returns something. **Screenshot this. It's your fallback demo.**

### P2 — REAL GUTS · ~2h · fully parallel, no cross-dependencies

| | Delivers |
|---|---|
| **W1** | `parser.service.ts` (real) + `planner.service.ts` (real LLM + lint) |
| **W2** | `emitter.service.ts` + templates → project that typechecks; `verifier.service.ts` tsc/build/boot |
| **W3** | `store.service.ts` (Map + disk) · activity interceptor · console vs `fixtures/activity.log` |

**SYNC 3 — closes when:** each workstream's unit passes against fixtures, independently.

### P3 — CONVERGENCE · ~1h · the truth moment

Swap stubs for real adapters. W1's IR flows into W2's emitter. W3's store holds real artifacts. Console shows real events.

**SYNC 4 — closes when:** `parse_spec` → `plan_tool_surface` → `forge_server` runs end-to-end on the pinned spec and returns a green report. **★ CORE DONE.**

### P4 — POLISH + SHIP · ~1.5h

Replay + mocked HTTP · `tool-surface` widget + 2 buttons · `resources/list_changed` · `completions` · `@HealthCheck` · Dockerfile · deploy.

**Order matters** — that list is in priority order. Stop where you run out of time.

### P5 — DEMO LOCK · ~1h

**H-2h:** record the fallback video. **H-1h:** rehearse twice, out loud, console projected. **H-30m:** code freeze. No exceptions.

---

## Pre-committed cut triggers

Decide now so nobody has to argue at hour five.

| If, by… | …this hasn't happened | Then cut |
|---|---|---|
| **H2** | SYNC 2 not closed | Drop `completions` and `@HealthCheck` |
| **H4** | W2's emitter doesn't typecheck output | Cut the second spec; single spec only |
| **H5** | SYNC 4 not closed | Cut replay — ship tsc + boot as "verification" |
| **H5.5** | Console not streaming | Console goes static (no SSE), reads on load |
| **H-2h** | Widget not rendering | Cut the widget. Console covers the visual |

**Never cut:** IR Zod validation · schemas derived from graph · deterministic emitter. Those three are the pitch.

---

## Working rules

**Merge:** small PRs into `main`, one module per person, no cross-module edits without a ping. Module boundaries = ownership boundaries, so conflicts should be near-zero. If you're editing someone else's folder, stop and message them.

**`src/contracts/` is frozen after P0.** Changing it breaks all three simultaneously. Requires all three to agree, in chat, before the commit.

**Blocked? The stub is missing — write it.** Never wait on another workstream. That's what `ports.ts` is for.

**Standups at each SYNC, 5 minutes, standing up.** Three questions: gate closed y/n · what's blocking · anything that changes someone else's assumptions.

**Every AI session starts with `CLAUDE.md` loaded.** The single biggest source of wasted time in this build will be `.js` import extensions and decorator syntax. The SDK reference prevents both.
