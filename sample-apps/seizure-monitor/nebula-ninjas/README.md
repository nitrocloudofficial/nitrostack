# Sentinel Gateway — an MCP zero-trust gateway

> MCP zero-trust gateway that sits in front of every internal MCP server, detects tool-poisoning/metadata drift in real time, and maintains a cryptographic provenance ledger of every agent tool call.

![Model Context Protocol](https://img.shields.io/badge/Model%20Context%20Protocol-MCP-blue) ![Built with Nitrostack](https://img.shields.io/badge/Built%20with-Nitrostack-0A66FF) ![Status](https://img.shields.io/badge/status-live-brightgreen)

**Sentinel Gateway — an MCP zero-trust gateway** is an [MCP (Model Context Protocol)](https://nitrostack.ai) server that extends AI assistants — like Claude, Cursor, and any MCP-compatible client — with new, real-world capabilities. It is built and deployed on [Nitrostack](https://nitrostack.ai), the fastest way to build, deploy, and share MCP apps.

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

MCP zero-trust gateway that sits in front of every internal MCP server, detects tool-poisoning/metadata drift in real time, and maintains a cryptographic provenance ledger of every agent tool call.

## What is MCP?

The **Model Context Protocol (MCP)** is an open standard that lets AI assistants securely connect to external tools, data sources, and services. Instead of being limited to what it was trained on, an AI model can call **MCP servers** to fetch live data, run actions, and integrate with real systems.

This project is one such MCP server. Learn more about building and shipping MCP apps at [nitrostack.ai](https://nitrostack.ai).

## Features

- 🔌 **MCP-native** — works with any MCP-compatible client (Claude, Cursor, and more)
- 🛡️ **Zero-Trust Policy Engine** — per-agent RBAC permission enforcement
- 🔍 **Tool Poisoning & Drift Detection** — cryptographic SHA-256 fingerprinting catches malicious description modifications
- ⚡ **Prompt Injection Scanner** — pattern-matching engine flags exfiltration directives (e.g. BCC directives)
- 📜 **Cryptographic Provenance Ledger** — immutable SHA-256 hash-chained audit log
- 🖼️ **7 Interactive UI Widgets** — built with Next.js 14, React 18, and Tailwind CSS
- ⚡ **Deployed on Nitrostack** — reliable, hosted, and instantly shareable
- 🔐 **Secure by design** — secrets stay in environment variables, never in code

## Getting Started

### Prerequisites

- Node.js 18+ (Node 20 recommended)
- An MCP-compatible client (NitroStudio, Claude Desktop, Cursor, etc.)

### Installation

```bash
git clone https://github.com/jaisimha18/nebula-ninjas.git
cd nebula-ninjas
npm install
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

For production build & start:

```bash
npm run build
npm start
```

## Connect to an MCP Client

Add this server to your MCP client configuration. A typical entry looks like:

```json
{
  "mcpServers": {
    "sentinel-gateway": {
      "command": "npx",
      "args": ["-y", "tsx", "src/index.ts"]
    }
  }
}
```

Restart your client and the tools from this MCP server will be available to your AI assistant.

## Deploy Your Own MCP App

Want to build and ship an MCP server like this one? **[Nitrostack](https://nitrostack.ai)** lets you create, deploy, and host MCP apps in minutes — no infrastructure to manage.

👉 **Start building:** [https://nitrostack.ai](https://nitrostack.ai)

## Explore More MCP Apps

- 🌙 Discover and share MCP projects with the community on [r/mcptothemoon](https://www.reddit.com/r/mcptothemoon/)
- 🧰 Browse a growing catalog of MCP apps on [Nitrostack](https://nitrostack.ai/apps)

## FAQ

### What is an MCP server?

An MCP server implements the Model Context Protocol to expose tools, resources, and prompts that AI assistants can call. It lets an AI model take real actions and access live data.

### What does Sentinel Gateway do?

Sentinel Gateway sits in front of internal MCP servers to detect tool poisoning, prompt injections, and metadata drift in real time, logging every call to a cryptographic provenance ledger.

### Which AI clients does this work with?

Any MCP-compatible client, including NitroStudio, Claude Desktop, and Cursor.

### How do I deploy my own MCP app?

Use [Nitrostack](https://nitrostack.ai) to build, deploy, and host MCP apps without managing infrastructure.

## Keywords

`Enterprise AI & Workplace Automation` · `Sentinel Gateway — an MCP zero-trust gateway` · `MCP` · `Model Context Protocol` · `MCP server` · `MCP app` · `AI security` · `Tool Poisoning` · `Zero Trust` · `Provenance Ledger` · `Nitrostack` · `deploy MCP server` · `build MCP app`

## License

MIT © 2026

---

Built with ❤️ using the Model Context Protocol on [Nitrostack](https://nitrostack.ai). Share your MCP app on [r/mcptothemoon](https://www.reddit.com/r/mcptothemoon/).
