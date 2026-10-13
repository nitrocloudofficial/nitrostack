# Invenio — MCP Servers

## Overview

NitroStack MCP (Model Context Protocol) servers expose AI agent capabilities as callable tools. Each agent in the 
itro/agents/ directory becomes an MCP server in Phase 2.

## Protocol

Invenio uses the **Model Context Protocol (MCP)** — the emerging standard for LLM tool use defined by Anthropic. MCP allows the Planner agent to call tools on any other agent without knowing the underlying implementation.

## MCP Server Registry

| Server Name | Agent | Phase | Port |
|---|---|---|---|
| invenio-planner | Planner | 2 | 9000 |
| invenio-research | Research | 2 | 9001 |
| invenio-datasets | Datasets | 2 | 9002 |
| invenio-repositories | Repositories | 2 | 9003 |
| invenio-knowledge-graph | Knowledge Graph | 3 | 9004 |
| invenio-evidence | Evidence | 3 | 9005 |
| invenio-correlation | Correlation | 4 | 9006 |
| invenio-hypothesis | Hypothesis | 4 | 9007 |
| invenio-reports | Reports | 5 | 9008 |

## Tool Schema Convention (Phase 2)

Each MCP tool will follow this schema:

\\\json
{
  "name": "tool_name",
  "description": "What this tool does",
  "inputSchema": {
    "type": "object",
    "properties": {
      "param": { "type": "string", "description": "..." }
    },
    "required": ["param"]
  }
}
\\\

## Server Configuration (Phase 2)

\\\yaml
# nitro/config.yaml
servers:
  planner:
    host: 0.0.0.0
    port: 9000
    log_level: info
  research:
    host: 0.0.0.0
    port: 9001
    rate_limit: 100/minute
    cache_ttl: 300
\\\

See [AGENTS.md](./AGENTS.md) for individual agent tool specifications.
