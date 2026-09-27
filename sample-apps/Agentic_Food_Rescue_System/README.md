# 🍲 Agentic Food Rescue System

[![Model Context Protocol](https://img.shields.io/badge/Model%20Context%20Protocol-MCP-blue)](https://nitrostack.ai)
[![Built with Nitrostack](https://img.shields.io/badge/Built%20with-Nitrostack-0A66FF)](https://nitrostack.ai)
[![Status](https://img.shields.io/badge/status-live-brightgreen)](#)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

> **The Problem:** Tons of edible food from restaurants go to waste daily because coordinating pickups with local NGOs is logistically difficult, extremely time-sensitive due to perishability, and burdened by language barriers across grassroots charity networks.

**Agentic_Food_Rescue_System** is a specialized [MCP (Model Context Protocol)](https://nitrostack.ai) server that extends AI assistants (like Claude, Cursor, and any MCP-compatible client) with real-world logistical capabilities. Deployed on [Nitrostack](https://nitrostack.ai), this intelligent system autonomously orchestrates food rescue operations with zero human friction.

---

## 📑 Table of Contents

- [Overview](#-overview)
- [What is MCP?](#-what-is-mcp)
- [Key Features](#-key-features)
- [Live Demo](#-live-demo)
- [Getting Started](#-getting-started)
- [Connect to an MCP Client](#-connect-to-an-mcp-client)
- [Deploy Your Own MCP App](#-deploy-your-own-mcp-app)
- [FAQ](#-faq)
- [Keywords](#-keywords)
- [License](#-license)

---

## 🚀 Overview

**What It Does:**  
Built on NitroStack, this system leverages AI to autonomously rescue surplus food. When a restaurant logs a donation, the system:
1. Queries a PostgreSQL database to calculate Haversine distances to nearby NGOs.
2. Strictly filters recipients based on capacity and perishability constraints.
3. Triggers an automated, real phone call to the optimal NGO via **Twilio**.
4. Uses **Sarvam AI's Text-to-Speech** to converse fluently in the NGO's regional language (e.g., Tamil, Hindi), bypassing English language barriers.
5. If accepted, formally allocates the food, assigns the nearest available gig-worker delivery executive, and handles end-to-end background SMS communications and JSONB audit logging.

**Who It Is For:**
- 🍽️ **Restaurants & Donors:** Seeking a zero-friction, automated way to prevent food waste and earn CSR metrics.
- 🤝 **Grassroots NGOs & Community Kitchens:** Receiving localized phone calls instead of struggling with complex English apps.
- 🛵 **Delivery Executives:** Looking for optimized, proximity-based gig tasks.

**What Makes It Special:**
- 🧠 **Agentic Autonomy:** Acting via Model Context Protocol (MCP) tools, an LLM orchestrator entirely manages dispatching, retry logic, and negotiations without human input.
- 🗣️ **Hyper-Local Voice Tech:** Integrating Sarvam AI for native-language Twilio voice calls completely removes digital friction for rural or local charity workers.
- 🛡️ **Safety-First Logistics:** Hard-coded SQL geospatial constraints ensure perishable (e.g., non-veg) food is only routed within safe micro-radii (5km).

---

## 🌐 What is MCP?

The **Model Context Protocol (MCP)** is an open standard that lets AI assistants securely connect to external tools, data sources, and services. Instead of being limited to training data, an AI model can call **MCP servers** to fetch live data, run actions, and integrate with real systems.

This project is one such MCP server. Learn more about building and shipping MCP apps at [Nitrostack](https://nitrostack.ai).

---

## ✨ Key Features

- 🔌 **MCP-native** — Works seamlessly with any MCP-compatible client (Claude, Cursor, etc.).
- 🛠️ **Tools, Resources & Prompts** — Exposes structured AI capabilities for complex logistical orchestration.
- ⚡ **Deployed on Nitrostack** — Reliable, hosted, and instantly shareable.
- 🔐 **Secure by Design** — Secrets stay in environment variables, never in code.
- 🧩 **Composable** — Combine with other MCP apps to build powerful multi-agent workflows.

---

## 🌍 Live Demo

🚀 **Live MCP endpoint:** `https://food-rescue-6a64f41b-team-dros-amrita-university-coimbatore.app.nitrocloud.ai`

Point your MCP client at the endpoint above to try it instantly. Prefer a hosted setup? Deploy your own in minutes on [Nitrostack](https://nitrostack.ai).

---

## 🛠️ Getting Started

### Prerequisites

- Node.js 18+ (or your project runtime)
- An MCP-compatible client (Claude Desktop, Cursor, etc.)

### Installation

```bash
git clone https://github.com/Team-DROS/Agentic_Food_Rescue_System.git
cd Agentic_Food_Rescue_System
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

---

## 🔗 Connect to an MCP Client

Add this server to your MCP client configuration. A typical entry looks like:

```json
{
  "mcpServers": {
    "agentic-food-rescue-system": {
      "url": "https://food-rescue-6a64f41b-team-dros-amrita-university-coimbatore.app.nitrocloud.ai"
    }
  }
}
```

Restart your client, and the logistical tools from this MCP server will be instantly available to your AI assistant.

---

## ☁️ Deploy Your Own MCP App

Want to build and ship an MCP server like this one? **[Nitrostack](https://nitrostack.ai)** lets you create, deploy, and host MCP apps in minutes — no infrastructure to manage.

👉 **Start building:** [nitrostack.ai](https://nitrostack.ai)

---

## ❓ FAQ

**What is an MCP server?**  
An MCP server implements the Model Context Protocol to expose tools, resources, and prompts that AI assistants can call. It lets an AI model take real actions and access live data.

**What does Agentic_Food_Rescue_System do?**  
It automates the end-to-end logistics of rescuing surplus restaurant food by matching it with nearby NGOs based on geospatial data and initiating regional-language voice calls to confirm pickups.

**Which AI clients does this work with?**  
Any MCP-compatible client, including Claude Desktop and Cursor. New clients are adding MCP support regularly.

**How do I deploy my own MCP app?**  
Use [Nitrostack](https://nitrostack.ai) to build, deploy, and host MCP apps without managing infrastructure.

---

## 🔑 Keywords

`Open Innovation` · `Agentic_Food_Rescue_System` · `MCP` · `Model Context Protocol` · `MCP server` · `MCP app` · `AI tools` · `AI agents` · `LLM tools` · `Claude MCP` · `Nitrostack` · `deploy MCP server` · `build MCP app`

---

## 📄 License

**Apache License 2.0** © 2026

---

*Built with ❤️ using the Model Context Protocol on [Nitrostack](https://nitrostack.ai). Share your MCP app on [r/mcptothemoon](https://www.reddit.com/r/mcptothemoon/).*
