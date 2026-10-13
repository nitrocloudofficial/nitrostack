# OrbitGuard: Autonomous Satellite Fault Isolation & Anomaly Detection MCP

[![Model Context Protocol](https://img.shields.io/badge/Model%20Context%20Protocol-MCP-blue)](https://nitrostack.ai)
[![Built with Nitrostack](https://img.shields.io/badge/Built%20with-Nitrostack-0A66FF)](https://nitrostack.ai)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![Status](https://img.shields.io/badge/status-live-brightgreen)](https://satellite-fault-isolation-6a6c6d22-techie-zeekies-srmist.app.nitrocloud.ai)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**OrbitGuard: Autonomous Satellite Fault Isolation & Anomaly Detection MCP** is an onboard [Model Context Protocol (MCP)](https://nitrostack.ai) server designed for autonomous satellite constellation telemetry classification, South Atlantic Anomaly (SAA) radiation glitch filtering, and fault isolation. Built and deployed on [Nitrostack](https://nitrostack.ai), it extends AI assistants — like Claude, Cursor, ChatGPT, and custom flight control agents — with real-world spacecraft operational capabilities.

---

## 📋 Table of Contents

- [Overview](#overview)
- [What is MCP?](#what-is-mcp)
- [Features](#features)
- [Architecture & Capabilities](#architecture--capabilities)
- [MCP Tools, Resources & Prompts](#mcp-tools-resources--prompts)
- [Live Demo](#live-demo)
- [Getting Started](#getting-started)
- [Connect to an MCP Client](#connect-to-an-mcp-client)
- [Deploy Your Own MCP App](#deploy-your-own-mcp-app)
- [Explore More MCP Apps](#explore-more-mcp-apps)
- [FAQ](#faq)
- [Keywords](#keywords)
- [License](#license)

---

## 🛰️ Overview

### What does it do?
OrbitGuard uses a multi-stage evaluation pipeline to monitor and safe satellite telemetry in real time:
1. **Critical Envelope Validation**: Validates real-time telemetry against critical hardware safety limits (voltage, thermal, and tumble rates).
2. **Space Weather Filtering**: Filters out temporary radiation-induced sensor glitches (e.g., Single Event Upsets / SEUs in the South Atlantic Anomaly).
3. **Persistent Fault Isolation**: Isolates persistent hardware faults (such as gyroscope drifts) using density-based novelty detection.
4. **Automated Triage & Safing**: Generates structured diagnostic reports for flight controllers and triggers spacecraft emergency safing modes when necessary.

### Who is it for?
Aerospace operators, flight operations controllers, and satellite constellation managers looking to integrate AI copilots directly into ground control operations for real-time monitoring and automated troubleshooting.

### What makes it special?
- **Native MCP Integration**: Exposes real-time spacecraft state vectors and safety limits as live MCP resources.
- **Space Weather Intelligent Filtering**: Distinguishes between transient radiation noise and genuine hardware failures to prevent unnecessary safe-mode entries.
- **Copilot-Guided Triage**: Bundles structured prompt templates (`triage_fault`, `generate_pass_summary`) to provide AI agents with exact step-by-step troubleshooting instructions during anomaly passes.

---

## 💡 What is MCP?

The **Model Context Protocol (MCP)** is an open standard that enables AI assistants to securely connect to external tools, data sources, and services. Instead of being limited to static knowledge, an AI model calls **MCP servers** to retrieve live data, execute commands, and interface with physical and software systems.

Learn more about building and shipping MCP apps at [nitrostack.ai](https://nitrostack.ai).

---

## ✨ Features

- 🔌 **MCP-Native**: Seamlessly connects to any MCP client (Claude Desktop, Cursor, Custom LLM Ground Control Agents).
- 🛠️ **Full MCP Specification**: Exposes tools, live resources, and prompt templates.
- ⚡ **Nitrostack Powered**: Hosted on Nitrocloud for low-latency execution and high availability.
- 🔐 **Secure Design**: Ground station authorization and encrypted telemetry stream support.
- 🧩 **Composable**: Easily orchestrate with satellite trajectory predictors or orbital physics engines.

---

## 📐 Architecture & Capabilities

```
                  Telemetry Vector Stream
                            │
                            ▼
          ┌───────────────────────────────────┐
          │  Stage 1: Hard Safety Envelope    │ ──► Trip? ──► SAFE_MODE
          └───────────────────────────────────┘
                            │ (No)
                            ▼
          ┌───────────────────────────────────┐
          │  Stage 2: Space Weather Filter   │ ──► SAA & SEU Glitch? ──► CONTINUE_MISSION
          └───────────────────────────────────┘
                            │ (No)
                            ▼
          ┌───────────────────────────────────┐
          │  Stage 3: Sensor Fault Isolation  │ ──► Gyro Drift? ──► ISOLATE_SENSOR
          └───────────────────────────────────┘
                            │ (Nominal)
                            ▼
                     NOMINAL OPERATING MODE
```

---

## 🛠️ MCP Tools, Resources & Prompts

### Core MCP Modules (`src/modules/`)

| Module | Description | Tools / Operations |
| :--- | :--- | :--- |
| **`telemetry`** | Multi-stage safety envelope & threshold evaluator | `evaluate_telemetry` |
| **`anomaly`** | Fault scenario simulator & density novelty detector | `simulate_scenario`, `detect_novelty_anomaly` |
| **`alerts`** | Component isolation & spacecraft emergency safing | `isolate_fault_component`, `trigger_safe_mode` |
| **`reports`** | Structured diagnostic summary generator | `generate_diagnostic_report` |
| **`auth`** | Ground station security & permission verifier | `verify_ground_station_auth` |

### Resources
- `telemetry://current-state` — Real-time spacecraft telemetry vector.
- `telemetry://safety-thresholds` — Configured hardware limits (voltage, thermal, tumbling).
- `satellite://constellation-health` — Health matrix across active constellation satellites.

### Prompts
- `triage_fault` — Guided flight operations prompt for anomaly evaluation and recovery.
- `generate_pass_summary` — Summary template for ground station contact passes.

---

## 🌐 Live Demo

🚀 **Live MCP Endpoint:**
[https://satellite-fault-isolation-6a6c6d22-techie-zeekies-srmist.app.nitrocloud.ai](https://satellite-fault-isolation-6a6c6d22-techie-zeekies-srmist.app.nitrocloud.ai)

Point your MCP client directly to this URL to start querying spacecraft state vectors and diagnosing simulated satellite anomalies.

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- An MCP-compatible client (Claude Desktop, Cursor, VS Code with MCP extension)

### Installation

```bash
git clone https://github.com/Litheshan07/satellite-anomaly-mcp.git
cd satellite-anomaly-mcp
npm install
```

### Configuration

Copy the example environment configuration file:

```bash
cp .env.example .env
```

### Build & Run Locally

```bash
# Build TypeScript code
npm run build

# Run automated unit & integration tests
npm test

# Start local server
npm run start
```

---

## 🔌 Connect to an MCP Client

Add OrbitGuard to your MCP client configuration file (e.g., `claude_desktop_config.json` or Cursor settings):

```json
{
  "mcpServers": {
    "orbitguard": {
      "url": "https://satellite-fault-isolation-6a6c6d22-techie-zeekies-srmist.app.nitrocloud.ai"
    }
  }
}
```

Restart your client to expose OrbitGuard's tools, resources, and prompt templates directly to your AI assistant.

---

## ☁️ Deploy Your Own MCP App

Want to build and ship an MCP server like OrbitGuard? **[Nitrostack](https://nitrostack.ai)** enables fast creation, deployment, and hosting of MCP applications with zero infrastructure management.

👉 **Start building:** [https://nitrostack.ai](https://nitrostack.ai)

---

## 🌌 Explore More MCP Apps

- 🌙 Join the community on Reddit: [r/mcptothemoon](https://www.reddit.com/r/mcptothemoon/)
- 🧰 Discover MCP apps on the catalog: [Nitrostack Apps](https://nitrostack.ai/apps)

---

## ❓ FAQ

### What is an MCP server?
An MCP server implements the Model Context Protocol to securely expose tools, live data resources, and structured prompts to AI assistants.

### What does OrbitGuard do?
OrbitGuard provides telemetry safety checks, filters radiation noise (SEUs) in low-Earth orbit, isolates hardware component failures (like gyro drift), and automates spacecraft emergency safing.

### Which AI clients support OrbitGuard?
Any client compatible with the MCP standard, including Claude Desktop, Cursor, and custom LLM applications built with `@modelcontextprotocol/sdk`.

---

## 🏷️ Keywords

`Open Innovation` · `OrbitGuard` · `Satellite Fault Isolation` · `Anomaly Detection` · `MCP` · `Model Context Protocol` · `MCP Server` · `Nitrostack` · `Nitrocloud` · `Spacecraft Telemetry` · `AI Agents` · `Flight Operations`

---

## 📜 License

Distributed under the MIT License. See [LICENSE](LICENSE) for details.

---

Built with ❤️ using the Model Context Protocol on [Nitrostack](https://nitrostack.ai).

