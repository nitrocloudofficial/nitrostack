# Handoff — W1 → W3

You're picking this up cold (new chat, no history), so this is written to be
self-contained. Read `CLAUDE.md` first, then this.

## What's already done (W1)

`src/modules/ingest/` — parser + planner + tool surface, all real, all
tested (17/17 passing). `npm run typecheck` and `npm run build` are clean.
You don't need to touch this module. What you *do* need to know about it:

## The one thing blocking your integration: `ArtifactStore`

`src/contracts/store.contract.ts` defines the interface W1's tools
(`parse_spec`, `plan_tool_surface`) depend on:

```ts
export const ARTIFACT_STORE = 'ARTIFACT_STORE';

export interface ArtifactStore {
  putGraph(graph: EndpointGraph): Promise<string>;
  getGraph(graphId: string): Promise<EndpointGraph | null>;
  putIR(ir: ToolSurfaceIR): Promise<string>;
  getIR(irId: string): Promise<ToolSurfaceIR | null>;
  putProject(project: GeneratedProject): Promise<string>;
  getProject(projectId: string): Promise<GeneratedProject | null>;
  putReport(report: VerificationReport): Promise<string>;
  getReport(reportId: string): Promise<VerificationReport | null>;
}
```

Right now `ingest.module.ts` binds this to `src/testing/in-memory-artifact-store.ts`
— a plain `Map`-based stand-in I wrote so W1 wasn't blocked on you. It
satisfies the interface exactly. **When your real `store.service.ts` (Map +
write-through to `.forge/`, per README §"catalog") is ready, the only change
needed in `ingest.module.ts` is:**

```ts
// before
{ provide: ARTIFACT_STORE, useClass: InMemoryArtifactStore }
// after
{ provide: ARTIFACT_STORE, useClass: StoreService }
```

Everything else — the tools, the tests, the fixtures — is unaffected as long
as your `StoreService` implements the interface above. If you need to extend
the interface (e.g. list methods for your Resources), that's a contract
change and needs a quick sign-off ping since `src/contracts/` is frozen, but
adding methods (not changing existing signatures) is low-risk.

Also see `src/contracts/activity.contract.ts` — `ActivityEventSchema`, exact
shape your `activity.interceptor.ts` needs to produce. It's already frozen
and matches the README verbatim, nothing to change there.

## Gotchas I hit building W1 — save yourself the time

Full detail is in `CLAUDE.md`, but headline ones, verified directly against
`node_modules/@nitrostack/core/dist/core/*.d.ts` (not assumed from docs):

- **`import { Tool } from '@nitrostack/core'` gets you the wrong thing.**
  `Tool`/`Resource`/`Prompt` bare are builder *classes*. The actual method
  decorators are `ToolDecorator`/`ResourceDecorator`/`PromptDecorator`. Import
  aliased: `import { ToolDecorator as Tool, ResourceDecorator as Resource, PromptDecorator as Prompt, ControllerDecorator as Controller } from '@nitrostack/core'`.
  This matters a lot for you — you own all the Resources and Prompts.
- `@Controller(prefixOrOptions?)` is optional but your controller classes
  need it (or equivalent) to register in DI. Bare `@Controller()` = no name
  prefix on tools.
- `ConfigModule`/`ConfigService` come from `@nitrostack/core`, not
  `nitrostack/config`.
- `@McpApp({ module: AppModule, server: {...} })` — `module` is required.
  You own `app.module.ts` / `index.ts` (not built yet — this repo doesn't
  have them; that's your Phase 1 "app shell" deliverable per README).
- `McpApplicationFactory.create(AppModule)` — single call, one arg.
- `@Cache` (if you use it — e.g. on Resources) shares its store across
  instances, keyed by `ClassName:methodName:JSON(input)`. Not a bug, but
  surprising in tests — use `clearCache()` between test runs that reuse input.
- `@Injectable({ deps: [...] })` is the SDK's own recommended pattern for
  ESM — implicit constructor injection via `emitDecoratorMetadata` "may not
  work reliably" per the package's own comments. Use explicit `deps` on any
  service with constructor args (see `planner.service.ts` for an example).
- `nitrostack-cli` (global npm install) has no runnable `bin` in the public
  registry snapshot we hit. This whole repo is hand-scaffolded instead of
  CLI-generated. If you find a working path to the real CLI, it'd help
  (`generate types` particularly, for your widget), but don't block on it.

## Fixtures you can build against right now

- `fixtures/specs/demo.yaml` — pinned demo spec (6 endpoints: customers,
  orders, stats; apiKey auth)
- `fixtures/graphs/demo.graph.json` — real parser output for that spec
- `fixtures/irs/demo.ir.json` — hand-written IR, 6 tools / 3 modules
  (`customers`, `orders`, `stats`), one `data-table` widget tool
  (`search_customers`), one `stat-card` widget tool (`get_revenue_stats`),
  the rest `widget: null`. This is a good fixture for your `catalog.resources.ts`
  (`forge://ir/{id}`) and for testing your console/activity pipeline without
  needing a live model call.

## What W1 explicitly did NOT build (by design — not oversights)

The widget component, `store.service.ts`, `catalog.*`, `activity.*`,
`console/`, `app.module.ts`, `index.ts`, Docker/deploy — all yours per the
README's workstream table. `ports.ts` has `RuntimePort` stubbed too, in case
W2's scope shifts your way.

## Verifying your integration once wired up

```bash
npm run typecheck && npm run build && npx vitest run
```

Should stay 17/17 (W1's tests) plus whatever you add. If W1's tests start
failing after you swap the store provider, the most likely cause is a
behavioral mismatch with the `ArtifactStore` interface (e.g. `getGraph`
returning `undefined` instead of `null` for a miss) — check
`src/testing/in-memory-artifact-store.ts` for the exact contract W1's tests
were written against.
