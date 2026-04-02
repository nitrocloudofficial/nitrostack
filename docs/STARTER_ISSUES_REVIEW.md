# Starter GitHub issues — draft for maintainer review

**Purpose:** Elaborate descriptions for onboarding contributors and for pasting into GitHub. Each item names **exact files** and **acceptance criteria** so PRs land in the right place.

**How to use:** Copy the **GitHub issue body template** blocks into new/updated issues. Add labels as listed. When an issue spans multiple packages, keep the “Where to change” section prominent.

---

## Security & hardening

### 1. Reconcile `StreamableHttpTransport` CORS defaults with documented security intent

**Summary:** The public TypeScript API docs for `enableCors` disagree with what the constructor actually does. Contributors and operators may secure (or insecurely deploy) the server based on wrong assumptions.

**Where to change:** `typescript/packages/core/src/core/transports/streamable-http.ts` — `StreamableHttpTransportOptions` JSDoc and the `constructor` default object (`this.options = { ... }`).

**Background:** JSDoc on `enableCors` states a default of **false** “for security,” but the implementation uses `enableCors: options.enableCors !== false`, which makes the default **true**. When enabled, middleware sets `Access-Control-Allow-Origin: *`. Origin validation middleware is skipped when CORS is on (`if (!this.options.enableCors)`).

**Why it matters:** Browser-based MCP clients may need permissive CORS; locked-down production deployments may want the opposite. Today, docs and code tell two different stories.

**Acceptance criteria (pick one path after product decision):**
- [ ] JSDoc and constructor defaults match intentionally **or**
- [ ] Defaults are changed to match the documented security posture, with a short **BREAKING** or migration note if behavior changes.
- [ ] Optional: document when to set `enableCors: false` and rely on Origin checks, and when an allowlist is appropriate.

**Suggested labels:** `security`, `documentation`, `discussion`

---

### 2. Optional: configurable JSON body size limit for Express transports

**Summary:** HTTP transports parse JSON bodies with Express’s default limits. Exposed servers should allow operators to cap payload size and reduce abuse risk.

**Where to change:** `typescript/packages/core/src/core/transports/streamable-http.ts` and `typescript/packages/core/src/core/transports/http-server.ts` — wherever `express.json()` is registered.

**Background:** `express.json()` is called without a custom `limit`. Express applies its default maximum body size; for some deployments a stricter or explicit limit is desirable and should be documented.

**Acceptance criteria:**
- [ ] New optional transport option (e.g. `jsonBodyLimit`) with a sensible default matching current behavior unless you intentionally tighten it.
- [ ] Pass `{ limit: ... }` (string or number as Express expects) into `express.json({ limit })`.
- [ ] Document recommended values for production vs dev in README or docs site.

**Suggested labels:** `security`, `enhancement`

---

### 3. Document `trust proxy` behavior for operators behind reverse proxies

**Summary:** `trust proxy` is enabled on the Streamable HTTP app. Operators need to know what that implies for `req.ip`, `X-Forwarded-*`, and security headers.

**Where to change:** Operator-facing docs (root `README.md`, `typescript/packages/core` package README, or https://docs.nitrostack.ai). Code reference: `typescript/packages/core/src/core/transports/streamable-http.ts` (`this.app.set('trust proxy', true)`).

**Background:** Behind nginx, Caddy, or cloud load balancers, trusting proxy headers is often required for correct HTTPS URLs and client IP. Wrong trust settings can mis-attribute IPs if middleware or rate limiting ever keys on IP.

**Acceptance criteria:**
- [ ] Short section: when NitroStack expects to run behind a reverse proxy.
- [ ] Risks of `trust proxy: true` if the edge proxy is not controlled by the operator.
- [ ] Cross-link to how this interacts with CORS and Origin validation (issue 1).

**Suggested labels:** `documentation`, `security`

---

### 4. Widget RPC: review `postMessage` with `targetOrigin: '*'`

**Summary:** Widget runtime posts messages to the parent with a wildcard target origin. Document the threat model and, where possible, tighten origins.

**Where to change:** `typescript/packages/widgets/src/runtime/WidgetLayout.tsx` (`callParentRpc` / `postMessage`). May require companion docs or examples for host apps.

**Background:** `window.parent.postMessage(..., '*')` is common for iframe widgets but allows any origin to receive if misused. Host pages should validate `event.origin` on receive; widgets may narrow `targetOrigin` when the parent URL is known at build time.

**Acceptance criteria:**
- [ ] Document recommended host-side `message` listener pattern (origin checks).
- [ ] Evaluate whether a configurable `targetOrigin` or allowlist fits the public API without breaking ChatGPT / MCP Apps embeds.
- [ ] No breaking change without a major or clear migration path.

**Suggested labels:** `security`, `widgets`, `discussion`

---

## Privacy / OSS expectations

### 5. CLI analytics: env-based opt-out and CI detection

**Summary:** The CLI sends anonymous usage events to PostHog. OSS norms expect an explicit, documented way to disable telemetry (and often auto-disable in CI).

**Where to change:** `typescript/packages/cli/src/analytics/posthog.ts` (guard before `getClient()` / `trackEvent`). Update `typescript/packages/cli/ANALYTICS.md`, root `README.md`, and `typescript/packages/cli/README.md`.

**Background:** `trackEvent` is called from multiple commands (`init`, `dev`, `build`, etc.). There is no documented `DO_NOT_TRACK`, `CI=true`, or `NITROSTACK_TELEMETRY=0` style switch in code today.

**Acceptance criteria:**
- [ ] If any standard env var is set (e.g. `CI`, `DO_NOT_TRACK`, or a NitroStack-specific flag), no network calls to PostHog for that process.
- [ ] Document the exact variable names and behavior in `ANALYTICS.md` and link from CLI README.
- [ ] Tests optional but welcome for the guard logic.

**Suggested labels:** `enhancement`, `privacy`, `good first issue`

---

## Developer experience (DX)

### 6. Fix misleading JSDoc defaults on `StreamableHttpTransportOptions`

**Summary:** Several option defaults documented on `StreamableHttpTransportOptions` do not match the constructor.

**Where to change:** `typescript/packages/core/src/core/transports/streamable-http.ts` — interface JSDoc and, if needed, constructor for consistency with issue 1.

**Concrete mismatches:**
- `enableSessions`: JSDoc implies default **true**; code uses `enableSessions: options.enableSessions === true` → default **false**.
- `enableCors`: documented vs actual mismatch (see issue 1).

**Acceptance criteria:**
- [ ] Every public option’s JSDoc default matches the constructor **or** defaults are intentionally changed and changelog/docs updated.

**Suggested labels:** `documentation`, `good first issue`

---

### 7. `nitrostack generate` templates: reduce MCP-hostile `console.log` in generated middleware/interceptors

**Summary:** Code emitted by `nitrostack generate` uses `console.log` in middleware-style templates. MCP servers using stdio must avoid polluting stdout/stderr.

**Where to change:** `typescript/packages/cli/src/commands/generate.ts` — template strings for `middleware`, `interceptor`, and any similar snippets that log to console.

**Background:** `typescript/packages/core/src/core/logger.ts` documents that console logging breaks JSON-RPC over stdio. New users copy generated code verbatim.

**Acceptance criteria:**
- [ ] Generated examples use `context.logger` (or equivalent) instead of `console.log` where an `ExecutionContext` is available.
- [ ] One-line comment in template explaining why not to use `console` in stdio MCP mode.

**Suggested labels:** `dx`, `cli`, `good first issue`

---

### 8. Fix hardcoded repo URL in legacy HTTP transport info JSON

**Summary:** The legacy HTTP transport exposes a JSON info endpoint with an incorrect GitHub path.

**Where to change:** `typescript/packages/core/src/core/transports/http-server.ts` — handler that returns `docs: 'https://github.com/...'`.

**Background:** Repository lives under `nitrocloudofficial/nitrostack` (see package `repository.url`). The hardcoded string points at a different org/path.

**Acceptance criteria:**
- [ ] `docs` URL matches the canonical repo or `https://docs.nitrostack.ai` (single source of truth chosen by maintainers).

**Suggested labels:** `documentation`, `good first issue`

---

### 9. Surface `ANALYTICS.md` from user-facing CLI docs

**Summary:** Telemetry is documented internally in `ANALYTICS.md` but not linked from the npm-facing CLI README.

**Where to change:** `typescript/packages/cli/README.md` — new short section; optionally root `README.md` one-liner.

**Acceptance criteria:**
- [ ] “Telemetry” or “Privacy” subsection with link to `ANALYTICS.md`.
- [ ] After issue 5 lands, mention opt-out env vars there.

**Suggested labels:** `documentation`, `good first issue`

---

### 10. Escape server metadata in Streamable HTTP documentation HTML

**Summary:** The HTML documentation page built in core interpolates server config into the DOM without escaping everywhere.

**Where to change:** `typescript/packages/core/src/core/transports/streamable-http.ts` — method `generateDocumentationPage` (and `escapeHtml` helper already used for tool fields).

**Background:** Tool names/descriptions/schemas use `escapeHtml`. `serverName`, `serverVersion`, `serverDescription`, and `mcpEndpoint` are inserted raw into `<title>`, `<h1>`, and `<code>` blocks. Odd characters or angle brackets in config could break HTML or introduce XSS if an attacker controlled server metadata.

**Acceptance criteria:**
- [ ] All dynamic strings in that template pass through the same escaping as tool fields (or a shared helper).
- [ ] Quick sanity test: server name containing `<` and `&` renders as text, not markup.

**Suggested labels:** `security`, `dx`, `good first issue`

---

### 11. Document CLI invocation and terminal-friendly output

**Summary:** Multiple entrypoints (`npx`, global bin names, `program.name`) confuse newcomers; terminal color behavior is undocumented.

**Where to change:** `typescript/packages/cli/README.md`, optionally `CONTRIBUTING.md`. Code refs: `typescript/packages/cli/package.json` (`bin`), `typescript/packages/cli/src/index.ts` (`program.name`).

**Acceptance criteria:**
- [ ] Table or list: `npx @nitrostack/cli …`, global `nitrostack-cli`, etc.
- [ ] Note on `NO_COLOR` / Chalk behavior for CI and log collectors.

**Suggested labels:** `documentation`, `dx`, `good first issue`

---

### 12. Align `generate types` command UX with other CLI flows

**Summary:** `nitrostack generate types` uses a minimal header/success pattern while other commands show banner and footer.

**Where to change:** `typescript/packages/cli/src/commands/generate-types.ts`; compare `init.ts` / `generate.ts` / `branding.ts`.

**Acceptance criteria:**
- [ ] Visual consistency (banner/footer/spacers) **unless** maintainers explicitly want a quiet mode for scripting—then document `--json` or quiet flag instead.

**Suggested labels:** `dx`, `cli`, `good first issue`

---

### 13. Reduce noisy stderr from `mcp-dev-wrapper` during stdio MCP dev

**Summary:** Dev wrapper logs hot-reload and debug info to `stderr`, which is painful when debugging stdio MCP.

**Where to change:** `typescript/packages/cli/src/mcp-dev-wrapper.ts`.

**Acceptance criteria:**
- [ ] Debug lines (e.g. `MCP_SERVER_PORT`) behind `NITROSTACK_DEBUG` or `DEBUG` namespace.
- [ ] Real failures remain obvious on stderr.

**Suggested labels:** `dx`, `cli`, `good first issue`

---

### 14. Add examples to Commander `--help` for common commands

**Summary:** `--help` lists flags but not copy-pastable examples.

**Where to change:** `typescript/packages/cli/src/index.ts` — `init`, `generate`, `dev` (minimum).

**Acceptance criteria:**
- [ ] `.addHelpText('after', ...)` (or equivalent) with 2–3 examples per high-traffic command.

**Suggested labels:** `dx`, `cli`, `good first issue`

---

### 15. Structured or leveled logging for Streamable HTTP transport errors

**Summary:** Transport catch blocks use `console.error`, which is hard to aggregate in production.

**Where to change:** `typescript/packages/core/src/core/transports/streamable-http.ts` — POST/GET error paths.

**Acceptance criteria:**
- [ ] Optional `onError` callback or injectable logger; default behavior documented.
- [ ] No silent swallowing of errors without a response to the client.

**Suggested labels:** `dx`, `enhancement`

---

## Testing / quality

### 16. Tests for `ReadResource` response shaping by `content.type` (`text` / `binary` / `json`)

**Summary:** `ReadResource` builds MCP `contents` from a `switch` on `content.type`. Regressions (e.g. missing `break`) should be caught by tests.

**Where to change:** `typescript/packages/core/src/core/server.ts` (handler); new or extended tests under `typescript/packages/core/src/**/__tests__/` (follow existing layout).

**Acceptance criteria:**
- [ ] Tests for `text`, `binary`, and `json` branches assert `mimeType`, `text` vs `blob`, and JSON stringification of `data` only for `json`.
- [ ] No fall-through to `default` for valid `json` payloads.

**Suggested labels:** `test`, `good first issue`

---

### 17. Expand transport tests for CORS on vs off (Origin validation path)

**Summary:** Middleware behavior differs when `enableCors` is true vs false. Tests should lock that in.

**Where to change:** `typescript/packages/core/src/core/transports/__tests__/transports.test.ts` (and related).

**Acceptance criteria:**
- [ ] With CORS off: invalid `Origin` vs `Host` → 403 (or documented behavior).
- [ ] With CORS on: preflight and headers behave as expected for at least one happy path.

**Suggested labels:** `test`, `security`

---

## Visuals / branding / polish

### 18. Refresh stale header comment in CLI branding module

**Summary:** Top-of-file comment does not match NitroStack branding.

**Where to change:** `typescript/packages/cli/src/ui/branding.ts` — header comment block only.

**Acceptance criteria:**
- [ ] Comment reflects NitroStack (or neutral “NitroStack CLI”) with no outdated org name.

**Suggested labels:** `chore`, `good first issue`

---

### 19. Gate or remove debug `console.log` in `WidgetLayout` for production builds

**Summary:** Widget layout logs in production pollute host devtools.

**Where to change:** `typescript/packages/widgets/src/runtime/WidgetLayout.tsx`.

**Acceptance criteria:**
- [ ] Logs only in dev or behind `NITROSTACK_WIDGET_DEBUG` (or similar).

**Suggested labels:** `widgets`, `dx`, `good first issue`

---

### 20. Align Streamable HTTP docs page branding with NitroStack (CSS + assets)

**Summary:** The **bundled** HTML docs page still says “NitroCloud” in CSS variables and image alt text.

**Where to change:** `typescript/packages/core/src/core/transports/streamable-http.ts` — `generateDocumentationPage` inline CSS and logo `alt`.

**Acceptance criteria:**
- [ ] Rename `--nitrocloud-*` to `--nitrostack-*` or `--brand-*`; update logo `alt` to NitroStack.
- [ ] Optional: align primary hex with CLI `branding.ts`.

**Suggested labels:** `visuals`, `good first issue`

---

### 21. Polish dark mode and motion on the bundled MCP documentation page

**Summary:** Dark mode tweaks inner variables but the page `body` keeps a bright gradient; animations ignore reduced motion.

**Where to change:** `typescript/packages/core/src/core/transports/streamable-http.ts` — `<style>` inside `generateDocumentationPage`.

**Acceptance criteria:**
- [ ] `body` background respects `prefers-color-scheme: dark` (or equivalent) without killing light mode.
- [ ] `@media (prefers-reduced-motion: reduce)` disables non-essential transforms/transitions on `.tool-card` and similar.

**Suggested labels:** `visuals`, `accessibility`, `good first issue`

---

### 22. Improve focus visibility and semantics on the bundled MCP docs page

**Summary:** The **server-generated** MCP documentation HTML (served by core over HTTP) needs keyboard focus styles and sensible headings—not the CLI widget templates.

**Where to change (required):** `typescript/packages/core/src/core/transports/streamable-http.ts` — inside `generateDocumentationPage`, add rules to the inline `<style>` block and adjust markup only if needed for semantics.

**Explicitly out of scope for this issue:** Styling **scaffolded** apps under `typescript/packages/cli/templates/**` (e.g. `typescript-oauth`, `typescript-starter` widget `globals.css`). Those are separate apps; improving them is welcome as **a different issue** or PR without closing this one.

**Background:** Footer links (`<a href="https://nitrostack.ai">`) and collapsible tool schemas (`<details><summary>`) rely on browser default focus rings, which are inconsistent. Section titles use leading emoji (`<h2>🛠️ Available Tools</h2>`); ensure heading levels remain a logical outline (emoji as decorative, not a substitute for `h2`).

**Acceptance criteria:**
- [ ] `:focus-visible` styles for `a` and `summary` (and any other interactive controls in that template) with visible outline and offset.
- [ ] Heading hierarchy reviewed: one `h1`, then `h2` for major sections; emoji do not require extra heading levels.
- [ ] Manual check: Tab through the page in Chrome/Firefox and confirm focus is visible on footer link and schema `<summary>`.

**Suggested labels:** `visuals`, `accessibility`, `good first issue`

---

### 23. Optional: tighten emoji / icon consistency in CLI success messages

**Summary:** CLI mixes emoji with box-drawing; some environments render poorly.

**Where to change:** `typescript/packages/cli/src/commands/init.ts`, `dev.ts`, `start.ts`.

**Acceptance criteria:**
- [ ] Either ASCII fallback when `NO_COLOR` is set, or documented “emoji may not render in all terminals.”

**Suggested labels:** `visuals`, `dx`, `discussion`

---

## Ecosystem / advanced (not “first issue” unless scoped small)

### 24. Redis (or pluggable) backend example for `@RateLimit` storage

**Summary:** In-memory rate limits do not coordinate across processes or hosts.

**Where to change:** Documentation and/or example code referencing `typescript/packages/core/src/core/decorators/rate-limit.decorator.ts` and `RateLimitStorage` interface.

**Acceptance criteria:**
- [ ] Runnable or copy-paste example implementing `RateLimitStorage` with Redis (or link to a small package).

**Suggested labels:** `enhancement`, `documentation`

---

### 25. `nitrostack generate` — implement or clearly scope stub generators

**Summary:** Some generator paths are TODO stubs or placeholder descriptions.

**Where to change:** `typescript/packages/cli/src/commands/generate.ts`.

**Acceptance criteria:**
- [ ] Either working generators **or** explicit “not implemented” error with link to docs **or** checklist in README listing supported `generate` types.

**Suggested labels:** `dx`, `cli`, `discussion`

---

## Maintainer checklist before publishing

- [ ] Confirm each item still applies on current `main`.
- [ ] For GitHub: paste the **Summary / Where to change / Acceptance criteria** sections into the issue body (you can drop “Suggested labels” from the body and apply labels in the UI).
- [ ] Issue **22** is easy to mis-target—keep the **out of scope** paragraph when syncing to GitHub issue #24 (or equivalent).

---

*This file is maintained in-repo; GitHub issue bodies may drift—prefer editing here then updating GitHub.*

---

## Appendix: Reply template for PRs that fix the wrong package (e.g. OAuth `globals.css` vs issue #22)

Use this tone on the contributor’s PR (adjust names/URLs):

> Thanks for working on keyboard focus — the `:focus-visible` rules you added are a solid improvement for the **OAuth widget template** (`globals.css`).
>
> **Heads-up:** GitHub issue #24 is scoped to the **bundled MCP documentation page** generated in **`typescript/packages/core/src/core/transports/streamable-http.ts`** (`generateDocumentationPage`), not the CLI templates under `typescript/packages/cli/templates/...`. We’ve expanded the issue description so the target file is explicit.
>
> **Next steps:**  
> - If you’d like #24 closed as intended, could you add the same kind of `:focus-visible` (and any heading tweaks) to the **inline `<style>`** in `streamable-http.ts`?  
> - Alternatively, we can merge your PR as a **template-only** a11y fix and **remove “Closes #24”** so that issue stays open until the core HTML page is updated.
>
> Either way, we appreciate the contribution — happy to re-review quickly once you pick a path.
