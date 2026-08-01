# 🛡️ C Sentinel — Autonomous AI Contract Sentinel

> **An enterprise-grade, MCP-powered AI agent system for automated contract ingestion, clause extraction, continuous risk monitoring, and real-time LLM integration.**

---

## 🚀 Live Demos

- **Frontend Dashboard (Vercel):** [https://contract-sentinel-seven.vercel.app](https://contract-sentinel-seven.vercel.app)
- **MCP Backend Endpoint (NitroCloud):** `https://c-sentinel-6a6ca7d2-dcoders-srmist.app.nitrocloud.ai`

---

## 📌 Overview

**C Sentinel** is an autonomous risk-analysis agent built to solve enterprise legal bottlenecks. Powered by the **Model Context Protocol (MCP)**, C Sentinel continuously monitors, ingests, and analyzes legal agreements (MSAs, NDAs, SLAs) to extract critical risk factors, uncapped liabilities, and dangerous SLA terms. 

It provides both a modern, interactive web dashboard for human operators and a standardized MCP server interface that seamlessly integrates with external LLMs like ChatGPT and Claude.

---

## ✨ Key Features

- **📄 Automated Contract Ingestion:** Ingest vendor agreements and instantly calculate overall risk scores (0–100%).
- **🧠 Continuous Sentinel Analysis Cycle:** Autonomous background cycle that audits all stored agreements for non-compliant clauses.
- **⚡ Model Context Protocol (MCP) Native:** Exposed as a streamable MCP server, allowing LLMs (like ChatGPT or Claude Desktop) to invoke tool actions (`ingest`, `fetch_contracts`, `run_analysis`) natively.
- **📊 Real-Time Operations Dashboard:** Built with React, Vite, and Tailwind CSS to display contract velocity, risk breakdown charts, and active alerts.

---

## 🏗️ Architecture & Deployment

```
   ┌─────────────────────────────────────────────────────────┐
   │                  ChatGPT / LLM Connectors               │
   └────────────────────────────┬────────────────────────────┘
                                │ (MCP Protocol)
                                ▼
 ┌──────────────────────┐   ┌───────────────────────────────┐
 │   Vercel Frontend    │──▶│      NitroCloud Backend       │
 │    (React / Vite)    │   │     (NitroStack MCP Server)   │
 └──────────────────────┘   └───────────────────────────────┘
```

| Component | Tech Stack | Hosting Platform |
| :--- | :--- | :--- |
| **Frontend UI** | React, TypeScript, Vite, Tailwind CSS | **Vercel** |
| **Agent Backend** | Node.js, TypeScript, NitroStack MCP SDK | **NitroCloud** |
| **Repository** | Monorepo Structure (`/ui` & `/server`) | **GitHub** |

---

## ⚙️ Environment Variables

### Frontend (`/ui`)
Configure the backend connection URL in your `.env` file or deployment settings:
```env
VITE_API_BASE_URL=https://c-sentinel-6a6ca7d2-dcoders-srmist.app.nitrocloud.ai
```

---

## 🛠️ Local Development Quickstart

### Prerequisites
- Node.js (v18+)
- npm / pnpm

### 1. Clone the Repository
```bash
git clone https://github.com/sachin0610-srm/contract-sentinel.git
cd contract-sentinel
```

### 2. Run Backend (MCP Server)
```bash
cd server
npm install
npm run dev
```

### 3. Run Frontend UI
```bash
cd ../ui
npm install
npm run dev
```
Open `http://localhost:5173` to access the local dashboard.

---

## 🔌 Connecting to ChatGPT / External MCP Clients

1. Open **ChatGPT** $\rightarrow$ **Settings** $\rightarrow$ **Developer Mode / Apps**.
2. Add a new **MCP Connector / Server**.
3. Set **Server URL** to:
   ```text
   https://c-sentinel-6a6ca7d2-dcoders-srmist.app.nitrocloud.ai/mcp
   ```
4. Set **Authentication** to `No Auth` and save!

---

## 👥 Authors & Credits

Developed with ❤️ for the Hackathon by **Sachin K** ([@sachin0610-srm](https://github.com/sachin0610-srm)).
