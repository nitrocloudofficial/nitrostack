# BUILD — W1 · INGEST & PLAN

Work through phases in order. Each has a **PROMPT** block to paste into Claude Code and a **GATE** you must pass before moving on.

---

## Load this into Claude first, every session

```
PROJECT: NitroForge — an MCP server that builds MCP servers, built on the
NitroStack framework (https://docs.nitrostack.ai/). Read ./CLAUDE.md first.

I own the INGEST module: src/modules/ingest/. Two pipeline stages:
  ① parse_spec        OpenAPI spec → EndpointGraph.  DETERMINISTIC — no LLM.
  ② plan_tool_surface EndpointGraph → ToolSurfaceIR. The ONLY LLM call in
                      the entire system.

ARCHITECTURAL RULES — these are not style preferences, they are the product:

1. The parser NEVER guesses. Field names, types, required-ness and response
   schemas come out of the spec or they do not exist. If an unresolvable $ref
   or a missing schema is hit, THROW — never substitute a plausible default.
   A hallucinated field name here passes every downstream check and is
   silently wrong forever.

2. The planner emits JSON, never code. It decides names, descriptions,
   endpoint clustering, and widget archetype + field mapping. Nothing else.

3. ToolSurfaceIR deliberately has NO inputSchema field. Another module derives
   input schemas from the EndpointGraph. Do not add one, however convenient it
   seems. This is what makes hallucinated field names structurally impossible.

NITROSTACK CONVENTIONS (violating these breaks the build):
- ES modules: ALWAYS .js extensions in imports, even from .ts files
- Decorators only: @Module, @Tool, @Injectable. Never server.tool()
- Constructor injection. Never `new ClassName()`
- Services hold logic; tools are thin wrappers
- Every tool needs a Zod inputSchema and examples.request/examples.response
```

---

## PHASE 1 — Stub surface (~45 min)

Goal: both tools exist, are callable, return fixture data. Nothing real.

**PROMPT**
```
Create src/modules/ingest/ with:

- ingest.module.ts  — @Module({ name:'ingest', controllers:[IngestTools],
                       providers:[ParserService, PlannerService] })
- ingest.tools.ts   — class IngestTools with two @Tool methods
- parser.service.ts  — @Injectable, stub: reads fixtures/graphs/demo.graph.json
- planner.service.ts — @Injectable, stub: reads fixtures/irs/demo.ir.json

TOOL 1: parse_spec
  inputSchema: z.object({ spec: z.string().describe('OpenAPI spec URL or raw JSON') })
  @Cache({ ttl: 3600 })
  returns: { graphId, title, version, endpointCount, resourceGroups[], authSchemes[] }

TOOL 2: plan_tool_surface
  inputSchema: z.object({ graphId: z.string() })
  @RateLimit({ requests: 5, window: '1m', key: () => 'global' })
  @Widget('tool-surface')
  returns: { irId, serverName, toolCount, endpointCount, tools[] }

Both need realistic examples.request / examples.response — they are required
for widget previews and for downstream verification.
Add invocation: { invoking, invoked } status strings to both.

Import ArtifactStore from ../../contracts/store.contract.js and inject it;
call store.putGraph() / store.putIR() and return the IDs.
```

**GATE:** `npm run dev` boots · both tools appear in NitroStudio · both return fixture data when called.

---

## PHASE 2A — Real parser (~1h)

**Use `@apidevtools/swagger-parser`.** `SwaggerParser.dereference()` handles `$ref` resolution and circular refs properly. Writing this yourself costs 2+ hours and will still be wrong on real specs.

```bash
npm install @apidevtools/swagger-parser
```

**PROMPT**
```
Implement parser.service.ts for real. OpenAPI 3.x → EndpointGraph, matching
src/contracts/endpoint-graph.schema.ts exactly.

Use SwaggerParser.dereference() to resolve all $refs up front.

For each operation, extract:
  id            `${METHOD} ${path}` uppercase method, e.g. "GET /v1/customers/{id}"
  method, path, summary, tags
  pathParams / queryParams  → name, type, required, description, enum
  bodySchema      the dereferenced request body schema, or null
  responseSchema  the 2xx response schema, or null
  security        security scheme names applying to this operation

Also extract top-level securitySchemes and source { url, title, version }.

Flatten allOf by merging properties. For oneOf/anyOf, take the first variant
and log a warning — we deliberately do not support full polymorphism.

THROW a descriptive error on: unresolvable $ref, missing operation, or a
malformed spec. Never substitute a default value.

Validate the result with EndpointGraphSchema.parse() before returning.
Write a snapshot test comparing output against fixtures/graphs/demo.graph.json.
```

**GATE:** both pinned specs parse without throwing · snapshot test green · endpoint counts match what your vetting script reported.

---

## PHASE 2B — Real planner (~1h)

**PROMPT**
```
Implement planner.service.ts for real.

Put the prompt in src/modules/ingest/planner.prompt.ts as an exported template
function — NOT inline in a string literal.

INPUT to the model: a compacted EndpointGraph — for each endpoint send only
id, method, path, summary, tags, and param names. Do NOT send full schemas;
they blow the context and the model does not need them for clustering.

ASK THE MODEL FOR exactly this JSON, nothing else:
{
  server: { name, version, description },
  auth: { type: 'apiKey'|'oauth2'|'none' },
  modules: [{ name, tools: [{
    name,            // snake_case, verb-first: search_customers
    description,     // 20-300 chars, written for MODEL SELECTION not humans
    composes: [],    // endpoint ids from the graph
    primaryEndpoint, // one of composes
    widget: null | { archetype: 'data-table'|'stat-card', mapping: {...} },
    cache: null | { ttl },
    requiresAuth
  }] }]
}

THEN VALIDATE, in this order:
  1. ToolSurfaceIRSchema.parse()
  2. Lint: total tools <= 20                        → hard fail
  3. Lint: every composes id exists in the graph     → hard fail
  4. Lint: names match /^[a-z][a-z0-9_]{2,40}$/      → hard fail
  5. Lint: descriptions 20-300 chars                 → hard fail

On failure: retry ONCE with the validation errors appended to the prompt.
On second failure: throw. Never return a partially-valid IR.

Read the API key via ConfigService — never hardcode it.
```

**Tool-surface compression is the product, not a nicety.** 1 endpoint → 1 tool produces servers that are *worse than useless*: 300 tools named `post_v1_payment_intents_id_capture` destroy model selection accuracy and exhaust the context window before turn one. The ≤20 cap forces clustering. Enforce it ruthlessly.

**GATE:** Stripe's spec → ≤20 tools, all `composes` resolve, output shape matches the hand-written `demo.ir.json`.

---

## PHASE 3 — Convergence (~30 min)

**PROMPT**
```
Wire the real ParserService and PlannerService into IngestTools, replacing
the fixture stubs. Keep the tool signatures and return shapes identical —
other modules depend on them.

Verify end to end in NitroStudio:
  parse_spec { spec: <pinned spec> }  → { graphId, ... }
  plan_tool_surface { graphId }        → { irId, toolCount, ... }
```

Then hand your real `irId` to W2 and confirm their emitter accepts it. **That handshake is SYNC 4.**

---

## PHASE 4 — Tuning (if time)

Tighten lint thresholds until output quality matches your hand-written IR · add the second spec to `forge://specs` · improve descriptions in the planner prompt (this is the cheapest quality win available).

---

## Definition of done

Pinned spec in → valid `ToolSurfaceIR` out · ≤20 tools · every `composes` resolves · W2's emitter accepts it without complaint.

## Do not build

Input schema generation (W2's, and it must stay W2's) · any code generation · English→server · the widget · the store implementation (you only call it) · a general-purpose OpenAPI parser — we support two vetted specs and that is deliberate.
