# BUILD — W2 · EMIT & VERIFY

Work through phases in order. Each has a **PROMPT** block to paste into Claude Code and a **GATE** you must pass before moving on.

---

## Load this into Claude first, every session

```
PROJECT: NitroForge — an MCP server that builds MCP servers, built on the
NitroStack framework (https://docs.nitrostack.ai/). Read ./CLAUDE.md first.

I own the FORGE module: src/modules/forge/. Two pipeline stages:
  ③ EMIT    ToolSurfaceIR → a real NitroStack project on disk.
            Deterministic Handlebars templates. NO MODEL ANYWHERE.
  ④ VERIFY  tsc → nitrostack build → boot → MCP handshake → replay → report.

ARCHITECTURAL RULES — these are not style preferences, they are the product:

1. EMISSION IS DETERMINISTIC. Same IR in → byte-identical code out. There is
   no LLM in my module. If it ever seems easier to "just have the model fill
   this bit in", that is the moment the entire project's thesis collapses.
   Snapshot-test the emitter output.

2. I DERIVE INPUT SCHEMAS FROM THE ENDPOINT GRAPH — the model never sees them.
   ToolSurfaceIR has no inputSchema field, by design. Each tool's `composes`
   array points at endpoint ids; I build Zod schemas from those endpoints'
   real params. This is what makes hallucinated field names structurally
   impossible. It is the single strongest claim the project makes. Protect it.

3. VERIFICATION USES A MACHINE ORACLE, NEVER A MODEL. Never ask an LLM to
   review generated code — that is the same probabilistic system grading
   itself, so errors correlate and it approves its own hallucinations. The
   oracle is tsc, a real build, and a real MCP handshake.

4. REPAIRS GO UPSTREAM. If verification fails, fix the TEMPLATE. Never patch
   an emitted file — patched output no longer corresponds to its IR and
   reproducibility dies.

NITROSTACK CONVENTIONS (violating these breaks the build):
- ES modules: ALWAYS .js extensions in imports, even from .ts files
- Decorators only: @Module, @Tool, @Injectable. Never server.tool()
- Constructor injection. Never `new ClassName()`
- Services hold logic; tools are thin wrappers
- Every tool needs a Zod inputSchema and examples.request/examples.response
```

---

## PHASE 1 — Stub surface + skeleton (~45 min)

### 1A — Build the pre-warmed skeleton FIRST

`npm install` on every generation costs 60–90s and turns the live demo into a spinner. This is not an optimization to do later; it's the difference between a demo that lands and a room watching a progress bar.

```bash
npx @nitrostack/cli init _skeleton
cd _skeleton && npm install && cd ..
mv _skeleton templates/skeleton
rm -rf templates/skeleton/src/modules/*      # keep the shell, drop the samples
echo "templates/skeleton/node_modules/" >> .gitignore   # but keep it locally
```

Emission = copy `templates/skeleton/` → overwrite `src/`. Seconds, not minutes.

### 1B — Stub the tool

**PROMPT**
```
Create src/modules/forge/ with:
- forge.module.ts    — @Module({ name:'forge', controllers:[ForgeTools],
                        providers:[EmitterService, VerifierService] })
- forge.tools.ts     — class ForgeTools, one @Tool
- emitter.service.ts — @Injectable, stub
- verifier.service.ts— @Injectable, stub

TOOL: forge_server
  inputSchema: z.object({ irId: z.string() })
  taskSupport: 'required'
  @Widget('tool-surface')
  invocation: { invoking: 'Forging MCP server...', invoked: 'Server ready' }
  returns: { serverId, status: 'green', toolResults[], stages{} }

Stream progress through ctx.task — these strings are the demo narration,
so write them to be read aloud:
  'Reading tool surface plan...'
  'Emitting 9 tools across 3 modules...'
  'Type-checking generated project...'
  'Booting server and completing MCP handshake...'
  'Replaying 9 tools against expected responses...'
Call ctx.task.throwIfCancelled() between stages.

For now sleep ~600ms between stages and return a fixture report from
fixtures/reports/demo.report.json.

Inject ArtifactStore from ../../contracts/store.contract.js; call
store.getIR(irId) and store.putServer(...).
```

**GATE:** `forge_server` callable in NitroStudio · progress messages stream visibly · fixture report returns.

---

## PHASE 2A — Real emitter (~1.5h)

Target the **hand-written** `fixtures/irs/demo.ir.json` all the way through this phase. Don't wait for W1.

```bash
npm install handlebars
```

**PROMPT**
```
Implement emitter.service.ts: (ToolSurfaceIR, EndpointGraph) → GeneratedProject.

STEP 1 — copy templates/skeleton/ to .forge/servers/<id>/, then clear src/.

STEP 2 — DERIVE INPUT SCHEMAS. For each tool in the IR:
  - look up every endpoint id in tool.composes against the EndpointGraph
  - union their pathParams + queryParams (+ bodySchema for write ops)
  - emit a Zod object: required params z.string()/z.number(), optional ones
    .optional(), enums as z.enum([...]), each with .describe(<param.description>)
  The model never supplies these. They come only from the graph.

STEP 3 — render Handlebars templates in src/modules/forge/templates/:
  app.module.hbs   @McpApp + @Module importing every generated module
  module.hbs       one per IR module
  tools.hbs        @Tool per IR tool, with derived Zod schema, @Widget when
                   ir.widget is set, @Cache when ir.cache is set, and
                   examples.request/examples.response built from the graph's
                   response schema
  service.hbs      HTTP client — one method per composed endpoint, using
                   fetch against source.url, injectable, holds the real logic
  package.hbs      name from ir.server.name

MUST EMIT, or the generated project will not build:
  - .js extensions on EVERY relative import
  - decorators only, no factory functions
  - constructor injection, never `new`
  - thin tools, fat services
  - examples.request AND examples.response on every tool

Return GeneratedProject { id, rootPath, files[], entrypoint, toolNames[] }.
Add a snapshot test: same IR must produce byte-identical output twice.
```

**GATE:** hand-written IR → project on disk → `npx tsc --noEmit` passes inside it.

---

## PHASE 2B — Verifier: tsc + build + boot (~1h)

**PROMPT**
```
Implement verifier.service.ts stages 1-3, returning VerificationReport
per src/contracts/verification-report.schema.ts.

STAGE 1 typecheck  spawn `npx tsc --noEmit` in project root
STAGE 2 build      spawn `npx nitrostack-cli build`
STAGE 3 boot       spawn the built server over stdio, send an MCP `initialize`
                   request, assert a valid response, then send tools/list and
                   assert every name in project.toolNames is present

Use node:child_process spawn. Capture stdout+stderr. Kill after 30s.
ALWAYS kill the child in a finally block — orphaned node processes will pile
up across a hundred dev iterations and eat the machine.

On failure, capture the compiler diagnostic verbatim including file:line.
These get projected on a screen — make them readable.

Set status: green (all pass) / amber (boot ok, replay pending) / red (any fail).
```

> **Handshake shortcut if you're behind:** speaking raw MCP over stdio is the honest version. If it's eating time, a JSON-RPC `initialize` + `tools/list` written by hand is ~40 lines and sufficient — you control both ends.

**GATE:** hand-written IR → project → typechecks → builds → boots → responds to `tools/list`.

---

## PHASE 3 — Convergence (~30 min)

Take W1's real `irId` from the store, run your real pipeline against it, return a real report. **That handshake is SYNC 4 — core done.**

Expect the first real IR to break your emitter in a way the hand-written one didn't. That's exactly what this phase is for; budget for it rather than being surprised.

---

## PHASE 4 — Replay (~45 min, highest-value remaining work)

**PROMPT**
```
Add STAGE 4 replay to verifier.service.ts.

MOCK THE HTTP LAYER. The generated server calls a real third-party API that
may need credentials or working wifi. Inject a stubbed fetch that returns each
tool's examples.response. We are testing that the GENERATED CODE is correct,
not that the upstream API is up. This also makes verification offline-safe,
which matters on conference wifi.

For each tool in project.toolNames:
  - call it over MCP with its examples.request
  - deep-diff the result against examples.response
  - record { tool, passed, diff }

Aggregate into toolResults[]. Report reads "9/9 green" — that string is the
demo's payoff line, so make sure it renders exactly.
```

**GATE:** `9/9 green` on the pinned spec.

---

## Definition of done

Real IR in → project that typechecks, builds, boots, completes an MCP handshake, and returns the expected example response for every tool. Green report, emitted deterministically.

## Do not build

The widget component (W3 authors it; you copy it into generated projects) · the parser or planner · the store implementation · a repair loop (cut) · auth guard emission (cut) · generated Dockerfiles (cut) · **anything that puts a model inside your emitter.**
