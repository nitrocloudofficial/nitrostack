# MCP 2026-07-28 in NitroStack: what we changed

> Blog-source notes. This covers the NitroStack package work; see
> [`01-protocol-changes.md`](./01-protocol-changes.md) for the protocol narrative
> and [`03-sep-index.md`](./03-sep-index.md) for the per-SEP index.

## The core promise: opt in, don't break

NitroStack is a framework on top of the Model Context Protocol. A protocol
revision this large could have forced every NitroStack app to migrate. It
doesn't. The design goal was: **implement all of 2026-07-28 without changing the
code NitroStack users write.**

We got there with a **dual-adapter** architecture and a single switch.

### The switch

```bash
# default (unset) — today's 2025-era sessionful behavior, byte-for-byte
# 2026-07-28 only:
NITRO_MCP_PROTOCOL_VERSION=2026-07-28
# both eras from one process (for validation against mixed clients):
NITRO_MCP_PROTOCOL_VERSION=auto
```

Accepted values (case-insensitive): `2026-07-28` / `2026` / `modern` /
`latest` → modern; `auto` / `both` / `dual` → auto; `2025-06-18` /
`2025-11-25` / `2025` / `legacy` / unset / anything unrecognized → legacy.

The same value is accepted on `@McpApp({ protocolVersion })` /
`McpServerConfig.protocolVersion`. **Env wins over config** so ops can flip a
deployed app without a code change. Flipping the eventual default is a one-line
change in the selector.

## Architecture: one registry, two adapters

NitroStack keeps owning the registry (tools, resources, prompts, tasks, widgets,
auth). What changes is the wire underneath:

```
@Tool / @Resource / @Prompt / @Widget / @McpApp   ← user code (unchanged)
                    │
          NitroStack registry
                    │
        protocol selector (env / config)
          │                        │
   legacy adapter            modern adapter
   (@modelcontextprotocol      (@modelcontextprotocol/server v2
    /sdk v1, sessionful)         createMcpHandler + serveStdio, stateless)
```

- **`protocol/version.ts`** — resolves the era (`legacy` | `modern` | `auto`).
- **`protocol/adapter.ts`** — the `ProtocolRegistry` (read-only view of the
  registry the adapters consume) and `ProtocolAdapter` contract. The adapters
  never import NitroStack decorators or DI.
- **`protocol/modern-v2.adapter.ts`** — binds the registry to the official v2
  engine (`@modelcontextprotocol/server` + `@modelcontextprotocol/node`).
- **`protocol/features/`** — the era-specific mappings (cache hints, MRTR, trace
  context, schema, extensions, errors).

The v2 packages are **loaded lazily** (dynamic `import`) only when the era is
`modern` or `auto`, so a default install keeps today's import graph and existing
Jest suites never touch v2.

The legacy path is unchanged: NitroStack still constructs its v1 `McpServer`, and
the sessionful Streamable HTTP stack (`Mcp-Session-Id`, `MCP_MAX_SESSIONS`,
session reaping) stays exactly as it was.

## What NitroStack users do NOT change

- `@Tool`, `@Resource`, `@Prompt`, `@Widget`, `@McpApp`, guards, pipes,
  interceptors, exception filters, DI — all identical.
- `ExecutionContext` gains **optional** fields; existing handlers ignore them.
- `@Cache({ ttl })` and resource `metadata.cacheable` already exist; on 2026
  they additionally populate cache hints.

That's the whole point: a NitroStack app boots on 2026 without a code edit.

## What we added (additive only)

### `ExecutionContext` extensions

New optional fields, populated only on the modern path:

- `protocolVersion` — the request's negotiated revision.
- `clientInfo`, `clientCapabilities` — from the per-request envelope.
- `requestState`, `inputResponses` — for MRTR (below).
- `trace` — W3C Trace Context (`traceparent` / `tracestate` / `baggage`).

### MRTR helpers (`protocol/features/mrtr.ts`)

Handlers are written **once** and work on both eras:

```ts
import { inputRequired, acceptedContent } from '@nitrostack/core';

async handler(input, ctx) {
  const confirmed = acceptedContent<boolean>(ctx.inputResponses, 'confirm');
  if (confirmed === undefined) {
    return inputRequired({
      requests: [{ id: 'confirm', message: 'Delete all rows?', schema: { type: 'boolean' } }],
      requestState: { table: input.table },
    });
  }
  // ...continue with confirmed answer
}
```

On 2026 the modern adapter translates this into the SDK's real
`input_required` result. On 2025, returning `inputRequired(...)` is guarded and
fails fast with guidance (push-style elicitation is not wired on the legacy
path), so you don't ship a handler that silently misbehaves.

### Cache hints (`protocol/features/cache-hints.ts`)

`@Cache({ ttl })` (seconds) → tool cache hint `{ ttlMs, cacheScope: 'private' }`.
Resource `metadata.cacheMaxAge` → resource `resources/read` cache hint. Explicit
`cacheHint` on a tool/resource wins.

### Extensions map (`protocol/features/extensions.ts`)

Derived from what the app registered and advertised on `server/discover`:

- `io.modelcontextprotocol/app` when any tool ships a `@Widget` / UI component.
- `io.modelcontextprotocol/tasks` when any tool declares `taskSupport`.
- App authors can declare extra extensions via `@McpApp({ extensions })`.

`@Widget` / `useWidgetSDK` are untouched; on 2026 the adapter aligns the widget
metadata with the official MCP Apps extension id.

### Tasks

`@Tool({ taskSupport })`, `context.task.updateProgress()`, and
`throwIfCancelled()` stay. We added `context.task.update(...)` to mirror the
2026 `tasks/update`. The experimental 2025 Tasks API remains on the legacy
adapter; the 2026 path uses the extension lifecycle and does not expose
`tasks/list` / `tasks/result`.

### Authorization

All additive; required for 2026-conformant auth, available on both eras once
enabled:

- `OAuth2Client.validateAuthorizationIssuer()` — RFC 9207 `iss` check.
- `OAuth2Client.registerClient()` infers `application_type` (`native` for
  loopback redirects); `OAuth2Client.isLoopbackRedirect()` helper.
- `tokenResponseToStored(..., issuer)` + `getIssuerBoundToken()` — issuer-bound
  credentials (drops and re-authorizes when the AS migrates).
- `startAuthorizationFlow({ prompt })` — OIDC refresh (`prompt=consent`).
- `auth/cimd.ts` — Client ID Metadata Documents: create / validate / resolve /
  detect. `OAuthModule.enableClientRegistration` (DCR) stays but is marked
  deprecated for 2026.
- Auth middleware bypasses `server/discover` (and list methods) the way it used
  to bypass `initialize`; `tools/call` is never bypassed.

### Transport / notifications

- `StreamableHttpTransport` can route `/mcp` to the modern stateless handler,
  reports the active protocol label on `/mcp/health`, and its CORS allow-list
  includes the new `MCP-Protocol-Version` / `Mcp-Method` / `Mcp-Name` /
  `Mcp-Param-*` headers.
- 2026 `list_changed` / `resources/updated` are published through the v2
  `subscriptions/listen` notify bus; 2025 unsolicited notifications are
  unchanged.

## Three real bugs the 2026 test suite caught

Worth calling out because they'd have been silent breakage on the modern path:

1. **`_meta` envelope keys are camelCase.** The reference SDK uses
   `io.modelcontextprotocol/protocolVersion` (not `.../protocol-version`).
   Our first cut read hyphenated keys and never populated `clientInfo` /
   `clientCapabilities` in `ExecutionContext`.
2. **Zod v3 is not ingestible by the v2 SDK.** The SDK only accepts Zod ≥ 4.2.0
   or a `fromJsonSchema(...)`-wrapped JSON Schema. NitroStack ships Zod v3, so
   the adapter now always converts tool schemas to JSON Schema 2020-12 and wraps
   them with `fromJsonSchema` before registering — otherwise every `tools/list`
   failed with `-32603`.
3. **SEP-2164 error code wasn't wired for resource reads.** A handler throwing
   NitroStack's `ResourceNotFoundError` was surfacing as `-32603`; the adapter
   now maps it to `-32602` via the SDK error classes.

## Migration recipe (for when the default flips)

1. Validate under `NITRO_MCP_PROTOCOL_VERSION=auto` against your real clients —
   one endpoint serves both a 2025 `initialize` and a 2026 `server/discover`.
2. Move to `NITRO_MCP_PROTOCOL_VERSION=2026-07-28` and confirm tools, resources,
   prompts, widgets, and auth behave.
3. Adopt the additive APIs where useful: `inputRequired()` for confirmations,
   `context.task.update()` for long tasks, cache hints via `@Cache`.
4. When the ecosystem has moved, flip the selector default to `modern` — a
   one-line change; no user code edits required.

## Tests

- Every existing Jest suite stays green **without** the env var (default
  legacy).
- A parallel `__tests__/protocol-2026/` suite covers the selector, feature
  mappings (cache/schema/trace/extensions/errors/MRTR), auth hardening, and an
  end-to-end run driving the real v2 `createMcpHandler` `fetch` handler:
  stateless `tools/list` (no `Mcp-Session-Id`), `server/discover`, `_meta` →
  `ExecutionContext`, SEP-2164 `-32602`, SEP-2243 header rejection (`-32020`),
  and `auto` mode serving both a 2025 `initialize` and a 2026 discover on one
  handler.
