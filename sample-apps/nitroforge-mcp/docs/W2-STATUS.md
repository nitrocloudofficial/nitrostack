# W2 build status — Phase 1B complete

## Setup gate (your steps 1-3): all green
`npm install` (pinned lockfile) · `npm run typecheck` · `npm run build` ·
`npx vitest run` → **17/17 W1 tests**, unchanged.

## New findings, verified against the real installed package/CLI, not assumed

1. **DIContainer is a flat global singleton** (`node_modules/@nitrostack/core/dist/core/di/container.js`
   — `static getInstance()`, one `Map` of providers, one `Map` of resolved
   instances). Not a per-module hierarchical injector. Practical effect:
   `forge.module.ts` safely mirrors `ingest.module.ts`'s own local
   `{ provide: ARTIFACT_STORE, useClass: InMemoryArtifactStore }` binding —
   duplicate registrations of the same token/class don't create divergent
   instances, because `resolve()` caches one instance per token app-wide.

2. **`@HealthCheck` is a class decorator**, not a method decorator: `{ name,
   description, interval }` + `implements HealthCheckInterface` with an
   async `check()`. Confirmed from the real CLI-generated
   `system.health.ts`. Both docs I'd fetched earlier (and my own prior W3
   work, before this repo existed) had it as a method decorator — wrong.
   Flagging for whenever W3's `forge.health.ts` gets reconciled with this
   repo.

3. **`McpApplicationFactory.create()` eagerly resolves every `@Widget()`-
   decorated tool's *built* static HTML at boot time** — and throws if it's
   missing (`Exported HTML for route '...' not found`). This blocks the
   *entire server* from booting, not just that one tool. Neither doc
   mentions this. Fix: set `WIDGETS_DEV_MODE=true` in the environment —
   confirmed in `node_modules/@nitrostack/core/dist/ui-next/index.js` — and
   the widget resolves to a dev placeholder instead of requiring a real
   build. `nitrostack-cli dev` presumably sets this itself; a bare
   `node dist/index.js` (exactly what Phase 2B's boot stage spawns) does
   not. **My `verifier.service.ts` boot/replay stages will need to spawn
   generated servers with `WIDGETS_DEV_MODE=true`** until real
   `templates/widget-archetypes/` content exists and gets built per
   generation — otherwise every IR with a widget-bound tool (which is most
   of them) fails verification on a widget problem that has nothing to do
   with the generated code's correctness. Flagging now since this affects
   Phase 2A/2B, not just my local testing.

4. **Contract gap: no `irId` → `graphId` link exists anywhere.**
   `ArtifactStore.putIR(ir)` doesn't take or store a graphId, and
   `EmitPort.emit(ir, graph)` needs both. BUILD-W2's stub input
   (`{ irId }` alone) can't supply the graph. **Fix applied:**
   `forge_server`'s `inputSchema` is `{ irId, graphId }`, mirroring
   `plan_tool_surface`'s existing pattern (it has the same problem and
   solves it the same way). The calling agent already has both ids in
   context from the two prior tool calls, so this doesn't add real
   friction. Flagging per your own instruction rather than silently
   defaulting to "whichever graph was stored most recently."

5. **`Tool`/`Resource`/`Prompt`/`Controller` bare-vs-`*Decorator` export
   split — confirmed independently**, not just trusted from your comment:
   `node_modules/@nitrostack/core/dist/core/index.d.ts` line 8 exports bare
   `Tool` from `./tool.js` (the builder class); line 17 exports the actual
   decorator as `Tool as ToolDecorator` from `./decorators.js`.
   `ConfigModule`/`ConfigService` confirmed living in `@nitrostack/core`.
   `@Injectable({ deps: [...] })` confirmed as the documented ESM-safe
   pattern straight from the decorator's own doc comments.

6. **One correction to your own HANDOFF-W2:** the real CLI-generated
   `calculator.tools.ts` uses **no class-level decorator at all** on its
   Tool/Resource/Prompt controller classes — just listed in the module's
   `controllers: [...]` array. This contradicts "`@Controller()` ... your
   controller class needs it (or equivalent) to register in DI." I kept
   `@Controller()` on `ForgeTools` anyway, matching `IngestTools`'s own
   tested convention — redundant decorators are cheaper than mixed
   conventions in one codebase, but wanted to flag that it may not be
   strictly required.

7. **Real CLI `init` reproduced your exact warning** — it's interactive
   (prompts for a description) and also tries to phone home to PostHog
   analytics (blocked by sandbox egress rules, harmless when it fails).
   Piping answers through (`yes "" | ... --skip-install --description ...
   --author ...`) got a real scaffold out, which is what `templates/skeleton/`
   is now built from — actual CLI output, not my best guess at the shape.

8. **`index.ts` really does need two calls**, not one:
   `const server = await McpApplicationFactory.create(AppModule); await
   server.start();` — confirmed from both the real `.d.ts`
   (`create()` returns `Promise<NitroStackServer>`, a separate `start()`
   exists) and the real generated `index.ts`. This matches the Quick
   Start's version, not the SDK Reference's single-call version.

## What's built and proven, not just written

- `templates/skeleton/` — **real CLI output** (`npx @nitrostack/cli init`),
  stripped of the sample calculator module and AI-agent skill directories,
  `node_modules` pre-warmed (322 packages, ~109MB). Placeholder
  `app.module.ts`/`package.json` neutralized so the bare skeleton typechecks
  standalone.
- `src/modules/forge/{forge.module.ts, forge.tools.ts, emitter.service.ts,
  verifier.service.ts}` — Phase 1B, real DI, real task progress streaming,
  real store integration.
- `src/app.module.ts` + `src/index.ts` — **new files**, didn't exist
  anywhere before this session. Necessary to actually boot ingest+forge
  together; ownership wasn't assigned to either W1 or W2 doc.
- `src/modules/forge/forge.tools.test.ts` — 4 new tests, all passing,
  seeded directly from `fixtures/irs/demo.ir.json` +
  `fixtures/graphs/demo.graph.json`, no API key needed.
- **Verified two ways, not just unit-tested:**
  - Real MCP stdio handshake (hand-rolled JSON-RPC harness): `initialize` →
    `tools/list` shows all 3 tools registered → `parse_spec` called for
    real against the raw spec fixture, returns a real graphId, graph
    actually stored (6 endpoints, 3 resource groups, correct auth scheme).
  - `plan_tool_surface` reaches the real planner code path and fails only
    on a missing `ANTHROPIC_API_KEY` — confirms the wiring is correct up to
    the LLM boundary I can't cross without credentials.
  - `forge_server` fully tested via direct instantiation (same pattern as
    W1's own tests) since I can't get a real `irId` through the live MCP
    path without an API key: green report, 6/6 tools, task progress
    messages actually stream, result persists and round-trips through
    `getServer()`.

Full suite: **21/21 passing** (17 W1 + 4 new).

## W1 <-> W3 connection (this session's actual ask) — done and proven live

Built `src/modules/catalog/{store.service.ts, catalog.resources.ts,
catalog.prompts.ts, notifier.service.ts, catalog.module.ts}`,
`src/observability/{activity.service.ts, activity.interceptor.ts}`, and
`src/health/forge.health.ts` — adapted to the *real* frozen contracts in
this repo (not my earlier, pre-repo W3 draft, which assumed a different
`putIR`/`getIR` shape).

**New findings, all verified against the real package, not assumed:**

- **Health-check providers are resolved EAGERLY at registration time**,
  unlike ordinary providers (lazy). Putting `ForgeHealthCheck` in the root
  module's own `providers` array fires before any `imports` entry —
  including the one that registers the real store — has run, and boot
  fails immediately (`Cannot resolve token "ARTIFACT_STORE"`). Fix: moved
  it into `catalog.module.ts`'s own `providers`, positioned *after* the
  `ARTIFACT_STORE` binding in that same array.
- **`@Interceptor()`/`@UseInterceptors` are tools-only.**
  `buildResource`/`buildPrompt` in `builders.js` never call
  `getInterceptorMetadata` — only `buildTool` does. There's no
  interceptor path for resources or prompts, and no app-level/global
  interceptor hook either. Resource/prompt activity logging is done by
  calling `ActivityService.record()` directly inside each handler.
- **No public API exists to fire a real MCP notification from application
  code.** `ExecutionContext` has no server handle; `index.d.ts`'s full
  export surface has zero exports mentioning "notification". `list_changed`
  pushes are entirely internal to the framework's own lifecycle.
  `notifier.service.ts` logs the *intent* to the activity log (useful for
  the console/demo narrative) but does not and cannot push a real
  protocol notification with the current `@nitrostack/core` API — flagged
  in the file's own doc comment rather than faked.
- **`@Prompt` handlers return a bare array** of `{ role, content: string
  }`, confirmed from the real CLI-generated `calculator.prompts.ts` — not
  the `{ messages: [{ content: { type: 'text', text } }] }` shape the SDK
  reference doc's examples use. Confirmed live: the framework itself wraps
  the bare array into full protocol `messages: [...]` format at the
  transport layer.
- **`ResourceOptions.examples` is `{ response }` only** — no `request`
  field, unlike `ToolOptions.examples`.

**Live-verified, not just unit-tested** (full MCP stdio harness, real
process boot, `.forge/` cleared first):

1. `resources/list` shows all 3 catalog resources + widget + health +
   widget-examples resources.
2. `parse_spec` (ingest's tool) stores a graph through the `ARTIFACT_STORE`
   token.
3. **The actual point of this exercise:** that graph is verifiably written
   to disk by `catalog`'s `StoreService` (`.forge/graphs/<id>.json` exists)
   — proving ingest and catalog share exactly one store instance, not two
   disconnected ones. This was a real risk (see the DI-ordering reasoning
   in `catalog.module.ts`'s doc comment), not assumed safe.
4. `forge://ir/{unknown}` and `prompts/get review_tool_surface` with a
   missing `irId` both degrade gracefully (structured error, not a crash).
5. `health://checks` shows `forge` as `up`, confirming `ForgeHealthCheck`
   also resolves the shared store correctly.

Full suite still 21/21. `CatalogModule` **must stay the last import** in
`app.module.ts` — that ordering is now load-bearing, not stylistic; see
the doc comments on both files for why.

## Phase 2A (real emitter) — done and gate passed for real

Built `schema-derivation.ts` (graph -> Zod source, the "strongest sentence
in the pitch" — never touches the IR's own text), `example-synthesis.ts`
(demo.ir.json has no pre-baked `examples` on any tool, so
`examples.request`/`examples.response` are synthesized from the graph's
param/response schemas — still deterministic, still graph-derived, no
model), and the five Handlebars templates
(`app.module.hbs`, `index.hbs`, `module.hbs`, `tools.hbs`, `service.hbs`)
plus `emitter.service.ts` orchestrating STEP 1-3 from BUILD-W2.

**The actual Phase 2A gate, run for real, not simulated:** hand-written
`fixtures/irs/demo.ir.json` + `fixtures/graphs/demo.graph.json` in ->
`EmitterService.emit()` -> 12 files on disk across 3 modules (customers,
orders, stats) -> `cd` into the generated project -> `npx tsc --noEmit`
against the **pre-warmed skeleton's own `node_modules`** (zero `npm
install` at generation time, confirming decision #11 actually works) ->
**exits 0.**

Spot-checked the generated `customers.tools.ts`/`customers.service.ts` by
hand: real Zod schemas per endpoint's actual `pathParams`/`queryParams`/
`bodySchema` (e.g. `search_customers` only gets `query`/`limit`, matching
`GET /v1/customers`'s real query params — nothing invented), `@Widget`/
`@Cache` only where the IR specifies them, path params correctly
substituted into template-literal URLs
(`` `/v1/customers/${input.id}` ``), body fields correctly wired for the
POST tool.

Added `emitter.service.test.ts` per BUILD-W2's explicit ask — 3 tests:
expected file list for the demo IR, **byte-identical output on a second
run against the same IR** (the actual determinism claim, not just asserted
in a comment), and a schema-derivation test that explicitly checks for the
*absence* of invented fields.

**One scope note, flagged rather than silently narrowed:** BUILD-W2 says
`service.hbs` should have "one method per composed endpoint." I generate
one service method per *tool*, calling that tool's `primaryEndpoint`.
Correct for the current demo IR (every tool composes exactly one endpoint,
always equal to `primaryEndpoint`), not a general multi-endpoint
composition — see the doc comment at the top of `emitter.service.ts`.

Full suite now 24/24 (17 W1 + 4 forge.tools + 3 emitter). The two
forge.tools.test.ts tests that call `forgeServer()` now take ~7s each
instead of instant, since `EmitterService` does real filesystem work
(skeleton copy) instead of the Phase 1B stub — bumped their timeouts to
30s and added cleanup so they don't leave `.forge/servers/` garbage
behind.

**Note on tool execution in this sandbox:** the emitter process doesn't
exit cleanly on its own after finishing (something keeps the event loop
alive — not yet root-caused, didn't block correctness, `timeout` reaping
it after it printed everything was enough to confirm success). Worth a
look before this matters for a real CLI/CI invocation.

## Next: Phase 2B (verifier — tsc/build/boot) + the WIDGETS_DEV_MODE question

Phase 2B: `verifier.service.ts` needs to actually spawn `tsc --noEmit`,
`nitrostack-cli build`, then boot the built server and do a real MCP
handshake (or the ~40-line hand-rolled JSON-RPC shortcut BUILD-W2 offers
as a fallback — I already have a working version of that from this
session's own test harnesses). Will hit finding #3 from Phase 1B
immediately: `search_customers` and `list_orders` both carry
`@Widget('data-table')`, `get_revenue_stats` carries
`@Widget('stat-card')` — none of those are built, so boot fails without
`WIDGETS_DEV_MODE=true`. I'll carry that env var into the spawned process
in `verifier.service.ts` unless you'd rather I build minimal placeholder
`data-table`/`stat-card` widget components myself (out of my stated scope,
but `templates/widget-archetypes/` is currently empty and this blocks a
real green boot/replay either way until W3 delivers them or I stub them).

## Phase 2B (real verifier) — done, genuinely green end-to-end

Built the real 4-stage `verifier.service.ts`: typecheck (`tsc --noEmit`) ->
build (`tsc`, not `nitrostack-cli build` -- deliberate, avoids the
interactive/PostHog issues confirmed during `init`) -> boot (spawn
`node --import <mock-fetch>.mjs dist/index.js`, real MCP `initialize`
handshake) -> replay (`tools/call` each tool with its `examples.request`,
diff the result against `examples.response`).

**Interface note:** `EmitPort.verify(project)` is frozen and can't take
ir/graph, but real replay needs both. Added `verifyWithContext(project, ir,
graph)` as an additional method (not a contract change) -- `verify()`
itself still satisfies the frozen interface, doing typecheck+build only.
`forge.tools.ts` calls the richer one since it already has both ids.

**Mocking, not live network:** the generated service classes call the real
`https://api.democrm.dev`, which isn't reachable from this sandbox (or
real, it's a fictional demo domain). Verification writes a route table
(method + path-regex -> canned response, built from each tool's
`primaryEndpoint` + `examples.response`) and a small ESM preload module
that overrides `globalThis.fetch`, loaded via Node's `--import` flag
before the generated server boots. Not part of `GeneratedProject.files` --
verification tooling written alongside the project, not shipped output.

**Result, run for real against the hand-written demo IR + graph:**

```
status: green
typecheck: passed (5.6s)   build: passed (3.3s)
boot: passed (0.5s)        replay: passed (0.3s)
toolResults: 6/6 passed, all diff: null
```

All four stages actually executed -- real `tsc` process spawned twice,
real `node` process booted, real MCP JSON-RPC over its stdio, real
`tools/call` against real service code hitting the mocked `fetch`, real
JSON diff against the expected response. Not simulated.

Full suite: 24/24, unchanged -- `forge.tools.test.ts`'s existing tests now
transparently exercise this real verifier through `forge_server` (no test
changes needed beyond the timeout bump from Phase 2A).

**Core pipeline is now real end-to-end**, modulo one thing that's blocked
on the user, not on engineering: `plan_tool_surface` needs a real
`ANTHROPIC_API_KEY` to go from a live spec to a live IR. Everything from
IR onward (emit -> verify -> green) is proven real; only the planning step
is fixture-substituted.

**Repair loop:** deliberately not implemented -- confirmed cut from scope
in `verification-report.schema.ts`'s own doc comment ("Do not build: a
repair loop (cut)"). `repairAttempts` always reports 0.

## Widget archetypes -- done, WIDGETS_DEV_MODE workaround eliminated for generated servers

Built real `data-table`/`stat-card` React components in
`templates/skeleton/src/widgets/app/{data-table,stat-card}/page.tsx`
against the REAL `@nitrostack/widgets` API (`useWidgetSDK()` ->
`isReady`/`toolOutput` -- confirmed from the real `.d.ts`, not guessed),
ran a real `npx next build` (NODE_ENV=production, static export, ~30s),
and re-ran the full verifier with the `WIDGETS_DEV_MODE=true` env var
REMOVED. Result: still fully green, all 4 stages, 6/6 tools, boot resolving
real static HTML instead of the dev-mode bypass.

**Caught a real emitter bug in the process:** STEP 1 previously did
`rm(src/, recursive)` wholesale, which would have deleted the freshly-built
`src/widgets/out/` on every single generation. Fixed to only clear
`src/modules/`, `app.module.ts`, `index.ts` -- `src/widgets/` (a one-time
build, not per-generation content) is now explicitly preserved.

**Scope simplification, documented not hidden:** `ToolIR.widget.mapping`
(the IR's declared `rowsPath`/`columns`/`valuePath`) isn't actually
plumbed through to the widget at runtime -- there's no mechanism in this
framework version to pass IR-shaped config into a shared widget route.
Both components auto-detect instead: data-table finds the first
array-valued property on `toolOutput` and renders every key of its first
item as a column; stat-card finds the first numeric top-level property.
Good enough for the demo, not a general JSONPath mapper -- real future
work if per-tool column selection matters.

**Cost note:** the widgets subproject's own `node_modules` is ~298MB
(Next.js is heavy) -- roughly 3x the skeleton's previous total size.
Emitter tests now take noticeably longer (skeleton copy scales with size)
but all 24/24 still pass.

**Deliberately NOT done:** the orchestrator's own `tool-surface` widget
(used by `plan_tool_surface`/`forge_server`) still relies on
`WIDGETS_DEV_MODE=true` at the app.module.ts level. Judgment call: that's
dev tooling, not the shipped deliverable (the generated servers are), and
standing up a second ~300MB Next.js subproject for it had poor ROI given
the workaround already works and is fully documented. Can revisit if it
matters for a live demo.

## Dockerfile -- written, NOT test-built (no docker binary in this sandbox)

Multi-stage build: `npm ci` with the pinned lockfile -> `npm run build` ->
slim runtime image. Copies `templates/skeleton/` (including its
node_modules AND the built `widgets/out/` static export) verbatim into the
image, since `EmitterService` uses it as-is at runtime and never
re-installs. `.forge/` is a declared `VOLUME` -- mount it if generated
servers need to survive a container restart.

Caught and fixed one real bug before it shipped: my first `.dockerignore`
draft excluded `node_modules` with a bare (unanchored) pattern, which
would have matched at any depth and silently stripped
`templates/skeleton/node_modules` and
`templates/skeleton/src/widgets/node_modules` out of the build context --
breaking every generation at runtime with no error until someone tried it.
Fixed to `/node_modules` (root-anchored).

Honest limitation: `which docker` -> not found in this sandbox. This is
written correctly as far as I can verify statically, but has not been
run through an actual `docker build`. Worth doing before it's load-bearing
for a real deploy.
