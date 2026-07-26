# Aloka - MCP-Driven GraphRAG for DevOps Diagnostics

> Aloka is an AI-native incident resolution platform built entirely around the Model Context Protocol (MCP).

![Model Context Protocol](https://img.shields.io/badge/Model%20Context%20Protocol-MCP-blue) ![Built with Nitrostack](https://img.shields.io/badge/Built%20with-Nitrostack-0A66FF) ![Status](https://img.shields.io/badge/status-live-brightgreen)

**Aloka - MCP-Driven GraphRAG for DevOps Diagnostics** is an [MCP (Model Context Protocol)](https://nitrostack.ai) application that extends AI assistants — like Claude, Cursor, and any MCP-compatible client — with real-world DevOps triage, trace correlation, and automated code remediation capabilities. It is built and deployed on [Nitrostack](https://nitrostack.ai), the fastest way to build, deploy, and share MCP apps.

---

## Table of Contents

- [Overview](#overview)
- [What is MCP?](#what-is-mcp)
- [Architecture & Multi-Agent Flow](#architecture--multi-agent-flow)
- [Features](#features)
- [Federated MCP Servers](#federated-mcp-servers)
- [Live Demo](#live-demo)
- [Getting Started](#getting-started)
- [Connect to an MCP Client](#connect-to-an-mcp-client)
- [Deploy Your Own MCP App](#deploy-your-own-mcp-app)
- [Explore More MCP Apps](#explore-more-mcp-apps)
- [FAQ](#faq)
- [Keywords](#keywords)
- [License](#license)

---

## Overview

When a build or integration test breaks in a CI/CD pipeline, software engineers spend up to 70% of their time on manual context gathering rather than writing solutions. They must continuously switch between disconnected systems: inspecting raw build logs on GitHub Actions/GitLab, querying APM traces on OpenTelemetry/Jaeger, inspecting DOM state for frontend failures, and checking issue boards on Linear or Jira.

**Aloka** is an AI-native incident resolution platform built entirely around the **Model Context Protocol (MCP)**. By utilizing a federated network of specialized MCP servers (`ci-mcp`, `otel-mcp`, `browser-mcp`, `slack-mcp`, `issue-mcp`, `k8s-test-mcp`, `git-mcp`) alongside a TypeScript LangGraph state machine orchestrator, Aloka empowers specialized AI agents to autonomously diagnose distributed system failures, synthesize accurate code patches, verify fixes in ephemeral Kubernetes containers, and manage human-in-the-loop approvals directly via Slack.

---

## What is MCP?

The **Model Context Protocol (MCP)** is an open standard that lets AI assistants securely connect to external tools, data sources, and services. Instead of being limited to what it was trained on, an AI model can call **MCP servers** to fetch live data, run actions, and integrate with real systems.

This project implements a federated suite of MCP servers managed by an autonomous orchestrator. Learn more about building and shipping MCP apps at [nitrostack.ai](https://nitrostack.ai).

---

## Architecture & Multi-Agent Flow

```
                   ┌─────────────────────────────────────────┐
                   │          CI/CD Pipeline Failure         │
                   └────────────────────┬────────────────────┘
                                        │ Webhook Trigger
                                        ▼
                   ┌─────────────────────────────────────────┐
                   │      Aloka LangGraph Orchestrator       │
                   └───────┬────────────┬────────────┬───────┘
                           │            │            │
             ┌─────────────┴─┐   ┌──────┴──────┐   ┌─┴─────────────┐
             │ ci-mcp        │   │ otel-mcp    │   │ browser-mcp   │
             │ (Build Logs)  │   │ (Traces)    │   │ (DOM Inspect) │
             └─────────────┬─┘   └──────┬──────┘   └─┬─────────────┘
                           │            │            │
                           └────────────┼────────────┘
                                        ▼
                   ┌─────────────────────────────────────────┐
                   │         Interactive Slack Alert         │
                   │  • RCA Summary  • Trace  • Proposed Diff│
                   └────────────────────┬────────────────────┘
                                        │ Developer Approval
                                        ▼
                   ┌─────────────────────────────────────────┐
                   │    k8s-test-mcp (Testkube K8s Run)      │
                   └────────────────────┬────────────────────┘
                                        │ Test Passed
                                        ▼
                   ┌─────────────────────────────────────────┐
                   │   git-mcp (PR) & issue-mcp (Jira Sync)  │
                   └─────────────────────────────────────────┘
```

### End-to-End Incident Resolution Loop

1. **Event Ingestion & Sanitization**: Incoming CI/CD failure webhooks are validated and sanitized via entropy-based secret filters to strip API keys, tokens, and PII before processing.
2. **GraphRAG Diagnosis**: The Diagnostic Agent queries `ci-mcp` for GraphRAG log analysis, `otel-mcp` for OpenTelemetry trace cascades, and `browser-mcp` for Playwright DOM/console diagnostics.
3. **Patch Synthesis**: Gemini LLM generates a human-readable Root Cause Analysis (RCA) and precise code diff patch.
4. **Interactive ChatOps Gate**: An interactive Block Kit message is delivered to Slack. The state machine pauses at `interruptBefore: ['verifier']` until a human engineer approves the fix.
5. **Ephemeral K8s Verification**: Upon approval, `k8s-test-mcp` triggers a Testkube execution pod in Kubernetes to verify zero regressions.
6. **Automated Submission**: `git-mcp` creates a hotfix branch and opens a Pull Request; `issue-mcp` syncs the ticket status in Jira/Linear.

---

## Features

- 🔌 **MCP-native & Federated** — standard JSON-RPC tools and resources working with any MCP-compatible client or orchestrator.
- 🤖 **Multi-Agent State Machine** — powered by LangGraph with persistent PostgreSQL checkpointer support (`PostgresSaver`).
- 💬 **Interactive ChatOps** — real-time Slack incident cards with one-click `[Approve]` / `[Reject]` human-in-the-loop controls.
- 📊 **Telemetry Correlation** — queries OpenTelemetry (Grafana Tempo/Jaeger) and maps microservice stack traces to root cause lines.
- 🌐 **Frontend DOM Diagnostics** — Playwright-driven headless browser inspection for DOM layout crashes and browser console errors.
- 🧪 **Ephemeral K8s Test Runs** — isolated Testkube integration test pod execution before committing code.
- 🛡️ **Secret Sanitization Engine** — 100% automated redaction of sensitive credentials, environment variables, and PII.
- ⚡ **Deployed on Nitrostack** — fast, reliable, containerized MCP execution hosted on Nitrostack Cloud.

---

## Federated MCP Servers

| MCP Server | Transport | Description & Key Capabilities |
|---|---|---|
| **`ci-mcp`** | stdio | Intercepts CI build failures, fetches step logs, and extracts GraphRAG context (`get_ci_graphrag_context`). |
| **`otel-mcp`** | stdio | Connects to Grafana Tempo/Jaeger to inspect distributed trace spans and microservice dependency graphs (`get_trace_spans`). |
| **`browser-mcp`** | stdio | Headless Chromium engine inspecting DOM state, element geometry, and frontend console errors (`inspect_dom_element`). |
| **`slack-mcp`** | stdio | Delivers interactive Block Kit incident cards and handles Slack thread conversations (`post_interactive_alert`). |
| **`issue-mcp`** | stdio | Integrates with Jira/Linear APIs to auto-create and update bug tickets with diagnostic evidence (`create_or_update_issue`). |
| **`k8s-test-mcp`** | stdio | Interfaces with Kubernetes and Testkube to run isolated integration suites against patches (`run_ephemeral_test_suite`). |
| **`git-mcp`** | stdio | Manages GitHub/GitLab repositories, applies patch diffs, creates fix branches, and opens Pull Requests (`create_branch_and_pr`). |

---

## Live Demo

🚀 **Live MCP endpoint:** https://aloka-6a65676a-dempsey-squad-amrita-university-coimbatore.app.nitrocloud.ai

Point your MCP client at the endpoint above to try it instantly. Prefer a hosted setup? Deploy your own in minutes on [Nitrostack](https://nitrostack.ai).

---

## Getting Started

### Prerequisites

- An MCP-compatible client (Claude Desktop, Cursor, etc.)

### Connect via Nitrostack (Recommended)

Since Aloka is deployed on Nitrostack Cloud, you don't need to run it locally. Simply point your MCP client to the live cloud endpoint:

```json
{
  "mcpServers": {
    "aloka-cloud": {
      "url": "https://aloka-6a65676a-dempsey-squad-amrita-university-coimbatore.app.nitrocloud.ai"
    }
  }
}
```

### Run Locally (Optional for Development)

If you wish to contribute to Aloka, you can run the orchestrator and all MCP servers locally:

```bash
git clone https://github.com/venkatesh21bit/Aloka.git
cd Aloka
npm install
```

Configure your environment variables in `.env` (refer to `.env.example`), start PostgreSQL via `docker-compose up -d`, and run `npm run start` to boot the orchestrator.

---

## Connect to an MCP Client

Add Aloka's MCP servers to your MCP client configuration (such as Claude Desktop or Cursor). A typical entry in `.mcp.json` or `claude_desktop_config.json` looks like:

```json
{
  "mcpServers": {
    "aloka-cloud": {
      "url": "https://aloka-6a65676a-dempsey-squad-amrita-university-coimbatore.app.nitrocloud.ai"
    },
    "aloka-ci-mcp": {
      "command": "node",
      "args": ["packages/mcp-servers/ci-mcp/dist/index.js"]
    },
    "aloka-otel-mcp": {
      "command": "node",
      "args": ["packages/mcp-servers/otel-mcp/dist/index.js"]
    },
    "aloka-git-mcp": {
      "command": "node",
      "args": ["packages/mcp-servers/git-mcp/dist/index.js"]
    },
    "aloka-issue-mcp": {
      "command": "node",
      "args": ["packages/mcp-servers/issue-mcp/dist/index.js"]
    },
    "aloka-k8s-test-mcp": {
      "command": "node",
      "args": ["packages/mcp-servers/k8s-test-mcp/dist/index.js"]
    }
  }
}
```

Restart your client, and the tools from Aloka will be available to your AI assistant.

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

An MCP server implements the Model Context Protocol to expose tools, resources, and prompts that AI assistants can call. It lets an AI model take real actions and access live data securely.

### What does Aloka - MCP-Driven GraphRAG for DevOps Diagnostics do?

Aloka is an autonomous incident resolution platform. It catches CI/CD pipeline failures, diagnoses root causes across telemetry (OpenTelemetry, build logs, DOM inspectors), generates fixes via Gemini LLM, asks for developer approval in Slack, verifies fixes in Kubernetes test pods, and opens GitHub Pull Requests and Jira tickets automatically.

### Which AI clients does this work with?

Any MCP-compatible client, including Claude Desktop, Cursor, and custom LangGraph/OpenAI agents.

### How do I deploy my own MCP app?

Use [Nitrostack](https://nitrostack.ai) to build, deploy, and host MCP apps without managing infrastructure.

---

## Keywords

`Open Innovation` · `Aloka - MCP-Driven GraphRAG for DevOps Diagnostics` · `MCP` · `Model Context Protocol` · `MCP server` · `MCP app` · `AI tools` · `AI agents` · `LLM tools` · `Claude MCP` · `Nitrostack` · `deploy MCP server` · `build MCP app` · `GraphRAG` · `DevOps AI` · `LangGraph` · `OpenTelemetry` · `Testkube` · `ChatOps`

---

## License

MIT © 2026

---

Built with ❤️ using the Model Context Protocol on [Nitrostack](https://nitrostack.ai). Share your MCP app on [r/mcptothemoon](https://www.reddit.com/r/mcptothemoon/).
