# ApexTune — an MCP server that gives AI assistants real control over Windows PC performance

> This project is a PC Optimization tool. It is designed to run locally on the user's computer via NitroStack Studio (STDIO transport) to inspect and optimize local system resources (CPU, RAM, disk, processes). The NitroCloud deployment serves as the hosted endpoint fallback.

![Model Context Protocol](https://img.shields.io/badge/Model%20Context%20Protocol-MCP-blue) ![Built with Nitrostack](https://img.shields.io/badge/Built%20with-Nitrostack-0A66FF) ![Platform](https://img.shields.io/badge/platform-Windows-0078D6) ![Status](https://img.shields.io/badge/status-hackathon%20build-orange)

**ApexTune** is an [MCP (Model Context Protocol)](https://nitrostack.ai) server that extends AI assistants — like Claude, Cursor, Copilot, and any MCP-compatible client — with real, safety-guarded system-tuning capabilities on Windows. It is built with [Nitrostack](https://nitrostack.ai), a framework for building and shipping MCP apps.

Built for the **Agentic AI Hackathon 2026**.

## Table of Contents

- [Overview](#overview)
- [What is MCP?](#what-is-mcp)
- [Features](#features)
- [Safety Model](#safety-model)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Connect to an MCP Client](#connect-to-an-mcp-client)
- [Project Structure](#project-structure)
- [FAQ](#faq)
- [Team](#team)
- [Keywords](#keywords)
- [License](#license)

## Overview

Most people troubleshoot a slow or misbehaving PC by guessing — closing a few random apps, restarting, or Googling generic advice. ApexTune replaces the guesswork with data. It gives an AI assistant direct, structured access to a Windows machine's live vitals — CPU load and temperature, RAM usage, GPU utilization, disk space, network throughput and latency — plus the ability to act: kill a runaway process, switch power plans, clean temp files, manage startup apps, and more.

Ask the assistant something like *"why is my PC slow?"* and it can run a full diagnostic sweep before answering. Ask it to *"get my PC ready for gaming"* and it can free up memory and switch to a high-performance power plan in one step. Every action that changes or deletes something requires an explicit confirmation, so the assistant never takes a destructive step silently.

## What is MCP?

The **Model Context Protocol (MCP)** is an open standard that lets AI assistants securely connect to external tools, data sources, and services. Instead of being limited to what it was trained on, an AI model can call **MCP servers** to fetch live data and take real actions.

ApexTune is one such MCP server, purpose-built for Windows system monitoring and tuning. Learn more about building and shipping MCP apps at [nitrostack.ai](https://nitrostack.ai).

## Features

- 🖥️ **System monitoring** — CPU load/temperature, RAM usage, GPU load/VRAM/temperature, disk usage across all drives, and a one-shot `system_overview` dashboard with a visual widget
- 🧠 **Process management** — list top processes by CPU/memory, kill a process by name, or change its scheduling priority
- 🌐 **Network diagnostics** — check adapters and throughput, ping for latency/packet loss, flush the DNS cache
- 🚀 **Performance boost** — switch power plans, run a one-shot `turbo_boost` mode, generate a battery health report, restart Explorer or clear the icon cache
- 🧹 **Cleanup tools** — estimate reclaimable space, clean temp files, empty the Recycle Bin
- 🔌 **Startup manager** — list, disable, and re-enable startup apps, with automatic backup for reversibility
- 🧭 **Guided prompts** — `diagnose_slow_pc` and `pre_gaming_boost` walk the assistant through a safe, structured routine instead of acting speculatively
- 🔐 **Confirmation-gated actions** — every destructive tool previews its effect first and requires `confirm: true`; killing critical Windows processes additionally requires the user to type the exact process name themselves

## Safety Model

ApexTune is designed so an AI assistant can act on a real system without acting recklessly:

- **Preview before action.** Destructive tools (killing a process, cleaning temp files, emptying the Recycle Bin, disabling a startup app) return a preview and require a follow-up call with `confirm: true`.
- **Extra friction for critical processes.** Known critical system processes (`explorer.exe`, `lsass.exe`, `winlogon.exe`, `services.exe`, and others) cannot be killed on the assistant's judgment alone — the human must type the exact process name to confirm.
- **Reversible where possible.** Disabling a startup app backs up its original registry value so it can be restored with `enable_startup_app`.
- **Read-only first.** The guided prompts explicitly instruct the assistant to run diagnostics (`system_overview`, `list_top_processes`, `check_disk`) before ever suggesting or taking an action.

## Tech Stack

| Layer | Technology |
|---|---|
| MCP framework | [Nitrostack](https://nitrostack.ai) (`@nitrostack/core`, `@nitrostack/cli`) |
| Language | TypeScript |
| Schema validation | Zod |
| System telemetry | [`systeminformation`](https://systeminformation.io/) |
| OS integration | Windows PowerShell, `reg`, `taskkill`, `powercfg` via Node `child_process` |
| Widgets | Next.js widget (`system-overview`) via the MCP Apps spec |
| Transport | STDIO (development) / STDIO + HTTP-SSE (production) |

## Getting Started

### Prerequisites

- Node.js 18+
- **Windows OS** (required — several tools call Windows-only commands such as `powercfg`, `reg`, and `taskkill`)
- An MCP-compatible client (Claude Desktop, Cursor, NitroStudio, etc.)

### Installation

```bash
git clone https://github.com/rox4545/ApexTune.git
cd ApexTune
npm run install:all
```

### Configuration

Copy the example environment file and adjust values if needed:

```bash
cp .env.example .env
```

### Run

```bash
npm run dev          # development (STDIO)
npm run build        # production build
npm start             # build + start
npm run start:prod   # start without rebuilding
```

## Connect to an MCP Client

Add ApexTune to your MCP client configuration. A typical local (STDIO) entry looks like:

```json
{
  "mcpServers": {
    "apextune": {
      "command": "npm",
      "args": ["run", "start:prod"],
      "cwd": "/path/to/ApexTune"
    }
  }
}
```

Restart your client and ApexTune's tools and prompts will be available to your AI assistant. [NitroStudio](https://nitrostack.ai/studio) is the recommended way to test and debug tool calls during development.

## Project Structure

```
src/
├── index.ts              # entry point, bootstraps the MCP server
├── app.module.ts          # registers all tool controllers
├── system.tools.ts        # CPU/RAM/GPU/disk checks, process management
├── network.tools.ts       # network checks, ping, DNS flush
├── boost.tools.ts         # power plans, battery report, explorer/icon fixes
├── cleanup.tools.ts       # temp file cleanup, recycle bin
├── startup.tools.ts       # startup app management
├── prompts.tools.ts       # guided diagnostic/boost prompts
├── health/
│   └── system.health.ts   # periodic health check
└── widgets/                # system-overview visual widget
```

## FAQ

### What is an MCP server?

An MCP server implements the Model Context Protocol to expose tools, resources, and prompts that AI assistants can call, letting a model take real actions and access live data instead of relying only on its training.

### What does ApexTune do?

It gives an AI assistant direct visibility into a Windows PC's CPU, RAM, GPU, disk, and network state, along with guarded tools to clean up, boost performance, and manage startup apps.

### Which AI clients does this work with?

Any MCP-compatible client, including Claude Desktop, Cursor, and Copilot.

### Is it safe to let an AI assistant run these tools?

Yes — every action that modifies or deletes something requires an explicit confirmation step, and critical system processes have an additional manual confirmation requirement.

### Does it work on macOS or Linux?

Not currently. Several tools shell out to Windows-specific commands (`powercfg`, `reg`, `taskkill`), so ApexTune is Windows-only for now.

## Team

- Rohan 
- Manoj
- Ravi teja
- Suhas 

## Keywords

`Agentic AI` · `MCP` · `Model Context Protocol` · `MCP server` · `Nitrostack` · `Windows system optimization` · `PC performance` · `AI agents` · `AI tools` · `Claude MCP` · `system monitoring` · `process management`

## License

<Add a license, e.g. MIT> © 2026

---

Built with ❤️ using the Model Context Protocol on [Nitrostack](https://nitrostack.ai).
