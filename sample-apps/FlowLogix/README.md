# FlowLogix - A Multi-Agent MCP Server Automating End-to-End Warehouse Workflows

> An AI-native control plane built on NitroStack that unifies warehouse logistics across all six fulfillment stages into an autonomous, human-in-the-loop control plane.

![Model Context Protocol](https://img.shields.io/badge/Model%20Context%20Protocol-MCP-blue) ![Built with Nitrostack](https://img.shields.io/badge/Built%20with-Nitrostack-0A66FF) ![Status](https://img.shields.io/badge/status-live-brightgreen)

**FlowLogix** is an [MCP (Model Context Protocol)](https://nitrostack.ai) server that extends AI assistants—like Claude Desktop, Cursor, and custom LangGraph agents—with real-world, physical warehouse operational capabilities. Built and deployed on [Nitrostack](https://nitrostack.ai), FlowLogix bridges local deterministic business logic with distributed cloud-deployed MCP services over Server-Sent Events (SSE).

---

## Table of Contents

- [Overview](#overview)
- [What is MCP?](#what-is-mcp)
- [Key Features](#features)
- [Architecture & Multi-MCP Integration](#architecture--multi-mcp-integration)
- [Getting Started](#getting-started)
- [Connect to an MCP Client](#connect-to-an-mcp-client)
- [Deploy Your Own MCP App](#deploy-your-own-mcp-app)
- [Explore More MCP Apps](#explore-more-mcp-apps)
- [FAQ](#faq)
- [Keywords](#keywords)
- [License](#license)

---

## Overview

Modern warehouse managers spend hours jumping between 4 to 5 disconnected enterprise portals: WMS, ERPs, cold-chain IoT monitors, Slack channels, and vendor email inboxes. When an inbound truck arrives with crushed cargo or cold-chain sensors trigger temperature warnings, manual coordination creates severe delays and supply chain penalties.

**FlowLogix** exposes every physical warehouse operation as an AI-callable tool via the Model Context Protocol (MCP). An LLM acts as an autonomous operational co-pilot—parsing natural-language instructions, diagnosing supply chain bottlenecks, maintaining persistent memory across sessions, and executing real-world side effects across connected cloud services.

### Core Architecture Highlights:
- **Zero Math Hallucinations:** Critical business logic (Days of Supply, Reorder Points, bin slotting) is calculated deterministically using NestJS-style TypeScript services inside NitroStack.
- **Distributed Multi-MCP Pipeline:** Combines local NitroStack backend tools with remote cloud MCP servers (Slack for alerts, SMTP Mail for vendor dispatches) running on Render via SSE.
- **Human-in-the-Loop (HITL) Controls:** Automatically halts high-impact workflows (like emergency budget expenditures or stock writes) to render dynamic React UI widgets (`ShipmentIncidentCard`, `StockoutTicker`) for human sign-off.

---

## What is MCP?

The **Model Context Protocol (MCP)** is an open standard that lets AI assistants securely connect to external tools, data sources, and services. Instead of being limited to static trained parameters, an AI model using MCP can call structured tools, inspect live resources, and trigger workflows in real-world software systems.

---

## Features

- 📥 **Stage 1: Inbound Receiving & OCR Parsing** — Ingests delivery receipts, parses damaged SKU counts, and logs Goods Received Notes (GRN).
- 📍 **Stage 2: Putaway & Bin Slotting** — Evaluates 3D rack dimensions, weight constraints, and hazardous material rules to assign optimal storage bins.
- ❄️ **Stage 3: Cold-Chain Telemetry & Stockout Prevention** — Monitors IoT temperature sensors, tracks Available-to-Promise (ATP) stock, and calculates depletion trajectories.
- 🛒 **Stage 4: Order Picking Path Optimization** — Aggregates customer order batches and optimizes physical worker picking routes.
- 🚚 **Stage 5: Emergency Purchasing & Vendor Dispatch** — Automatically selects backup suppliers and triggers Purchase Orders (POs) when stock thresholds are breached.
- 💬 **External Team Alerts (Slack MCP)** — Broadcasts real-time incident warnings to `#warehouse-alerts`.
- 📧 **Automated Vendor Dispatches (Mail MCP)** — Sends formal PO emails to external suppliers using SMTP.
- 🧠 **Persistent Memory System** — Remembers past vendor performance, historical incident logs, and facility state across sessions.

---

## Architecture & Multi-MCP Integration

                           ┌───────────────────────────┐
                           │     Orchestrator LLM      │
                           │  (LangGraph / ChatOpenAI) │
                           └─────────────┬─────────────┘
                                         │
                   ┌─────────────────────┴─────────────────────┐
                   │   FlowLogix Multi-MCP Transport Layer     │
                   └──────┬─────────────────────────────┬──────┘
                          │                             │
          (STDIO Local)   │                             │  (SSE Remote / Render)
                          ▼                             ▼
            ┌──────────────────────────┐  ┌──────────────────────────┐
            │ NitroStack Core Server   │  │ External Cloud MCP Hub   │
            │  - 15+ Local TS Tools    │  │  - Slack MCP (/sse)      │
            │  - Deterministic Math    │  │  - Mail MCP (/sse)       │
            │  - Persistent Memory     │  └──────────────────────────┘
            │  - React HITL Widgets    │
            └──────────────────────────┘

---

## Getting Started

### Prerequisites

- **Node.js**: v18.x or higher
- **npm** or **pnpm**
- **Ollama** (for local LLM execution) or an **OpenAI API Key**

### 1. Clone & Install Dependencies

```bash
git clone [https://github.com/FLASH2332/FlowLogix.git](https://github.com/FLASH2332/FlowLogix.git)
cd FlowLogix
npm install
2. Configure Environment Variables
Create a .env file in the root directory:

Code snippet
# LLM Configuration (Local Ollama or OpenAI)
OPENAI_BASE_URL=http://localhost:11434/v1
OPENAI_API_KEY=ollama
DEFAULT_MODEL=gemma4:e2b

# Optional: Slack / Mail Keys (if testing external integrations locally)
SLACK_BOT_TOKEN=xoxb-...
SLACK_TEAM_ID=T...
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-digit-app-password

# Build the NitroStack Server
npm run build

# Run the Interactive Multi-MCP Agent Session
npm run agent:session "Inbound truck TRK-9988 has 50 damaged units of SKU-A1. Handle it."
```

### Connect to an MCP Client
FlowLogix uses standard mcp.json configuration to orchestrate local and remote transports simultaneously

```
{
  "mcpServers": {
    "nitrostack": {
      "command": "node",
      "args": ["dist/index.js"]
    },
    "slack": {
      "transport": "sse",
      "url": "[https://mcp-servers-vzou.onrender.com/sse](https://mcp-servers-vzou.onrender.com/sse)"
    },
    "gmail": {
      "transport": "sse",
      "url": "[https://gmail-mcp-server-jnkx.onrender.com/sse](https://gmail-mcp-server-jnkx.onrender.com/sse)"
    }
  }
}
```