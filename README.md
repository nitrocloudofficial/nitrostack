# 🛡️ Aegis Protocol — Zero-Knowledge Threat Fusion Engine

> **Real-Time Digital Arrest Scam Detection & HITL Guard Enforcement for Modern Banking**

[![Framework](https://img.shields.io/badge/Framework-NitroStack%20SDK%20v1.0-blue)](https://nitrostack.ai)
[![Protocol](https://img.shields.io/badge/Protocol-Model%20Context%20Protocol%20(MCP)-purple)](https://modelcontextprotocol.io)
[![License](https://img.shields.io/badge/License-Private-red)](#-license)

**Aegis Protocol** is an official **NitroStack MCP Application** implementing a 2-Agent **"Maker-Checker"** architecture paired with Human-in-the-Loop (HITL) Guard Enforcement to combat **Digital Arrest Scams** and sophisticated financial fraud in real time.

---

## 📑 Table of Contents

- [🌟 Key Architecture & Capabilities](#-key-architecture--capabilities)
  - [1. 2-Agent Maker-Checker Pipeline](#1-2-agent-maker-checker-pipeline)
  - [2. Zero-Knowledge (ZK) Privacy Layer](#2-zero-knowledge-zk-privacy-layer)
  - [3. Dual-Mode Graph Engine for Mule Detection](#3-dual-mode-graph-engine-for-mule-detection)
  - [4. HITL Guard Enforcement (`ThreatScoreGuard`)](#4-hitl-guard-enforcement-threatscoreguard)
  - [5. Express REST Gateway & SSE Stream](#5-express-rest-gateway--sse-stream)
  - [6. Interactive Fraud Officer Dashboard Widget](#6-interactive-fraud-officer-dashboard-widget)
- [📂 Project Structure](#-project-structure)
- [🚀 Quick Start & Installation](#-quick-start--installation)
  - [Prerequisites](#prerequisites)
  - [1. Installation](#1-installation)
  - [2. Environment Setup](#2-environment-setup)
  - [3. Running Development Server](#3-running-development-server)
  - [4. Running the Express REST & SSE Server](#4-running-the-express-rest--sse-server)
- [🛠️ MCP Tools & Capabilities](#️-mcp-tools--capabilities)
- [📡 REST API & SSE Reference](#-rest-api--sse-reference)
- [🎬 Stage Demo & Scenario Runbook](#-stage-demo--scenario-runbook)
  - [Scenario Overview](#scenario-overview)
  - [Execution Commands](#execution-commands)
- [💻 Tech Stack](#-tech-stack)
- [📄 License](#-license)

---

## 🌟 Key Architecture & Capabilities

```
+-----------------------------------------------------------------------------------+
|                                 AEGIS PROTOCOL                                    |
|                                                                                   |
|  +------------------------+      +------------------------+      +-------------+  |
|  | Telecom Telemetry      |      | Voice Biometrics       |      | Banking     |  |
|  | (CLI Spoof, VoIP,      |      | (Spectral Analysis,    |      | Topology    |  |
|  |  STIR/SHAKEN Failure)  |      |  Deepfake Prob 96%)    |      | (Mule Graph)|  |
|  +-----------+------------+      +-----------+------------+      +------+------+  |
|              |                               |                          |         |
|              +-------------------------------+--------------------------+         |
|                                              |                                    |
|                                              v                                    |
|                             +---------------------------------+                   |
|                             |  AGENT 1: INVESTIGATOR           |                  |
|                             |  - ZK-hashes PII (SHA-256)      |                  |
|                             |  - Synthesizes Intel Report     |                  |
|                             +----------------+----------------+                   |
|                                              |                                    |
|                                              v                                    |
|                             +---------------------------------+                   |
|                             |  AGENT 2: ADJUDICATOR           |                  |
|                             |  - Scores Threat (0 - 100)      |                  |
|                             +----------------+----------------+                   |
|                                              |                                    |
|                                     [threat_score >= 80?]                         |
|                                      /               \                            |
|                                   YES                 NO                          |
|                                    /                   \                          |
|                                   v                     v                         |
|                     +---------------------------+   +------------------------+    |
|                     | 🛡️ HITL GUARD FIRES        |   | Transaction Cleared    |    |
|                     | Pauses execution pipeline |   | (Low/Medium Risk)      |    |
|                     | Persists state to file    |   +------------------------+    |
|                     +-------------+-------------+                                 |
|                                   |                                               |
|                                   v                                               |
|                     +---------------------------+                                 |
|                     | 📊 aegis-dashboard Widget |                                 |
|                     | Fraud Officer Approves    |                                 |
|                     |  -> FREEZE & REPORT       |                                 |
|                     +-------------+-------------+                                 |
|                                   |                                               |
|                                   v                                               |
|                     +---------------------------+                                 |
|                     | MHA/I4C Alert Dispatched  |                                 |
|                     | Account Frozen & Reversed |                                 |
|                     +---------------------------+                                 |
+-----------------------------------------------------------------------------------+
```

### 1. 2-Agent Maker-Checker Pipeline
* 🔍 **Agent 1 (Investigator)**: Ingests disparate threat vectors—telecom metadata (CLI spoofing, STIR/SHAKEN Level B failures, call coercion duration), voice biometrics spectral analysis (`VoiceShield-v3`, pitch/formant anomalies), and bank mule account topologies. Synthesizes a unified, structured **Intelligence Report**.
* ⚖️ **Agent 2 (Adjudicator)**: Computes a deterministic threat score (0–100) split across Telecom (30 pts max), Deepfake (35 pts max), and Financial (35 pts max) components. Categorizes threat into tiers (**LOW** `<50`, **MEDIUM** `50–79`, **CRITICAL** `≥80`) and evaluates policy enforcement.

### 2. Zero-Knowledge (ZK) Privacy Layer
* All Personally Identifiable Information (PII)—including phone numbers, victim names, and account numbers—is processed using **Zero-Knowledge Privacy Utilities** (`src/utils/zk-privacy.ts`).
* PII is salted and hashed with SHA-256 commitments (`zk_phone_commitment`, `zk_account_commitment`) before passing across MCP transport boundaries, providing cryptographically verifiable audit trails without leaking sensitive customer data.

### 3. Dual-Mode Graph Engine for Mule Detection
Mule accounts operate in coordinated rings linked by explicit registries or shared device fingerprints. Aegis provides a zero-downtime graph engine (`src/modules/aegis/graph/neo4j.service.ts`):
* **Mode 1: Live Neo4j Graph Database (`USE_NEO4J=true`)**: Queries a live Neo4j database (`bolt://localhost:7687`) with Cypher queries for accounts (`Account`), devices (`Device`), and clusters (`Cluster`).
* **Mode 2: In-Memory Union-Find Graph Engine (`USE_NEO4J=false` or Auto-Fallback)**: Employs an in-memory **Disjoint-Set (Union-Find)** algorithm to analyze transaction graphs across all mock datasets. Guarantees 100% demo reliability without external Docker dependencies.

### 4. HITL Guard Enforcement (`ThreatScoreGuard`)
* Built with NitroStack's `@UseGuards(ThreatScoreGuard)`.
* When `threat_score >= 80`, the pipeline halts and enters a pending state (`HitlGateState`).
* State is persisted to `.aegis-state/hitl_gate.json` so guard approvals survive process restarts. Execution only resumes when a certified fraud officer approves the action via the dashboard widget or REST API.

### 5. Express REST Gateway & SSE Stream
Exposes a production REST interface (`src/server.ts`):
* **`POST /api/v1/transaction/process`**: Submits financial transactions to the 2-agent pipeline.
* **`POST /api/v1/guard/resolve`**: Resolves pending HITL guard states programmatically.
* **`GET /api/v1/events`**: Real-time Server-Sent Events (SSE) channel broadcasting `guard_frozen` and `guard_resolved` events to connected frontend clients.

### 6. Interactive Fraud Officer Dashboard Widget
* Interactive Next.js 14 component (`aegis-dashboard`) created using `@nitrostack/widgets`.
* **Normal Mode**: Monitors live transaction clearing feeds.
* **Guard Triggered Mode**: Displays a high-contrast red modal showing telecom intelligence, deepfake breakdown, bank mule risk metrics, threat gauge, and an interactive **FREEZE & REPORT** button.
* Includes standalone `⚡ SIMULATE SCAM THREAT` testing mode.

---

## 📂 Project Structure

```
aegis-protocol/
├── src/
│   ├── agents/
│   │   └── AegisAgents.ts             # Multi-Agent Orchestrator (Investigator + Adjudicator)
│   ├── modules/
│   │   └── aegis/
│   │       ├── aegis.module.ts        # NitroStack Module declaration
│   │       ├── aegis.service.ts       # Core Threat Fusion logic & approval handler
│   │       ├── graph/
│   │       │   └── neo4j.service.ts   # Dual-Mode Graph Engine (Neo4j + Union-Find)
│   │       ├── guards/
│   │       │   └── threat-score.guard.ts # HITL ThreatScoreGuard & state persistence
│   │       └── tools/
│   │           ├── aegis.tools.ts     # Main orchestrator tools & Widget bindings
│   │           ├── banking.tools.ts   # Mule graph query & MHA alert dispatch tools
│   │           └── telecom.tools.ts   # Telecom metadata & voice deepfake verification
│   ├── utils/
│   │   ├── mcp-transport.ts           # JSON-RPC Client transport wrapper
│   │   └── zk-privacy.ts              # Zero-Knowledge SHA-256 PII hashing & salt
│   ├── widgets/                       # Next.js 14 Aegis Dashboard Widget
│   ├── app.module.ts                  # Root NitroStack App Module
│   ├── index.ts                       # Application entry point
│   └── server.ts                      # Express REST API & SSE Server Gateway
├── scripts/
│   ├── trigger.mjs                    # Scenario execution engine (critical, medium, safe)
│   ├── stream_logs.mjs                # Real-time JSON-RPC log viewer
│   ├── seed-neo4j.ts                  # Neo4j graph dataset seeder
│   └── verify-mock-data.ts            # Schema validator for mock datasets
├── mocks/                             # Telecom and Bank telemetry mock events
├── DECISION.md                        # ADR: Dual-Mode Graph Engine Architecture
├── STAGE_DEMO_GUIDE.md                # 3-Minute Stage Runbook & Talk Track
└── README.md
```

---

## 🚀 Quick Start & Installation

### Prerequisites
* **Node.js**: `v18.0.0` or higher
* **npm**: `v9.0.0` or higher

### 1. Installation

Install dependencies for the backend engine and widget application:

```bash
# Install core dependencies
npm install

# Install widget dependencies
npm --prefix src/widgets install
```

### 2. Environment Setup

Create a `.env` file in the root directory (or use `.env.example`):

```env
PORT=3000
USE_NEO4J=false
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=password
```

> **Note**: Setting `USE_NEO4J=false` enables the zero-dependency in-memory Union-Find graph engine.

### 3. Running Development Server

Start the NitroStack MCP server in development mode:

```bash
npm run dev
```

* **MCP Backend**: Transports via STDIO.
* **Widget App**: Available at [http://localhost:3001/aegis-dashboard](http://localhost:3001/aegis-dashboard).

### 4. Running the Express REST & SSE Server

To launch the Express REST Gateway with real-time SSE streaming:

```bash
npx tsx src/server.ts
```

The REST server runs at `http://localhost:3000`.

---

## 🛠️ MCP Tools & Capabilities

The Aegis Protocol exposes the following tools registered in NitroStack MCP:

| Tool Name | Module / Controller | Description | Features / Decorators |
| :--- | :--- | :--- | :--- |
| `run_threat_analysis` | `AegisTools` (`aegis`) | Runs Agent 1 (Investigator) & Agent 2 (Adjudicator) pipeline for Digital Arrest detection. | `@Widget('aegis-dashboard')` |
| `approve_freeze_report` | `AegisTools` (`aegis`) | Resolves the HITL guard gate and triggers dispatch of MHA alerts. | Called from Dashboard Widget |
| `query_mule_graph` | `BankingTools` (`banking`) | Queries mule network topologies, device sharing, and RBI clusters. | `@Cache({ ttl: 30 })` |
| `dispatch_mha_alert` | `BankingTools` (`banking`) | Dispatches official cybercrime alerts to MHA/I4C and freezes accounts. | `@UseGuards(ThreatScoreGuard)` |
| `analyze_telecom_metadata` | `TelecomTools` (`telecom`) | Extracts caller origin, STIR/SHAKEN failure, and call coercion metadata. | `@Cache({ ttl: 30 })` |
| `verify_voice_deepfake` | `TelecomTools` (`telecom`) | Analyzes voice sample spectral tremors for AI deepfake probability. | AI Spectral Biometrics |

---

## 📡 REST API & SSE Reference

The Express Gateway (`src/server.ts`) exposes three REST endpoints:

### 1. Process Transaction
`POST /api/v1/transaction/process`

**Request Body:**
```json
{
  "transaction_id": "TXN-998822",
  "amount": 250000,
  "currency": "INR",
  "sender_account": "ACC-554411",
  "destination_account": "ACC-998877",
  "priority": "CRITICAL",
  "scenario": "critical"
}
```

### 2. Resolve HITL Guard
`POST /api/v1/guard/resolve`

**Request Body:**
```json
{
  "transaction_id": "TXN-998822",
  "approved": true,
  "officer_id": "OFFICER-771",
  "notes": "Verified Digital Arrest threat. Freeze authorized."
}
```

### 3. Server-Sent Events (SSE) Stream
`GET /api/v1/events`

Establishes a persistent SSE connection receiving real-time JSON payloads:
* `guard_frozen`: Emitted when `threat_score >= 80`.
* `guard_resolved`: Emitted when fraud officer approves or denies freeze.
* `heartbeat`: Keep-alive ping sent every 30 seconds.

---

## 🎬 Stage Demo & Scenario Runbook

Aegis includes 3 pre-configured scenario datasets in `mocks/` for live stage demonstrations:

### Scenario Overview

| Scenario | Command | Score | Level | Action Taken |
| :--- | :--- | :--- | :--- | :--- |
| 🟢 **Safe** | `node scripts/trigger.mjs safe` | `~12/100` | LOW | Passes silently. Transaction clears with 0 friction. |
| 🟡 **Medium** | `node scripts/trigger.mjs medium` | `~55/100` | MEDIUM | Flagged for 24h asynchronous analyst queue. |
| 🔴 **Digital Arrest** | `node scripts/trigger.mjs critical` | `~95/100` | CRITICAL | 🚨 **Guard Fires**. Red modal opens. HITL freeze required. |

### Execution Commands

In split terminal windows, run:

```bash
# Terminal 1: Real-time log viewer
node scripts/stream_logs.mjs

# Terminal 2: Trigger Digital Arrest scam
node scripts/trigger.mjs critical
```

For complete stage scripts and talk tracks, view [STAGE_DEMO_GUIDE.md](file:///Users/varunshankar/Desktop/aegis-protocol/STAGE_DEMO_GUIDE.md).

---

## 💻 Tech Stack

* **Core Framework**: [NitroStack SDK](https://nitrostack.ai) (`@nitrostack/core`, `@nitrostack/widgets`, `@nitrostack/cli`)
* **Protocol**: [Model Context Protocol (MCP)](https://modelcontextprotocol.io)
* **Backend Runtime**: Node.js (ES Modules), TypeScript, Express.js
* **Data & Graph Engines**: Neo4j (`neo4j-driver`) + In-Memory Union-Find Graph Algorithm
* **Validation & Security**: Zod, SHA-256 Zero-Knowledge Privacy Hashing
* **Frontend Widgets**: Next.js 14, React 18, `@nitrostack/widgets`

---

# Aegis Protocol - Digital Arrest Scam/Fraud Detection

> Autonomous Digital Arrest & Mule-Account Interceptor A Model Context Protocol (MCP) Infrastructure Layer for Real-Time Digital Public Safety & Fraud Prevention

![Model Context Protocol](https://img.shields.io/badge/Model%20Context%20Protocol-MCP-blue) ![Built with Nitrostack](https://img.shields.io/badge/Built%20with-Nitrostack-0A66FF) ![Status](https://img.shields.io/badge/status-live-brightgreen)

**Aegis Protocol - Digital Arrest Scam/Fraud Detection** is an [MCP (Model Context Protocol)](https://nitrostack.ai) server that extends AI assistants — like Claude, Cursor, and any MCP-compatible client — with new, real-world capabilities. It is built and deployed on [Nitrostack](https://nitrostack.ai), the fastest way to build, deploy, and share MCP apps.

## Table of Contents

- [Overview](#overview)
- [What is MCP?](#what-is-mcp)
- [Features](#features)
- [Getting Started](#getting-started)
- [Connect to an MCP Client](#connect-to-an-mcp-client)
- [Deploy Your Own MCP App](#deploy-your-own-mcp-app)
- [Explore More MCP Apps](#explore-more-mcp-apps)
- [FAQ](#faq)
- [Keywords](#keywords)
- [License](#license)

## Overview

Autonomous Digital Arrest & Mule-Account Interceptor A Model Context Protocol (MCP) Infrastructure Layer for Real-Time Digital Public Safety & Fraud Prevention

## What is MCP?

The **Model Context Protocol (MCP)** is an open standard that lets AI assistants securely connect to external tools, data sources, and services. Instead of being limited to what it was trained on, an AI model can call **MCP servers** to fetch live data, run actions, and integrate with real systems.

This project is one such MCP server. Learn more about building and shipping MCP apps at [nitrostack.ai](https://nitrostack.ai).

## Features

- 🔌 **MCP-native** — works with any MCP-compatible client (Claude, Cursor, and more)
- 🛠️ **Tools, resources & prompts** — exposes structured capabilities to AI agents
- ⚡ **Deployed on Nitrostack** — reliable, hosted, and instantly shareable
- 🔐 **Secure by design** — secrets stay in environment variables, never in code
- 🧩 **Composable** — combine with other MCP apps to build powerful AI workflows

## Getting Started

### Prerequisites

- Node.js 18+ (or your project runtime)
- An MCP-compatible client (Claude Desktop, Cursor, etc.)

### Installation

```bash
git clone https://github.com/your-username/your-mcp-project.git
cd aegis-protocol-digital-arrest-scam-fraud-detection
npm install
```

### Configuration

Copy the example environment file and add your own values:

```bash
cp .env.example .env
```

### Run

```bash
npm run start
```

## Connect to an MCP Client

Add this server to your MCP client configuration. A typical entry looks like:

```json
{
  "mcpServers": {
    "aegis-protocol-digital-arrest-scam-fraud-detection": {
      "command": "npm",
      "args": ["run", "start"]
    }
  }
}
```

Restart your client and the tools from this MCP server will be available to your AI assistant.

## Deploy Your Own MCP App

Want to build and ship an MCP server like this one? **[Nitrostack](https://nitrostack.ai)** lets you create, deploy, and host MCP apps in minutes — no infrastructure to manage.

👉 **Start building:** [https://nitrostack.ai](https://nitrostack.ai)

## Explore More MCP Apps

- 🌙 Discover and share MCP projects with the community on [r/mcptothemoon](https://www.reddit.com/r/mcptothemoon/)
- 🧰 Browse a growing catalog of MCP apps on [Nitrostack](https://nitrostack.ai/apps)

## FAQ

### What is an MCP server?

An MCP server implements the Model Context Protocol to expose tools, resources, and prompts that AI assistants can call. It lets an AI model take real actions and access live data.

### What does Aegis Protocol - Digital Arrest Scam/Fraud Detection do?

Autonomous Digital Arrest & Mule-Account Interceptor A Model Context Protocol (MCP) Infrastructure Layer for Real-Time Digital Public Safety & Fraud Prevention

### Which AI clients does this work with?

Any MCP-compatible client, including Claude Desktop and Cursor. New clients are adding MCP support regularly.

### How do I deploy my own MCP app?

Use [Nitrostack](https://nitrostack.ai) to build, deploy, and host MCP apps without managing infrastructure.

## Keywords

`Open Innovation` · `Aegis Protocol - Digital Arrest Scam/Fraud Detection` · `MCP` · `Model Context Protocol` · `MCP server` · `MCP app` · `AI tools` · `AI agents` · `LLM tools` · `Claude MCP` · `Nitrostack` · `deploy MCP server` · `build MCP app`

## License

MIT © 2026

---

Built with ❤️ using the Model Context Protocol on [Nitrostack](https://nitrostack.ai). Share your MCP app on [r/mcptothemoon](https://www.reddit.com/r/mcptothemoon/).

