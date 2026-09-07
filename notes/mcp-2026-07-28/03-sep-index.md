# MCP 2026-07-28 SEP index

> Blog-source notes. One row per change: what the SEP does → where NitroStack
> implements it → what it means for a NitroStack user. See
> [`01-protocol-changes.md`](./01-protocol-changes.md) and
> [`02-nitrostack-changes.md`](./02-nitrostack-changes.md) for prose.
>
> **User impact legend:** _none_ = works with no code change; _opt-in_ =
> available on both eras once you use it; _2026-only_ = active on the modern
> path.

## Stateless core

| SEP | Spec change | NitroStack file(s) | User impact |
| --- | --- | --- | --- |
| [2575](https://github.com/modelcontextprotocol/modelcontextprotocol/pull/2575) | No `initialize`/`initialized`; per-request `_meta` envelope (`protocolVersion`, `clientCapabilities`, `clientInfo`); new `server/discover`. | `protocol/modern-v2.adapter.ts` (envelope → `ExecutionContext`), `auth/middleware.ts` (discover bypass) | 2026-only; `ExecutionContext.protocolVersion/clientInfo/clientCapabilities` become available |
| [2567](https://github.com/modelcontextprotocol/modelcontextprotocol/pull/2567) | No `Mcp-Session-Id`; any instance serves any request. | `protocol/modern-v2.adapter.ts` (`createMcpHandler`, fresh server per request), `transports/streamable-http.ts` | 2026-only; multi-instance deployments need explicit handles, not sessions |
| [2260](https://github.com/modelcontextprotocol/modelcontextprotocol/pull/2260) | Server→client requests only while a client request is in flight. | enforced by v2 engine; NitroStack elicitation runs inside handlers only | 2026-only; none for users |
| [2322](https://github.com/modelcontextprotocol/modelcontextprotocol/pull/2322) | Multi-round-trip `input_required` + opaque `requestState`; client retries with `inputResponses`. | `protocol/features/mrtr.ts`, adapter `runTool`, `ExecutionContext.requestState/inputResponses` | opt-in via `inputRequired()` / `acceptedContent()`; guarded on 2025 |
| [2243](https://github.com/modelcontextprotocol/modelcontextprotocol/pull/2243) | Required `MCP-Protocol-Version` / `Mcp-Method` / `Mcp-Name` headers, optional `Mcp-Param-*`; mismatch → `-32020`. | `transports/streamable-http.ts` (CORS allow-list), v2 engine validation | 2026-only; none (transport concern) |
| [2549](https://github.com/modelcontextprotocol/modelcontextprotocol/pull/2549) | `ttlMs` + `cacheScope` on list/read/discover results. | `protocol/features/cache-hints.ts`, `tool.ts`, `resource.ts`, `builders.ts` | opt-in via `@Cache({ ttl })` / resource `cacheMaxAge` |
| [414](https://github.com/modelcontextprotocol/modelcontextprotocol/pull/414) | W3C Trace Context (`traceparent`/`tracestate`/`baggage`) in `_meta`. | `protocol/features/trace-context.ts`, `ExecutionContext.trace` | 2026-only; read `ctx.trace` if you want correlation |
| [2164](https://github.com/modelcontextprotocol/modelcontextprotocol/pull/2164) | Missing resource → `-32602` (was `-32002`). | `protocol/features/errors.ts`, adapter `readResource` mapping | 2026-only; none (error code) |

## Extensions, Apps, Tasks

| SEP | Spec change | NitroStack file(s) | User impact |
| --- | --- | --- | --- |
| [2133](https://github.com/modelcontextprotocol/modelcontextprotocol/pull/2133) | Capabilities become named, versioned extensions on `server/discover`. | `protocol/features/extensions.ts`, adapter `advertisedExtensions()` | 2026-only; declare extras via `@McpApp({ extensions })` |
| MCP Apps | `io.modelcontextprotocol/app`: prefetchable sandboxed UI templates; tool calls still via `tools/call`. | `widget-mcp-meta.ts`, `app-mode.ts`, adapter UI `_meta` alignment | none; `@Widget` / `useWidgetSDK` unchanged |
| [2663](https://github.com/modelcontextprotocol/modelcontextprotocol/pull/2663) | Tasks → extension: server-directed handle, `tasks/get`/`update`/`cancel`, no `tasks/list`/`result`. | `task.ts` (`context.task.update`), adapter tasks handling | opt-in via `@Tool({ taskSupport })`; 2025 experimental Tasks kept on legacy |

## Schema

| SEP | Spec change | NitroStack file(s) | User impact |
| --- | --- | --- | --- |
| [2106](https://github.com/modelcontextprotocol/modelcontextprotocol/pull/2106) | Full JSON Schema 2020-12: composition + `$ref`/`$defs`, unrestricted output, object input root. | `protocol/features/schema.ts`, adapter `toModernSchema` (Zod v3 → JSON Schema → `fromJsonSchema`) | 2026-only; richer tool schemas survive; none required |

## Authorization hardening

| SEP | Spec change | NitroStack file(s) | User impact |
| --- | --- | --- | --- |
| [2468](https://github.com/modelcontextprotocol/modelcontextprotocol/pull/2468) | Validate `iss` on the authorization response (RFC 9207). | `auth/client.ts` (`validateAuthorizationIssuer`) | opt-in; hardening for OAuth clients |
| [837](https://github.com/modelcontextprotocol/modelcontextprotocol/pull/837) | DCR `application_type` (`native` for loopback redirects). | `auth/client.ts` (`registerClient`, `isLoopbackRedirect`), `auth/types.ts` | opt-in; CLI/desktop redirects accepted |
| [2352](https://github.com/modelcontextprotocol/modelcontextprotocol/pull/2352) | Bind stored credentials to the issuing `issuer`; re-auth on AS migration. | `auth/token-store.ts` (`getIssuerBoundToken`, `tokenResponseToStored`), `auth/types.ts` | opt-in |
| [2207](https://github.com/modelcontextprotocol/modelcontextprotocol/pull/2207) | OIDC refresh (`offline_access` / `prompt=consent`). | `auth/client.ts` (`startAuthorizationFlow({ prompt })`) | opt-in |
| [2350](https://github.com/modelcontextprotocol/modelcontextprotocol/pull/2350) | Scope step-up / insufficient-scope handling. | `auth/middleware.ts`, token validation | opt-in |
| [2351](https://github.com/modelcontextprotocol/modelcontextprotocol/pull/2351) | Correct `.well-known` suffix insertion for path-component issuers. | `auth/server-metadata.ts` (audited) | none |
| Final: CIMD | DCR deprecated in favor of Client ID Metadata Documents. | `auth/cimd.ts`, `auth/index.ts`; `oauth-module.ts` (`enableClientRegistration` marked deprecated) | opt-in; DCR still works |

## Deprecations

| SEP | Spec change | NitroStack file(s) | User impact |
| --- | --- | --- | --- |
| [2577](https://github.com/modelcontextprotocol/modelcontextprotocol/pull/2577) | Roots, Sampling, MCP `logging/setLevel` deprecated. | not implemented in NitroStack (not added as features); documented replacements | none — use tool params/resource URIs (roots), host LLM APIs (sampling), OpenTelemetry / server logging (logging) |

## Selection / packaging (NitroStack-specific)

| Item | NitroStack file(s) | User impact |
| --- | --- | --- |
| Protocol selector (`NITRO_MCP_PROTOCOL_VERSION` / `protocolVersion`) | `protocol/version.ts`, `server.ts`, `types.ts` (`McpServerConfig.protocolVersion`) | default unset = auto (dual modern stateless + legacy fallback) |
| Protocol adapter contract | `protocol/adapter.ts` | none (internal) |
| v2 engine deps (`@modelcontextprotocol/server`, `@modelcontextprotocol/node`) | `package.json`; lazily imported | none; not loaded on default installs |

## Reference constants (from the reference TypeScript SDK v2)

- `MODERN_WIRE_REVISION` / `FIRST_MODERN_PROTOCOL_VERSION` = `2026-07-28`.
- `LATEST_PROTOCOL_VERSION` (latest *legacy* handshake) = `2025-11-25`.
- Envelope `_meta` keys are camelCase reverse-DNS:
  `io.modelcontextprotocol/protocolVersion`,
  `io.modelcontextprotocol/clientCapabilities`,
  `io.modelcontextprotocol/clientInfo`,
  `io.modelcontextprotocol/serverInfo`.
- Required envelope keys: `protocolVersion` **and** `clientCapabilities`.
- Trace keys are bare: `traceparent`, `tracestate`, `baggage`.
