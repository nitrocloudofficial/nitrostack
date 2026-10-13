# 🌍 RemitWise AI

> Every day, millions of people send money across borders—to support their families, pay university tuition, cover medical emergencies, or manage business payments. But choosing the right remittance provider isn't as simple as it should be. RemitWise AI simplifies cross-border transfers by providing intelligent, real-time comparisons, compliance checks, and optimal route recommendations.

![Model Context Protocol](https://img.shields.io/badge/Model%20Context%20Protocol-MCP-blue) ![Built with Nitrostack](https://img.shields.io/badge/Built%20with-Nitrostack-0A66FF) ![Status](https://img.shields.io/badge/status-live-brightgreen) [![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://www.python.org/) [![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg)](https://fastapi.tiangolo.com/) [![React](https://img.shields.io/badge/React-19-61DAFB.svg)](https://react.dev/) [![License](https://img.shields.io/badge/License-MIT-yellow.svg)](docs/LICENSE)

**RemitWise AI** is an [MCP (Model Context Protocol)](https://nitrostack.ai) server and multi-agent financial decision platform that extends AI assistants — like Claude, Cursor, and any MCP-compatible client — with real-world remittance capabilities. Built for the **NitroStack × Amrita University Hackathon** by **Team Sambar Spartans**, it is deployed on [Nitrostack](https://nitrostack.ai), the fastest way to build, deploy, and share MCP apps.

---

## 👥 Team Members & Project Information

- **Team Name**: **Sambar Spartans**
- **Hackathon**: **NitroStack × Amrita University Hackathon**
- **Project**: **RemitWise AI**
- **Official GitHub Repository**: [https://github.com/A-GOWSHIK/remitwise-ai.git](https://github.com/A-GOWSHIK/remitwise-ai.git)

### Team Members
1. **A-GOWSHIK** — [@A-GOWSHIK](https://github.com/A-GOWSHIK)
2. **vijay45057** — [@vijay45057](https://github.com/vijay45057)
3. **Kavin-2806** — [@Kavin-2806](https://github.com/Kavin-2806)

---

## 📑 Table of Contents

- [Overview](#overview)
- [What is MCP?](#what-is-mcp)
- [Features](#features)
- [Live Demo](#live-demo)
- [Multi-Agent System Architecture](#multi-agent-system-architecture)
- [3-Tier Automatic Fallback Mechanics](#3-tier-automatic-fallback-mechanics)
- [Getting Started](#getting-started)
- [Connect to an MCP Client](#connect-to-an-mcp-client)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Deploy Your Own MCP App](#deploy-your-own-mcp-app)
- [Explore More MCP Apps](#explore-more-mcp-apps)
- [FAQ](#faq)
- [Keywords](#keywords)
- [License](#license)

---

## Overview

Every day, millions of people send money across borders—to support their families, pay university tuition, cover medical emergencies, or manage business payments. But choosing the right remittance provider isn't as simple as it should be. Users are often forced to compare multiple platforms, understand fluctuating exchange rates, calculate hidden fees, estimate delivery times, and navigate compliance requirements, all while hoping they're making the right financial decision.

That's where RemitWise AI comes in. We've built an intelligent multi-agent platform that takes the complexity out of international remittances. Instead of making users do all the research themselves, our AI agents work together to analyze the transfer, compare providers in real time, evaluate compliance requirements, and recommend the best option based on the user's priorities—whether that's the lowest cost, fastest delivery, or best exchange rate.

But we didn't stop at recommendations. We wanted users to trust every decision our platform makes. That's why RemitWise AI provides transparent AI reasoning, live provider comparisons, interactive visualizations, a real-time agent execution pipeline, compliance insights, and exchange-rate predictions that help users decide not just where to send money, but also when to send it.

At its core, RemitWise AI isn't just another remittance tool—it's an intelligent financial decision-making platform that empowers users to transfer money with confidence, transparency, and peace of mind.

---

## What is MCP?

The **Model Context Protocol (MCP)** is an open standard that lets AI assistants securely connect to external tools, data sources, and services. Instead of being limited to what it was trained on, an AI model can call **MCP servers** to fetch live data, run actions, and integrate with real systems.

This project is one such MCP server. Learn more about building and shipping MCP apps at [nitrostack.ai](https://nitrostack.ai).

---

## Features

- 🔌 **MCP-native** — works with any MCP-compatible client (Claude Desktop, Cursor, NitroStudio, and more).
- 🛠️ **Tools, resources & prompts** — exposes structured capabilities for live exchange rates, provider comparison, compliance rules, and optimal routing to AI agents.
- 🧠 **Multi-Agent Intelligence** — orchestrated intent analysis using Ollama (`llama3.1`) / OpenAI with deterministic rule-based fallbacks.
- 💱 **Live Exchange Rates & Provider Analytics** — real-time mid-market rates via Frankfurter API and instant fee/payout comparison across 5 top providers (Wise, Remitly, Western Union, Revolut, OFX).
- 🛡️ **Automated Regulation & Compliance** — automatic KYC document requirement lookup and transfer limits across 10 international corridors.
- 💻 **Interactive React 19 UI** — TypeScript dashboard with interactive Recharts rate trends and Framer Motion micro-animations.
- ⚡ **Deployed on Nitrostack** — reliable, hosted, and instantly shareable.
- 🔐 **Secure by design** — secrets stay in environment variables, never in code.
- 🧩 **Composable** — combine with other MCP apps to build powerful AI workflows.

---

## Live Demo

🚀 **Live MCP endpoint:**
`https://remitwise-6a64f8d5-sambar-spartans-amrita-university-coimbatore.app.nitrocloud.ai`

Point your MCP client at the endpoint above to try it instantly. Prefer a hosted setup? Deploy your own in minutes on [Nitrostack](https://nitrostack.ai).

---

## Multi-Agent System Architecture

```text
                               ┌────────────────────────┐
                               │ User / Frontend / MCP  │
                               └───────────┬────────────┘
                                           │ POST /agent/chat
                                           ▼
                               ┌────────────────────────┐
                               │   OrchestratorAgent    │
                               │    (Planner Engine)    │
                               └───────────┬────────────┘
                                           │ Dynamic Task Delegation
                     ┌─────────────────────┼─────────────────────┐
                     ▼                     ▼                     ▼
           ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
           │  ExchangeAgent   │  │  ProviderAgent   │  │ ComplianceAgent  │
           │(Frankfurter API) │  │  (5 Providers)   │  │ (10 Regulations) │
           └─────────┬────────┘  └─────────┬────────┘  └─────────┬────────┘
                     │                     │                     │
                     └─────────────────────┼─────────────────────┘
                                           │ Sub-agent Data
                                           ▼
                               ┌────────────────────────┐
                               │     Merger Engine      │
                               └───────────┬────────────┘
                                           │ Unified Advisory Payload
                                           ▼
                               ┌────────────────────────┐
                               │ React 19 UI / MCP App  │
                               └────────────────────────┘
```

---

## 3-Tier Automatic Fallback Mechanics

To guarantee **zero downtime** and continuous availability:

```text
                       User Request
                            │
                            ▼
                  OrchestratorAgent
                            │
            ┌───────────────┴───────────────┐
            │   Primary LLM: OllamaProvider │
            │   (Host: localhost:11434)     │
            └───────────────┬───────────────┘
                            │ (If offline / timeout / connection refused)
                            ▼
            ┌───────────────────────────────┐
            │  Fallback 1: MockProvider     │
            │  (Offline simulation)         │
            └───────────────┬───────────────┘
                            │ (If LLM response malformed / invalid)
                            ▼
            ┌───────────────────────────────┐
            │  Fallback 2: RuleBasedPlanner │
            │  (Deterministic Heuristics)   │
            └───────────────────────────────┘
```

---

## Getting Started

### Prerequisites

- **Node.js 18+** (for frontend UI and Nitrostack CLI)
- **Python 3.11+** (for FastAPI backend & Multi-Agent engine)
- **Ollama** (Optional for local LLM planning with `llama3.1`)
- An MCP-compatible client (Claude Desktop, Cursor, NitroStudio, etc.)

### Installation

```bash
# Clone the repository
git clone https://github.com/A-GOWSHIK/remitwise-ai.git
cd remitwise-ai
```

### Backend Setup

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
# Windows:
venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# Install requirements
pip install -r requirements.txt

# Run FastAPI development server
python -m uvicorn api.app:app --reload
```
*Backend runs at `http://localhost:8000` (Interactive API docs at `http://localhost:8000/docs`).*

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start Vite dev server
npm run dev
```
*Frontend runs at `http://localhost:5173`.*

---

## Connect to an MCP Client

Add this server to your MCP client configuration (e.g., `claude_desktop_config.json` or Cursor MCP settings):

```json
{
  "mcpServers": {
    "remitwise-ai": {
      "url": "https://remitwise-6a64f8d5-sambar-spartans-amrita-university-coimbatore.app.nitrocloud.ai"
    }
  }
}
```

Restart your client, and the tools from **RemitWise AI** will automatically be available to your AI assistant.

---

## Technology Stack

| Domain | Technology |
|--------|------------|
| **Frontend** | React 19, TypeScript, Vite 8, TailwindCSS 4, Framer Motion, Recharts |
| **Backend** | Python 3.11+, FastAPI, Uvicorn, Pydantic v2, Requests |
| **AI Architecture** | Multi-Agent Orchestrator, Ollama (`llama3.1`), MockProvider, RuleBasedPlanner |
| **Protocol** | Model Context Protocol (MCP), NitroStack SDK |
| **Live FX API** | Frankfurter Exchange API |
| **Testing** | Pytest, Pytest-Asyncio (64 tests passing) |
| **Version Control** | Git, GitHub |

---

## Project Structure

```text
remitwise-ai/
├── backend/
│   ├── agents/              # AI specialist agents (Exchange, Provider, Compliance, Orchestrator)
│   ├── api/                 # FastAPI routes & app entry point
│   ├── data/                # Provider data & compliance rules JSON
│   ├── services/            # Core business logic services
│   ├── tests/               # 64 automated unit & integration tests
│   ├── utils/               # LRU cache & validators
│   ├── config.py            # Centralized settings
│   └── requirements.txt
├── frontend/
│   ├── src/                 # React components, hooks, contexts
│   └── package.json
├── docs/
│   ├── architecture/        # Architecture blueprints
│   ├── api.md               # REST API & MCP documentation
│   ├── workflow.md          # Multi-agent workflow spec
│   └── LICENSE              # MIT License
├── AGENTS.md
└── README.md
```

---

## Deploy Your Own MCP App

Want to build and ship an MCP server like this one? **[Nitrostack](https://nitrostack.ai)** lets you create, deploy, and host MCP apps in minutes — no infrastructure to manage.

👉 **Start building:** [https://nitrostack.ai](https://nitrostack.ai)

---

## Explore More MCP Apps

- 🌙 Discover and share MCP projects with the community on [r/mcptothemoon](https://www.reddit.com/r/mcptothemoon/)
- 🧰 Browse a growing catalog of MCP apps on [Nitrostack](https://nitrostack.ai/apps)

---

## FAQ

### What is an MCP server?

An MCP server implements the Model Context Protocol to expose tools, resources, and prompts that AI assistants can call. It lets an AI model take real actions and access live data.

### What does RemitWise AI do?

RemitWise AI is an intelligent multi-agent platform that takes the complexity out of international remittances. It analyzes transfers, compares providers in real-time, evaluates compliance requirements, and recommends optimal transfer routes based on cost, speed, or exchange rate priorities.

### Which AI clients does this work with?

Any MCP-compatible client, including Claude Desktop, Cursor, and NitroStudio. New clients are adding MCP support regularly.

### How does the Multi-Agent Fallback system work?

If the primary local LLM (`Ollama`) is unreachable or times out, RemitWise AI seamlessly switches to `MockProvider` and `RuleBasedPlanner`, ensuring 100% endpoint availability without failing request payloads.

### How do I deploy my own MCP app?

Use [Nitrostack](https://nitrostack.ai) to build, deploy, and host MCP apps without managing infrastructure.

---

## Keywords

`BFSI & FinTech` · `RemitWise AI` · `MCP` · `Model Context Protocol` · `MCP server` · `MCP app` · `AI tools` · `AI agents` · `LLM tools` · `Claude MCP` · `Nitrostack` · `deploy MCP server` · `build MCP app` · `Sambar Spartans` · `Amrita University`

---

## License

MIT © 2026

---

Built with ❤️ using the Model Context Protocol on [Nitrostack](https://nitrostack.ai). Share your MCP app on [r/mcptothemoon](https://www.reddit.com/r/mcptothemoon/).
