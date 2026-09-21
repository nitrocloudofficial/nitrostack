# NitroForge — Handoff Summary (read this first)

Written at ~52% token budget on the previous session, handing off to a new
one. This is the scannable version — `docs/W2-STATUS.md` is the full
chronological log with every discovered gotcha and its evidence, read that
second if you need the "why," not the "what."

## What this is

An MCP server that builds MCP servers. Point it at an OpenAPI spec:
`parse_spec` (deterministic) -> `plan_tool_surface` (the ONE LLM call in
the whole system, clusters endpoints into a small tool surface) ->
`forge_server` (deterministic codegen + real machine verification: tsc,
build, boot, MCP replay). Core pitch: delete the LLM and you still get a
working server with dumb names — the model is an optimization pass on tool
naming/clustering, not the pipeline. Input schemas are derived from the
EndpointGraph, never from the model's output, by design (see
`src/modules/forge/schema-derivation.ts`).

## Setup (do this first, in order)

```bash
cd nitroforge
npm install              # pinned lockfile, don't run npm update
npm run typecheck && npm run build && npx vitest run   # expect 24/24 passing
```

If `node_modules` wasn't included in whatever archive you got, this repo
ships a **pre-warmed** `templates/skeleton/` (its own `node_modules`,
~120MB, plus a built widgets subproject, ~300MB more) — that's what
`EmitterService` copies per-generation instead of running `npm install` on
every single request. Don't delete or rebuild it casually; if you must,
see "Rebuilding the skeleton" in `docs/W2-STATUS.md`.

## What's real and proven — not just written

Everything below was actually executed and observed, not reasoned about:

- **`parse_spec`** — real, live-tested via a hand-rolled MCP stdio harness
  against the raw spec fixture. Deterministic, no LLM.
- **`plan_tool_surface`** — reaches real code, fails only on missing
  `ANTHROPIC_API_KEY`. **This is the one link in the chain that has NEVER
  actually run against a live model this session.** Every emit/verify test
  below used the hand-written `fixtures/irs/demo.ir.json`, not
  model-produced IR. See "The one real unknown" below.
- **`forge_server` (emit)** — real Handlebars template rendering, schema
  derivation strictly from the graph (tested: explicitly asserts no
  invented fields), deterministic (tested: byte-identical output on two
  runs of the same IR), real `tsc --noEmit` passes inside the generated
  project using the pre-warmed skeleton, zero `npm install` at generation
  time.
- **`forge_server` (verify)** — real 4-stage verifier: `tsc --noEmit` ->
  `tsc` build -> real process boot with a real MCP `initialize` handshake
  -> real `tools/call` replay against a mocked `fetch` layer, diffed
  against `examples.response`. Result on the demo IR: **green, 6/6 tools,
  all four stages passed for real.**
- **Widgets** — real `data-table`/`stat-card` React components against
  the real `@nitrostack/widgets` API, real `next build` static export.
  Verified: re-ran the full verifier with `WIDGETS_DEV_MODE=true` REMOVED
  and it's still green — real widget resolution, not the dev bypass.
- **W1 (ingest) <-> W3 (catalog) connection** — live-verified: cleared
  `.forge/`, booted the real app, called `parse_spec`, confirmed on disk
  that the graph was written by catalog's `StoreService` — proving both
  modules share exactly one store instance, not two silently disconnected
  ones.
- **`npm run dev`** — genuinely boots, validates, TypeScript watch mode
  works, MCP server up over stdio.
- **Spec vetting** — `npm run vet-specs` runs the real `ParserService`
  against every file in `fixtures/specs/` (currently just `demo.yaml` —
  only one spec exists despite the brief wanting 2-3).

## The one real unknown

**The planner has never been tested against a live LLM.** The code path is
real and correctly reaches the model call, but nobody has verified:
- Does real model output validate against `ToolSurfaceIRSchema` on the
  first try, or does the retry loop (`MAX_RETRIES = 2` in
  `planner.service.ts`) get exercised in practice?
- Does the planner ever compose >1 endpoint into a single tool? If so,
  **there's a known real gap**: `EmitterService` generates one HTTP call
  per tool against only `primaryEndpoint`, silently ignoring the rest of
  `composes` for the actual call. Not a crash — wrong behavior. See
  `emitter.service.ts`'s doc comment.
- How does the parser behave on a spec that isn't the pinned demo? It
  explicitly refuses `oneOf`/`anyOf` and complex `$ref` cycles — real specs
  hit that often.

**This is the single highest-value thing to test next**, the moment a real
`ANTHROPIC_API_KEY` is available. Only `api.anthropic.com` was reachable
from the sandbox that built this — every other provider (OpenAI, Groq,
Gemini, Mistral, Cohere, Together, Perplexity, OpenRouter, NitroCloud's own
`cloud.nitrostack.ai`) returned a hard network block. If your environment
doesn't have that restriction, you may have more options.

## Provider abstraction (just added, one path proven, one is not)

`src/modules/ingest/providers/` — `PlannerService` no longer talks to
Anthropic directly. `ModelProviderFactory` picks by `LLM_PROVIDER` env var
(default `anthropic`).

- **`anthropic-provider.ts`** — extracted verbatim from the original code.
  Proven (see above).
- **`groq-provider.ts`** — OpenAI-compatible chat completions, written
  against Groq's documented API shape. **Never run against a live
  endpoint** (`api.groq.com` confirmed blocked from the building sandbox).
  Treat its first real run as a genuine test, not a formality — the doc
  comment in that file explains why Llama-family models may be less
  reliable than Claude at this specific structured-output task.

To use Groq: set `LLM_PROVIDER=groq` and `GROQ_API_KEY` in the environment.
`GROQ_MODEL` optional, defaults to `llama-3.3-70b-versatile` — verify
that's still current before relying on it.

## What's left, roughly in priority order

1. **Run the real planner** (see above) — the highest-value next step,
   blocked on an API key reachable from wherever you're running this.
   Guardrails around it are now hardened and proven (see below) even
   without a live run.
2. **Multi-endpoint `composes` support in the emitter** — currently only
   calls `primaryEndpoint`. Only matters if a real planner run actually
   produces multi-endpoint tools.
3. ~~Console~~ — **done this session**, see below.
4. **A second pinned spec** — `npm run vet-specs` is ready for it the
   moment it exists.
5. **`docker build` verification** — `Dockerfile` is written (multi-stage,
   copies the pre-warmed skeleton verbatim, sets `NODE_ENV=production` —
   now confirmed load-bearing, see below) but never actually built — no
   `docker` binary in the building sandbox. **Deploy must set
   `NODE_ENV=production` (or `MCP_TRANSPORT_TYPE=dual`) and a `PORT`** —
   without it the container binds no port and looks dead to any health
   check.
6. **Real deploy** — NitroCloud explicitly offers free hosted deployment
   ("build, deploy, and live URL on us" per their own site) — that's a
   real, promising path, but happens outside any sandbox, in NitroCloud's
   own dashboard/CLI flow. Separate from the LLM-token question — that
   free-tier token you have is for NitroCloud's own chat/hosting product,
   not a portable Anthropic-compatible key (confirmed: it returns 401
   against the real Anthropic API).
7. **Repair loop** — deliberately NOT built. Confirmed cut from scope in
   `verification-report.schema.ts`'s own doc comment.
8. **The orchestrator's own `tool-surface` widget** — deliberately skipped
   (judgment call, see `docs/W2-STATUS.md`). Still uses
   `WIDGETS_DEV_MODE=true` at the `app.module.ts` level. Fine for now: it's
   dev tooling, not the shipped deliverable.

## Deployment — one critical, load-bearing discovery this session

**`@McpApp({ transport: {...} })` has ZERO effect.** Tested directly: set
it to `{ type: 'dual', http: { port: 3000 } }`, rebuilt, booted — server
still logged `"started successfully (STDIO transport)"` and bound no port
at all. Read `node_modules/@nitrostack/core/dist/core/server.js`'s actual
`start()`: transport type is derived ENTIRELY from `NODE_ENV`/
`MCP_TRANSPORT_TYPE` env vars, and `port`/`host` come straight from
`process.env.PORT`/`HOST` — the decorator's `transport` field is never
read by this code path. **The real mechanism:**

- `NODE_ENV=production` (or explicit `MCP_TRANSPORT_TYPE=dual`) -> HTTP
  transport binds, at `process.env.PORT` (default 3000), endpoint `/mcp`
  (Streamable HTTP, dual mode also keeps stdio alive for local MCP
  clients).
- `NODE_ENV` unset/`development` -> stdio-only, no port bound at all -- a
  cloud host expecting a health-checkable port would see this as dead.

**Verified for real**, not just read from source: booted with
`NODE_ENV=production PORT=3006`, got `"MCP Streamable HTTP transport
listening on http://localhost:3006/mcp"` in the logs, then sent a real
`curl -X POST http://localhost:3006/mcp` with a real `initialize` payload
and got back a real MCP response (SSE-framed, correct `serverInfo`,
correct capabilities). **This is what makes the Dockerfile's
`ENV NODE_ENV=production` load-bearing rather than boilerplate** -- updated
its comment to say so.

`src/app.module.ts`'s `@McpApp(...)` config was reverted to NOT set
`transport` (since it does nothing) -- left a comment explaining why, so
nobody re-adds it thinking it'll help.

## Console -- built and live-verified this session

`console/server.ts` + `console/public/index.html`, real per the original
spec (separate process, static + SSE tail of `.forge/`, no build step).
`npm run console` (added `tsx` as a devDependency so this doesn't need a
global install). Three panels: servers forged, graphs/tool-surfaces
catalog, live activity feed.

Verified twice: booted with no `.forge/` at all (every panel renders
empty, doesn't error -- has to be able to boot before the pipeline has run
once), then ran the real pipeline through the real `StoreService` and
confirmed `/api/state` correctly reflected the real forged server (status
green, 6 tools, correct ir/graph linkage). `fixtures/activity.log` added
as a dev fixture so the activity panel has something to show even with
zero pipeline runs.

## Planner guardrail hardening (in lieu of a live LLM test)

Since a live Anthropic run genuinely isn't available (no key reachable
from any environment tried), hardened what CAN be verified without one:
added two adversarial test cases to `planner.service.test.ts` -- duplicate
tool names across modules, and `primaryEndpoint` not being one of a
tool's own `composes` entries. Both confirmed to correctly trigger a
retry with the validation error fed back into the next prompt. Combined
with W1's existing coverage (unknown endpoint reference, tool-budget
overrun, malformed JSON, missing API key), the retry/validate/throw
safety net is now proven solid across every adversarial case that can be
tested without a live model. What's still unverified is model *behavior*
(how often real output needs those retries in practice), not the
guardrails themselves.

## Files worth reading before writing any code

In order: this file -> `CLAUDE.md` (verified real SDK gotchas, several
contradict the official docs) -> `docs/W2-STATUS.md` (full log, all
evidence) -> the contract files in `src/contracts/` (frozen, all fields
verified against real usage).
