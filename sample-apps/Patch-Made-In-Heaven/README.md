# Patch Made In Heaven

Execution-Verified AI Agent Memory and Search Platform

Track: Enterprise AI and Workplace Automation, Nitrostack Hackathon

**Live deployment:**

| Component | URL |
| :--- | :--- |
| MCP Server (Streamable HTTP) | `https://patch-made-in-works-on-my-machine-amrita-university-coimbatore.app.nitrocloud.ai/mcp` |
| Web Dashboard | `https://patch-made-in-heaven.vercel.app/` |

## System Architecture

```
+-----------------------------------------------------------------------------------+
|                                    AI Agent                                       |
+-----------------------------------------------------------------------------------+
                                         |
                                         | Model Context Protocol (MCP)
                                         v
+-----------------------------------------------------------------------------------+
|                              NitroStack MCP Server                                |
|                                                                                   |
|  +--------------------+  +---------------------+  +----------------------------+  |
|  |    Search Tools    |  |   Retrieval Tools   |  |  Verification & Submission |  |
|  |                    |  |                     |  |                            |  |
|  | - search_fix       |  | - get_patch        |  | - verify_fix               |  |
|  | - find_similar     |  | - get_execution_log |  | - submit_fix               |  |
|  +---------+----------+  +----------+----------+  +-------------+--------------+  |
+------------|------------------------|---------------------------|-----------------+
             |                        |                           |
             | Hybrid Search /        | Fetch Patch /             | Isolated
             | Vector Embeddings      | Execution Logs            | Sandbox Run
             v                        v                           v
+-----------------------+  +---------------------+  +-------------------------------+
|  Elasticsearch Engine |  |  OpenRouter API     |  |   Docker Sandbox Container    |
|                       |  |                     |  |                               |
| - BM25 Lexical Index  |  | - Vector Embedding  |  | - Isolated Execution          |
| - Knowledge Cards     |  |   Generation        |  | - Captured Stdout/Stderr Logs |
| - Verification Runs   |  |                     |  | - Exit Code & Digest Matching |
+-----------------------+  +---------------------+  +-------------------------------+
```

## System Overview

Patch Made In Heaven is a persistent memory and search infrastructure designed for artificial intelligence coding agents. It provides a shared knowledge repository of execution-verified software patches exposed through standard Model Context Protocol tools.

The platform prevents unverified indexing by requiring server-owned verification runs. Patches are indexed only after executing inside an isolated sandbox environment and satisfying cryptographic digest, environment, and exit-code validation requirements. A failed or timed-out execution is never converted into a stored success — there is no fallback path that fabricates a "PASS" result.

The deployed index ships with 60 real, sandbox-verified seed fixes (Python, Node.js, Docker, and general environment issues), and every fix — seeded or agent-submitted — is embedded at index time, so both keyword (BM25) and semantic (dense vector, RRF-fused) retrieval work against the full corpus from the first query.

Sandbox verification runs on Docker (or Podman) locally, and on [E2B](https://e2b.dev) Firecracker microVMs in the deployed production environment, where no local container engine is available — selected automatically via a provider-agnostic interface, never guessed or auto-detected.

## MCP Tools Specification

The server exposes six core tools:

| Tool Name | Class | Description |
| :--- | :--- | :--- |
| search_fix | Search | Performs hybrid search combining BM25 lexical retrieval and dense vector embeddings to locate verified patches for stack traces. |
| find_similar | Search | Conducts semantic vector similarity search across indexed knowledge records to identify related resolution patterns. |
| get_patch | Retrieval | Retrieves the complete unified git diff patch associated with a specified knowledge card identifier. |
| get_execution_log | Retrieval | Returns execution logs, exit codes, and timing metadata captured during fix verification. |
| verify_fix | Verification | Executes candidate fixes within isolated Docker sandboxes and records server-owned verification run results. |
| submit_fix | Submission | Validates candidate patches against active verification runs, matching digests, and environment configurations before writing to the index. |

## Response Envelope Contract

All tool responses adhere to the standard contract format:

| Field | Type | Purpose |
| :--- | :--- | :--- |
| contractVersion | String | Contract version identifier (hm.v1). |
| requestId | String | Unique identifier assigned to each execution request. |
| ok | Boolean | Success indicator distinguishing valid tool outcomes from infrastructure failures. |
| status | String | Execution outcome code indicating operational state. |
| warnings | Array | Non-fatal diagnostic messages generated during execution. |

Operational status codes returned under valid execution include HIT, MISS, DEGRADED, PASS, FAIL, TIMEOUT, STORED, REJECTED, and NOT_FOUND. System failure statuses include DEPENDENCY_UNAVAILABLE and INVALID_INPUT.

## Getting Started

### Prerequisites

- Node.js `>=20` and npm
- Docker or Podman, for local sandbox verification (`SANDBOX_CONTAINER_RUNTIME=podman` in `.env` if you don't have `docker`)
- An Elasticsearch cluster (self-hosted or Elastic Cloud), with its URL and API key
- Optional: an [OpenRouter](https://openrouter.ai) API key, for embedding generation and hybrid (semantic + lexical) search. Search degrades to lexical-only, with this honestly reported in every response's `searchMode` field, if omitted.

### 1. Clone and install

```bash
git clone https://github.com/BIJJUDAMA/Patch-Made-In-Heaven.git
cd Patch-Made-In-Heaven
npm install
```

### 2. Configure

```bash
cp .env.example .env
```

At minimum, set `ELASTICSEARCH_URL` and `ELASTICSEARCH_API_KEY`. Every other variable has a safe default or is optional — see the inline comments in `.env.example`.

### 3. Seed the knowledge base

Populate your Elasticsearch index with the 60 real, sandbox-verified seed fixes:

```bash
npm --prefix mcp run seed
```

### 4. Build the server

```bash
npm run build
```

(`npm run dev` also works for iterative development, but only exposes STDIO transport — build first if you want to connect a real MCP client, below.)

### 5. Connect an MCP client

Locally, the server communicates over STDIO — register it as a subprocess command, not a URL:

**Claude Code:**

```bash
claude mcp add patch-made-in-heaven -- node mcp/dist/index.js
```

**Codex CLI:**

```bash
codex mcp add patch-made-in-heaven -- node mcp/dist/index.js
```

**Claude Desktop / Cursor:** add the server to your client's MCP config using the same `node mcp/dist/index.js` command — ready-to-adapt examples are provided at `mcp/claude_desktop_config.json` and `mcp/.cursor/mcp.json` (update the path to match your local clone).

To connect to the **live deployment** instead of a local build, use `--transport http`/`--url` with the deployed `/mcp` URL from the table at the top of this document, in place of the local command above.

Once connected, ask your agent something like:

> Search for a fix for: `SyntaxError: Missing parentheses in call to 'print'. Did you mean print(...)?`

### 6. Run the web dashboard (optional)

```bash
cd web
npm install
npm run dev
```

### Running the tests

```bash
npm --prefix mcp run typecheck
npm --prefix mcp run test:unit
npm --prefix mcp run test:integration
```

## Repository Layout

```
.
├── docs/                     # Technical architecture documentation
├── mcp/                      # TypeScript MCP server implementation
│   ├── src/
│   │   ├── config/           # Server and environment configuration
│   │   ├── domain/           # Data models and contract definitions
│   │   ├── services/         # Elasticsearch, embedding, and sandbox execution clients
│   │   ├── tools/            # MCP tool controllers
│   │   └── scripts/          # Index initialization and seed scripts
│   └── tests/                # Unit, integration, and quality test suites
├── web/                      # Next.js web dashboard (read-only knowledge card inspector)
├── .env.example              # Environment configuration template
└── package.json              # Workspace configuration and build orchestration
```
