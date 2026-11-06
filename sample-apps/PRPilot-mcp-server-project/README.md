# PRPilot

> **Evidence-Driven Pull Request Intelligence for AI Assistants**

PRPilot is an [MCP (Model Context Protocol)](https://nitrostack.ai) server that extends AI assistants — like Claude, Cursor, and any MCP-compatible client — with real-world pull request intelligence. Built and deployed on [NitroStack](https://nitrostack.ai), the fastest way to build, deploy, and share MCP apps.

[![NitroStack](https://img.shields.io/badge/NitroStack-MCP%20Server-6366f1.svg)](https://nitrostack.ai)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![MCP Protocol](https://img.shields.io/badge/MCP-2026--07--28-emerald.svg)](https://modelcontextprotocol.io)
[![Next.js Widget](https://img.shields.io/badge/Widget-Next.js%2014-black.svg)](https://nextjs.org)

---

## Table of Contents

- [Overview](#overview)
- [What is MCP?](#what-is-mcp)
- [Features](#features)
- [Live Demo](#live-demo)
- [Connect to an MCP Client](#connect-to-an-mcp-client)
- [Core MCP Tools & Primitives](#core-mcp-tools--primitives)
- [Interactive Review Dossier Widget](#interactive-review-dossier-widget)
- [Getting Started](#getting-started)
- [Automated Testing](#automated-testing)
- [Deploy Your Own MCP App](#deploy-your-own-mcp-app)
- [Explore More MCP Apps](#explore-more-mcp-apps)
- [FAQ](#faq)
- [Keywords](#keywords)
- [License](#license)

---

## Overview

Reviewing modern software pull requests is exhausting. Engineers lose hours sifting through thousands of lines of code diffs, tracking down whether CI actually ran, and verifying whether sensitive security boundaries were altered. Generic AI summaries often hallucinate or skim over critical risks.

**PRPilot** changes that. Using the official **NitroStack TypeScript SDK**, PRPilot retrieves ground-truth GitHub facts, categorizes modified files into architectural tiers, runs transparent risk heuristics, checks live CI pipeline statuses, and traces related issues into a structured, evidence-backed **Review Dossier**.

Instead of guessing, PRPilot:
- **Prioritizes areas that deserve human attention** (security, auth, migrations, untested logic).
- **Generates an actionable, ordered 3-to-5 step reviewer route** linked directly to file diff evidence.
- **Distinguishes confirmed facts from potential risks** with honest assessments (e.g. explicitly warning when CI checks are absent instead of assuming tests passed).

---

## What is MCP?

The **Model Context Protocol (MCP)** is an open standard that lets AI assistants securely connect to external tools, data sources, and real-world services. Instead of being limited to static training data, an AI model can call MCP servers to fetch live data, run actions, and integrate with engineering systems.

PRPilot is an MCP server built for code review workflows. Learn more about building and shipping MCP apps at [nitrostack.ai](https://nitrostack.ai).

---

## Features

-  **MCP-Native:** Works seamlessly with any MCP-compatible client (Claude Desktop, Cursor, NitroStudio, ChatGPT).
-  **5 Granular Tools + Resource + Prompt:** Exposes dedicated tools for metadata, file mapping, CI evidence, and full dossier synthesis.
-  **Interactive Next.js Widget:** Renders an editorial charcoal Review Dossier UI directly in supporting canvases.
-  **Zero-Hallucination Integrity:** Distinguishes verified facts from heuristics and explicitly reports missing data.
-  **Live on NitroCloud:** Hosted, production-ready, and instantly shareable.
-  **Secure by Design:** Read-only analysis; credentials stay safely in environment variables.

---

## Live Demo

-  **Live MCP SSE Endpoint:** [`https://prpilot-6ad4acd1-ayush-heapify-global-community.app.nitrocloud.ai/sse`](https://prpilot-6ad4acd1-ayush-heapify-global-community.app.nitrocloud.ai/sse)
-  **Live Documentation & Server:** [`https://prpilot-6ad4acd1-ayush-heapify-global-community.app.nitrocloud.ai/`](https://prpilot-6ad4acd1-ayush-heapify-global-community.app.nitrocloud.ai/)
-  **Local Interactive Widget:** [`http://localhost:3001/review-dossier`](http://localhost:3001/review-dossier)

Point your MCP client at the SSE endpoint above to try it instantly without local installation!

---

## Connect to an MCP Client

### Claude Desktop & Cursor

Add PRPilot to your MCP client configuration file (e.g., `claude_desktop_config.json` or `.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "prpilot": {
      "url": "https://prpilot-6ad4acd1-ayush-heapify-global-community.app.nitrocloud.ai/sse"
    }
  }
}
```

### NitroStudio (Desktop IDE)

1. Open **NitroStudio**.
2. Click **Add Server** $\rightarrow$ **Other Project** $\rightarrow$ **HTTP**.
3. Enter the URL:
   ```text
   https://prpilot-6ad4acd1-ayush-heapify-global-community.app.nitrocloud.ai/sse
   ```
4. Click **Connect**. All 5 tools, resources, and prompts will be registered immediately.

---

## Core MCP Tools & Primitives

All tools accept a typed schema: `{ owner: string, repo: string, pull_number: number, github_token?: string }`.

| Tool / Primitive | Type | Description |
| :--- | :--- | :--- |
| **`assemble_review_dossier`** | Tool (`@Widget`) | **Flagship Tool:** Synthesizes change intent, categorized map, risk signals, CI evidence, and 3–5 step reviewer route. Linked to the visual Next.js widget. |
| **`inspect_pull_request`** | Tool | Fast metadata extraction (title, description, author, branch targets, commit SHAs, file counts). |
| **`build_change_map`** | Tool | Categorizes changed files (logic, tests, configs, docs) and flags sensitive boundary signals (`SIG_AUTH_SECURITY`, `SIG_DB_MIGRATION`, `SIG_UNTESTED_LOGIC`). |
| **`inspect_verification_evidence`**| Tool | Checks live GitHub Actions and commit check-runs. Honestly identifies missing CI checks (`no_checks_found`). |
| **`trace_related_context`** | Tool | Parses explicit issue/PR references (`#123`, `fixes #456`) and fetches their live titles and statuses. |
| **`prpilot://heuristics/catalog`** | Resource | Machine-readable catalog of all risk rules, boundary regexes, and severity scoring weights. |
| **`review_pull_request`** | Prompt | Pre-configured prompt template guiding LLMs through systematic, evidence-driven code reviews. |

---

## Interactive Review Dossier Widget

Built with `@nitrostack/widgets` using **Next.js 14** and **React**:
- **Risk Score & Meter:** Overall computed risk level (`low`, `medium`, `high`) based on touched architectural boundaries.
- **Categorized File Tree:** Clean visual breakdown separating core logic from test files and configurations.
- **Interactive Reviewer Route:** Step-by-step checklist with interactive checkboxes guiding the engineer from high-risk paths to tests.
- **Honest CI Status:** Direct check-run status cards linking to pipeline runs.

---

## Getting Started

### Prerequisites
- Node.js 20.x or higher
- npm 9+
- An MCP-compatible client (NitroStudio, Claude Desktop, Cursor)

### Installation
```bash
# Clone the repository
git clone https://github.com/ayushv7/PRPilot.git
cd PRPilot

# Install all dependencies (root & widgets)
npm run install:all
```

### Configuration
Copy the example environment file:
```bash
cp .env.example .env
```
*(Optional: Add a `GITHUB_TOKEN` in `.env` to increase GitHub API rate limits from 60 to 5,000 requests/hr).*

### Running Locally
```bash
# Start both MCP server (port 3000) and Widget server (port 3001) with hot-reload
npm run dev

# Or build and run production server
npm run build
npm start
```

---

## Automated Testing

PRPilot includes a comprehensive test suite covering API error handling, heuristics, truncation limits, prompt injection safety, and live public PR smoke tests:

```bash
npm test
```

All 16 unit and smoke tests execute with `tsx --test`.

---

## Deploy Your Own MCP App

Want to build and ship an MCP server like this one? [NitroStack](https://nitrostack.ai) lets you create, deploy, and host MCP apps in minutes — no infrastructure to manage.

**Start building:** [https://nitrostack.ai](https://nitrostack.ai)

---

## Explore More MCP Apps

- **Discover & share:** Join the community on [r/mcptothemoon](https://www.reddit.com/r/mcptothemoon/)
- **Browse the catalog:** Explore more apps on [NitroStack Apps](https://nitrostack.ai/apps)

---

## FAQ

**What is an MCP server?**  
An MCP server implements the Model Context Protocol to expose tools, resources, and prompts that AI assistants can call. It lets an AI model take real actions and access live data.

**What does PRPilot do?**  
PRPilot is an evidence-driven code review intelligence tool that analyzes pull requests, calculates architectural risk, and generates a structured, prioritized review route.

**Which AI clients does this work with?**  
Any MCP-compatible client, including Claude Desktop, Cursor, and NitroStudio.

**Can PRPilot review private repositories?**  
Yes! Provide a GitHub Personal Access Token (`GITHUB_TOKEN` in `.env` or passed via the `github_token` tool argument) with read access to your private repository.

**Can it inspect already-merged or closed PRs?**  
Yes! GitHub preserves full pull request diffs, commits, and comments permanently. PRPilot seamlessly inspects open, merged, or closed PRs for post-mortems and compliance audits.

---

## Keywords

PRPilot · MCP · Model Context Protocol · MCP server · MCP app · AI tools · AI agents · LLM tools · Claude MCP · Cursor MCP · NitroStack · deploy MCP server · build MCP app · GitHub pull request · code review intelligence · developer tools

---

## License

[MIT](LICENSE) © 2026 Ayush ([ayushv7](https://github.com/ayushv7))
