# CLAUDE.md — NitroStack SDK reference (AI context)

> Saved from https://docs.nitrostack.ai/ai-agents/sdk-reference and
> https://docs.nitrostack.ai/ai-agents/cli-reference per team brief §5/§9.
> Read this before generating or editing any file in this repo.

## Non-negotiable rules for this codebase

1. **ES modules — `.js` extensions on every relative import, even from `.ts` files.**
   `import { ParserService } from './parser.service.js'` — NOT `'./parser.service'`.
2. **Decorators only.** No `server.tool()` / factory functions. Use `@McpApp`, `@Module`,
   `@Tool`, `@Resource`, `@Prompt`, `@Injectable`, `@Widget`, `@UseGuards`, `@Cache`,
   `@RateLimit`, `@HealthCheck` from `@nitrostack/core`.
3. **Constructor injection only. Never `new ClassName()`** for anything `@Injectable`.
4. **Services hold logic; `@Tool`-decorated methods are thin wrappers** that call into
   injected services.
5. **Every `@Tool` needs a Zod `inputSchema`.** Outputs must be JSON-serializable.
6. **Always provide `examples.request` / `examples.response`** on tools — widget
   previews won't render without them, and the verifier (W2) replays these examples.
7. **Widgets: inline styles, NOT Tailwind** (breaks in the widget iframe). Use
   `useWidgetSDK()`, guard on `isReady` before rendering.
8. **Long-running jobs use MCP Tasks**: `taskSupport: 'optional'`, then
   `ctx.task.updateProgress(...)` / `ctx.task.throwIfCancelled()` inside the handler.

## ⚠️ Verified against the real installed package — trust this over either doc

Checked directly against `node_modules/@nitrostack/core/dist/core/index.d.ts`
(v1.0.14) rather than assumed from docs, because the two docs disagree and one
of them is wrong on several points:

- **`Tool`, `Resource`, `Prompt` (bare) are the *builder classes*, NOT the
  method decorators.** The actual decorators are exported as `ToolDecorator`,
  `ResourceDecorator`, `PromptDecorator`, `ControllerDecorator`. Import them
  aliased: `import { ToolDecorator as Tool, ControllerDecorator as Controller } from '@nitrostack/core'`.
  Using the bare `Tool` class as `@Tool(...)` throws at runtime (class invoked
  without `new`). **This confirms the Quick Start's import style is correct
  and the SDK Reference's `import { Tool } from '@nitrostack/core'` example is
  stale — do not follow that one.**
- `Widget`, `Cache`, `RateLimit`, `Injectable`, `Module` (as the decorator),
  `UseGuards` etc. are all exported under their plain names with no shadowing
  — no alias needed for those.
- `ConfigModule`/`ConfigService` come from `@nitrostack/core` (not
  `nitrostack/config`).
- `McpApplicationFactory.create(AppModule)` is a single call, one argument.
- `@McpApp({ module: AppModule, server: {...} })` — `module` is a **required**
  field on `McpAppOptions`.
- `@Controller(prefixOrOptions?)` is optional — only needed if you want it to
  prefix every `@Tool` name in the class (`@Controller('github')` turns
  `create_issue` into `github_create_issue`). Omit it (or call bare
  `@Controller()`) for unprefixed tool names; the class still needs *some*
  controller/DI-registering decorator to be picked up.
- **`@Cache` uses a store shared across instances**, keyed by
  `ClassName:methodName:JSON(input)` — not scoped to a single class instance.
  Correct for production (repeat calls to the same input should hit cache
  regardless of which instance handled it first), but tests that reuse the
  same input across fresh instances must call `clearCache()` between runs.
- `@Injectable({ deps: [...] })` is the SDK's own recommended pattern for ESM
  environments — `emitDecoratorMetadata`-based implicit constructor injection
  "may not work reliably due to module loading order" per the package's own
  doc comments. Prefer explicit `deps` for any service with constructor args.

## Architecture skeleton (this repo)

```
@McpApp (root) → @Module (per workstream: ingest / emit / runtime / forge)
  → @Injectable services (business logic)
    → @Tool / @Resource / @Prompt controllers (thin)
```

## This project's specific contract

- `src/contracts/*` is FROZEN after H0. Nobody edits it without full-team sign-off.
- W1 (ingest) implements `IngestPort`: `parse()` deterministic, `plan()` is the
  ONLY LLM call in the whole system.
- The IR (`ToolSurfaceIR`) has NO `inputSchema` field — that's derived downstream
  by W2 from the `EndpointGraph` via each tool's `composes` array. Never add one.
- `store.contract.ts` (`ArtifactStore`) is owned by W3's real `store.service.ts`.
  W1 uses `src/testing/in-memory-artifact-store.ts` as a temporary stand-in —
  swap the provider binding in `ingest.module.ts` once W3 ships the real one.
  It has `putServer`/`getServer` (combined `GeneratedProject` + `VerificationReport`
  manifest, for `forge://server/{id}`) alongside the per-artifact put/get pairs.
- `generated-project.schema.ts` and `verification-report.schema.ts` are
  separate files (split from an earlier combined version) — W2 produces both.

## Full SDK/CLI reference

See `docs/nitrostack-sdk-reference.md` and `docs/nitrostack-cli-reference.md` in
this repo (mirrored locally so the whole team has offline/consistent context).
