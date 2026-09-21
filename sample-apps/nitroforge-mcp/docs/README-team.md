# NitroForge

**An MCP server that builds MCP servers.**

Point it at an OpenAPI spec. It returns a verified, deployable [NitroStack](https://docs.nitrostack.ai/) MCP server — clustered tools, derived Zod schemas, and a UI widget — with every stage observable over the MCP protocol.

Built entirely on the **NitroStack CLI + SDK**. Docs: https://docs.nitrostack.ai/

---

## Why this isn't a wrapper around a coding agent

> **Delete the LLM from a wrapper and you get nothing. Delete the LLM from NitroForge and you still get a working MCP server — just with dumb tool names and a naive 1:1 endpoint mapping.**

The LLM is an *optimization pass over a deterministic pipeline*, not the pipeline. Four properties follow, and every design decision in this repo exists to protect them:

| | |
|---|---|
| **The model emits data, not code** | It returns a ~4KB JSON plan (the IR), Zod-validated *before* any TypeScript exists |
| **Codegen is deterministic** | Same IR in → byte-identical code out. Snapshot-testable, diffable, regenerable |
| **The verifier is a machine** | `tsc` + a real MCP handshake — not a model reviewing its own output |
| **Domain knowledge lives in code** | Typed templates and lint rules, not a system-prompt string |

**The landscape gap:** deterministic OpenAPI→MCP generators have determinism but no judgment (300 endpoints → 300 unusable tools). LLM codegen has judgment but no determinism or verification. Nobody has both, because everyone treats it as one problem. We split it at the IR.

---

## Architecture

```
OpenAPI spec
    │
    ├─ ① PARSE      deterministic · NO model                    ← W1
    ▼
EndpointGraph       paths · params · schemas · security
    │
    ├─ ② PLAN       LLM · judgment ONLY                         ← W1
    │               names · descriptions · clustering · widget mapping
    ▼
ToolSurfaceIR   ──▶ Zod validation + lint rules (≤20 tools)
    │
    ├─ ③ EMIT       deterministic templates · NO model          ← W2
    ▼
GeneratedProject
    │
    ├─ ④ VERIFY     tsc → build → boot → replay (mocked HTTP)   ← W2
    ▼
VerificationReport  "9/9 green"
    │
    └─ ArtifactStore ──▶ .forge/ ──▶ Resources · Console        ← W3
```

**Note there is no `inputSchema` in the IR.** Input schemas are derived by the emitter from the `EndpointGraph` via each tool's `composes` array. The model cannot invent field names — that's structural, not a guardrail.

---

## MCP surface

| Primitive | Name | Notes |
|---|---|---|
| **Tool** | `parse_spec` | `@Cache` · deterministic |
| **Tool** | `plan_tool_surface` | `@RateLimit` · `@Widget` · the only LLM call |
| **Tool** | `forge_server` | `@Widget` · `taskSupport: 'required'` |
| **Resource** | `forge://specs` | vetted spec catalog |
| **Resource** | `forge://ir/{id}` | **the raw IR — the thesis, inspectable** · completions |
| **Resource** | `forge://server/{id}` | manifest + verification report · completions |
| **Prompt** | `forge_this_api` | chains all three tools into one user action |
| **Prompt** | `review_tool_surface` | critique clustering + naming |
| **Widget** | `tool-surface` | renders on plan + forge · 2 follow-up buttons |
| **Notification** | `resources/list_changed` | fires on forge completion |
| **Extras** | `completions` · `logging` · `@HealthCheck` | |

Plus the **Forge Console** — a browsable page at `/` on the deployed instance showing the capability surface and a live SSE feed of `tools/call`, `resources/read`, `prompts/get` and notifications as they happen.

---

## Project structure

```
nitroforge/
├── CLAUDE.md                          ← SDK reference, for AI context
├── Dockerfile                         ← multi-stage; bakes skeleton + console
│
├── src/
│   ├── contracts/                     ★ FROZEN AT H0 — all three depend
│   │   ├── endpoint-graph.schema.ts
│   │   ├── ir.schema.ts
│   │   ├── generated-project.schema.ts
│   │   ├── verification-report.schema.ts
│   │   ├── store.contract.ts
│   │   ├── activity.contract.ts
│   │   └── ports.ts
│   │
│   ├── modules/
│   │   ├── ingest/                    ══ W1 ══
│   │   │   ├── ingest.module.ts
│   │   │   ├── ingest.tools.ts        parse_spec · plan_tool_surface
│   │   │   ├── parser.service.ts      deterministic — NO model
│   │   │   └── planner.service.ts     the ONLY LLM call
│   │   │
│   │   ├── forge/                     ══ W2 ══
│   │   │   ├── forge.module.ts
│   │   │   ├── forge.tools.ts         forge_server
│   │   │   ├── emitter.service.ts     IR → project (templates, NO model)
│   │   │   ├── verifier.service.ts    tsc → build → boot → replay
│   │   │   └── templates/*.hbs
│   │   │
│   │   └── catalog/                   ══ W3 ══
│   │       ├── catalog.module.ts
│   │       ├── catalog.resources.ts   3 resources + completions
│   │       ├── catalog.prompts.ts     2 prompts
│   │       ├── store.service.ts       Map + write-through → .forge/
│   │       └── notifier.service.ts    resources/list_changed
│   │
│   ├── observability/                 ══ W3 ══ cross-cutting
│   │   ├── activity.interceptor.ts    wraps tools · resources · prompts
│   │   └── activity.service.ts        append → .forge/activity.log
│   │
│   ├── health/forge.health.ts
│   ├── widgets/app/tool-surface/page.tsx    ══ W3 ══
│   ├── app.module.ts
│   └── index.ts
│
├── console/                           ══ W3 ══ SEPARATE PROCESS
│   ├── server.ts                      static + SSE tail of .forge/
│   └── public/index.html              single file, no build step
│
├── templates/skeleton/                pre-warmed node_modules
├── fixtures/
│   ├── specs/    stripe.json · openfda.json · petstore.json (tests only)
│   ├── graphs/   expected parser output
│   ├── irs/      demo.ir.json  ← HAND-WRITTEN at H0
│   └── activity.log             ← console dev fixture
└── .forge/                            gitignored · runtime artifacts
```

**Why this shape:** `contracts/` is a top-level peer of `modules/` because it belongs to no workstream — physical separation makes "frozen" obvious. One module per pipeline stage, one owner each, so merge conflicts are structurally rare. `console/` sits outside `src/` because it's a different process with a different failure domain. `observability/` is separate from `catalog/` because the interceptor wraps W1's and W2's handlers too.

---

## Getting started

**Prerequisites:** Node **20.18.1** (use nvm) · npm 9+ · `npm i -g tsx`

```bash
npm install -g @nitrostack/cli
nitrostack-cli --version

# scaffold (already done — clone instead)
npx @nitrostack/cli init nitroforge

cd nitroforge
nitrostack-cli install          # installs root + src/widgets
npm run dev                     # MCP server; widgets on :3001
```

**NitroStudio is a standalone desktop app** — download from [nitrostack.ai/studio](https://nitrostack.ai/studio) and point it at this directory. It gives you real-time tool testing, widget preview, and request/response inspection. This is your controlled demo environment; get it working at H0.

```bash
nitrostack-cli generate types   # regenerate widget types after tool changes
nitrostack-cli build
```

---

## ⚠️ Doc discrepancies — resolve these in the first 20 minutes

The Quick Start and the SDK Reference disagree in four places. **Whoever scaffolds first: run `npx @nitrostack/cli init` on a throwaway project, look at what the generated code actually does, and post the answers in the group chat.** Everyone else codes against those answers.

| # | Quick Start says | SDK Reference says |
|---|---|---|
| 1 | `import { ToolDecorator as Tool, z } from '@nitrostack/core'` | `import { Tool } from '@nitrostack/core'` + `import { z } from 'zod'` |
| 2 | `ConfigModule` from `@nitrostack/core` | `ConfigModule` from `nitrostack/config` |
| 3 | `const s = await McpApplicationFactory.create(App); await s.start();` | `McpApplicationFactory.create(AppModule);` |
| 4 | `@McpApp({ module: AppModule, server: {…} })` | `@McpApp({ server: {…} })` |

Also: the **Widgets guide says inline styles only** (Tailwind breaks in the iframe), but the **Quick Start sample widget uses Tailwind classes**. Trust the dedicated widgets guide — **use inline styles.** If a widget renders unstyled, this is why.

---

## Workstreams

### ══ W1 · INGEST & PLAN ══ `src/modules/ingest/`

**Owns:** `parse_spec`, `plan_tool_surface`, the IR schema and its lint rules.
**Produces:** `ToolSurfaceIR`. That's the only thing anyone else sees.

| Deliverable | Notes |
|---|---|
| `parser.service.ts` | OpenAPI → `EndpointGraph`. `$ref` resolution, `allOf` flattening, param + response + security extraction |
| `ingest.tools.ts` | `parse_spec` (`@Cache({ttl:3600})`) · `plan_tool_surface` (`@RateLimit({requests:5,window:'1m'})`, `@Widget('tool-surface')`) |
| `planner.service.ts` | The single LLM call. Prompt in a versioned file, not a string literal |
| Lint rules | ≤20 tools · snake_case verb-first names · descriptions 20–300 chars · **every `composes` id must resolve to a real endpoint** |

**Two rules that matter more than anything else you write:**

1. **The parser never guesses.** If a field name is invented here, everything downstream compiles, boots and verifies green — and is silently wrong. This is the one failure the machine oracle cannot catch. Throw loudly on unresolvable refs rather than filling in a plausible default.
2. **The planner emits JSON, never code.** No `inputSchema` field in the IR, even though it'll feel convenient. W2 derives those.

**Definition of done:** pinned spec in → valid IR out, ≤20 tools, all `composes` resolve, W2's emitter accepts it.

**Don't build:** input schema generation, any codegen, English→server, spec #3 onward.
**Needs at H0:** an LLM API key behind `ConfigModule` — sort this before you need it.

---

### ══ W2 · EMIT & VERIFY ══ `src/modules/forge/`

**Owns:** `forge_server` and everything under it.
**You are why we can say "verified, not plausible."**

| Deliverable | Notes |
|---|---|
| `emitter.service.ts` | IR → `GeneratedProject`. Handlebars templates. **No model anywhere** |
| Zod schema derivation | From `EndpointGraph` via `composes` — the strongest sentence in the pitch |
| `verifier.service.ts` | `tsc` → `nitrostack build` → boot → MCP handshake → replay `examples.request` → diff |
| `forge.tools.ts` | `taskSupport: 'required'`, `@Widget('tool-surface')`, progress via `ctx.task.updateProgress()` |
| `templates/skeleton/` | **Build this at H1, not H5** |

**Three rules:**

1. **Emission is deterministic.** If you're ever tempted to "just have the LLM fill this bit in," that's the moment the whole architectural claim collapses.
2. **You derive input schemas — the model never sees them.** Protect this.
3. **Repairs go upstream, never into generated files.** Patched output no longer corresponds to its IR.

**⚠ Pre-warmed skeleton, at H1:** `npm install` per generation costs 60–90s and turns the live demo into a spinner. Keep `templates/skeleton/` with `node_modules` already installed, copy the directory, overwrite `src/`.

**⚠ Mock the HTTP layer during replay.** The generated server calls a third-party API that may need credentials or working venue wifi. Stub the client and replay against `examples.response` — faster, offline-safe, and it tests what you actually care about.

**Your templates must encode:** `.js` import extensions · decorators only · constructor injection · thin tools / fat services · Zod `inputSchema` on every tool · **always** `examples.request` + `examples.response` · `invocation: { invoking, invoked }`.

**Definition of done:** hand-written IR in → project that typechecks, builds, boots, handshakes, and returns the expected example response for every tool. Green report.

**Don't build:** the widget component (W3 authors it, you stamp it), the planner, anything that puts a model in your emitter.

---

### ══ W3 · SURFACE, OBSERVABILITY & DEPLOY ══ `src/modules/catalog/`, `src/observability/`, `console/`

**Owns:** NitroForge's shell, all Resources and Prompts, the store, the activity pipeline, the widget, the console, Docker and deploy.

| Deliverable | Notes |
|---|---|
| **`store.contract.ts` + `activity.contract.ts`** | **At H0, ahead of your own work — W1 and W2 both depend on the store** |
| `store.service.ts` | `Map` + write-through to `.forge/`. Survives restart; lets Resources serve after redeploy |
| `catalog.resources.ts` | 3 resources + `completions` on the URI templates |
| `catalog.prompts.ts` | `forge_this_api` (chains the 3 tools) · `review_tool_surface` |
| `activity.interceptor.ts` | Wraps tools **and** resources **and** prompts → `.forge/activity.log` (JSONL) |
| `notifier.service.ts` | `resources/list_changed` on forge completion |
| `widgets/app/tool-surface/page.tsx` | `useWidgetSDK` · `useTheme` · **inline styles** · 2 buttons via `sendFollowUpMessage` |
| `console/` | **Separate process.** Static page + SSE tail of `.forge/` |
| Dockerfile + deploy | Container platform, not serverless |

**Start against stubs at hour one.** `ports.ts` exists so you can build the entire surface on day one against fixtures. If you're ever blocked on W1 or W2, the stub is missing — write it.

**Why the console is a separate process:** it must not be able to crash, deadlock or block the MCP server. It reads `.forge/` from disk — no imports, no shared memory, no IPC. Anything touching the demo path must not be able to take down the thing being demoed. It also means you can build it entirely against `fixtures/activity.log`.

**Console must show raw JSON-RPC method names** — `tools/call`, `resources/read`, `prompts/get`, `notifications/resources/list_changed` — not friendly labels. That's what makes it read as protocol instrumentation rather than a generic dashboard.

**Deploy constraints:** `forge_server` writes files, runs `tsc`, and spawns a child process. That rules out Vercel / Lambda / Cloudflare Workers. Use Railway, Render, Fly.io or Cloud Run. `typescript` goes in `dependencies`, not `devDependencies`. Memory ≥ 1GB. Bake `templates/skeleton/` into the image at build time.

**Definition of done:** all 3 tools callable from Studio with live Tasks progress; 3 resources readable; 2 prompts invocable; console streaming real activity; deployed URL live.

---

## Frozen contracts

Everything in `src/contracts/` is written before feature code and changed only with **full-team sign-off** — a change there breaks all three workstreams simultaneously.

```ts
// ports.ts
export interface IngestPort {                                    // W1
  parse(specUrlOrBody: string): Promise<EndpointGraph>;
  plan(graph: EndpointGraph, hints?: PlanHints): Promise<ToolSurfaceIR>;
}
export interface EmitPort {                                      // W2
  emit(ir: ToolSurfaceIR, graph: EndpointGraph): Promise<GeneratedProject>;
  verify(project: GeneratedProject): Promise<VerificationReport>;
}
export interface ArtifactStore { /* store.contract.ts */ }       // W3
```

```ts
// activity.contract.ts — the console reads exactly this shape
export const ActivityEventSchema = z.object({
  ts: z.string(),
  kind: z.enum(['tool', 'resource', 'prompt', 'notification']),
  method: z.string(),        // 'tools/call' · 'resources/read' · 'prompts/get'
  name: z.string(),
  durationMs: z.number().nullable(),
  status: z.enum(['ok', 'error']),
  detail: z.string().nullable(),
});
```

---

## NitroStack conventions

- **`.js` extensions on every import**, even from `.ts`. AI assistants get this wrong constantly — check every file.
- **Decorators only.** No `server.tool()` or factory functions.
- **Constructor injection.** Never `new ClassName()`.
- **Services hold logic; tools are thin.**
- **Zod `inputSchema` on every tool.** All outputs JSON-serializable.
- **Always `examples.request` / `examples.response`** — widget previews and W2's replay stage both depend on them.
- **Widgets: inline styles.** Tailwind breaks in the iframe. `useWidgetSDK()`, not `withToolData`. Always guard on `isReady`.
- **Save https://docs.nitrostack.ai/ai-agents/sdk-reference as `CLAUDE.md`** before prompting any AI assistant. It's written for AI code editors and prevents most of the above.

---

## Build order

```
H0     ★ contracts/* frozen (incl. store + activity)
       ★ hand-write fixtures/irs/demo.ir.json  (~45 min — do not delegate)
       ★ vet both specs with a script, NOT by reading them into an AI context
       ★ resolve the 4 doc discrepancies above
       ★ pre-warmed skeleton · Studio booting

H1–3   W1 parser        W2 emitter → typechecks     W3 shell · store · console vs fixture
H3–4   W1 planner + lint  W2 tsc + boot             W3 resources · prompts · SSE live
H4–5   ══ CONVERGENCE: real IR → real emitter → real report ══
                                                    W3 widget · list_changed
H5–6   replay + mocked HTTP · completions · Docker · deploy
H-2h   ⚠ RECORD THE FALLBACK VIDEO
H-1h   rehearse twice, out loud, console projected
```

**Two rules decide whether this ships:** contracts freeze at H0, and the demo is *rehearsed* at H-1, not assembled at H-1.

---

## Demo

1. `parse_spec` on Stripe → *"No model has touched this. Field names are derived."*
2. `plan_tool_surface` → widget: **312 endpoints → 12 tools** → console fires `resources/list_changed`
3. Widget button **"Inspect the IR"** → model reads `forge://ir/…` → *"That's the model's literal output. JSON, not code."*
4. `forge_server` on openFDA → Tasks progress → **`9/9 green`**
5. Invoke `review_tool_surface` → console shows `prompts/get`
6. *"Tools, Resources, Prompts and protocol notifications — live, on a deployed instance you can connect to right now."*

**Run two instances:** demo from local stdio (no wifi dependency, no cold start), point at the deployed URL for proof. Demoing live over conference wifi against a cold container is a gamble that earns no extra credit.

---

## Reference

[SDK Reference (AI)](https://docs.nitrostack.ai/ai-agents/sdk-reference) · [Tools](https://docs.nitrostack.ai/sdk/typescript/tools) · [Resources](https://docs.nitrostack.ai/sdk/typescript/resources) · [Prompts](https://docs.nitrostack.ai/sdk/typescript/prompts) · [Widgets](https://docs.nitrostack.ai/sdk/typescript/ui/widgets) · [MCP Tasks](https://docs.nitrostack.ai/sdk/typescript/tasks) · [Interceptors](https://docs.nitrostack.ai/sdk/typescript/interceptors) · [Events](https://docs.nitrostack.ai/sdk/typescript/events) · [Caching](https://docs.nitrostack.ai/sdk/typescript/caching) · [Rate Limiting](https://docs.nitrostack.ai/sdk/typescript/rate-limiting) · [Dual Transport](https://docs.nitrostack.ai/guides/dual-transport) · [Docker](https://docs.nitrostack.ai/deployment/docker) · [Cloud](https://docs.nitrostack.ai/deployment/cloud) · [Checklist](https://docs.nitrostack.ai/deployment/checklist)
