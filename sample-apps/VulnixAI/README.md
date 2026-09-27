# VulnixAI — AI-Powered Code Security Scanner & MCP Server

> A comprehensive security analysis suite that runs vulnerability scans, domain checks, code sandbox executions, penetration testing, and creates automatic security fix pull requests directly from your AI assistant.

![Model Context Protocol](https://img.shields.io/badge/Model%20Context%20Protocol-MCP-blue) ![Built with Nitrostack](https://img.shields.io/badge/Built%20with-Nitrostack-0A66FF) ![Status](https://img.shields.io/badge/status-live-brightgreen)

**VulnixAI** is a developer security suite that integrates a modern web dashboard with an **MCP (Model Context Protocol)** server. Built using the [NitroStack](https://nitrostack.ai) framework, it allows AI assistants—such as Claude Desktop, Cursor, ChatGPT, or any MCP client—to directly scan codebases, analyze websites for configuration errors/vulnerabilities, run untrusted repositories in isolated sandboxes, execute automated penetration testing, and generate security patch pull requests.

**Team:** Ayedontknow (magibalanofficial-stack)

---

## Table of Contents

- [Overview](#overview)
- [What is MCP?](#what-is-mcp)
- [Features](#features)
- [MCP Tools Reference](#mcp-tools-reference)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Environment Setup](#environment-setup)
  - [Running the App](#running-the-app)
- [Connecting to an MCP Client](#connecting-to-an-mcp-client)
- [License](#license)

---

## Overview

Modern applications face continuous security threats. VulnixAI streamlines the detection and remediation process by combining:
1. **Repository Security Audits**: Static analysis scanning of backend and frontend code.
2. **Dynamic Sandbox Execution**: Scanning and running code in temporary secure runtimes to inspect dynamic behavior.
3. **Web Penetration Testing**: Simulated attacks targeting common web vulnerabilities (XSS, SQLi, CORS misconfigurations, security header omissions).
4. **AI-Powered Remediation**: Automated code patching and pull request generation to fix discovered flaws directly on GitHub.

The unified governance layer is implemented as an MCP server using **NitroStack**, which exposes these security scanning capabilities directly to LLMs.

---

## What is MCP?

The **Model Context Protocol (MCP)** is an open standard that enables AI assistants to securely interface with local and remote tools, data, and APIs. By exposing VulnixAI as an MCP server, developers can ask their IDE or AI chat client to scan their projects and apply security fixes interactively without leaving the chat interface.

Learn more about building and shipping MCP apps at [nitrostack.ai](https://nitrostack.ai).

---

## Features

- 🔐 **GitHub OAuth Integration** — Secure user authentication and repository access.
- 🔍 **Vulnerability Scanners** — Scans local and remote files for secrets, dependency vulnerabilities, and syntax patterns.
- 🐳 **Dynamic Sandbox Testing** — Safe remote execution of untrusted scripts.
- 🛡️ **Web Domain Penetration Testing** — Probes live servers for CORS vulnerabilities, SSL issues, and security header checks.
- 🤖 **AI Patch Generation** — Leverages LLMs (Gemini, Groq) to generate patches for discovered vulnerabilities.
- 🚀 **Automated PR Remediation** — Raises Git pull requests containing vulnerability fixes automatically.
- 🔌 **NitroStack-Powered MCP Server** — Instantly exposes all scanner tools to any compatible MCP client.

---

## MCP Tools Reference

VulnixAI registers the following tools with the MCP host:

| Tool Name | Input Schema | Description |
|-----------|--------------|-------------|
| `scan_repository` | `repoFullName` (string), `defaultBranch` (string) | Performs static analysis and security scanning on a GitHub repository. |
| `sandbox_scan` | `repoUrl` (string), `branch` (string) | Runs a repository code execution sandbox scan in a secure environment. |
| `scan_website` | `url` (string) | Performs general vulnerability scanning on a web domain. |
| `penetration_test` | `url` (string) | Runs simulated automated web penetration testing on a domain. |
| `create_security_fix_pr` | `scanId` (string) | Generates and submits a GitHub Pull Request with patches for vulnerabilities found during a repository scan. |

---

## Getting Started

### Prerequisites

- **Node.js** >= 20.18
- **MongoDB** (Local instance or Atlas connection URI)
- **API Keys** for AI providers (Groq API Key / Gemini API Key)
- **GitHub Account** (to configure OAuth and generate access tokens)

### Environment Setup

1. **Frontend Setup**:
   Copy `.env.example` to `.env` in the root folder:
   ```bash
   cp .env.example .env
   ```
   Modify `VITE_API_URL` if running your backend on a custom port (default is `http://localhost:5000`).

2. **Backend Setup**:
   Copy `backend/.env.example` to `backend/.env`:
   ```bash
   cp backend/.env.example backend/.env
   ```
   Provide your values for:
   - `MONGO_URI` (MongoDB connection string)
   - `GITHUB_CLIENT_ID` & `GITHUB_CLIENT_SECRET` (GitHub Developer Settings > OAuth Apps)
   - `GITHUB_ACCESS_TOKEN` (GitHub Personal Access Token for PR generation)
   - `GROQ_API_KEY` & `GEMINI_API_KEYS` (for AI-powered vulnerability fixing)
   - `JWT_SECRET` (session signing key)

### Running the App

1. **Install Dependencies**:
   ```bash
   npm install
   cd backend
   npm install
   cd ..
   ```

2. **Run in Development Mode**:
   You can start both frontend and backend using convenience scripts:
   - **Frontend dev server** (Vite on `http://localhost:8080`):
     ```bash
     npm run dev:frontend
     ```
   - **Backend Express/NitroStack server** (port `5000`):
     ```bash
     npm run dev:backend
     ```

---

## Connecting to an MCP Client

Because the backend is built using the **NitroStack** framework, it exposes the MCP tools over HTTP/SSE.

To connect your MCP client (such as Claude Desktop or Cursor) to the VulnixAI MCP Server, add the following configuration to your client settings file (e.g., `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "vulnixai-scanner": {
      "command": "node",
      "args": [
        "sample-apps/VulnixAI/backend/dist/index.js"
      ],
      "env": {
        "PORT": "5000",
        "MONGO_URI": "mongodb://localhost:27017/vulnixai",
        "JWT_SECRET": "vulnixai_dev_secret_key_2026",
        "GITHUB_ACCESS_TOKEN": "your_github_token_here",
        "GROQ_API_KEY": "your_groq_key_here",
        "GEMINI_API_KEYS": "your_gemini_key_here"
      }
    }
  }
}
```

Alternatively, when running the backend locally:
- It serves the MCP SSE endpoint on `http://localhost:5000/sse`
- You can connect to it using SSE transport in supported clients.

---

## License

This project is licensed under the Apache 2.0 License. See the [LICENSE](../../LICENSE) file for details.
