# Proactive Financial Orchestrator for the Financially Included, Digitally Guided

> Most "AI financial advisors" are a chatbot bolted onto a bank app: you ask a question, an LLM answers from whatever context it's given, and the moment you close the tab, it stops thinking about you. Our financial orchestrator is built to be structurally different.

![Model Context Protocol](https://img.shields.io/badge/Model%20Context%20Protocol-MCP-blue) ![Built with Nitrostack](https://img.shields.io/badge/Built%20with-Nitrostack-0A66FF) ![Status](https://img.shields.io/badge/status-live-brightgreen)

**Proactive Financial Orchestrator for the Financially Included, Digitally Guided** is an MCP (Model Context Protocol) server that extends AI assistants — like Claude, Cursor, and any MCP-compatible client — with new, real-world capabilities. It is built and deployed on Nitrostack, the fastest way to build, deploy, and share MCP apps.

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

Most "AI financial advisors" are a chatbot bolted onto a bank app: you ask a question, an LLM answers from whatever context it's given, and the moment you close the tab, it stops thinking about you. Our financial orchestrator is built to be structurally different — a system that watches, calculates, and acts on a user's behalf continuously, while the AI itself is never trusted to touch a single number.

**Deterministic core, not a chatbot guessing.** Every score you see — the six-dimension Financial Health Score, the Safe-to-Spend limit, the Credit Trust Score — is computed by hard-coded, testable Python engines benchmarked against RBI, SEBI, and IT Act standards. The LLM layer (Google Gemini, orchestrated via LangChain and CrewAI) is architecturally forbidden from performing arithmetic; it only ever narrates numbers that have already been verified. This isn't a prompting choice — it's a hard boundary, which means the system cannot hallucinate a financial figure by construction, not by hoping the prompt holds.

**A crew of agents, not one model doing everything.** Instead of a single LLM handling every task, We Win runs six narrowly-scoped agents — Aggregator, Context & Incident, Market Watch, Loan Matching, Explainer, and Execution — each with exactly one job and exactly the MCP tools needed to do it. None of them ever holds a database credential. Every read and every write is mediated through a purpose-built MCP tool, so a hallucinated or malformed request from an agent can never reach Supabase or Neo4j directly — a non-negotiable requirement when the data is financial.

**Genuinely proactive, not reactive.** A static balance tells you what you have; it doesn't tell you what you can safely spend after tomorrow's EMI and next week's rent. We Win's Safe-to-Spend Guardian nets obligations against income in real time and alerts users before they overdraw — while a life event (a new baby, a job change) instantly re-weights only the affected part of their plan, without re-running the whole system.

## What is MCP?
The Model Context Protocol (MCP) is an open standard that lets AI assistants securely connect to external tools, data sources, and services. Instead of being limited to what it was trained on, an AI model can call MCP servers to fetch live data, run actions, and integrate with real systems.

This project is one such MCP server. Learn more about building and shipping MCP apps at nitrostack.ai.

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
git clone https://github.com/DarshanRadhakrishnan/AI-Driven-Proactive-Financial-Orchestrator.git
cd AI-Driven-Proactive-Financial-Orchestrator
npm install
npm install --prefix backend
npm install --prefix frontend
```

### Configuration
Copy the example environment file and add your own values:
```bash
cp .env.example .env
```

### Run
```bash
npm run dev
```

## Connect to an MCP Client
Add this server to your MCP client configuration. A typical entry looks like:
```json
{
  "mcpServers": {
    "proactive-financial-orchestrator": {
      "command": "npm",
      "args": ["run", "dev"]
    }
  }
}
```
Restart your client and the tools from this MCP server will be available to your AI assistant.

## Deploy Your Own MCP App
Want to build and ship an MCP server like this one? Nitrostack lets you create, deploy, and host MCP apps in minutes — no infrastructure to manage.
👉 Start building: https://nitrostack.ai

## Explore More MCP Apps
- 🌙 Discover and share MCP projects with the community on r/mcptothemoon
- 🧰 Browse a growing catalog of MCP apps on Nitrostack

## FAQ

**What is an MCP server?**
An MCP server implements the Model Context Protocol to expose tools, resources, and prompts that AI assistants can call. It lets an AI model take real actions and access live data.

**What does Proactive Financial Orchestrator for the Financially Included, Digitally Guided do?**
Most "AI financial advisors" are a chatbot bolted onto a bank app: you ask a question, an LLM answers from whatever context it's given, and the moment you close the tab, it stops thinking about you. We Win is structurally different, providing real-time safe-to-spend tracking, proactive incident routing, and fully deterministic core calculations while maintaining zero-trust database exposure.

**Which AI clients does this work with?**
Any MCP-compatible client, including Claude Desktop and Cursor. New clients are adding MCP support regularly.

**How do I deploy my own MCP app?**
Use Nitrostack to build, deploy, and host MCP apps without managing infrastructure.

## Keywords
`BFSI & FinTech` · `Proactive Financial Orchestrator` · `MCP` · `Model Context Protocol` · `MCP server` · `MCP app` · `AI tools` · `AI agents` · `LLM tools` · `Claude MCP` · `Nitrostack` · `deploy MCP server` · `build MCP app`

## License
MIT © 2026

---
*Built with ❤️ using the Model Context Protocol on Nitrostack. Share your MCP app on r/mcptothemoon.*
