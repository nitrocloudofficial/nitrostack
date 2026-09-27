# ThreatMatrix MCP Server

Enterprise-grade, AI-powered cybersecurity intelligence platform — fully compliant **Model Context Protocol (MCP) Server** for NitroStack Cloud Marketplace.

## 🛡️ What It Does

ThreatMatrix exposes **28 security tools**, **6 resources**, and **16 prompts** over the MCP protocol. It supports **STDIO** (Claude Desktop, Cursor, NitroStack CLI) and **SSE/HTTP** (NitroStack Cloud, Claude Web) transports.

| Input Type | Capability |
|-----------|------------|
| URLs | Typosquatting, DNS, RDAP WHOIS, TLD risk, Google Safe Browsing |
| PDFs | Binary stream malware & /Launch /JS detection |
| Emails | BEC, phishing, credential harvest, SPF/DKIM/DMARC headers |
| IPs | Reputation, PTR, Reverse DNS, AbuseIPDB lookup |
| Hashes | MD5/SHA-1/SHA-256 threat intelligence (VirusTotal API) |
| QR Codes | Quishing risk analysis & ZXing matrix barcode decoding |
| Images | OCR text + Gemini Vision AI security analysis |
| Text | IoC extraction, phishing language detection |

---

## ⚡ Quick Start

### 1. Install Dependencies

```bash
git clone https://github.com/VijaySathappan79/Threatmatrix.git
cd Threatmatrix
npm install
```

### 2. Set Environment Variables

```bash
cp .env.example .env
# Edit .env and fill in your API keys
```

Required variables:
```
GROQ_API_KEY_1=gsk_...
GROQ_API_KEY_2=gsk_...
GROQ_API_KEY_3=gsk_...
NITRO_API_KEY=your_internal_key
DATABASE_URL=postgresql://...
```

### 3. Build

```bash
npm run build
```

### 4. Run

**HTTP Web UI + SSE MCP server:**
```bash
npm run start        # production (node dist/main.js)
npm run dev          # development (tsx src/main.ts)
```

**STDIO MCP server (for Claude Desktop / Cursor):**
```bash
npm run start:mcp    # production (node dist/index.js)
npm run dev:mcp      # development (tsx src/index.ts)
```

---

## 🔌 MCP Client Connection

### Claude Desktop (`claude_desktop_config.json`)
```json
{
  "mcpServers": {
    "threatmatrix": {
      "command": "node",
      "args": ["/path/to/Threatmatrix/dist/index.js"],
      "env": {
        "GROQ_API_KEY_1": "gsk_...",
        "NITRO_API_KEY": "tm_live_..."
      }
    }
  }
}
```

### Cursor / VS Code Extension
```json
{
  "mcp.servers": [
    {
      "name": "ThreatMatrix",
      "command": "node /path/to/Threatmatrix/dist/index.js"
    }
  ]
}
```

### NitroStack Cloud SSE Connection
```
GET http://localhost:3000/mcp/sse
POST http://localhost:3000/mcp/message?sessionId=<id>
```

---

## 🚀 NitroStack Deployment

### Deploy to NitroStack Cloud

```bash
# Install NitroStack CLI
npm install -g @nitrostack/cli

# Authenticate
nitrostack auth login

# Deploy
nitrostack deploy --config nitrostack.json
```

### Environment Variables on NitroStack
Set via NitroStack dashboard or CLI:
```bash
nitrostack env set GROQ_API_KEY_1 gsk_...
nitrostack env set NITRO_API_KEY  tm_...
nitrostack env set DATABASE_URL   postgresql://...
```

---

## 🐳 Docker

```bash
# Build
docker build -t threatmatrix-mcp .

# Run HTTP mode (NitroStack Cloud)
docker run -p 3000:3000 \
  -e GROQ_API_KEY_1=gsk_... \
  -e NITRO_API_KEY=tm_... \
  -e DATABASE_URL=postgresql://... \
  threatmatrix-mcp

# Run STDIO mode (override CMD)
docker run -i \
  -e GROQ_API_KEY_1=gsk_... \
  threatmatrix-mcp node dist/index.js
```

---

## 🧪 Testing

```bash
# Build first
npm run build

# Run full MCP protocol test suite
npm test
```

The test suite validates:
- ✅ MCP `initialize` handshake
- ✅ `tools/list` — all 28 tools (includes `investigate` & `process_request`)
- ✅ `tools/call` — execution, path traversal rejection & error handling
- ✅ `resources/list` — all 6 resources
- ✅ `resources/read` — content retrieval
- ✅ `prompts/list` — all 16 prompts
- ✅ `prompts/get` — template expansion
- ✅ Multi-vector automated orchestration
- ✅ Invalid request error handling

---

## 🔧 API Endpoints (HTTP Mode)

| Method | Path | Description |
|--------|------|-------------|
| `GET`  | `/health` | Server health + metadata |
| `GET`  | `/mcp/sse` | SSE MCP transport connection |
| `POST` | `/mcp/message` | SSE message handler |
| `POST` | `/mcp/tools/:name` | Direct tool invocation |
| `POST` | `/api/process-request` | Universal Agentic AI Pipeline |
| `POST` | `/api/groq-analysis` | Groq AI natural language analysis |
| `GET`  | `/` | Web UI |

---

## 📁 Project Structure

```
Threatmatrix/
├── src/
│   ├── index.ts                  # STDIO MCP entrypoint
│   ├── main.ts                   # HTTP + SSE + Web UI server
│   ├── mcp.server.ts             # MCP Server factory (SDK)
│   ├── mcp.tools.ts              # 28 Security tools registry & execution
│   ├── mcp.resources.ts          # 6 Static resources registry
│   ├── mcp.prompts.ts            # 16 System prompts registry
│   ├── mcp.schemas.ts            # Zod schemas + risk scoring
│   ├── container.ts              # Singleton DI container
│   ├── config.ts                 # Environment config validation
│   ├── logger.ts                 # Structured logger (stderr-safe)
│   ├── agent.engine.ts           # Groq/Gemini dynamic AI engine
│   ├── input.processor.ts        # Universal format detector
│   ├── threat.analyzer.ts        # Threat analyzer engine
│   ├── threat.intel.service.ts   # VT v3, AbuseIPDB v2, GSB v4, AlienVault OTX
│   ├── orchestrator.ts           # Multi-vector investigation workflow
│   ├── report.generator.ts       # MD + HTML + JSON report generator
│   ├── groq.service.ts           # Groq 3-key rotation service
│   ├── gemini.service.ts         # Gemini Vision service
│   ├── prisma.ts                 # Prisma singleton
│   ├── threatmatrix.controller.ts
│   ├── threatmatrix.service.ts
│   └── threatmatrix.module.ts
├── public/                       # Web UI (HTML/CSS/JS)
├── prisma/                       # Database schema + migrations
├── scripts/
│   └── test-mcp.ts              # MCP protocol test suite
├── Dockerfile                    # Production container
├── nitrostack.json               # NitroStack Marketplace manifest
├── .env.example                  # Environment template
└── package.json
```

---

## ✅ Production Readiness Checklist

- [x] MCP `initialize` handshake working
- [x] All 26 tools registered and callable
- [x] All 6 resources readable
- [x] All 8 prompts with template expansion
- [x] STDIO transport for Claude/Cursor
- [x] SSE transport for NitroStack Cloud
- [x] HTTP tool bridge endpoints
- [x] Groq AI with 3-key round-robin rotation
- [x] Structured logging to stderr
- [x] Config validation with fail-fast
- [x] Graceful shutdown on SIGTERM/SIGINT
- [x] Production Docker image with healthcheck
- [x] NitroStack manifest configured
- [x] Full MCP test suite
- [x] Zero unhandled exceptions in production

---

## 📄 License

MIT — © ThreatMatrix Team
