# MCP 2026-07-28: what changed in the protocol

> Blog-source notes. Protocol-only narrative — no NitroStack specifics here (see
> [`02-nitrostack-changes.md`](./02-nitrostack-changes.md) for the SDK work and
> [`03-sep-index.md`](./03-sep-index.md) for the per-SEP index).
>
> Sources: the [2026-07-28 release candidate post](https://blog.modelcontextprotocol.io/posts/2026-07-28-release-candidate/),
> the [final release post](https://blog.modelcontextprotocol.io/posts/2026-07-28/),
> and the [specification changelog](https://modelcontextprotocol.io/specification/2026-07-28/changelog).

## TL;DR

2026-07-28 is the largest revision of MCP since the protocol launched. It makes
the protocol **stateless by default**, deletes the `initialize` handshake and
session IDs, and reorganizes optional capabilities into **independently
versioned extensions**. Along the way it hardens authorization, adopts full
**JSON Schema 2020-12** for tool schemas, formalizes **multi-round-trip
requests** for server→client input, and deprecates Roots, Sampling, and MCP
logging.

The headline for implementers: a 2026 server can be a plain, horizontally
scalable HTTP handler. Any replica can answer any request because there is no
per-connection state to pin.

## 1. The handshake is gone: `initialize` → `server/discover`

**2025-era.** A client opened a session by POSTing `initialize`, the server
replied with negotiated `protocolVersion` + capabilities, the client sent
`notifications/initialized`, and every subsequent request rode the same session
(identified by an `Mcp-Session-Id` header on Streamable HTTP).

**2026-07-28.** There is no `initialize` and no `initialized`. Capability
discovery is a single, optional, **cacheable** `server/discover` call. Servers
advertise their identity, capabilities, and negotiated **extensions** there —
but a client may skip it entirely and go straight to `tools/list` or
`tools/call`.

Because discovery is just another request, it caches like one and never has to
be repeated per connection.

## 2. Stateless core: no sessions, no `Mcp-Session-Id`

Every 2026 request is self-describing. Instead of relying on a session
established at `initialize` time, each request carries a small **per-request
envelope** in its `_meta`:

| envelope key | meaning |
| --- | --- |
| `io.modelcontextprotocol/protocolVersion` | the revision this request speaks (required) |
| `io.modelcontextprotocol/clientCapabilities` | what the client can do (required) |
| `io.modelcontextprotocol/clientInfo` | client name/version (optional) |

> Note the camelCase reverse-DNS keys — this trips people up. The reference
> TypeScript SDK exports them as `PROTOCOL_VERSION_META_KEY`,
> `CLIENT_CAPABILITIES_META_KEY`, `CLIENT_INFO_META_KEY`.

The transport-level effect: **no server-issued session id**, and any instance
behind a load balancer can serve any request. Application state that used to be
implied by a session is now explicit — passed as tool parameters, encoded in
resource URIs, or stored behind an application-owned handle (the same pattern
any stateless HTTP API uses).

## 3. Required request headers (SEP-2243)

Streamable HTTP requests now carry standard headers that must agree with the
body, so proxies and gateways can route/observe MCP traffic without parsing
JSON-RPC:

- `MCP-Protocol-Version` — cross-checked against the body's envelope claim.
- `Mcp-Method` — the JSON-RPC method; must equal the body's `method`.
- `Mcp-Name` — the primary target name (e.g. the tool name on `tools/call`, the
  URI on `resources/read`).
- `Mcp-Param-*` — optional, populated from `x-mcp-header` declarations in a
  tool's input schema.

**If a header disagrees with the body, the request is rejected with `-32020`**
(a header/body mismatch). In practice this means a `tools/call` without an
`Mcp-Name` header, or an `Mcp-Method` header that names a different method than
the body, is a hard 400 — before the tool ever runs.

## 4. Multi Round-Trip Requests (MRTR) replace push elicitation (SEP-2322)

Stateless HTTP has no persistent channel for a server to "call back" to a
client mid-request. So server→client interactions (elicitation, sampling) are
reframed as **multi round-trip requests**:

1. A handler that needs more input returns an `input_required` result carrying
   `inputRequests` and an **opaque `requestState`** (everything it needs to
   resume — the server keeps nothing).
2. The client gathers the answers and **re-invokes the same request**, echoing
   `requestState` and attaching `inputResponses`.
3. The handler reads the answers and continues (or asks again).

Server→client requests are only legal while a client request is in flight
(SEP-2260), which falls out naturally from this model.

## 5. Caching hints (SEP-2549)

Results that are safe to cache now say so. `tools/list`, `prompts/list`,
`resources/list`, `resources/templates/list`, `resources/read`, and
`server/discover` can carry:

- `ttlMs` — freshness lifetime in milliseconds.
- `cacheScope` — `public` (shared caches may store it) or `private`.

This is what makes "skip discovery, cache the tool list" safe and standardized
rather than a client-by-client guess.

## 6. W3C Trace Context (SEP-414)

Distributed-tracing keys travel in `_meta` under their standard names:
`traceparent`, `tracestate`, `baggage`. A server can correlate a tool call
across the host, itself, and any downstream service without MCP inventing a
tracing backend.

## 7. Extensions become first-class (SEP-2133)

Capabilities that used to be baked into the core spec are now **named,
independently versioned extensions** advertised in `server/discover`:

- `io.modelcontextprotocol/app` — **MCP Apps**: prefetchable, sandboxed UI
  templates. Tool calls still flow through `tools/call`; the UI is just a
  template the host renders.
- `io.modelcontextprotocol/tasks` — the **Tasks** extension (below).

New extensions can ship and version on their own cadence instead of forcing a
whole-protocol revision.

## 8. Tasks graduate to an extension (SEP-2663)

The experimental 2025 Tasks vocabulary (`tasks/list`, `tasks/result`, a
client-augmented `task: {}` param) is replaced by a proper extension:

- Task creation can be **server-directed**: if the client advertised the tasks
  extension and a tool is task-capable, the server may return a task handle from
  `tools/call` without the client asking.
- The client drives with `tasks/get`, **`tasks/update`** (new — supersedes the
  ad-hoc mid-task input request), and `tasks/cancel`.
- `tasks/list` and `tasks/result` are **removed**; era-mismatched task methods
  answer `-32601`.

## 9. Full JSON Schema 2020-12 for tools (SEP-2106)

2025-era tool schemas were effectively JSON Schema draft-7 with composition
stripped and a forced `type: "object"` root. 2026 lifts this to full **JSON
Schema 2020-12**:

- Input keeps an object root but may now use `oneOf`/`anyOf`/`allOf`,
  conditionals, and `$ref`/`$defs`.
- Output schemas are **unrestricted** (not forced to an object).
- `structuredContent` may be any JSON value.

Implementations should bound schema depth/validation time and must not
auto-dereference external `$ref` URIs.

## 10. Authorization hardening

Six SEPs plus the final-spec CIMD change tighten the OAuth story:

- **RFC 9207 `iss` validation (SEP-2468).** Clients must verify the `iss`
  parameter on the authorization response to defend against mix-up attacks.
- **`application_type` on DCR (SEP-837).** Native/CLI clients declare
  `application_type: native` so loopback (`localhost`) redirects are accepted.
- **Issuer-bound credentials (SEP-2352).** Stored tokens are bound to the
  issuing authorization server; if a resource migrates to a new AS, old
  credentials are not reused.
- **OIDC refresh tokens (SEP-2207).** Documented `offline_access` /
  `prompt=consent` handling for OIDC-style authorization servers.
- **Scope step-up (SEP-2350).** Incremental scope accumulation and
  insufficient-scope handling.
- **`.well-known` suffix insertion (SEP-2351).** Correct metadata URL
  construction for issuers that carry a path component.
- **CIMD (final spec).** **Dynamic Client Registration is deprecated** in favor
  of **Client ID Metadata Documents**: the client's `client_id` is an HTTPS URL
  that resolves to its metadata document, so authorization servers fetch it
  instead of running a registration endpoint. DCR remains for backward
  compatibility.

Discovery-style methods (like `server/discover`) are unauthenticated, just as
`initialize` was; `tools/call` is not.

## 11. Missing-resource error changes (SEP-2164)

`resources/read` on an unknown URI now returns **`-32602` (Invalid Params)**
instead of the 2025-era `-32002` (Resource Not Found). It is treated as a bad
parameter, not a distinct resource-layer error.

## 12. Deprecations (SEP-2577)

**Roots, Sampling, and MCP `logging/setLevel` are deprecated.** Recommended
replacements:

- Roots → pass paths/URIs as tool parameters or resource URIs.
- Sampling → the host application's own LLM APIs.
- MCP logging → standard server logging / OpenTelemetry.

## 2025 vs 2026 at a glance

| Concern | 2025-era (`2025-06-18`) | 2026-07-28 |
| --- | --- | --- |
| Handshake | `initialize` + `initialized` | none; optional `server/discover` |
| Sessions | `Mcp-Session-Id`, sticky | stateless; no session id |
| Server→client input | push over the session stream | multi-round-trip `input_required` + `requestState` |
| Request headers | `Mcp-Session-Id` | `MCP-Protocol-Version`, `Mcp-Method`, `Mcp-Name`, `Mcp-Param-*` |
| Caching | ad hoc | `ttlMs` + `cacheScope` on list/read/discover |
| Tracing | none standardized | W3C `traceparent`/`tracestate`/`baggage` in `_meta` |
| Capabilities | fixed in core | named, versioned **extensions** |
| Tasks | experimental (`tasks/list`, `tasks/result`) | `io.modelcontextprotocol/tasks` (`get`/`update`/`cancel`) |
| Tool schema | draft-7, composition stripped, object-only | JSON Schema 2020-12, composition + `$defs`, unrestricted output |
| Missing resource | `-32002` | `-32602` |
| Client registration | DCR (RFC 7591) | CIMD (DCR deprecated) |
| Roots / Sampling / MCP logging | present | deprecated |

## How the protocol will evolve

Making capabilities into versioned extensions is the structural bet: the core
wire can stay small and stable while extensions (Apps, Tasks, and future ones)
iterate independently. Combined with a stateless core, that is what lets MCP
servers be deployed like ordinary web services — behind a load balancer, cached
at the edge, and observed with the same tracing and gateway tooling as the rest
of a fleet.
