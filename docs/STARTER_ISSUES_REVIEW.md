# Starter GitHub issues — draft for maintainer review

**Purpose:** Candidate issues for onboarding contributors. Each item is tied to something observable in this repo; **maintainers should trim, reword, or drop** anything that duplicates roadmap work or is already fixed on `main`.

**How to use:** Copy a section into a GitHub issue, add labels (`good first issue`, `bug`, `documentation`, `security`, etc.), and link to the referenced file path.

---

## Security & hardening

### 1. Reconcile `StreamableHttpTransport` CORS defaults with documented security intent

- **Area:** HTTP transport, docs accuracy  
- **Evidence:** `typescript/packages/core/src/core/transports/streamable-http.ts` — interface JSDoc on `enableCors` says default is **false** for security, but the constructor sets `enableCors: options.enableCors !== false` (**default true**). When CORS is on, `Access-Control-Allow-Origin: *` is applied.  
- **Scope:** Decide product default (strict vs DX for browser clients), then **align code and JSDoc**; optionally document when to disable CORS or use an allowlist for production.  
- **Labels:** `security`, `documentation`, `discussion`

### 2. Optional: configurable JSON body size limit for Express transports

- **Area:** `streamable-http.ts`, `http-server.ts`  
- **Evidence:** Both use `express.json()` with no explicit limit (Express default applies). Large bodies can be a DoS vector on exposed HTTP transports.  
- **Scope:** Expose something like `bodyLimit` in transport options and pass `{ limit: ... }` to `express.json()`. Document recommended values for production.  
- **Labels:** `security`, `enhancement`

### 3. Document `trust proxy` behavior for operators behind reverse proxies

- **Area:** `streamable-http.ts` sets `trust proxy` to `true`.  
- **Evidence:** Correct for TLS termination, but misconfiguration can affect IP-based logic if added later.  
- **Scope:** Add operator docs (README or docs site): when to use, risks, and pairing with `enableCors` / Origin checks.  
- **Labels:** `documentation`, `security`

### 4. Widget RPC: review `postMessage` with `targetOrigin: '*'`

- **Area:** `@nitrostack/widgets`  
- **Evidence:** `typescript/packages/widgets/src/runtime/WidgetLayout.tsx` uses `window.parent.postMessage(..., '*')`. Common for embedded UIs but worth a deliberate security pass.  
- **Scope:** Document threat model; where parent origin is known, consider narrowing `targetOrigin` or validating `event.origin` in the parent (may require paired doc + example).  
- **Labels:** `security`, `widgets`, `discussion`

---

## Privacy / OSS expectations

### 5. CLI analytics: env-based opt-out and CI detection

- **Area:** `@nitrostack/cli`  
- **Evidence:** `typescript/packages/cli/src/analytics/posthog.ts` always initializes PostHog when `trackEvent` runs. `typescript/packages/cli/ANALYTICS.md` describes behavior but does not define a standard opt-out (e.g. `DO_NOT_TRACK`, `NITROSTACK_TELEMETRY=0`, or `CI=true`).  
- **Scope:** Implement opt-out respected by all commands that call `trackEvent`; document in `ANALYTICS.md`, root README, and `typescript/packages/cli/README.md`.  
- **Labels:** `enhancement`, `privacy`, `good first issue` (if scoped to env guard + docs only)

---

## Developer experience (DX)

### 6. Fix misleading JSDoc defaults on `StreamableHttpTransportOptions`

- **Area:** `streamable-http.ts`  
- **Evidence:** `enableSessions` JSDoc says default `true`, but constructor uses `enableSessions === true` (default **false**). `enableCors` JSDoc vs actual default mismatch (see issue 1).  
- **Scope:** Update JSDoc to match code **or** change defaults after an intentional design decision.  
- **Labels:** `documentation`, `good first issue`

### 7. `nitrostack generate` templates: reduce MCP-hostile `console.log` in generated middleware/interceptors

- **Area:** `typescript/packages/cli/src/commands/generate.ts`  
- **Evidence:** Generated snippets use `console.log` for “before/after” middleware. For stdio MCP servers, stdout/stderr pollution is a known footgun (see `typescript/packages/core/src/core/logger.ts` comments).  
- **Scope:** Prefer `context.logger` in generated examples, with a one-line comment pointing to MCP constraints.  
- **Labels:** `dx`, `cli`, `good first issue`

### 8. Fix hardcoded repo URL in legacy HTTP transport info JSON

- **Area:** `typescript/packages/core/src/core/transports/http-server.ts`  
- **Evidence:** Root handler returns `docs: 'https://github.com/nitrostack/nitrostack'` while `package.json` / root README reference `nitrocloudofficial/nitrostack`.  
- **Scope:** Point to the correct org/repo or a stable docs URL.  
- **Labels:** `documentation`, `good first issue`

### 9. Surface `ANALYTICS.md` from user-facing CLI docs

- **Area:** Docs discoverability  
- **Evidence:** `typescript/packages/cli/README.md` does not link to `typescript/packages/cli/ANALYTICS.md`.  
- **Scope:** Add a short “Telemetry” section with link and (once issue 5 exists) opt-out instructions.  
- **Labels:** `documentation`, `good first issue`

### 10. Escape server metadata in Streamable HTTP documentation HTML

- **Area:** `typescript/packages/core/src/core/transports/streamable-http.ts`, `generateDocumentationPage`  
- **Evidence:** `escapeHtml()` is used for tool name/description/schema, but `serverName`, `serverVersion`, `serverDescription`, and `mcpEndpoint` are interpolated raw into `<title>`, headings, and `<code>`. Malicious or accidental markup in config could break the page or worse.  
- **Scope:** Run the same escaping (or a small HTML-encode helper) on all user-controlled strings in that template.  
- **Labels:** `security`, `dx`, `good first issue`

### 11. Document CLI invocation and terminal-friendly output

- **Area:** `typescript/packages/cli/README.md`, optionally `CONTRIBUTING.md`  
- **Evidence:** `package.json` exposes bins `nitrostack-cli` and `@nitrostack/cli`; `typescript/packages/cli/src/index.ts` sets `program.name('nitrostack')`, which affects help text. Root README uses `npx @nitrostack/cli init`. Repo docs do not mention `NO_COLOR` / non-TTY behavior for contributors who rely on plain logs.  
- **Scope:** Short “How to run” table (`npx`, global install, local bin) and a note that Chalk respects standard terminal color env vars (`NO_COLOR`, etc.).  
- **Labels:** `documentation`, `dx`, `good first issue`

### 12. Align `generate types` command UX with other CLI flows

- **Area:** `typescript/packages/cli/src/commands/generate-types.ts` vs `init.ts` / `generate.ts`  
- **Evidence:** `generateTypes` prints only `createHeader` and success box—no full banner, footer, or `nextSteps` pattern used elsewhere. It is invoked from `generate` for the `types` path; standalone UX may feel inconsistent.  
- **Scope:** Optionally reuse `NITRO_BANNER_FULL`, `showFooter`, and spacing helpers from `branding.ts` where it does not conflict with non-interactive use.  
- **Labels:** `dx`, `cli`, `good first issue`

### 13. Reduce noisy stderr from `mcp-dev-wrapper` during stdio MCP dev

- **Area:** `typescript/packages/cli/src/mcp-dev-wrapper.ts`  
- **Evidence:** Hot-reload status and a `[DEBUG] ... MCP_SERVER_PORT` line go to `console.error`. When the parent is an MCP client using stdio, extra stderr can confuse debugging (even if JSON-RPC is on stdout).  
- **Scope:** Gate debug lines behind something like `NITROSTACK_DEBUG=1` or `DEBUG=nitrostack:*`; keep user-visible fatal errors clear.  
- **Labels:** `dx`, `cli`, `good first issue`

### 14. Add examples to Commander `--help` for common commands

- **Area:** `typescript/packages/cli/src/index.ts`  
- **Evidence:** Subcommands list options but no “Examples:” block (`init` templates, `generate module`, etc.). New users cross-check root README instead of `--help`.  
- **Scope:** Use Commander’s `.addHelpText('after', ...)` (or equivalent) on `init`, `generate`, and `dev` with copy-pastable snippets.  
- **Labels:** `dx`, `cli`, `good first issue`

### 15. Structured or leveled logging for Streamable HTTP transport errors

- **Area:** `typescript/packages/core/src/core/transports/streamable-http.ts`  
- **Evidence:** Handlers use `console.error('POST error:', error)` (and similar) in catch paths. Operators running behind a reverse proxy may want JSON logs or a single logger interface consistent with the rest of core.  
- **Scope:** Optional `onError` callback or shared logger injection; document default behavior.  
- **Labels:** `dx`, `enhancement`

---

## Testing / quality

### 16. Tests for `ReadResource` response shaping by `content.type` (`text` / `binary` / `json`)

- **Area:** `@nitrostack/core` tests  
- **Evidence:** `ReadResource` handling in `typescript/packages/core/src/core/server.ts` branches on `content.type`; automated tests per branch reduce regression risk.  
- **Scope:** Assert correct MCP payload shape for each branch (e.g. `json` uses stringified `data`, not the whole content object).  
- **Labels:** `test`, `good first issue` (with maintainer pointers to test layout)

### 17. Expand transport tests for CORS on vs off (Origin validation path)

- **Area:** `typescript/packages/core/src/core/transports/__tests__/transports.test.ts` (and related)  
- **Evidence:** Middleware branches on `enableCors` vs Origin check; explicit tests help prevent accidental security regressions.  
- **Labels:** `test`, `security`

---

## Visuals / branding / polish

### 18. Refresh stale header comment in CLI branding module

- **Area:** `typescript/packages/cli/src/ui/branding.ts`  
- **Evidence:** File header references “Wekan Enterprise Solutions” while the rest of the file uses NitroStack links and palette.  
- **Scope:** Update comment to match current project ownership/branding.  
- **Labels:** `chore`, `good first issue`

### 19. Gate or remove debug `console.log` in `WidgetLayout` for production builds

- **Area:** `@nitrostack/widgets`  
- **Evidence:** `typescript/packages/widgets/src/runtime/WidgetLayout.tsx` logs to console on setup and on some message events.  
- **Scope:** Use `process.env.NODE_ENV !== 'production'` or a `NITROSTACK_WIDGET_DEBUG` flag.  
- **Labels:** `widgets`, `dx`, `good first issue`

### 20. Align Streamable HTTP docs page branding with NitroStack (CSS + assets)

- **Area:** `typescript/packages/core/src/core/transports/streamable-http.ts` (`generateDocumentationPage`)  
- **Evidence:** Inline CSS uses `--nitrocloud-*` variable names; embedded logo `alt` is “NitroCloud Logo”. Public site and CLI use NitroStack naming.  
- **Scope:** Rename tokens to `--nitrostack-*` (or neutral `--brand-*`) and update alt text; optional palette alignment with `branding.ts` hex values.  
- **Labels:** `visuals`, `good first issue`

### 21. Polish dark mode and motion on the bundled MCP documentation page

- **Area:** Same HTML template in `streamable-http.ts`  
- **Evidence:** `@media (prefers-color-scheme: dark)` adjusts inner tokens, but `body` keeps a bright purple gradient in all modes. `.tool-card` uses hover `transform` and transitions without `prefers-reduced-motion`.  
- **Scope:** Soften or swap the outer background in dark mode; add `@media (prefers-reduced-motion: reduce)` to disable non-essential transitions/transforms.  
- **Labels:** `visuals`, `accessibility`, `good first issue`

### 22. Improve focus visibility and semantics on the bundled MCP docs page

- **Area:** Same template  
- **Evidence:** Footer links rely on browser defaults; section headings use emoji with no extra affordance for keyboard users.  
- **Scope:** Add `:focus-visible` outlines for links and `summary`; ensure heading hierarchy stays logical when emoji are decorative.  
- **Labels:** `visuals`, `accessibility`, `good first issue`

### 23. Optional: tighten emoji / icon consistency in CLI success messages

- **Area:** `typescript/packages/cli/src/commands/init.ts`, `dev.ts`, `start.ts`  
- **Evidence:** Messages mix emoji (`🎉`, `👋`) with box-drawing UI; some terminals/fonts render these poorly.  
- **Scope:** Prefer ASCII-friendly variants when `NO_COLOR` is set, or document that emoji in CLI output are best-effort.  
- **Labels:** `visuals`, `dx`, `discussion`

---

## Ecosystem / advanced (not “first issue” unless scoped small)

### 24. Redis (or pluggable) backend example for `@RateLimit` storage

- **Area:** `typescript/packages/core/src/core/decorators/rate-limit.decorator.ts` — `InMemoryRateLimitStorage` is process-local.  
- **Scope:** Doc recipe or small optional package for multi-instance deployments.  
- **Labels:** `enhancement`, `documentation`

### 25. `nitrostack generate` — implement or clearly scope stub generators

- **Area:** `typescript/packages/cli/src/commands/generate.ts` contains `// TODO: Implement` for several generator paths and “TODO: Add description” in templates.  
- **Scope:** Either implement minimal viable output or document which subcommands are experimental and fail fast with a clear message.  
- **Labels:** `dx`, `cli`, `discussion`

---

## Maintainer checklist before publishing

- [ ] Confirm each item still applies on current `main`.  
- [ ] Split large items (CORS defaults vs docs) if you want parallel PRs.  
- [ ] Add **one** `good first issue` label per issue; reserve `security` for items that need careful review.

---

*Generated from a static read of the nitrostack monorepo; not a substitute for triage or threat modeling.*
