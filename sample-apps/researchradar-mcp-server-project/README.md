# ResearchRadar MCP - AI-Powered Research Discovery & Paper Intelligence

> ResearchRadar MCP is an open-source Model Context Protocol (MCP) server that transforms academic research into real-world innovation — enabling AI assistants to discover, analyze, track, and commercialize academic research papers using the free, unlimited arXiv API.

![Model Context Protocol](https://img.shields.io/badge/Model%20Context%20Protocol-MCP-blue) ![Built with Nitrostack](https://img.shields.io/badge/Built%20with-Nitrostack-0A66FF) ![Status](https://img.shields.io/badge/status-live-brightgreen) [![License](https://img.shields.io/badge/License-Apache%202.0-blue?style=flat-square)](https://opensource.org/licenses/Apache-2.0)

**ResearchRadar MCP - AI-Powered Research Discovery & Paper Intelligence** is an [MCP (Model Context Protocol)](https://nitrostack.ai) server that extends AI assistants — like Claude, Cursor, and any MCP-compatible client — with new, real-world capabilities. It is built and deployed on [Nitrostack](https://nitrostack.ai), the fastest way to build, deploy, and share MCP apps.

## Table of Contents

- [Overview](#overview)
- [What is MCP?](#what-is-mcp)
- [Key Features](#key-features)
- [Live Demo](#live-demo)
- [Quick Start](#quick-start)
- [Connect to an MCP Client](#connect-to-an-mcp-client)
- [Open in NitroStudio](#open-in-nitrostudio)
- [API & Primitive Reference](#api--primitive-reference)
- [Troubleshooting](#troubleshooting)
- [Deploy Your Own MCP App](#deploy-your-own-mcp-app)
- [Explore More MCP Apps](#explore-more-mcp-apps)
- [FAQ](#faq)
- [Keywords](#keywords)
- [License](#license)

## Overview

ResearchRadar MCP is an open-source Model Context Protocol (MCP) server that enables AI assistants to discover, analyze, and organize academic research through natural language. It helps developers, students, researchers, and knowledge workers search for relevant papers, summarize findings, compare research, and build curated reading lists directly within MCP-compatible clients such as Claude, Cursor, and other AI tools. Built with TypeScript and designed for extensibility, ResearchRadar simplifies literature exploration by turning scattered academic sources into structured, actionable insights through a standard MCP interface. It also helps identify research gaps and facilitates comprehensive literature reviews, and helps innovators and entrepreneurs find new ideas that could be commercialized.

## What is MCP?

The **Model Context Protocol (MCP)** is an open standard that lets AI assistants securely connect to external tools, data sources, and services. Instead of being limited to what it was trained on, an AI model can call **MCP servers** to fetch live data, run actions, and integrate with real systems.

This project is one such MCP server. Learn more about building and shipping MCP apps at [nitrostack.ai](https://nitrostack.ai).

## Key Features

- 🔌 **MCP-native** — works with any MCP-compatible client (Claude, Cursor, and more)
- ⚡ **Real-time Discovery** — query arXiv's database for STEM research (Computer Science, Mathematics, Physics, Statistics, Economics, etc.) with zero rate limits or auth keys required
- 🛡️ **Smart Domain Guard** — automatically alerts users if they search for unsupported domains and suggests appropriate alternatives (like PubMed or SSRN)
- 💡 **Research Commercialization Agent** — maps technical abstracts and paper metadata directly to target industries, estimated market potential (TAM), concrete startup ideas, IP licensing paths, and investor archetypes
- 📚 **Persistent Reading List Resource** — bookmark papers using `save_to_reading_list`; bookmarks are saved directly on disk and exposed to AI agents via the `researchradar://reading-list` resource for literature reviews
- 🎨 **Vibrant Interactive Widgets** — integrated React search results display custom, high-contrast cards in NitroStudio with full Dark/Light theme support and direct links to abstracts and PDFs
- 🔐 **Secure by design** — secrets stay in environment variables, never in code
- 🧩 **Composable** — combine with other MCP apps to build powerful AI workflows

## Live Demo

🚀 **Live MCP endpoint:** https://researchradar-serv-prompt-protocol-amrita-university-coimbatore.app.nitrocloud.ai

Point your MCP client at the endpoint above to try it instantly. Prefer a hosted setup? Deploy your own in minutes on [Nitrostack](https://nitrostack.ai).

## Quick Start

### Prerequisites

- **Node.js** >= 20.18 ([download](https://nodejs.org/))
- **npm** >= 9
- An MCP-compatible client (Claude Desktop, Cursor, etc.)

### 1. Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/your-username/your-mcp-project.git
cd researchradar-mcp-ai-powered-research-discovery-paper-intell
npm install
```

### 2. Configuration

Copy the example environment file and add your own values:

```bash
cp .env.example .env
```

### 3. Start developing

```bash
npm run dev
```

Your MCP server is running via STDIO transport, and the Widget Dev Server is running at http://localhost:3001. Connect it to any MCP-compatible client.

## Connect to an MCP Client

Add this server to your MCP client configuration. A typical entry looks like:

```json
{
  "mcpServers": {
    "researchradar-mcp-ai-powered-research-discovery-paper-intell": {
      "url": "https://researchradar-serv-prompt-protocol-amrita-university-coimbatore.app.nitrocloud.ai"
    }
  }
}
```

Restart your client and the tools from this MCP server will be available to your AI assistant.

## Open in NitroStudio

Once your project is running, open the folder in NitroStudio for visual testing and debugging.

- Download: <https://nitrostack.ai/studio>
- Open your `researchradar-mcp` project folder
- Use NitroStudio to test tools, inspect payloads, and chat with your MCP server

## API & Primitive Reference

### 1. Tools

| Tool Name | Input Parameters | Description |
|:---|:---|:---|
| `search_papers` | `query` (string), `limit` (number), `year_from` (number), `year_to` (number) | Search STEM fields. Multi-word phrases are formatted automatically to prevent arXiv 503 limits. Handles rate limits cleanly. |
| `get_paper_details` | `paper_id` (string) | Fetches the full abstract, categories, and direct PDF links for a specific arXiv ID or URL. |
| `get_related_papers` | `paper_id` (string), `limit` (number) | Performs a category-based fallback query to locate recent related research. |
| `save_to_reading_list` | `paper_id`, `title`, `year`, `category`, `note` | Bookmarks a paper. Synchronizes updates immediately with local disk. |
| `commercialize_research` | `paper_id`, `title`, `abstract`, `categories`, `save_to_list` | Generates market potential analysis, target industries, and university spin-off recommendations. |

### 2. Resources

- **Reading List Resource**: `researchradar://reading-list`
  - Exposes all saved bookmarks as a live, clean Markdown document.
  - Allows LLM agents to automatically consume saved papers as ground-truth context before writing pitches or summaries.

### 3. Prompts

- `research_gap_finder`: Conducts a structured academic literature gap analysis.
- `literature_review_summary`: Summarizes technical concepts from reading lists.
- `commercialization_pitch`: Formulates startup investor pitches for academic spin-offs.

## Troubleshooting

- **Sluggish API / Rate Limits:** arXiv allows 1 request every 3 seconds. If you execute tools too rapidly, you may see arXiv API Rate Limit Exceeded. The server will automatically perform a 4-second backoff retry.
- **Port Conflicts:** If port 3001 is already in use by another widget dev server, configure a different port in `next.config.js` or stop conflicting processes.
- **"Tool execution failed" Errors:** Ensure `npm run dev` remains running in your terminal. If the process is shut down, NitroStudio will lose connection.

## Deploy Your Own MCP App

Want to build and ship an MCP server like this one? **[Nitrostack](https://nitrostack.ai)** lets you create, deploy, and host MCP apps in minutes — no infrastructure to manage.

👉 **Start building:** [https://nitrostack.ai](https://nitrostack.ai)

## Explore More MCP Apps

- 🌙 Discover and share MCP projects with the community on [r/mcptothemoon](https://www.reddit.com/r/mcptothemoon/)
- 🧰 Browse a growing catalog of MCP apps on [Nitrostack](https://nitrostack.ai/apps)

## FAQ

### What is an MCP server?

An MCP server implements the Model Context Protocol to expose tools, resources, and prompts that AI assistants can call. It lets an AI model take real actions and access live data.

### What does ResearchRadar MCP - AI-Powered Research Discovery & Paper Intelligence do?

It enables AI assistants to discover, analyze, track, and organize academic research from arXiv, and to turn that research into commercialization insights — market potential, target industries, and startup ideas.

### Which AI clients does this work with?

Any MCP-compatible client, including Claude Desktop and Cursor. New clients are adding MCP support regularly.

### How do I deploy my own MCP app?

Use [Nitrostack](https://nitrostack.ai) to build, deploy, and host MCP apps without managing infrastructure.

## Keywords

`Education & Research` · `ResearchRadar MCP - AI-Powered Research Discovery & Paper Intelligence` · `MCP` · `Model Context Protocol` · `MCP server` · `MCP app` · `AI tools` · `AI agents` · `LLM tools` · `Claude MCP` · `Nitrostack` · `deploy MCP server` · `build MCP app` · `arXiv` · `research commercialization`

## License

ResearchRadar is open-source software licensed under the [Apache License 2.0](./LICENSE).

---

<div align="center">
  <sub>Built with ❤️ using the Model Context Protocol on <a href="https://nitrostack.ai">Nitrostack</a> by the Prompt Protocol team and contributors. Share your MCP app on <a href="https://www.reddit.com/r/mcptothemoon/">r/mcptothemoon</a>.</sub>
</div>