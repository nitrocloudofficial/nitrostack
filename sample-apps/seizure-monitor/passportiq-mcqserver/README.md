# PassportIQ

An AI copilot for passport verification officers, built as a
[NitroStack](https://www.npmjs.com/package/@nitrostack/core) MCP server.

PassportIQ runs **the whole passport application lifecycle** — filing, fee,
Passport Seva Kendra appointment, biometrics, verification, police verification,
officer grant, printing, dispatch, delivery — as **45 MCP tools**, and drives it
autonomously with an agent that stops of its own accord at the one step reserved
for a human: granting the passport. On top sit a conversational copilot
(`copilot_chat` — ask it anything, it calls the real guarded tools), an officer
sign-in at `/login`, and a rotating dotted-earth console UI.

Three layers, one server:

| Layer | What it is | Tools |
| --- | --- | --- |
| **Lifecycle** | The real Passport Seva process as a declarative state machine. 14 stages, SLA clocks, artefacts (receipts, PSK tokens, PV reports, booklets, Speed Post tracking), an attributed case journal. | 18 |
| **Fraud** | Cross-application duplicate detection, a risk graph that exposes rings sharing a phone/address/photo hash, and the eight verification stages. | 18 |
| **Agent + console** | An investigator agent, an autopilot sweep and the console read models. `PlatformModule` adds the 4 resources, 3 prompts and 4 of the 8 health checks. | 8 |

**The copilot never decides.** Not by policy — structurally. Every legal move in
the lifecycle carries an `autonomous: boolean` in the contract, and the
orchestrator may only execute moves flagged `true`. All three exits from
`officer_review` are flagged `false`, so no step budget, retry or future code path
can grant, refuse or clarify an application. The gate is a property of the data,
not of the agent's good behaviour.

## Quick start

```bash
npm install
npm run build
npx tsx src/index.ts   # boot the MCP server on stdio
npm run test:all       # typecheck + 366 assertions

# the officer console (HTTP + SSE + widgets) on :8080
NODE_ENV=production HOST=0.0.0.0 PORT=8080 node dist/index.js
# → http://localhost:8080/console
```

Healthy boot:

```
✅ Application initialized with 45 tools, 4 resources, 3 prompts
✓ ExecutionContext bridge installed (ctx.emit + ctx.input) on 45 tool(s)
✓ Case register — 9 passport case(s) across 7 lifecycle stage(s), 3 awaiting a human officer
✓ PassportIQ ready — 9 seeded applications loaded
```

Two env flags arm the autonomous loops (both default off so a demo starts calm):

```bash
PASSPORTIQ_CASEFLOW=true    # lifecycle orchestrator advances cases on a timer
PASSPORTIQ_AUTOPILOT=true   # fraud autopilot sweeps the queue
```

## Demo path

**The lifecycle — file an application and watch the agent walk it to the gate:**

```
submit_passport_application      → mints an ARN, opens a case, reindexes the fraud graph
advance_case  <ARN> maxSteps=40  → the agent executes SIX transitions unattended:
                                     pay_application_fee
                                     book_psk_appointment
                                     complete_psk_visit
                                     run_case_verification
                                     initiate_police_verification
                                     record_police_verification
                                   …then STOPS at officer_review and says why.
                                   40 steps requested. 6 taken. The gate holds.
get_case_file  <ARN>             → artefacts + the attributed journal + the legal next moves
officer_decide                   → the human. The only way past the gate.
get_caseflow_board               → all 14 lanes, SLA clocks, who is waiting on whom
caseflow_autopilot action=tick   → one narrated pass over the whole register
```

`advance_case` returns the reasoning composed **before** each action, the tool it
invoked, and the outcome — so the trace is an audit record, not a post-hoc story.

**The fraud reveal:**

```
build_risk_graph  PIQ-2026-2001  → a 4-application ring
agent_investigate PIQ-2026-2001  → an agent that picks its own next tool
get_audit_trail                  → append-only proof of who decided what
```

`PIQ-2026-2001` is the demo subject: the centre of a planted ring sharing a phone
number, an address and a passport photo across four "unrelated" applications.
`PIQ-2026-1003` is the clean control.

**Or just open the console** at `/console` — the lifecycle board, the intake form,
the ARN tracker and the case journal are all there, and every write on the page
executes one of the 45 MCP tools. Sign in at `/login` (name + badge — identity
for the audit trail, not auth), then use **Ask PassportIQ** in the sidebar: a
chat copilot that triages the queue, investigates ARNs, shows fraud rings and
records officer decisions — every reply lists the exact MCP tools it called,
and the decision gate still refuses anything premature.

## Repository layout

```
src/
  index.ts                  bootstrap (create → lifecycle → bridge → setServer → start)
  app.module.ts             root module — imports must be FLAT
  contracts/                frozen cross-role types (single source of truth)
  bootstrap/                ExecutionContext bridge (ctx.emit / ctx.input)
  data/seed-applications.json   9 applications, 32 documents, planted overlaps
  contracts/caseflow.contract.ts  THE LIFECYCLE — 14 stages, CASE_TRANSITIONS,
                                  FEE_SCHEDULE, REQUIRED_DOCUMENTS. The whole
                                  process is data; the code only executes it.
  modules/caseflow/         18 lifecycle tools, the case register, the state
                            machine, the SLA clocks and the orchestrator
  modules/pipeline/         Backend B: duplicate detection, risk graph, decision gate
  modules/verification/     Backend A stages (env-gated placeholders for now)
  modules/agent/            the investigator agent + its action policy
  modules/console/          HTTP + SSE officer console (/api/caseflow/*, /console)
  widgets/                  separate npm project — React 18 + esbuild, 5 routes
tests/                      real-server harness + 366 assertions
docs/BACKEND_B.md           Backend B handoff, integration contract, landmines
contracts.md                the team's frozen integration boundaries
```

## Team split

| Role | Scope | Status on this branch |
| --- | --- | --- |
| Backend A | `document_validate`, `ocr_extract`, consistency checks, `evaluate_rules`, `score_risk`, `explain_risk` | env-gated placeholders |
| **Backend B** | server shell, `detect_duplicate_signals`, `build_risk_graph`, seed data, event wiring, `officer_decide` + gate | **complete** |
| Frontend A | officer dashboard | consumes `get_pipeline_progress` / `get_pipeline_events` |
| Frontend B | `GraphView` | consumes `build_risk_graph` |

Placeholder stages announce themselves loudly at boot and are removed with
`PASSPORTIQ_STAGE_STUBS=off`.

## Understanding this project

**[`docs/PROJECT_EXPLAINED.md`](docs/PROJECT_EXPLAINED.md)** is the full walkthrough:
what MCP is, exactly what NitroStack does for you (and the six framework landmines
that cost real hours), the architecture, the lifecycle state machine, both agents,
the end-to-end workflow, the three bugs found by running it — and a timed video
script for the demo.

## Deploying / submitting

| Doc | Covers |
|---|---|
| [`docs/DEPLOY_NITROCLOUD.md`](docs/DEPLOY_NITROCLOUD.md) | Getting a live MCP on NitroCloud — including two silent, deploy-breaking upstream defaults (the CLI overwrites the platform's `PORT`; core binds `localhost` inside containers) and the fixes now in this repo. |
| [`docs/HACKATHON_SUBMISSION.md`](docs/HACKATHON_SUBMISSION.md) | Track choice, ready-to-paste title/description copy, and a fact sheet. |
| [`docs/SAMPLE_APP_PR.md`](docs/SAMPLE_APP_PR.md) | Raising the `sample-apps/` PR against `nitrocloudofficial/nitrostack`. |
| [`docs/sample-app-README.md`](docs/sample-app-README.md) | The README to ship inside that PR. |

## Working on this

**Read [`docs/BACKEND_B.md`](docs/BACKEND_B.md) before editing** — §4 is the
integration contract for the other three roles, and §6 lists ten framework
landmines (flat module imports, mandatory `@Injectable({ deps })`, widget files
that crash boot, tools that receive unvalidated input, a provider that looks like
dead code but carries the whole event bus). Every one of them is a real failure we
already hit.

## Scripts

| Script | Does |
| --- | --- |
| `npm run test:all` | typecheck + seed (67) + backend (106) + agent (63) + **caseflow (95)** + console (35) = **366** |

The CI gate lives at `ci/nitrocloud-ci.yml` (typecheck, build, 366 assertions,
a 45-tool boot smoke, Docker probe) — see `ci/README.md` for the one-line
activation move to `.github/workflows/deploy.yml`.
| `npm run test:caseflow` | the lifecycle suite: illegal orders refused, the agent stops at the gate, the gate is structural, the journal is attributed |
| `npm run test` | acceptance suite only |
| `npm run test:seed` | seed / ring integrity only |
| `npm run typecheck` | `tsc` over `src` + `tests` |
| `npm run dev` | NitroStack CLI dev server |
| `npm run build` | NitroStack CLI build |
