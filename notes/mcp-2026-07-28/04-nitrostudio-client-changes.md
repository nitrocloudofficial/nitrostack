# NitroStudio: MCP 2026-07-28 client support

> Blog-source notes for the **client** side. NitroStudio is the desktop
> inspector (Next.js UI + Tauri/Rust transport). This documents how it learned
> to speak the 2026-07-28 stateless protocol **without breaking any existing
> 2025-era connection**. Companion to [`02-nitrostack-changes.md`](./02-nitrostack-changes.md)
> (server side) and [`03-sep-index.md`](./03-sep-index.md).

## TL;DR

- Studio now **auto-negotiates** the protocol era per connection. It probes
  `server/discover` first; a JSON-RPC result ⇒ modern (2026-07-28 stateless), an
  error/timeout ⇒ fall back to the legacy `initialize` handshake. No user
  toggle, no config.
- Both transports are covered: **STDIO** (negotiated in TypeScript) and **HTTP**
  (negotiated in the Rust/Tauri transport).
- On the modern path Studio drops the `initialize`/`initialized` handshake and
  the `Mcp-Session-Id`, attaches the per-request `_meta` envelope, and (over
  HTTP) mirrors the SEP-2243 routing headers.
- Legacy connections are byte-for-byte unchanged — the modern code only runs
  when a server actually answers `server/discover`.

## Where the real client lives

The production MCP client is **not** the SDK-based `lib/mcp-client.ts` (dead
code — imports a `http-client-transport.ts` that doesn't exist). The live path
is:

```
UI (React) → lib/api.ts (McpManager) → Tauri invoke → src-tauri/src/mcp/*.rs → server
```

- `lib/api.ts` — `McpManager` builds JSON-RPC, logs traffic, injects `_meta`.
- `src-tauri/src/mcp/stdio.rs` — spawns the child process, framed JSON-RPC.
- `src-tauri/src/mcp/http_client.rs` — hand-rolled Streamable-HTTP + legacy
  HTTP+SSE (exists to bypass browser CORS and to spawn processes).

## New shared modules

| File | Purpose |
| --- | --- |
| `nitrostudio/lib/mcp-protocol.ts` | TS source of truth: `ProtocolEra`, version constants, `_meta` key names, SEP-2243 header names, `withModernEnvelope()`, `readNegotiatedServerInfo()`, stateless-version classifier. |
| `nitrostudio/src-tauri/src/mcp/protocol.rs` | Rust mirror: `ProtocolEra`, envelope builder, `discover_request_body()`, `mcp_name_for()` (routing-header value), `name_required()`. |

Both hard-code the same wire contract taken from `@modelcontextprotocol/{server,client}`
v2 (the packages the NitroStack server adapter uses) and
`typescript/packages/core/src/core/protocol/modern-v2.adapter.ts`.

## Change map (SEP → Studio file → behavior)

| SEP / concern | Studio change | Era |
| --- | --- | --- |
| 2575 — no `initialize`; `_meta` envelope; `server/discover` | STDIO: `McpManager.negotiateStdioEra()`/`probeStdioDiscover()` in `lib/api.ts`; HTTP: `try_modern_discover()` in `http_client.rs`. Envelope injected in `McpManager.sendRequest()` (`withModernEnvelope`) for modern requests. | 2026-only |
| 2567 — no `Mcp-Session-Id` | `http_client.rs`: modern branch of `mcp_http_send` skips the session header; `HttpMcpConn.session_id` stays `None`. | 2026-only |
| 2243 — `MCP-Protocol-Version` / `Mcp-Method` / `Mcp-Name` headers | `http_client.rs`: modern branch sets all three; `Mcp-Name` derived from body params via `protocol::mcp_name_for` (`uri` for `resources/read`, `name` for `tools/call`/`prompts/get`, `taskId` for `tasks/*`). | 2026-only (HTTP) |
| 2133 — capabilities as `server/discover` result | `readNegotiatedServerInfo()` maps discover/initialize result → `{ era, protocolVersion, serverInfo, capabilities }` on the connection; surfaced via `api.getProtocolInfo()`. | both |
| 2164 — missing resource `-32602` (was `-32002`) | `executeToolWithRouting` `read_resource` routing already retries on **any** error code, so `-32602` and `-32002` are both handled. | both |
| MCP Apps `io.modelcontextprotocol/app` | `lib/types.ts`: new `getMcpAppResourceUri()` + priority slot in `resolveWidgetUri()`; still resolves `_meta.ui.resourceUri` for existing servers. | both |
| 2663 — Tasks extension | `lib/api.ts`: task-augmented `tools/call` param shape is identical across eras; modern requests get the envelope + `Mcp-Name: <taskId>` automatically. `listTasks()` degrades gracefully (`-32601` ⇒ empty) so update-driven 2026 servers without `tasks/list` don't error the panel. | both |
| 2468 — RFC 9207 `iss` validation | `app/auth/callback/page.tsx`: validates the authorization-response `iss` against the AS `issuer` when present or when the AS advertises `authorization_response_iss_parameter_supported`. | opt-in (gated) |
| 2351 — path-aware `.well-known` | `lib/oauth-helper.ts`: `buildWellKnownUrl()` inserts the suffix **between host and path** (RFC 8414 §3.1 / RFC 9728 §3.1); PRM discovery tries path-aware then root. Root issuers unchanged. | both |
| CIMD | `lib/oauth-helper.ts`: `supportsClientIdMetadataDocument()` detection helper. Full CIMD needs Studio to host a client-metadata document, so DCR remains the default (opt-in, non-breaking). | opt-in |

## Auto-negotiation flow

**STDIO** (`connectToProject`, `connectToStdioServer`):

1. Spawn process, wait for startup.
2. `negotiateStdioEra()` sends `server/discover` (with envelope) — bounded retry
   for process warm-up. Result ⇒ `modern`; JSON-RPC error ⇒ `legacy`; transport
   error ⇒ retry.
3. `modern` ⇒ skip `initialize`; start hot-reload watcher; done.
   `legacy` ⇒ existing `initialize` + `notifications/initialized` retry loop.

**HTTP** (`mcp_connect_http`):

1. `try_modern_discover()` POSTs `server/discover` with the modern headers,
   accepts `application/json` or `text/event-stream`.
2. Success ⇒ store `era = Modern`, return `{ transport: "streamable-2026",
   era: "modern", protocolVersion }`.
3. Otherwise fall through to the unchanged Streamable-HTTP `initialize`, then
   legacy HTTP+SSE.

`McpManager.connect()` records `era`/`protocolVersion`/`negotiated` on the
`McpConnection`; `sendRequest()` then injects the envelope for modern requests
only.

## UI surfacing

- **Health** (`app/health/page.tsx`): `ProtocolBadge` shows negotiated era,
  version, server info, and capability/extension keys.
- **Settings** (`app/settings/page.tsx`): Runtime Configuration gains an "MCP
  Protocol" row (era + version).
- **Logs** (`app/logs/page.tsx`): each traffic entry carries an era chip
  (`2025`/`2026`); `traffic-log-store.ts` gained an `era` field.

## Non-breaking guarantees

- Modern code paths execute only after a server answers `server/discover`.
- `era` defaults to `legacy`; the envelope, modern headers, and session-drop are
  all gated on `era === 'modern'`.
- OAuth: `iss` is only enforced when returned/advertised; `.well-known` stays
  identical for root issuers; DCR is still the default.

## Not done / follow-ups

- Full CIMD (requires hosting a client-metadata document from Studio).
- 2026 server→client MRTR `input_required` prompting in the Studio UI (server
  supports it; Studio still treats tool calls as single round-trip).
