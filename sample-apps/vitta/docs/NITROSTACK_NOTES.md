# NITROSTACK_NOTES.md — the ONLY NitroStack API truth for this repo

> Phase −1 discovery output (17 Jul 2026). Every claim below cites a **local file path**,
> **CLI `--help` output**, or a **fetched docs URL**. Do NOT add a claim here without a citation.
> If you need an API that is not here, STOP and ask a NitroStack mentor — do not guess (CLAUDE.md rule 1).

## Verified environment
- Node `v24.11.0` (plan requires ≥ 20.18 ✓) — `node --version`
- npm `11.6.1`, git `2.55`, gh `2.95`
- Packages installed (from npm registry, `npm view`):
  - `@nitrostack/core@1.0.13` (decorators, DI, runtime) — `package.json` dep `^1`
  - `@nitrostack/cli@1.0.14` (scaffold/dev/build/start/generate) — devDep `^1`
  - `@nitrostack/widgets@1.0.8` (React widget SDK) — added only in Phase 7
  - bare `nitrostack@1.0.85` exists but `npx nitrostack --help` → "could not determine executable"; **do not use the bare package**. The working binary is `nitrostack-cli` (shipped by `@nitrostack/cli`).
- Scaffold created with: `npx @nitrostack/cli init vitta-lending --template typescript-starter`
  (templates offered: `typescript-starter`, `typescript-pizzaz`, `typescript-oauth` — from `init --help`).

## CLI — verified from `nitrostack-cli <cmd> --help`
| Command | Purpose | Notes |
|---|---|---|
| `nitrostack-cli init [name]` | scaffold | `--template`, `--description`, `--author`, `--skip-install` |
| `nitrostack-cli dev` | dev server (MCP + widgets) hot reload | `--port` (widget dev, default 3001). MCP server itself is **stdio** in dev. |
| `nitrostack-cli build` | build for prod | `--output` (default `dist`) |
| `nitrostack-cli start` | start prod server | `--port` (default 3000) |
| `nitrostack-cli generate\|g <type> [name]` | codegen | types: middleware, interceptor, pipe, filter, service, guard, health, module, tools, resources, prompts, types |
| `nitrostack-cli upgrade` | upgrade nitrostack in project | |
| `nitrostack-cli install\|i` | install deps in root + src/widgets | |
| `nitrostack-cli cursor\|c` | Cursor MCP integration | |

npm scripts (from `package.json`): `dev`, `build`, `start` (= build+start), `start:prod`, `upgrade`, `install:all`, `widget`.

> **There is NO `nitro deploy` / `nitrostack-cli deploy` command.** The plan's `nitro deploy --prod`
> does not exist in this CLI. See **Deployment** below.

## How a TOOL is defined — `src/modules/calculator/calculator.tools.ts`
```ts
import { ToolDecorator as Tool, Widget, ExecutionContext, z } from '@nitrostack/core';

export class CalculatorTools {                 // plain class; registered via module `controllers`
  @Tool({
    name: 'calculate',                          // snake_case or kebab-case, unique
    description: 'Perform basic arithmetic calculations',   // model reads this to decide to call
    inputSchema: z.object({ a: z.number().describe('First number') }),  // Zod, .describe() per field
    // outputSchema?: z.ZodSchema  (optional, validates output — types.d.ts ToolDefinition)
    examples: { request: {...}, response: {...} }           // optional
  })
  @Widget('calculator-result')                  // optional: attach a React widget by route name
  async calculate(input: any, ctx: ExecutionContext) {
    ctx.logger.info('msg', { meta });           // logger on ctx
    return { ...anyJson };                       // handler return = tool result (structuredContent)
  }
}
```
- Import name: `ToolDecorator` (aliased `Tool`) OR `Tool` directly — both exported (`core/dist/core/index.d.ts`).
- Handler signature: `(input, ctx: ExecutionContext) => Promise<output>` (`types.d.ts` `ToolDefinition.handler`).
- `@InitialTool()` marks a tool auto-invoked on client init (skill: tools-resources-prompts). Not needed for us.
- Policy decorators (skill: tools-resources-prompts): `@Cache({ttl})`, `@RateLimit({requests,window})`.

## How a RESOURCE is defined — `calculator.resources.ts` + tools-resources-prompts skill
```ts
import { ResourceDecorator as Resource, ExecutionContext } from '@nitrostack/core';
@Resource({ uri: 'calculator://operations', name: '...', description: '...', mimeType: 'application/json' })
async getOperations(uri: string, ctx: ExecutionContext) {
  return { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(data) }] };
}
```
- Handler signature: `(uri: string, ctx) => Promise<{contents:[{uri,mimeType,text}]}>` (scaffold-verified).
- URI schemes are **arbitrary** (`scheme://path`) — `calculator://operations`, and skill shows `app://settings`,
  `git://{owner}/{repo}/file` (template style). For our live case record use `case://{lead_id}`.
- `ResourceTemplate` / `createResourceTemplate` exist for RFC-6570 templated URIs (`index.d.ts`, `types.d.ts`).

## How a PROMPT is defined — `calculator.prompts.ts`
```ts
import { PromptDecorator as Prompt, ExecutionContext } from '@nitrostack/core';
@Prompt({ name: 'calculator_help', description: '...', arguments: [{ name, description, required }] })
async getHelp(args: any, ctx) {
  return [ { role: 'user' as const, content: '...' }, { role: 'assistant' as const, content: '...' } ];
}
```
- Scaffold returns a **bare array** of `{role, content}`. (The tools-resources-prompts skill shows an
  alt shape `{ messages: [...] }` — the scaffold's bare-array form is what this template compiles, use it.)

## Module / App wiring — `calculator.module.ts`, `app.module.ts`, `index.ts`
```ts
// feature module — groups controllers (classes holding @Tool/@Resource/@Prompt methods)
@Module({ name: 'calculator', description: '...', controllers: [CalculatorTools, CalculatorResources, CalculatorPrompts] })
export class CalculatorModule {}

// root
@McpApp({ module: AppModule, server: { name: 'calculator-server', version: '1.0.0' }, logging: { level: 'info' } })
@Module({ name: 'app', description: '...', imports: [ConfigModule.forRoot(), CalculatorModule], providers: [SystemHealthCheck] })
export class AppModule {}

// entry — index.ts
import 'dotenv/config';
import { McpApplicationFactory } from '@nitrostack/core';
const server = await McpApplicationFactory.create(AppModule); await server.start();
```
- `controllers` = classes with tool/resource/prompt methods. `providers` = DI services / health checks.
- `@Controller('prefix')` optionally prefixes every tool name in a class (mcp-app-architecture skill) — we do NOT prefix (tool names are canonical).
- DI: `@Injectable({scope})`, constructor injection, `Scope.SINGLETON|TRANSIENT|SCOPED`. Lifecycle hooks:
  `OnModuleInit`, `OnApplicationBootstrap`, `OnModuleDestroy`, etc. (mcp-app-architecture skill).

## Middleware pipeline — `middleware-pipeline` skill
- **Guard**: `implements Guard { canActivate(ctx): boolean|Promise<boolean> }`, applied `@UseGuards(A, B)` (chained).
- **Interceptor**: `intercept(ctx, next)`. **Filter**: `catch(exception, ctx)` → maps thrown error to JSON. `@UseFilters(F)`.
- **Middleware**: `use(ctx, next)`, `@UseMiddleware`. **Pipe**: `transform(value, meta)`, `@UsePipes`.

## ⚠️ CONSENT-GATE DESIGN DECISION (load-bearing)
`ExecutionContext` (`core/dist/core/types.d.ts:268`) exposes ONLY:
`requestId, toolName?, logger, metadata?, auth?, task?`. **It does NOT carry the tool input arguments.**
Therefore a `Guard.canActivate(ctx)` **cannot read the `consent_token` tool input**.
Our consent token is a **tool input parameter** (the LLM passes it as a tool arg), not an HTTP/auth header.

**Conclusion (matches PLAN.md §5 Phase 1a fallback):** the consent gate is enforced **inline as the FIRST
line of each gated handler** via `validConsent(input.consent_token, requiredScope)`, returning the exact
refusal payload `{ error: "CONSENT_REQUIRED", code, hint }`. Guards remain correct for header/auth-level
checks (JWT/API-key), but are the wrong tool for an input-level consent token on this platform.
This is a genuine platform finding, not a shortcut — document it in the write-up.

## Auth modules available (not used for the consent gate, but real) — `auth-security` skill
`JWTModule.forRoot({secret, expiresIn})`, `ApiKeyModule.forRoot(...)`, `@UseGuards(JWTGuard, RoleGuard)`.
Guards read `ctx.metadata?.authorization` / `ctx.metadata?.['x-api-key']` and set `ctx.auth`.

## Widgets — `@Widget` + `@nitrostack/widgets` (Phase 7 only) — `ui-widgets` skill + `src/widgets/`
- Backend: `@Widget('route-name')` on a tool (or object form `{route, domain?, csp?}`).
- Frontend: Next.js app under `src/widgets/app/<route>/page.tsx`; `useWidgetSDK()` → `getToolOutput<T>()`,
  `callTool(name,args)`, `useWidgetState()`, `theme`, `requestFullscreen()`, `sendFollowUpMessage()`.
- Manifest: `src/widgets/widget-manifest.json`. Preview via NitroStudio hot reload.

## Local testing
- `npm run dev` → stdio MCP server + widget dev server (port 3001). Open the project folder in **NitroStudio**
  (https://nitrostack.ai/studio) for the visual tool-testing panel + AI chat (chat uses YOUR OpenAI/Gemini key,
  set `NITROSTACK_APP_MODE` in `.env`; costs nothing on the platform).
- Unit tests: **`@nitrostack/core/testing`** ships `createMockContext(overrides)`, `MockLogger`, `TestingModule`
  (`core/dist/testing/index.d.ts`). Test runner: scaffold ships none → **add `vitest`** (decided in Phase 0;
  declare in THIRD_PARTY.md). Tools/consent are plain functions → unit-testable without the runtime.

## State / persistence
- No DB in scaffold. Convention: write JSON under `process.cwd()` (calculator example writes `uploads/`).
  We persist to `./data/*.json` via `src/lib/store.ts` (gitignored `data/`). Env via `dotenv/config` + `ConfigModule`/`ConfigService`.

## Env / secrets
- `.env` loaded by `import 'dotenv/config'` in `index.ts`. `.env.example` keys: `NITRO_LOG_LEVEL`,
  `NITROSTACK_APP_MODE` (openai|...), `MCP_TRANSPORT_TYPE` (stdio|http|dual), `PORT`, `HOST`, `ENABLE_CORS`.
- Transport: **dev = stdio**, **prod (NODE_ENV=production) = dual (stdio + HTTP SSE)** (`index.ts` header comment + `.env.example`).
- Consent HMAC secret → add `CONSENT_SECRET` to `.env` (Phase 1a).

## Deployment — DEPLOY IS PLATFORM-SIDE (NitroCloud), not a local CLI command
- Docs (`docs.nitrostack.ai/deployment/checklist`, fetched 17 Jul): local build = `nitrostack-cli build` → `dist/`.
  Generic run targets shown: `node dist/index.js`, Docker (`-p 3000:3000`), PM2. For managed cloud it says
  *"Deploy to NitroCloud and we handle security, scaling, monitoring, DevOps"* and points to **nitrocloud.ai**.
- Dashboard (cloud.nitrostack.ai) "Deploy MCP" step offers **three paths: CLI · GitHub connect · package upload**.
- **Chosen path for Vitta:** `nitrostack-cli build` locally to prove it compiles, then **GitHub-connect** the repo
  `AnshBajpai05/NitroStack-Hackathon` in the dashboard (auto-deploys on push) OR **package upload** as fallback.
  The public URL is generated by the platform (goes in the submission). **Prod deploy is a human/team step** done
  from the logged-in dashboard (CLAUDE.md rule 11) — Claude Code does NOT deploy.

## UNKNOWNS (honest — ask a mentor, do not guess)
1. Exact CLI-path deploy command/auth in the dashboard "Deploy MCP → CLI" option (is there a `login`+push CLI
   distributed only to logged-in users?). GitHub-connect + package-upload are documented and sufficient.
2. Platform-level rollback / URL-swap mechanics (source-level rollback via git tag + rebuild is our guaranteed path).
3. Whether hackathon "Platform Credits" top up the Free-plan 5.0M tokens / $0.50 NitroChat (ask mentor desk).
4. Prompt return shape on the wire: scaffold uses bare `[{role,content}]`; skill shows `{messages:[...]}`. Use the
   scaffold form; confirm in NitroStudio at Phase 5.

## Prod-mode smoke (17 Jul, local) — known-benign log noise
`NODE_ENV=production node dist/index.js` boots DUAL MODE (stdio + Streamable HTTP `/mcp` + legacy SSE `/sse`).
GET `/` and `/mcp` → 200; `initialize` over POST `/mcp` answers correctly.
KNOWN-BENIGN: one startup error `Failed to instantiate provider OAuthModule … Cannot resolve token "OAUTH_CONFIG"` —
the framework's built-in OAuth module tries to self-instantiate without `OAuthModule.forRoot()` config (we don't use OAuth).
Server continues and serves normally. Ignore in cloud logs.
