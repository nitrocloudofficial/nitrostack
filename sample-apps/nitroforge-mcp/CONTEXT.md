# NitroForge — Complete Context (for handoff to a new Claude session)

Pair this with `workflow.md`. This file is the "what actually happened and
what's actually true" companion — `workflow.md` presumably has the
intended plan; this has the as-built reality, verified against real code
execution, not assumption.

---

## 1. What NitroForge is

An MCP server that builds MCP servers. Point it at an OpenAPI spec:

```
parse_spec (deterministic)
  -> plan_tool_surface (the ONE LLM call in the whole system)
  -> forge_server (deterministic codegen + real machine verification)
```

Core architectural claim: delete the LLM and you still get a working
server with dumb, literal names. The model is an optimization pass on tool
naming/clustering, not a load-bearing part of the pipeline. Concretely:
input schemas for generated tools are derived from the parsed
`EndpointGraph` (path params, query params, request body shape), NEVER
from the model's output. The `ToolSurfaceIR` schema has no `inputSchema`
field by design — enforced structurally, not by convention.

Three workstreams, each owning a slice:
- W1 (ingest) — `src/modules/ingest/`: OpenAPI parsing (deterministic) +
  LLM planning. Built by a prior collaborator, frozen contracts, real
  tests, all verified working.
- W2 (forge) — `src/modules/forge/`: deterministic code generation
  (Handlebars templates) + real machine verification (tsc/build/boot/MCP
  replay). Built by Claude this session, from scratch.
- W3 (catalog/observability/console) — `src/modules/catalog/`,
  `src/observability/`, `console/`: real disk-backed store, MCP
  Resources/Prompts, activity logging, and a separate-process web console.
  Built by Claude this session, from scratch.

All three are now wired into one running app (`src/app.module.ts`),
verified live together, not just individually.

---

## 2. How this session actually went (narrative, in order)

1. Built a W3 draft speculatively, before any real repo existed —
   catalog module, store service, console, widget, based on fetched docs
   and best-guess conventions. Several assumptions turned out wrong (see
   §3) — later replaced with verified-real code.
2. User uploaded W1's real repo (a tarball) — real, tested
   `src/modules/ingest/`, frozen `src/contracts/`, real `CLAUDE.md` and
   `docs/HANDOFF-W2.md`/`docs/BUILD-W2.md`. Ran the real setup gate
   (`npm install` pinned lockfile, typecheck, build, `npx vitest run`) —
   17/17 green from the start.
3. Verified every SDK claim against the real installed package
   (`node_modules/@nitrostack/core/dist/**/*.d.ts` and `.js` source)
   rather than trusting fetched docs or prior comments at face value —
   see §3 for the full list of things that turned out wrong.
4. Built Phase 1B (stub forge_server) -> Phase 2A (real emitter: schema
   derivation from the graph, Handlebars templates, deterministic output,
   proven byte-identical on reruns) -> Phase 2B (real 4-stage verifier:
   typecheck, build, boot, MCP replay against a mocked HTTP layer) — each
   phase actually run and proven green before moving to the next.
5. Connected W1 and W3 for real — rebuilt the catalog module against the
   actual frozen contracts, then proved live that `parse_spec` and the
   catalog Resources share exactly one store instance by checking the
   actual bytes on disk after a real MCP call.
6. Built real widget archetypes (`data-table`/`stat-card`) against the
   real `@nitrostack/widgets` API, got a real `next build` static export,
   re-verified the pipeline green with the `WIDGETS_DEV_MODE` workaround
   removed.
7. Investigated live LLM planner testing. A NitroStack/NitroCloud "free
   tokens" key turned out to be for NitroCloud's own hosted chat/deploy
   product, not a portable key — confirmed via a real 401 against
   Anthropic's actual API. Every LLM provider except `api.anthropic.com`
   is network-blocked from the building sandbox (confirmed for OpenAI,
   Groq, Gemini, Mistral, Cohere, Together, Perplexity, OpenRouter,
   NitroCloud's own domains). No live LLM planner run ever happened —
   this remains the single biggest open unknown.
8. Built a provider abstraction anyway (`src/modules/ingest/providers/`)
   so a Groq/OpenAI-compatible model can be swapped in via `LLM_PROVIDER`
   env var — written correctly per Groq's documented API shape, but
   flagged as never run against a live endpoint.
9. Hardened the planner's guardrails with adversarial test cases
   (duplicate tool names, mismatched `primaryEndpoint`) since a live
   model test wasn't possible — proved the retry/validate/throw safety
   net catches every adversarial case testable without one.
10. Built the console (separate process, live activity feed, catalog
    browser) and verified it against real forged output.
11. Found and fixed a genuine deployment blocker: the `@McpApp`
    decorator's `transport` config field does nothing — tested directly.
    The real mechanism is `NODE_ENV=production` (or explicit
    `MCP_TRANSPORT_TYPE=dual`) + `PORT` env var. Verified live with an
    actual `curl` POST getting a real MCP `initialize` response over
    HTTP. This would have silently broken any cloud deployment if not
    caught.

---

## 3. Every verified SDK/framework finding (the stuff not in the docs)

All confirmed by reading `node_modules/@nitrostack/core`'s actual
`.d.ts`/`.js` source and/or running real code:

- `Tool`/`Resource`/`Prompt`/`Controller` imported bare are builder
  classes, not decorators. Real decorators are `ToolDecorator`/
  `ResourceDecorator`/`PromptDecorator`/`ControllerDecorator`, aliased on
  import.
- `ConfigModule`/`ConfigService` live in `@nitrostack/core`, not
  `nitrostack/config` (one doc said otherwise).
- `@Injectable({ deps: [...] })` is genuinely the documented ESM-safe
  pattern.
- DIContainer is a flat GLOBAL singleton (`static getInstance()`), not a
  per-module hierarchical injector. `register()` is a plain `Map.set()` —
  duplicate registrations of the same token across modules silently
  overwrite each other. A module's own `providers` register before its
  `imports` are walked (in array order), and controller resolution
  happens only after ALL provider registration completes — so "last
  module imported wins" for any token registered in multiple places.
  Load-bearing: `CatalogModule` has to be the LAST entry in
  `AppModule.imports` for its real store to win over
  `IngestModule`/`ForgeModule`'s temporary in-memory ones.
- Health-check providers are resolved EAGERLY at registration time,
  unlike ordinary providers (lazy, resolved after all registration
  completes). Putting a health check in the root module's own `providers`
  can crash boot if it depends on something registered later via
  `imports`.
- `@HealthCheck` is a CLASS decorator (`{name, description, interval}` +
  `implements HealthCheckInterface` with `async check()`), not a method
  decorator — contradicts the fetched SDK reference doc.
- `@UseInterceptors`/`@Interceptor()` only work on `@Tool` methods.
  `buildResource`/`buildPrompt` never read interceptor metadata at all.
  No global/app-level interceptor hook exists either.
- No public API exists to fire a real MCP notification (e.g.
  `resources/list_changed`) from application code. `ExecutionContext` has
  no server handle; the full export surface has zero notification-related
  exports.
- `@Prompt` handlers return a BARE ARRAY of `{ role, content: string }`
  (content as a plain string) — not the `{ messages: [{ content: { type:
  'text', text } }] }` shape the SDK reference doc shows. The framework
  wraps it into full protocol shape at the transport layer automatically
  (confirmed live).
- `ResourceOptions.examples` is `{ response }` only — no `request` field.
- Any `@Widget('route')`-decorated tool BLOCKS THE ENTIRE SERVER FROM
  BOOTING unless a real static export exists at
  `src/widgets/out/<route>.html` (or `out/<route>/index.html`) —
  `McpApplicationFactory.create()` eagerly resolves it and throws if
  missing. `WIDGETS_DEV_MODE=true` bypasses this with a dev placeholder.
- `index.ts` needs TWO calls, not one: `const server = await
  McpApplicationFactory.create(AppModule); await server.start();` — the
  Quick Start doc matches this; the SDK Reference doc's single-call
  example does not.
- `@McpApp({ module: AppModule, ... })` genuinely self-references the
  class being decorated — works due to how TS legacy decorators evaluate.
- Real CLI-generated code uses NO class-level decorator at all on
  Tool/Resource/Prompt controller classes — just listed in the module's
  `controllers: [...]` array. `@Controller()` is not strictly required.
- `nitrostack-cli init` is INTERACTIVE (prompts for a description) and
  also tries to phone home to PostHog analytics — both cause problems in
  non-interactive environments. Pass `--description`, `--author`,
  `--skip-install` explicitly. The PostHog failure is harmless if
  network-blocked.
- `@McpApp({ transport: {...} })` HAS ZERO EFFECT on actual transport
  selection. `NitroStackServer.start()` derives transport type entirely
  from `NODE_ENV`/`MCP_TRANSPORT_TYPE` env vars, and HTTP `port`/`host`
  come straight from `process.env.PORT`/`HOST` — never from the
  decorator's config object. `NODE_ENV=production` (or
  `MCP_TRANSPORT_TYPE=dual`) is what actually enables HTTP transport
  (endpoint `/mcp`, Streamable HTTP). Verified live: a real curl POST with
  `initialize` got a real response only once this env var was set.

---

## 4. What's proven real vs. what's genuinely unverified

PROVEN REAL, LIVE, this session (not just written):
- `parse_spec` — real MCP call, real graph, real fixture spec.
- Emit (`EmitterService`) — deterministic (byte-identical across two runs
  of the same IR, tested), schema derivation strictly graph-only (tested:
  asserts absence of invented fields), real `tsc --noEmit` passes inside
  generated output using the pre-warmed skeleton.
- Verify (`VerifierService`) — real 4-stage pipeline, all four stages
  actually executed: typecheck, build, real process boot with real MCP
  handshake, real tools/call replay against mocked fetch. Result on the
  demo IR: green, 6/6 tools.
- Widgets — real components, real `next build`, pipeline stays green with
  `WIDGETS_DEV_MODE` removed.
- W1<->W3 connection — live-verified on disk.
- Console — live-verified against both empty state and real forged
  output.
- HTTP transport for deployment — live-verified with a real curl POST.
- Planner guardrails — proven via adversarial fixtures (not live model
  behavior, but the safety net around it).

GENUINELY UNVERIFIED — the honest gaps:
- THE PLANNER HAS NEVER RUN AGAINST A LIVE LLM. Every emit/verify test
  used the hand-written `fixtures/irs/demo.ir.json`. Unknown: does real
  model output validate on the first try or lean on retries? Does it ever
  produce genuinely multi-endpoint tools (emitter only calls
  `primaryEndpoint`, a known gap that only matters if this happens)? How
  does the parser handle a non-demo spec (it explicitly refuses
  `oneOf`/`anyOf`/complex `$ref` cycles)?
- `groq-provider.ts` — written correctly per documentation, never run
  against `api.groq.com` (network-blocked from the building sandbox).
- `Dockerfile` — written, never actually `docker build`-tested (no docker
  binary in the building sandbox).
- The orchestrator's own `tool-surface` widget still relies on
  `WIDGETS_DEV_MODE=true`. Deliberate: it's dev tooling, not the shipped
  deliverable.
- Repair loop — deliberately not built. Confirmed cut from scope in
  `verification-report.schema.ts`'s own doc comment.

---

## 5. Repo structure

```
nitroforge/
├── HANDOFF-SUMMARY.md          <- scannable version of this file
├── CLAUDE.md                   <- W1's original verified SDK gotchas doc
├── docs/
│   ├── README-team.md          <- original team brief / architecture doc
│   ├── HANDOFF-W2.md           <- W1's handoff doc to W2
│   ├── BUILD-W2.md             <- W1's phased build plan for W2
│   └── W2-STATUS.md            <- full chronological build log, every finding + evidence
├── src/
│   ├── app.module.ts           <- root module, imports Ingest+Forge+Catalog (Catalog MUST be last)
│   ├── index.ts                <- entrypoint, two-call bootstrap
│   ├── contracts/               <- FROZEN, all fields verified against real usage
│   ├── modules/
│   │   ├── ingest/              <- W1: parser, planner, provider abstraction (providers/)
│   │   ├── forge/                <- W2: emitter, verifier, schema-derivation, templates/*.hbs
│   │   └── catalog/             <- W3: real StoreService, Resources, Prompts, Notifier
│   ├── observability/           <- activity log + tools-only interceptor
│   └── health/                  <- real class-decorator health check
├── console/                     <- separate process, W3, live-verified
├── templates/skeleton/          <- pre-warmed node_modules + built widget archetypes
├── fixtures/                    <- demo spec/graph/ir/report, activity.log dev fixture
├── scripts/vet-specs.mjs        <- npm run vet-specs
├── Dockerfile                   <- written, NODE_ENV=production is load-bearing (see §3)
└── .dockerignore
```

Setup: `npm install` (pinned lockfile) then `npm run typecheck && npm run
build && npx vitest run` — expect 26/26 passing.

---

## 6. Deployment — concrete remaining steps

1. Push to GitHub (needed for NitroCloud's GitHub-based deploy flow).
2. Connect in NitroCloud's dashboard; set `ANTHROPIC_API_KEY` (or
   `LLM_PROVIDER=groq` + `GROQ_API_KEY`) as an environment variable
   there. Confirm `NODE_ENV=production` gets set — verify explicitly,
   it's load-bearing (see §3).
3. Deploy via NitroCloud (may not need the Dockerfile if their
   GitHub-based build handles it — Dockerfile is the fallback for other
   hosts).
4. Run the first real request against the live URL — doubles as smoke
   test AND the first-ever live planner test.
5. If step 4 shows the planner producing multi-endpoint tools, fix the
   emitter's known `primaryEndpoint`-only gap then, not before.

Steps 1-3 aren't code — they're actions in NitroCloud's dashboard/GitHub.
Step 4 is the one genuine remaining unknown.

---

## 7. Setting up a NitroStack MCP server from scratch — quick guide

```bash
npm install -g @nitrostack/cli
# Or without global install: npx @nitrostack/cli <command>

# MUST pass these flags explicitly or init hangs waiting on stdin in any
# non-interactive environment (confirmed):
npx @nitrostack/cli init my-project \
  --template typescript-starter \
  --description "what this server does" \
  --author "you" \
  --skip-install

cd my-project
npm install
npm run dev        # boots via nitrostack-cli dev, STDIO by default
```

Real conventions, all verified this session (§3 has the full list with
evidence):

```typescript
// app.module.ts
import { McpApp, Module, ConfigModule } from '@nitrostack/core';

@McpApp({
  module: AppModule,                     // self-reference, this works
  server: { name: 'my-server', version: '0.1.0' },
  logging: { level: 'info' },
  // Do NOT bother with `transport` here -- confirmed to do nothing.
  // Control transport via NODE_ENV/MCP_TRANSPORT_TYPE env vars instead.
})
@Module({
  name: 'app',
  imports: [ConfigModule.forRoot(), /* your feature modules */],
})
export class AppModule {}
```

```typescript
// index.ts
import { McpApplicationFactory } from '@nitrostack/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const server = await McpApplicationFactory.create(AppModule);
  await server.start();   // TWO calls, not one
}
bootstrap().catch((e) => { console.error(e); process.exit(1); });
```

```typescript
// a-feature.tools.ts
import {
  ControllerDecorator as Controller,
  ToolDecorator as Tool,
  z,
} from '@nitrostack/core';   // aliasing required -- bare Tool is a builder class

@Controller()
export class MyTools {
  @Tool({
    name: 'do_thing',
    description: 'What this does, written for MODEL tool-selection',
    inputSchema: z.object({ id: z.string() }),
    invocation: { invoking: 'Doing thing...', invoked: 'Done' },
    examples: { request: { id: '123' }, response: { ok: true } },
  })
  async doThing(input: { id: string }) {
    return { ok: true };
  }
}
```

For local testing: NitroStudio is a SEPARATE DESKTOP APP (download from
nitrostack.ai/studio), point it at your project directory -- not
something runnable/verifiable from a headless sandbox, confirmed. `npm
run dev` alone gets you a real, working stdio MCP server without it.

For deployment: set `NODE_ENV=production` and `PORT` -- this is the ONLY
thing that switches transport to HTTP (`/mcp` endpoint, Streamable HTTP).
Test locally first: `NODE_ENV=production PORT=3000 node dist/index.js`,
then `curl -X POST http://localhost:3000/mcp` with a real `initialize`
payload to confirm before trusting any cloud deploy.
