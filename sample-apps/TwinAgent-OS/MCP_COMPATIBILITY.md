# TwinAgent OS — Multi-Transport MCP Client Connection Guide

TwinAgent OS supports **Dual-Transport Official MCP Capabilities**:
1. **STDIO Transport** (JSON-RPC over Stdio command)
2. **URL / SSE Transport** (Server-Sent Events streaming over HTTP URL)

---

## 1. Connection Configurations by Client

### NitroStudio

NitroStudio supports both **STDIO Command** and **URL / SSE** connections.

#### Option A: STDIO Command Connection (Recommended)
- **Project / Server Name**: `TwinAgent OS`
- **Connection Type**: `STDIO`
- **Command**: `npm`
- **Arguments**: `run`, `--silent`, `mcp:start`
- **Working Directory**: `/Users/sunilprasad/richelle/TwinAgent OS`
- **Environment Variables**:
  ```json
  {
    "NODE_ENV": "production"
  }
  ```

> *(Direct Execution)*:
> - **Command**: `npx`
> - **Arguments**: `-y`, `tsx`, `src/mcp/cli.ts`

#### Option B: URL / SSE Connection
- **Project / Server Name**: `TwinAgent OS (SSE)`
- **Connection Type**: `SSE` / `HTTP`
- **Server URL**: `http://localhost:4000/api/v1/mcp/sse`

---

### Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "twinagent-os": {
      "command": "npx",
      "args": ["-y", "tsx", "/Users/sunilprasad/richelle/TwinAgent OS/src/mcp/cli.ts"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

---

### Cursor IDE

1. Open **Cursor Settings** -> **Features** -> **MCP Servers** -> **+ Add New MCP Server**.
2. Configure:
   - **Name**: `twinagent-os`
   - **Type**: `command`
   - **Command**: `npx -y tsx /Users/sunilprasad/richelle/TwinAgent OS/src/mcp/cli.ts`

---

### Gemini CLI / Agent

Add to `~/.gemini/mcp_servers.json`:

```json
{
  "mcpServers": {
    "twinagent-os": {
      "command": "npx",
      "args": ["-y", "tsx", "/Users/sunilprasad/richelle/TwinAgent OS/src/mcp/cli.ts"]
    }
  }
}
```

---

## 2. Production Build & Launch Commands

### Development Mode:
```bash
npm run mcp:start
```

### Production Mode:
```bash
npm run build
node dist/mcp/cli.js
```

### Automated Compatibility Validation:
```bash
npm run validate:mcp
```
