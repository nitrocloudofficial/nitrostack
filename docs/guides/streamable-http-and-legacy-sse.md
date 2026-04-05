# Streamable HTTP and legacy SSE (`/mcp` and `/sse`)

When you run your NitroStack MCP server over HTTP (for example with **`npm run start`** after a build, or **`npm run dev`** in development), the same HTTP port exposes **two complementary ways** for clients to speak MCP over the network:

1. **Streamable HTTP** — the current default path, aligned with the MCP streamable HTTP transport (JSON-RPC over HTTP with optional SSE on the same logical endpoint).
2. **Legacy SDK SSE** — compatibility routes for clients built against the older **`SSEServerTransport`** pattern from `@modelcontextprotocol/sdk`.

The CLI startup summary reflects both:

- **Streamable HTTP:** `http://localhost:<PORT>/mcp` (or your configured `endpoint`)
- **Legacy SDK SSE:** `http://localhost:<PORT>/sse`

The exact host, port, and `/mcp` path come from your `server.start('dual' | 'http', { host, port, endpoint })` options (default endpoint is `/mcp`).

## Streamable HTTP (`/mcp`)

NitroStack uses **`StreamableHttpTransport`**, which mounts MCP on a single configurable path (default **`/mcp`**).

Typical usage:

- **`POST /mcp`** — send JSON-RPC requests to the server (tools, resources, prompts, etc.).
- **`GET /mcp`** — open an **SSE** stream for server-initiated events and session continuity, as defined by the streamable HTTP transport.

The implementation may also expose **compatibility aliases** on the same app (for example **`/mcp/sse`** and **`/mcp/message`**) so older URLs still work. Prefer **`/mcp`** for new integrations.

**Communication model (conceptual):**

1. Client sends JSON-RPC 2.0 messages (e.g. `initialize`, `tools/list`, `tools/call`) via **POST** to the MCP endpoint.
2. Client may hold a **GET** connection to the same endpoint (or the transport’s SSE channel) to receive streamed events and follow the MCP streamable HTTP session rules (including session headers when sessions are enabled).

This is the path used by modern MCP inspectors and HTTP clients that target **streamable HTTP**.

## Legacy SDK SSE (`/sse` + `POST /mcp/messages`)

For clients that still use the classic **HTTP + SSE** split from the TypeScript SDK:

- **`GET /sse`** — opens a **Server-Sent Events** connection. The server creates a **per-session** MCP server instance wired to **`SSEServerTransport`**.
- **`POST /mcp/messages?sessionId=<id>`** — sends JSON-RPC messages for that session. The `sessionId` is issued by the transport when the SSE connection is established.

**Communication model:**

1. Client connects to **`GET /sse`** and reads the event stream.
2. Client obtains a **session id** from the SSE transport (per SDK behavior).
3. Client posts JSON-RPC envelopes to **`/mcp/messages`** with **`sessionId`** as a query parameter.

Each active legacy session runs through the same tool/resource/prompt surface as the main server; NitroStack registers handlers on the session **`McpServer`** the same way as the primary instance.

## STDIO in dual mode

In **`dual`** mode, **STDIO** remains available on the same process: one client can attach via **stdin/stdout** while others use **HTTP**. Legacy SSE and streamable HTTP share the **same Express app** and port as the streamable transport.

## Which URL should I use?

| Client / scenario | Suggested entry |
|-------------------|-----------------|
| MCP Inspector, streamable HTTP, “`/mcp`” URL | `http://<host>:<port>/mcp` |
| Older examples using **`SSEServerTransport`** | `http://<host>:<port>/sse` (plus **`/mcp/messages`** for posts) |
| Local NitroStudio / CLI-spawned STDIO | STDIO (no `/mcp` URL) |

## Configuration reminders

- **Port** is usually set via **`PORT`** or your `start()` options; avoid colliding with NitroStudio (often **3000**) and the widget dev server (often **3001**).
- **`endpoint`** defaults to **`/mcp`**; if you change it, streamable URLs move with it (for example `/api/mcp`). Legacy routes stay **`/sse`** and **`/mcp/messages`** unless you customize the server.
- **Production:** terminate TLS at your reverse proxy and forward to the Node port; clients should use **`https://`**.

## Related documentation

- [Dual transport (STDIO + HTTP)](./dual-transport.md) — high-level dual-mode overview (note: some endpoint names there may predate streamable HTTP; this guide is authoritative for **`/mcp`** vs **`/sse`**).
- [Verify transport](./verify-transport.md)
- [Server concepts](../sdk/typescript/03-server-concepts.md)
