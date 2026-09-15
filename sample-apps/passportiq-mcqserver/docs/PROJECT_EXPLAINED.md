# PassportIQ — the whole project, explained from scratch

This is the document to read before you demo, present, or get questioned on this
project. It explains **what it is, how it works, what NitroStack actually does for
you, what MCP is, and how the workflow runs** — followed by a **video script** you
can read while screen-recording.

---

# PART 1 — What problem this solves

## The real-world situation

In India, a passport application goes through the **Passport Seva** system. The
journey is long and involves several different organisations:

1. A citizen fills the form online and gets an **ARN** (Application Reference Number)
2. They pay a fee
3. They're given an appointment at a **PSK** (Passport Seva Kendra — a passport office)
4. At the PSK they pass through **Counter A** (document check), **Counter B**
   (biometrics + photo), **Counter C** (final scrutiny)
5. The application gets verified
6. The **district police** do a physical address verification
7. A **Passport Officer** decides: grant, refuse, or ask for clarification
8. If granted → the booklet is **printed** at a press (Nashik)
9. It's **dispatched** by Speed Post
10. It's **delivered**

An officer sitting at step 7 has to decide, for each application, whether this
person is who they say they are. The hard part isn't reading one form — it's
noticing that **this application shares a phone number with three others filed
last month**, or that **the passport photo is byte-identical to a different
applicant's**. That's a cross-application pattern, and a human going file-by-file
structurally cannot see it.

## What PassportIQ does

Two things, and it's important you can state them separately:

| | What it does |
|---|---|
| **The process** | Runs the entire 14-stage lifecycle above as software, and drives it **automatically** |
| **The intelligence** | At the verification step, cross-references every application against every other one to surface fraud rings |

And one thing it deliberately **doesn't** do:

> **It never decides.** It walks the case right up to the Passport Officer's desk,
> prepares everything, writes down its reasoning — and stops. A human grants the
> passport. Always.

---

# PART 2 — What MCP is (and why it matters here)

## The plain version

**MCP = Model Context Protocol.** It's an open standard, created by Anthropic, that
answers one question:

> How does an AI model safely *do things* in someone else's system?

Before MCP, if you wanted Claude or ChatGPT to interact with your app, you wrote a
custom integration for each model, each with its own format. MCP standardises it.
You write your capabilities **once** as an "MCP server", and **any** MCP-compatible
AI client can use them — Claude Desktop, Cursor, NitroStudio, VS Code, and so on.

Think of it like **USB for AI**. You don't build a different port for each device.

## The three things an MCP server exposes

| Concept | What it is | Analogy | In PassportIQ |
|---|---|---|---|
| **Tools** | Actions the AI can *perform*. They have typed inputs and they change things. | A button | **44 of them** — `pay_application_fee`, `build_risk_graph`, `advance_case`… |
| **Resources** | Read-only data the AI can *look at*. Addressed by URI. | A file | **4** — `passportiq://applications`, `passportiq://rulebook`, `passportiq://audit-trail`, `passportiq://agent/runs` |
| **Prompts** | Pre-written templates a user can invoke. | A saved document template | **3** — `officer-briefing`, `fraud-ring-memo`, `clarification-letter` |

**PassportIQ is an MCP server.** That's the single most important sentence about
its architecture. It isn't a web app with an API that happens to have AI features.
It's a set of 44 capabilities that any AI can discover and call — and the browser
console is just *one* client of those same 44 tools.

## Why that's the right shape for this problem

Because a passport officer's real workflow is conversational and unpredictable.
They don't want a fixed dashboard with fixed buttons. They want to ask:

> *"Show me everything filed from this address in the last six months."*

With MCP, an AI assistant reads the tool list, picks `detect_duplicate_signals`
and `build_risk_graph`, calls them with the right arguments, and answers. Nobody
had to build a "search by address" screen.

---

# PART 3 — What NitroStack is and what it actually does for you

## The problem NitroStack solves

Writing a raw MCP server means hand-writing a lot of plumbing: JSON-RPC message
handling, a tool registry, JSON Schema for every input, transport setup, error
formatting. It's tedious and easy to get subtly wrong.

**NitroStack is a TypeScript framework that generates all of that from decorators.**
If you know NestJS or Angular, it will feel immediately familiar — it's the same
idea (decorators + dependency injection + modules), pointed at MCP.

## Every NitroStack feature this project uses

### 1. `@McpApp` — the application root

```ts
@McpApp({
  module: AppModule,
  server: { name: 'passportiq', version: '1.0.0' },
})
export class Application {}
```

One class that says "this is the server." NitroStack reads it and builds
everything underneath.

### 2. `@Module` — feature grouping

The project has **6 modules**:

| Module | Owns |
|---|---|
| `PipelineModule` | The applicant pool, duplicate detection, the risk graph, the event bus, the guarded `officer_decide` |
| `VerificationModule` | The 8 verification stages — document check, OCR, identity/address consistency, rulebook, scoring, explanation |
| `AgentModule` | The autonomous investigator: planner, memory, action policy, triage |
| `PlatformModule` | Resources, prompts, health checks |
| `ConsoleModule` | The officer console — HTTP server, live event stream, browser UI, the fraud autopilot |
| `CaseflowModule` | **The passport process itself** — all 18 lifecycle tools + the orchestrator |

> ⚠️ **The #1 NitroStack landmine, and it cost me hours:** `imports` in `@Module`
> is **not walked recursively**. NitroStack reads `imports` on the module you pass
> to `@McpApp`, registers those, and stops. A module imported only by another
> feature module is **never registered — silently**. Its tools just don't appear.
> No error.
>
> That's why `src/app.module.ts` lists **all six modules flat**, even though
> several of them import each other.

### 3. `@Injectable({ deps })` — dependency injection

```ts
@Injectable({ deps: [CaseflowService, CaseflowEventsService] })
export class IntakeTools {
  constructor(
    private readonly caseflow: CaseflowService,
    private readonly events: CaseflowEventsService
  ) {}
}
```

You declare what a class needs; NitroStack constructs it and passes the
singletons in. The `deps` array is **mandatory** — TypeScript's metadata reflection
isn't used, so if you omit it, you get `undefined` injected.

### 4. `@Tool` — the core decorator

```ts
@Tool({
  name: 'submit_passport_application',
  description: 'STEP 1 OF THE PASSPORT PROCESS. File a new passport application...',
  inputSchema: SubmitApplicationInputSchema,   // a Zod schema
})
async submitApplication(input) { ... }
```

From this one decorator, NitroStack automatically:
- registers the tool so it appears in `tools/list`
- converts the **Zod schema into JSON Schema** so any AI client knows the exact shape
- validates incoming input
- wires it into the MCP request handler

> ⚠️ **Landmine #2:** you must import it as
> `import { ToolDecorator as Tool } from '@nitrostack/core'`.
> Importing `{ Tool }` typechecks as a *class*, and you get
> `TS2348: Value of type 'typeof Tool' is not callable`. Cost me 18 errors at once.

> ⚠️ **Landmine #3:** `@Tool` methods are harvested from a module's **`controllers`**
> array only. Put a tool class in `providers` and it registers **nothing**, silently.

### 5. `@Widget` — interactive UI attached to a tool result

```ts
@Widget('graph-view')
@Tool({ name: 'build_risk_graph', ... })
```

This is a NitroStack feature, not core MCP. When the tool returns, the client can
render a **real React UI** instead of a JSON blob. The project has 5 widget routes:
`officer-dashboard`, `graph-view`, `risk-explanation`, `agent-console`, `console`.

> ⚠️ **Landmine #4:** widget bundles must land **flat** at
> `src/widgets/out/<id>.html`. And `src/widgets/` is a **separate npm project**
> (React 18 + esbuild) — it cannot import from `src/contracts/`, so shared types
> have to be restated.

### 6. `@Resource` / `@Prompt` — the other two MCP primitives

```ts
@ResourceDecorator({ uri: 'passportiq://rulebook', name: 'Verification rulebook', ... })
@PromptDecorator({ name: 'fraud-ring-memo', ... })
```

### 7. `@OnEvent` — the internal event bus

```ts
@OnEvent(APPLICATION_DECIDED)
onApplicationDecided(event: ApplicationDecidedEvent): void { ... }
```

Services publish events; other services subscribe. This is how the console's live
stream works, and how the officer's decision feeds back into the lifecycle.

> ⚠️ **Landmine #5:** `@OnEvent` only writes *metadata*. NitroStack subscribes the
> handler when it **resolves the instance**. A class with `@OnEvent` methods that
> is never in `providers` never subscribes — silently. It looks like dead code
> but it's carrying the whole event bus.

### 8. `@UseGuards` — authorisation before a tool runs

```ts
@UseGuards(PipelineCompleteGuardRef)
@Tool({ name: 'officer_decide', ... })
```

`PipelineCompleteGuard` blocks `officer_decide` until every required verification
stage has completed **for that specific application**. You can't record a decision
on an application nobody finished checking.

> ⚠️ **Landmine #6:** NitroStack calls guards as `guard.canActivate(context)` — the
> tool **input is never passed**. Since `applicationId` only exists in the input,
> the guard reads `ctx.input`, which is attached by a custom bridge at boot. If
> that bridge is missing, the guard **denies** rather than allowing an
> unverifiable decision through. Failing closed is the only safe direction for an
> approval gate.

### 9. `@HealthCheck` — readiness probes

**8 health checks**: `seed-data`, `rulebook`, `llm-provider`, `agent-activity`,
`autopilot`, `console-http`, `caseflow-register`, `caseflow-orchestrator`.
Notably, the caseflow ones return `'up'` (never `'down'`) when
disabled by config — otherwise NitroCloud's readiness probe would restart-loop the
container.

### 10. `@nitrostack/cli` — the tooling

`nitrostack build` bundles the widgets and compiles TypeScript in one step.

## The one thing NitroStack does NOT do, that I had to build

**There's no public "call a tool by name from inside the server" API.** The tool
registry is a private `tools: Map` on `NitroStackServer`.

But the whole agentic layer *depends* on that: the orchestrator's only way to act
is to call the other tools. So `ToolExecutorService` reaches into that private Map
once, at boot, behind a narrow interface:

```ts
container.resolve(ToolExecutorService).setServer(app);
```

**This is the single most important line in the bootstrap.** Without it the agent
cannot act at all — every turn fails with *"ToolExecutorService has no server
reference."*

## Bootstrap order (and why each step can't move)

```
McpApplicationFactory.create(Application)
  │
  ├─ 1. triggerLifecycleHook('onModuleInit')   create() does NOT fire these itself
  ├─ 2. installExecutionContextBridge(app)     attaches ctx.emit + ctx.input.
  │                                            After create() (tools don't exist
  │                                            before), before start() (no request
  │                                            may be served un-bridged)
  ├─ 3. ToolExecutorService.setServer(app)     ← the agent's only action path
  ├─ 4. logBootSummary()
  │
  ├─ app.start()                               ← transport comes up here
  │
  ├─ 5. ConsoleHttpService.attach(app)         the Express app doesn't exist until
  │                                            start() builds the HTTP transport
  ├─ 6. AutopilotService.start()               needs the executor from step 3
  └─ 7. CaseOrchestratorService.start()        same
```

**Transport is chosen from `NODE_ENV` inside `NitroStackServer.start()`** — not
from `nitrostack.config.ts`:

- `NODE_ENV` unset / `development` / `dev` → **stdio only**, no HTTP port, no `/console`
- anything else (e.g. `production`) → **dual stdio + HTTP** on `PORT`/`HOST`

And `HOST=0.0.0.0` is mandatory in a container — the default is `localhost`, which
binds only the loopback interface, so the platform health probe can't reach it and
the deploy fails readiness.

---

# PART 4 — The architecture

```
┌──────────────────────────────────────────────────────────────────┐
│  CLIENTS                                                          │
│  Claude Desktop · NitroStudio · Cursor  ──stdio/HTTP──┐          │
│  Browser (officer console)             ──HTTP/SSE──┐  │          │
└────────────────────────────────────────────────────┼──┼──────────┘
                                                     ▼  ▼
┌──────────────────────────────────────────────────────────────────┐
│  NITROSTACK MCP SERVER  —  44 tools · 4 resources · 3 prompts     │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ CaseflowModule — THE PASSPORT PROCESS         (18 tools)   │  │
│  │  intake: submit, pay, book PSK, PSK visit, clarify, withdraw│ │
│  │  processing: verify, initiate PV, record PV, print,         │  │
│  │              dispatch, confirm delivery                     │  │
│  │  query/control: case file, list, board, track, ADVANCE_CASE,│  │
│  │                 caseflow_autopilot                          │  │
│  │  ── CaseOrchestratorService: the autonomous driver ─────────│  │
│  └────────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ PipelineModule + VerificationModule — IS THIS FRAUD? (18)  │  │
│  │  detect_duplicate_signals · build_risk_graph · document_    │  │
│  │  validate · ocr_extract · consistency · rules · score ·     │  │
│  │  explain · officer_decide [GUARDED]                         │  │
│  └────────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ AgentModule (4) · ConsoleModule (4) · PlatformModule (0)   │  │
│  │  agent_investigate · triage · autopilot · console reads     │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  Event bus (@OnEvent) ─ Guards ─ Health checks ─ 5 React widgets  │
└──────────────────────────────────────────────────────────────────┘
```

**The 44 tools, exactly:**

| Module | Count | Tools |
|---|---|---|
| `CaseflowModule` | **18** | `submit_passport_application` `pay_application_fee` `book_psk_appointment` `complete_psk_visit` `submit_clarification_response` `withdraw_passport_application` `run_case_verification` `initiate_police_verification` `record_police_verification` `print_passport_booklet` `dispatch_passport` `confirm_delivery` `get_case_file` `list_passport_cases` `get_caseflow_board` `track_passport_application` `advance_case` `caseflow_autopilot` |
| `PipelineModule` | **10** | `list_applications` `get_application` `detect_duplicate_signals` `build_risk_graph` `list_applicant_clusters` `run_verification_pipeline` `get_pipeline_progress` `get_pipeline_events` `officer_decide` `get_audit_trail` |
| `VerificationModule` | **8** | `document_validate` `ocr_extract` `check_identity_consistency` `check_address_consistency` `evaluate_rules` `score_risk` `explain_risk` `visual_similarity_flag` |
| `AgentModule` | **4** | `agent_investigate` `agent_recommend_decision` `agent_triage_queue` `get_agent_trace` |
| `ConsoleModule` | **4** | `get_officer_queue` `get_console_activity` `autopilot_status` `autopilot_control` |
| `PlatformModule` | 0 tools | contributes the 4 resources, 3 prompts and 4 health checks |

**Totals:** 44 tools · 4 resources · 3 prompts · 5 widgets · 8 health checks ·
1 guard · 6 modules · 14 lifecycle stages · 13 transitions · 366 test assertions ·
~65,000 lines.

---

# PART 5 — The lifecycle, and the idea the whole project rests on

## The lifecycle is DATA, not code

This is the design decision to lead with. It's in
`src/contracts/caseflow.contract.ts`.

The 14 stages:

```
submitted → fee_paid → appointment_booked → psk_visit_complete
  → verification_running → police_verification
  → officer_review  ⬅ THE HUMAN GATE
  → granted → printing → dispatched → delivered

  (+ clarification — a hold, returns to officer_review)
  (+ rejected, withdrawn — terminal)
```

And every legal move between them is a **row in a table**:

```ts
export interface CaseTransition {
  from: CaseStage;
  to: CaseStage;
  tool: string;        // the tool that performs it — also the agent's action name
  actor: Actor;        // citizen | system | psk_officer | police | passport_officer
  label: string;
  autonomous: boolean; // ⬅ THE ENTIRE SAFETY MODEL IS THIS ONE FIELD
  slaHours: number;
  requires?: string;
}
```

There are **13 transitions: 9 marked `autonomous: true`, 4 marked `false`.**

## Why `autonomous: boolean` is the whole point

**The orchestrator may only execute transitions where `autonomous === true`.**

All three exits from `officer_review` — grant, clarify, refuse — are
`autonomous: false`.

So the claim *"the AI never grants a passport"* is **not a policy the agent is
asked to respect.** It is a **property of the data**. No step budget, no retry,
no future code path, no prompt injection can cross it — because there is
physically no `true` row leading out of `officer_review`.

This is the difference between:

- ❌ *"We told the AI not to approve applications"* — a promise
- ✅ *"There is no move in the action space that approves an application"* — a proof

The test asserts this against `CASE_TRANSITIONS` **itself**, not against runtime
behaviour, precisely because runtime behaviour is the part a later change could
break.

## What "agentic" means here, concretely

There are two agents in this project. Be able to distinguish them:

### Agent 1 — `CaseOrchestratorService` (the lifecycle driver)

Each pass it:
1. **Perceives** — reads the whole case register
2. **Prioritises** — tatkal (expedited) first, then SLA-breached, then oldest
3. **Decides** — looks up the legal `autonomous: true` move from the current stage
4. **Writes down why** — *before* acting
5. **Acts** — calls the real MCP tool via `ToolExecutorService`
6. **Narrates** — records what it did **and what it refused to do**

> The rationale is composed **before** the call, from the state that justified the
> choice. Writing it afterwards from the result would produce a plausible post-hoc
> story — and a worthless audit record. That distinction is worth saying out loud
> in a demo.

### Agent 2 — the fraud investigator (`agent_investigate`)

This one is genuinely non-deterministic in its path. It has **no fixed stage array**.
Each turn it builds an observation from what it has learned and picks **one** next
action. Three consequences:

1. **Trajectories diverge.** A clean application never reaches
   `visual_similarity_flag` — the agent stops early. A ring subject gets extra
   turns on the graph and photo comparison. *Same code, different paths.*
2. **Arguments are derived at runtime.** `visual_similarity_flag` needs a *target*
   application. Nothing hardcodes it — the agent reads the duplicate signals it
   just collected, finds the counterpart sharing a document image, and compares
   against *that*. It cannot know the target before running, because the target
   **is a finding**.
3. **It reacts to its own uncertainty.** Below `AGENT_CONFIDENCE_FLOOR = 0.7` it
   refuses to conclude and escalates to a human. Bounded at
   `AGENT_MAX_STEPS = 16`.

An LLM (Gemini or OpenAI, via `GEMINI_API_KEY` / `OPENAI_API_KEY`) plans when a key
is present. Without a key, a deterministic planner takes over. **Both draw from the
same enumerated action space** — so the agent's authority is identical either way.
And `officer_decide` is **not in that enum**. The agent cannot decide an
application's outcome even if a model tells it to.

---

# PART 6 — The workflow, end to end

## A. Citizen files an application

`submit_passport_application` →
mints an ARN → registers a case at `submitted` → adds the applicant to the fraud
graph → **reindexes it**, so the new application is immediately comparable against
every existing one.

## B. The agent takes over

`advance_case(arn, maxSteps: 40)`. Real output from the running server:

```
submitted → officer_review | 6 executed, 0 failed | handedToOfficer: True

  pay_application_fee            submitted            → fee_paid              ✓
  book_psk_appointment           fee_paid             → appointment_booked    ✓
  complete_psk_visit             appointment_booked   → psk_visit_complete    ✓
  run_case_verification          psk_visit_complete   → verification_running  ✓
  initiate_police_verification   verification_running → police_verification   ✓
  record_police_verification     police_verification  → officer_review        ✓
  —                              officer_review       → (declined)

STOP: Waiting on a human passport officer. PassportIQ has prepared the
      recommendation and will not decide — officer_decide is the only way
      past this point.
```

**40 steps requested. 6 taken. The gate holds.**

Each step produces a real artefact: a fee receipt, a PSK token with counter A/B/C
results, a police verification report.

## C. What happens when it *can't* proceed

The agent doesn't fail silently or guess. Real output:

```
STOP: Blocked: ARN-2026-000009 cannot be verified: counter C is unresolved —
      birth_certificate were never produced. Verifying an incomplete file would
      produce a confident answer about missing evidence.
```

That last sentence is the philosophy of the project in one line.

## D. The officer decides

`officer_decide` — guarded by `PipelineCompleteGuard`. If verification is
incomplete you get a **usable** error, not "access denied":

```
Cannot record a decision on PIQ-2026-2001 yet — 3 verification stage(s) have
not completed: evaluate_rules, score_risk, explain_risk.
```

The decision emits `application.decided`. `CaseflowDecisionBridge` catches it via
`@OnEvent` and maps it back onto the lifecycle:
approve → `granted`, clarify → `clarification`, reject → `rejected`.

**That's the loop closing:** agent drives → human decides → agent resumes.

## E. The agent resumes

`granted → printing → dispatched → delivered`, all `autonomous: true`. Booklet
number, then Speed Post tracking. Case closed.

---

# PART 7 — Testing

```
✅ Seed integrity:        67   the planted fraud rings are actually there
✅ Backend B acceptance: 106   pipeline, graph, guard, events
✅ Agent acceptance:      63   trajectories diverge; agent can't decide
✅ Caseflow acceptance:   95   the lifecycle
✅ Console acceptance:    35   HTTP + SSE
                        ────
                         366   all passing
```

These run against a **real booted server** — real DI singletons, real `@OnEvent`
subscriptions, real guards. The only thing skipped is `app.start()`.

The caseflow suite tests four claims:
1. Illegal orders are refused (book before pay, pay twice, verify without the Kendra visit, print before grant)
2. The agent drives, then stops at the gate **on its own**
3. The gate is **structural** — asserted against `CASE_TRANSITIONS` directly
4. The journal is attributed and ordered

---

# PART 8 — Three real bugs (have these ready — judges love them)

**1. The orchestrator reported every successful step as a failure.**
`CaseflowService.transition()` mutates the registered case object *in place*, and
the orchestrator held **that very object** — not a copy. So reading `kase.stage`
after the tool call returned the **new** stage, and `after.stage !== kase.stage`
was always false. Fix: snapshot the stage before acting.

**2. A correct hand-off rendered red.** The orchestrator records its own refusal to
act as a step with tool `'—'`. That was counted as a failure — so the agent doing
exactly the right thing looked like an error. Fix: distinguish *declined* from
*failed*.

**3. A malformed form crashed with `Cannot read properties of undefined`.** The
in-process executor path (console HTTP, orchestrator) hands input straight to
`execute()` without the schema check an MCP *client* request gets. Fix:
re-validate at the tool boundary and name the missing fields.

All three were found by **running it**, not reading it.

---

# PART 9 — Running it

```bash
npm install
npm run build
npm run test:all      # 366 assertions

# stdio mode — for Claude Desktop / NitroStudio
npx tsx src/index.ts

# HTTP mode — the officer console
NODE_ENV=production HOST=0.0.0.0 PORT=8080 node dist/index.js
# → http://localhost:8080/console
```

Both autonomous loops default **off** so a demo starts calm:

```bash
PASSPORTIQ_CASEFLOW=true    # lifecycle orchestrator on a timer
PASSPORTIQ_AUTOPILOT=true   # fraud autopilot sweeps the queue
```

Healthy boot:

```
✅ Application initialized with 44 tools, 4 resources, 3 prompts
✓ ExecutionContext bridge installed (ctx.emit + ctx.input) on 44 tool(s)
✓ Case register — 9 passport case(s) across 7 lifecycle stage(s), 3 awaiting a human officer
```

**Demo subjects:** `PIQ-2026-2001` is the centre of a planted 4-application fraud
ring (shared phone, address and photo hash). `PIQ-2026-1003` is the clean control.

---

# PART 10 — Answers to questions you'll be asked

**"Is this just a CRUD app with an AI label?"**
No. The lifecycle is a declarative state machine, and an agent perceives,
prioritises, acts and explains against it. The proof it isn't a script: give it a
budget of 40 steps and it takes 6, because the 7th requires a human.

**"What stops the AI approving a passport?"**
There is no `autonomous: true` transition out of `officer_review`. The orchestrator
only executes `autonomous: true`. It's arithmetic, not a promise. The test asserts
it against the table itself.

**"How much is NitroStack vs. your code?"**
NitroStack gives the MCP protocol layer, the DI container, decorator registration,
Zod→JSON Schema, transport, widget bundling and the event bus. Mine is the domain:
the state machine, the two agents, the fraud graph, the console, 366 tests, and
`ToolExecutorService` — which reaches into NitroStack's private tool registry
because the framework has no public API for calling a tool by name from inside the
server, and the whole agentic layer depends on that.

**"Does it need an LLM?"**
No. With `GEMINI_API_KEY`/`OPENAI_API_KEY` the investigator uses an LLM planner;
without one a deterministic planner takes over. Both draw from the same action
space, so authority is identical. It demos on conference wifi with no key.

**"What would you do next?"**
Persistence (the register is in-memory), real integrations behind the simulated
PSK/police/printing adapters, and multi-officer roles. Also merging my teammates'
frontends from `.refs/`, which I left out to protect a working build.

---

# 🎬 PART 11 — VIDEO SCRIPT

**Target: 5–6 minutes.** Stage directions in `[brackets]`. Say the words in plain
text. Don't rush the pause at 2:45 — it's the moment the whole project lands.

---

### [0:00–0:30] — The problem

`[Screen: title slide, or just the console home]`

> Hi, I'm building PassportIQ — an AI copilot for passport verification officers,
> built as a NitroStack MCP server.
>
> Here's the problem. An Indian passport application passes through ten stages —
> filing, fee, a Passport Seva Kendra appointment, biometrics at counters A, B and
> C, verification, police verification, an officer's decision, printing, dispatch,
> delivery.
>
> And at the officer's desk, one person has to spot that *this* application shares
> a phone number with three others filed last month. Going file by file, a human
> structurally cannot see that pattern.
>
> PassportIQ runs the whole process automatically, catches those patterns — and
> then stops, and lets a human decide.

---

### [0:30–1:10] — What it's built on

`[Screen: the boot log]`

> This is an MCP server. MCP — Model Context Protocol — is the open standard for
> how an AI safely does things in someone else's system. Write your capabilities
> once, and any AI client can use them.
>
> I built it with NitroStack, a TypeScript framework that turns decorators into a
> full MCP server.
>
> `[point at the boot line]`
>
> Forty-four tools. Four resources. Three prompts. Six modules. Fourteen lifecycle
> stages. Three hundred and sixty-six passing tests.
>
> And notice this line: nine passport cases across seven lifecycle stages, three
> awaiting a human officer. That's a live case register, not fixtures.

---

### [1:10–1:50] — The lifecycle board

`[Screen: /console → "Lifecycle board"]`

> This is the officer console. Every lane is a real stage of the Passport Seva
> journey. Every card is a live case with an SLA clock — you can see two have
> already breached.
>
> And every single button on this page executes an MCP tool. There's no separate
> API. The browser is just another MCP client, the same as Claude Desktop would
> be.
>
> `[hover a card]`
>
> Each card offers exactly the move that's legal from its current stage. This one
> is at "fee paid", so the only thing offered is allotting a Kendra slot. You
> cannot book before you pay — the state machine refuses it.

---

### [1:50–2:45] — The agent runs ⭐

`[Screen: click "File application", fill it, submit — then open the case and
"Run to the next gate"]`

> Let me file a fresh application.
>
> `[submit]`
>
> That minted an ARN, opened a case, and reindexed the fraud graph — so this
> application is already comparable against every other one in the system.
>
> Now I'll hand it to the agent. I'm giving it a budget of forty steps.
>
> `[click Run to the next gate]`
>
> Watch. Fee collected. Kendra slot allotted. Counters A, B and C — documents
> granted, biometrics captured. Verification pipeline. Police verification
> initiated. Police verification recorded.
>
> Six transitions, unattended. It generated a real fee receipt, a PSK token, a
> police report.
>
> And now — it stops.

---

### [2:45–3:30] — The gate ⭐⭐ THE KEY MOMENT

`[Screen: the stop message. Pause. Let it sit for two full seconds.]`

> *"Waiting on a human passport officer. PassportIQ has prepared the
> recommendation and will not decide."*
>
> I gave it forty steps. It took six.
>
> `[pause]`
>
> And here's the part I actually care about — it didn't stop because I told it to
> be careful.
>
> `[Screen: open caseflow.contract.ts, scroll to CASE_TRANSITIONS]`
>
> The entire lifecycle is declared as data. Every legal move is a row in this
> table, and every row carries a flag: `autonomous`.
>
> The orchestrator can only execute rows where that flag is true. And all three
> exits from "officer review" — grant, clarify, refuse — are false.
>
> So "the AI never grants a passport" isn't a policy I asked it to respect. There
> is no move in its action space that grants a passport. It's arithmetic.
>
> And I test that against the table itself, not against behaviour — because
> behaviour is the part a future change could break.

---

### [3:30–4:00] — When it can't proceed

`[Screen: advance a blocked case — ARN-2026-000009]`

> Here's a different case. Same agent, same command.
>
> `[run it]`
>
> *"Cannot be verified: counter C is unresolved — birth certificate was never
> produced. Verifying an incomplete file would produce a confident answer about
> missing evidence."*
>
> It didn't guess. It didn't fail silently. It named the counter, named the
> document, and explained why proceeding would be worse than stopping.

---

### [4:00–4:35] — The audit trail

`[Screen: a case journey view — stage rail, artefacts, journal]`

> Every case has a full file. The stage rail, the artefacts — fee receipt, PSK
> token, police report — and the journal.
>
> Every entry names who did it, which tool did it, and why.
>
> And the reasoning is written *before* the action, from the state that justified
> it. If you wrote it afterwards from the result, you'd get a plausible story and
> a worthless audit record. For a government document, that distinction is the
> whole thing.

---

### [4:35–5:05] — The fraud layer

`[Screen: Fraud graph → PIQ-2026-2001]`

> The other half. This is the cross-application intelligence.
>
> `[show the graph]`
>
> Four applications that look unrelated one at a time, sharing a phone number, an
> address, and a passport photo hash.
>
> There's a second agent here — an investigator. It has no fixed script. It picks
> its next tool from what it's learned so far. A clean application stops in three
> steps. This one keeps going.
>
> And the photo-comparison tool needs a *target* application — nothing hardcodes
> it. The agent reads the duplicates it just found and picks the counterpart. It
> couldn't know the target in advance, because the target is a finding.
>
> Below seventy percent confidence, it refuses to conclude and escalates.

---

### [5:05–5:40] — Tests and honesty

`[Screen: terminal → npm run test:all]`

> Three hundred and sixty-six assertions, against a real booted server — real
> dependency injection, real event subscriptions, real guards.
>
> And running it found three bugs reading it never would have.
>
> The orchestrator was reporting every *successful* step as a failure — it held
> the same object the service mutates in place, so its before-and-after comparison
> was always false.
>
> A correct hand-off to an officer was rendering red, because the agent's
> deliberate refusal to act was being counted as an error.
>
> And a malformed form crashed with "cannot read properties of undefined", because
> the in-process path skips the schema check MCP clients get.
>
> All three are fixed, and all three have tests.

---

### [5:40–6:00] — Close

`[Screen: back to the lifecycle board]`

> So: PassportIQ. The entire passport lifecycle as forty-four MCP tools, on
> NitroStack. An agent that runs the whole process, explains every step, and stops
> at the one decision that belongs to a person.
>
> Not because I asked it to.
>
> Because there's no path through the data that lets it do anything else.
>
> Thank you.

---

## Recording tips

| | |
|---|---|
| **Prep** | Start the server *before* recording. `PASSPORTIQ_CASEFLOW=false` so the board is stable until you press the button yourself. |
| **Have ready** | One fresh ARN (files clean, runs to the gate) and `ARN-2026-000009` (blocks at counter C). |
| **Tabs open** | `/console` · `caseflow.contract.ts` at `CASE_TRANSITIONS` · a terminal |
| **Font** | Bump the editor to ~18pt. Judges may watch on a laptop. |
| **The one pause** | After *"I gave it forty steps. It took six."* — stop talking for two seconds. |
| **If asked to cut it** | Drop §4:00–4:35 (audit trail) and §5:05–5:40 (tests). Never drop 2:45. |
| **Don't oversell** | The PSK/police/printing integrations are simulated adapters — say so if asked. The state machine, the agents, the fraud graph and the tests are all real. |
