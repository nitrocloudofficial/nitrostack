# Continuum Forge — Tacit Knowledge Capture, Codification & Transfer Engine

> Continuum Forge bridges the generational skill gap in industrial manufacturing by turning fragile, unwritten expert knowledge into verifiable, automated safety rules.

![Model Context Protocol](https://img.shields.io/badge/Model%20Context%20Protocol-MCP-blue) ![Built with Nitrostack](https://img.shields.io/badge/Built%20with-Nitrostack-0A66FF) ![Status](https://img.shields.io/badge/status-live-brightgreen)

**Continuum Forge — Tacit Knowledge Capture, Codification & Transfer Engine** is an [MCP (Model Context Protocol)](https://nitrostack.ai) server that extends AI assistants — like Claude, Cursor, and any MCP-compatible client — with new, real-world capabilities. It is built and deployed on [Nitrostack](https://nitrostack.ai), the framework for building, deploying, and sharing MCP apps.

## Table of Contents

- [Overview](#overview)
- [What is MCP?](#what-is-mcp)
- [Application Canvas & System Screenshots](#application-canvas--system-screenshots)
- [Features](#features)
- [Repository Structure & File Breakdown](#repository-structure--file-breakdown)
- [7-Step Knowledge Pipeline](#7-step-knowledge-pipeline)
- [Exposed MCP Tools & Prompts](#exposed-mcp-tools--prompts)
- [Live Demo & Testing UI](#live-demo--testing-ui)
- [How Judges & AI Clients Test Your Chat & UI](#how-judges--ai-clients-test-your-chat--ui)
- [Getting Started](#getting-started)
- [Connect to an MCP Client](#connect-to-an-mcp-client)
- [Deploy Your Own MCP App](#deploy-your-own-mcp-app)
- [Explore More MCP Apps](#explore-more-mcp-apps)
- [FAQ](#faq)
- [Keywords](#keywords)
- [License](#license)

## Overview

Continuum Forge bridges the generational skill gap in industrial manufacturing by turning fragile, unwritten expert knowledge into verifiable, automated safety rules.

### Problem Statement
Over 80% of critical manufacturing rules of thumb live only in senior technicians' heads. When veteran technicians retire or leave shifts, decades of unwritten safety knowledge and equipment diagnostics vanish—leading to costly motor burnouts, plant downtime, and safety hazards.

### Solution Overview
Continuum Forge operates an Agentic Model Context Protocol (MCP) pipeline that:
1. **Grounded Elicitation**: Ingests raw interview transcripts from senior technicians.
2. **Rule Codification**: Codifies unwritten human heuristics into machine-readable Structured JSON AST (Abstract Syntax Tree) rules.
3. **Database Validation**: Validates rules statistically against real-time and historical Neon PostgreSQL sensor telemetry (e.g. Pump B vibration and temperature logs).
4. **Real-Time Coaching**: Delivers instant guidance to junior operators with dynamic verbosity settings ("short" for emergency fixes vs "detailed" for mentor training).
5. **Langfuse Observability**: Wraps every tool call in Langfuse telemetry for 100% auditability and zero AI hallucination.

### Who It Is For
Smart factories, industrial plant managers, and junior technicians looking to preserve senior expertise before retirement and prevent catastrophic equipment burnouts.

### What Makes It Special
Built natively on the NitroStack MCP Framework with custom Next.js MCP Widgets (Rule AST Visualizer, Emergency Guidance Card, Database Visualizer), live Neon DB telemetry, and full Langfuse tracing.

## What is MCP?

The **Model Context Protocol (MCP)** is an open standard that lets AI assistants securely connect to external tools, data sources, and services. Instead of being limited to static training data, an AI model can call **MCP servers** to fetch live data, run actions, and integrate with real systems.

This project is one such MCP server. Learn more about building and shipping MCP apps at [nitrostack.ai](https://nitrostack.ai).

## Application Canvas & System Screenshots

### 1. NitroStudio App Canvas & MCP Architecture Map
![NitroStudio App Canvas](docs/screenshots/nitrostudio-app-canvas.png)
*Figure 1: Full interactive MCP architecture canvas in NitroStudio. Shows the central NitroStack Agent node connected to 6 active pipeline tools (`codify_transcript`, `extract_parameters`, `query_neon_database`, `validate_heuristic`, `generate_explanation`, `coach_apprentice`), prompts, tasks, resources, and health checks over HTTP transport.*

---

### 2. Master Orchestrator Scenario Execution in NitroChat
![NitroChat Pipeline Start](docs/screenshots/nitrochat-pipeline-start.png)
*Figure 2: Initiation of the Pump B motor burnout scenario in NitroChat. A junior technician reports live sensor readings (vibration: 5.0 mm/s, temperature: 95°C) and requests immediate short-verbosity emergency instructions.*

---

### 3. Rule Codification & Neon Database Validation Output
![NitroChat Rule Validation](docs/screenshots/nitrochat-rule-validation.png)
*Figure 3: Output showing the lead tech's heuristic codified into a Structured JSON AST (`IF Vibration > 4.5 mm/s AND Temp > 90°C THEN SHUTDOWN`), parameter extraction, and statistical Neon PostgreSQL database validation results.*

---

### 4. Emergency Junior Operator Action Checklist
![NitroChat Emergency Action](docs/screenshots/nitrochat-emergency-action.png)
*Figure 4: Immediate operational response generated by `coach_apprentice` tool with short verbosity mode. Instructs the junior technician to hit the kill switch, notify the shift lead, and prevent equipment burnout.*

---

### 5. Langfuse Cloud Real-Time Telemetry & Span Traces
![Langfuse Telemetry Spans](docs/screenshots/langfuse-telemetry-spans.png)
*Figure 5: Live Langfuse Cloud tracing table showing end-to-end telemetry spans for tool executions (`coach_apprentice`, `generate_explanation`, `validate_heuristic`, `extract_parameters`, `query_neon_database`, `codify_transcript`) detailing execution latencies, inputs, and output payloads.*

## Features

- **MCP-Native Architecture**: Works seamlessly with any MCP-compatible client (Claude Desktop, Cursor, NitroStudio).
- **Structured AST Codification**: Converts natural language heuristics into deterministic JSON AST rules.
- **Statistical DB Telemetry Validation**: Executes live SQL queries against Neon PostgreSQL sensor databases to calculate historical confidence.
- **Dynamic Verbosity Control**: Supports `verbosity: "short"` for emergency immediate actions and `verbosity: "detailed"` for full coaching.
- **Langfuse Observability Integration**: Every tool execution logs input, execution latency, and output payloads to Langfuse Cloud.
- **Interactive Next.js MCP Widgets**: Includes inline rendered visual widgets for AST rules, emergency guidance cards, and database tables.
- **Deployed on Nitrostack**: Reliable, hosted, and instantly accessible via HTTP SSE / Streamable endpoints.

## Repository Structure & File Breakdown

### 1. Documentation (`docs/`)
- `docs/submission-checklist.md`: Official hackathon verification, platform rules audit, and environment variable checklist.
- `docs/getting-started.md`: Comprehensive local & cloud installation, configuration, and environment setup instructions.
- `docs/index.md`: Master system architecture document detailing the 7-step pipeline and database schemas.
- `docs/verification.md`: End-to-end testing procedures, sample prompts, and telemetry inspection guide.
- `docs/screenshots/`: Visual showcase screenshots for NitroStudio canvas, NitroChat execution, widget responses, and Langfuse telemetry spans.

### 2. Backend MCP Pipeline Modules (`src/modules/`)
- `src/modules/elicitation/`: `conduct_interview` tool for processing raw expert grounding transcripts.
- `src/modules/codification/`: `codify_transcript` tool for converting natural language into Structured JSON ASTs.
- `src/modules/extraction/`: `extract_parameters` tool for isolating numerical parameters, logical operators, and thresholds.
- `src/modules/validation/`: `query_neon_database` & `validate_heuristic` tools for executing SQL queries against Neon PostgreSQL sensor telemetry (`sensor_readings` table).
- `src/modules/explainability/`: `generate_explanation` tool for synthesizing validation confidence narratives.
- `src/modules/mentor/`: `coach_apprentice` tool for delivering real-time senior technician coaching cards with `short` or `detailed` verbosity.

### 3. Telemetry & Infrastructure (`src/telemetry/`, `src/health/`, `src/`)
- `src/telemetry/langfuse.service.ts`: Wraps tool executions in Langfuse Cloud spans, logging query inputs, execution latency, and outputs.
- `src/health/system.health.ts`: Controller endpoint for system health diagnostics.
- `src/app.module.ts`: Root NitroStack module registering all pipeline tools, controllers, and services.
- `src/index.ts`: Application entrypoint configuring server transports (`/mcp` HTTP streamable endpoint and `/sse`).

### 4. Interactive Web Dashboard & MCP Widgets (`src/widgets/`)
- `src/widgets/app/rule-ast-widget/`: Rendered JSON AST visualization widget for displaying active conditions and logical operators.
- `src/widgets/app/mentor-guidance-widget/`: Red-alert emergency coaching card widget for field operators.
- `src/widgets/app/database-visualizer/`: Rendered query result table widget displaying Neon PostgreSQL sensor readings.
- `src/widgets/app/page.tsx`: Standalone industrial Web Dashboard with live chat interface, pipeline step indicators, and Pump B scenario trigger button.
- `src/widgets/widget-manifest.json`: NitroStack manifest mapping widget URIs to Next.js routes.

### 5. Test Suite (`tests/`)
- `tests/test-validation.ts`: Tsx validation script for testing the statistical validation engine against sample telemetry payloads.

## 7-Step Knowledge Pipeline

1. **Grounding Interview (`conduct_interview`)**: Captures raw domain expert interviews.
2. **Codification (`codify_transcript`)**: Extracts AST JSON rules from expert statements.
3. **Parameter Extraction (`extract_parameters`)**: Isolates numerical parameters, operators, and thresholds.
4. **Database Validation (`query_neon_database` & `validate_heuristic`)**: Queries historical logs to calculate statistical significance.
5. **Explainability Engine (`generate_explanation`)**: Produces evidence narratives explaining validation results.
6. **Rule Codification (`codify_rule`)**: Codifies validated rules into the production rule registry.
7. **Mentor Coaching (`coach_apprentice`)**: Delivers real-time operational guidance to field technicians.

## Exposed MCP Tools & Prompts

### Tools
- `codify_transcript`: Converts interview text into Structured JSON AST rules.
- `extract_parameters`: Extracts parameters, operators, and thresholds into JSON schemas.
- `query_neon_database`: Executes SQL queries against Neon PostgreSQL sensor database.
- `validate_heuristic`: Computes statistical confidence against historical machine data.
- `generate_explanation`: Generates validation evidence summaries.
- `coach_apprentice`: Provides role-based guidance with adjustable verbosity (`short` / `detailed`).

### Prompts
- `rule_generation`: System instructions for formatting parseable JSON AST rules.
- `mentor_persona`: Configures the LLM as a veteran manufacturing technician with 30 years of floor experience.

## Live Demo & Testing UI

- **Hosted NitroChat Web UI:** https://nitrochat-con-soumiths-llm-abusers-amrita-university-coimbatore.app.nitrocloud.ai/embed
- **Live MCP Endpoint:** `https://continuum-for-soumiths-llm-abusers-amrita-university-coimbatore.app.nitrocloud.ai/mcp`

You can test the interactive assistant directly in your browser using the Hosted NitroChat Web UI link above.

## How Judges & AI Clients Test Your Chat & UI

1. **Direct Web Browser Testing (NitroChat Web UI)**:
   Judges can open the hosted chat interface directly at:
   `https://nitrochat-con-soumiths-llm-abusers-amrita-university-coimbatore.app.nitrocloud.ai/embed`

2. **Connecting External MCP Clients (NitroStudio / Claude Desktop / Cursor)**:
   Judges can connect any MCP-compatible client directly to `https://continuum-for-soumiths-llm-abusers-amrita-university-coimbatore.app.nitrocloud.ai/mcp`. Opening `/mcp` in a standard browser streams raw Server-Sent Events (SSE), confirming the backend is live and operational.

3. **Interactive MCP Widgets**:
   When the AI client calls tools like `coach_apprentice` or `codify_transcript`, NitroStack automatically fetches and renders custom interactive Next.js frontend widgets (`Rule AST Visualizer`, `Emergency Guidance Card`, `Database Visualizer`) directly inside the chat interface.

4. **Standalone Industrial Web Dashboard**:
   To test the standalone dashboard locally, run `npm start` and visit `http://localhost:3001` to access the full interactive interface with pipeline step indicators and trigger buttons.

## Getting Started

### Prerequisites

- Node.js 18+ (or your project runtime)
- An MCP-compatible client (Claude Desktop, Cursor, NitroStudio)

### Installation

```bash
git clone https://github.com/AnirudhJayan22083/continuum-forge.git
cd continuum-forge
npm install
```

### Configuration

Copy the example environment file and add your own values:

```bash
cp .env.example .env
```

### Environment Variables

```env
NODE_ENV=production
PORT=3000
DATABASE_URL=postgres://user:password@ep-sample-pooler.neon.tech/neondb?sslmode=require
LANGFUSE_PUBLIC_KEY=pk-lf-xxxx
LANGFUSE_SECRET_KEY=sk-lf-xxxx
LANGFUSE_BASE_URL=https://jp.cloud.langfuse.com
GEMINI_API_KEY=your_gemini_api_key_here
```

### Run

```bash
npm run build
npm run start
```

## Connect to an MCP Client

Add this server to your MCP client configuration. A typical entry looks like:

```json
{
  "mcpServers": {
    "continuum-forge": {
      "url": "https://continuum-for-soumiths-llm-abusers-amrita-university-coimbatore.app.nitrocloud.ai/mcp"
    }
  }
}
```

Restart your client and the tools from this MCP server will be available to your AI assistant.

## Deploy Your Own MCP App

Want to build and ship an MCP server like this one? **[Nitrostack](https://nitrostack.ai)** lets you create, deploy, and host MCP apps in minutes — no infrastructure to manage.

**Start building:** [https://nitrostack.ai](https://nitrostack.ai)

## Explore More MCP Apps

- Discover and share MCP projects with the community on [r/mcptothemoon](https://www.reddit.com/r/mcptothemoon/)
- Browse a growing catalog of MCP apps on [Nitrostack](https://nitrostack.ai/apps)

## FAQ

### What is an MCP server?

An MCP server implements the Model Context Protocol to expose tools, resources, and prompts that AI assistants can call. It lets an AI model take real actions and access live data.

### What does Continuum Forge — Tacit Knowledge Capture, Codification & Transfer Engine do?

Continuum Forge bridges the generational skill gap in industrial manufacturing by turning fragile, unwritten expert knowledge into verifiable, automated safety rules. It codifies human heuristics, validates them against Neon PostgreSQL sensor telemetry, and coaches junior technicians in real time.

### Which AI clients does this work with?

Any MCP-compatible client, including Claude Desktop, Cursor, and NitroStudio. New clients are adding MCP support regularly.

### How do I deploy my own MCP app?

Use [Nitrostack](https://nitrostack.ai) to build, deploy, and host MCP apps without managing infrastructure.

## Keywords

`Manufacturing & Industry 4.0` · `Continuum Forge` · `Tacit Knowledge Capture` · `MCP` · `Model Context Protocol` · `MCP server` · `MCP app` · `AI tools` · `AI agents` · `LLM tools` · `Claude MCP` · `Nitrostack` · `Langfuse` · `Neon PostgreSQL`

## License

MIT © 2026

---

Built using the Model Context Protocol on [Nitrostack](https://nitrostack.ai). Share your MCP app on [r/mcptothemoon](https://www.reddit.com/r/mcptothemoon/).
