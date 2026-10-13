# Decision Trail — Institutional Memory That Cites Its Sources

> When someone leaves a team, the reasoning behind their decisions leaves with them — Slack threads and meeting transcripts capture what happened, but never why.

![Model Context Protocol](https://img.shields.io/badge/Model%20Context%20Protocol-MCP-blue) ![Built with Nitrostack](https://img.shields.io/badge/Built%20with-Nitrostack-0A66FF) ![Status](https://img.shields.io/badge/status-live-brightgreen)

**Decision Trail — Institutional Memory That Cites Its Sources** is an [MCP (Model Context Protocol)](https://nitrostack.ai) server that extends AI assistants — like Claude, Cursor, and any MCP-compatible client — with new, real-world capabilities. It is built and deployed on [Nitrostack](https://nitrostack.ai), the fastest way to build, deploy, and share MCP apps.

It helps teams retain, audit, and navigate their institutional memory by automatically parsing meeting transcripts and conversations, extracting structured decision events, linking them into an interactive decision graph, and providing direct citations back to the source transcripts.

---

## Table of Contents

- [Overview](#overview)
- [What is MCP?](#what-is-mcp)
- [Features & Capabilities](#features--capabilities)
- [Exposed MCP Tools](#exposed-mcp-tools)
- [Live Demo & Web Interface](#live-demo--web-interface)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Database Setup](#database-setup)
  - [Configuration](#configuration)
  - [Build and Seed Demo Data](#build-and-seed-demo-data)
  - [Run the Application](#run-the-application)
- [Connect to an MCP Client](#connect-to-an-mcp-client)
  - [Claude Desktop Configuration](#claude-desktop-configuration)
  - [Cursor Configuration](#cursor-configuration)
- [Deploy Your Own MCP App](#deploy-your-own-mcp-app)
- [Explore More MCP Apps](#explore-more-mcp-apps)
- [FAQ](#faq)
- [Keywords](#keywords)
- [License](#license)

---

## Overview

When someone leaves a team, the reasoning behind their decisions leaves with them — Slack threads and meeting transcripts capture what happened, but never *why*. 

**Decision Trail** is an AI agent that ingests a team's meetings and conversations, reconstructs the rationale behind past decisions, and answers questions like *"Why did we choose Vendor A over B?"* with a structured, sourced answer — listing the decider, date, alternatives considered, and a clickable citation back to the exact moment it came from. 

If no rationale exists in the record, it says so rather than guessing. Built to make enterprise decision-making auditable, not just searchable.

---

## What is MCP?

The **Model Context Protocol (MCP)** is an open standard that lets AI assistants securely connect to external tools, data sources, and services. Instead of being limited to what it was trained on, an AI model can call **MCP servers** to fetch live data, run actions, and integrate with real systems.

This project is one such MCP server. Learn more about building and shipping MCP apps at [nitrostack.ai](https://nitrostack.ai).

---

## Features & Capabilities

- 🔌 **MCP-native** — Works seamlessly with Claude Desktop, Cursor, or any MCP-compatible client.
- 📂 **Smart Ingestion** — Automatically chunks transcript text, computes 1536-dimensional OpenAI embeddings, and persists them.
- 🧠 **Live Decision Extraction** — Uses LLMs to synthesize structured decision records (decisions, rationale, alternatives, owner, topic, status) from raw dialogue.
- 🔗 **Relationship Graphing** — Classes relationships between decisions (e.g., if decision B *supersedes*, *depends on*, or *revises* decision A) to build an auditable lineage tree.
- 🔍 **Hybrid Search** — Search over raw conversational segments or structured decisions using vector similarity search.
- 🔬 **Claim Verification** — Double-checks LLM assertions against original transcript segments to prevent hallucinations.
- 💻 **Interactive React UI Client** — A stunning dashboard containing a live chat widget and an interactive D3 decision node graph representing decision lineages.

---

## Exposed MCP Tools

The Decision Trail server exposes the following tools directly to AI clients:

| Tool Name | Input Schema | Description |
| :--- | :--- | :--- |
| `ingest_transcript` | `transcript_text`, `source_name`, `metadata?` | Chunks transcript text, computes embeddings, and persists to the database. |
| `search_segments` | `query`, `top_k?` | Performs a vector similarity search over raw transcript segments. |
| `search_decisions` | `query`, `top_k?` | Performs a vector similarity search over pre-extracted structured decisions. |
| `get_related_decisions` | `decision_id` | Retrieves connected, superseding, or dependent decisions from the graph. |
| `get_segment_context` | `segment_id`, `window?` | Fetches surrounding transcript lines before and after a target segment. |
| `extract_decision_from_segments` | `segment_ids` | Analyzes segments, extracts a structured decision, and persists if high confidence. |
| `verify_claim` | `claim`, `segment_ids` | Verifies whether a specific claim is supported by evidence in the given segments. |

---

## Live Demo & Web Interface

🚀 **Live MCP Endpoint & UI Client:** [https://decision-trail-6a64a8-codespectrum-amrita-university-coimbatore.app.nitrocloud.ai](https://decision-trail-6a64a8-codespectrum-amrita-university-coimbatore.app.nitrocloud.ai)

- Point your MCP client to the URL above to integrate its tools.
- Open the URL in your browser to interact with the visual chat console and D3 decision lineage graph.

---

## Getting Started

### Prerequisites

- [Node.js 18+](https://nodejs.org)
- [Docker](https://www.docker.com/) (to run the PostgreSQL database container with pgvector support)

### Installation

Clone the repository and install all dependencies:

```bash
git clone https://github.com/your-username/your-mcp-project.git
cd decision-trail-institutional-memory-that-cites-its-sources
npm install
```

### Database Setup

Start the pre-configured Postgres instance using Docker Compose. This automatically initializes the schema from `schema.sql` (enabling `pgvector` and creating the tables):

```bash
docker-compose up -d
```

### Configuration

Copy the example environment file and fill in your API credentials:

```bash
cp .env.example .env
```

Ensure the following variables are defined in your `.env`:

```env
OPENAI_API_KEY=your_openai_api_key
GEMINI_API_KEY=your_gemini_api_key
DATABASE_URL=postgres://decisiontrail:decisiontrail@localhost:5433/decisiontrail
PORT=3000
EXTRACTION_CONFIDENCE_THRESHOLD=0.7
```

### Build and Seed Demo Data

Compile the project and run the rehearsal script to clean, ingest, and pre-extract the demo transcripts:

```bash
# 1. Compile the server
npm run build

# 2. Build the client application
cd client
npm install
npm run build
cd ..

# 3. Seed the Postgres database with demo transcripts
node dist/run_demo_rehearsal.js
```

### Run the Application

Start the Express application (which hosts the API and serves the React dashboard statically):

```bash
npm start
```

Open `http://localhost:3000` (or the port defined in `.env`) in your browser to try out the dashboard!

---

## Connect to an MCP Client

### Claude Desktop Configuration

Add this server to your Claude Desktop config file:

- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

Add the following config (ensure you replace `/path/to/decision-trail` with the absolute path to your cloned directory):

```json
{
  "mcpServers": {
    "decision-trail": {
      "command": "node",
      "args": ["/path/to/decision-trail/dist/index.js"],
      "env": {
        "OPENAI_API_KEY": "your_openai_api_key",
        "GEMINI_API_KEY": "your_gemini_api_key",
        "DATABASE_URL": "postgres://decisiontrail:decisiontrail@localhost:5433/decisiontrail"
      }
    }
  }
}
```

Restart Claude Desktop, and the tools will appear in the input box.

### Cursor Configuration

1. Open **Cursor Settings** > **Features** > **MCP**.
2. Click **+ Add New MCP Server**.
3. Fill in:
   - **Name:** `Decision Trail`
   - **Type:** `command`
   - **Command:** `node /path/to/decision-trail/dist/index.js`
4. Click **Save**.

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

### How does Decision Trail verify claims?

It uses the `verify_claim` tool which runs the candidate claim alongside matching raw conversational segments through an LLM validator. This ensures any statement made is fully backed by real quotes.

### Which AI clients does this work with?

Any MCP-compatible client, including Claude Desktop, Cursor, and more.

### How do I deploy my own MCP app?

Use [Nitrostack](https://nitrostack.ai) to build, deploy, and host MCP apps without managing infrastructure.

---

## Keywords

`Enterprise AI & Workplace Automation` · `Decision Trail — Institutional Memory That Cites Its Sources` · `MCP` · `Model Context Protocol` · `MCP server` · `MCP app` · `AI tools` · `AI agents` · `LLM tools` · `Claude MCP` · `Nitrostack` · `deploy MCP server` · `build MCP app`

---

## License

MIT © 2026

---

Built with ❤️ using the Model Context Protocol on [Nitrostack](https://nitrostack.ai). Share your MCP app on [r/mcptothemoon](https://www.reddit.com/r/mcptothemoon/).
