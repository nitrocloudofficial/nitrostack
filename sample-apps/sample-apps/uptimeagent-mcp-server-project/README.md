# UptimeAgent

> An agentic predictive-maintenance copilot for manufacturing — chains anomaly detection, failure prediction, and work-order generation into one autonomous MCP tool sequence.

![Model Context Protocol](https://img.shields.io/badge/Model%20Context%20Protocol-MCP-blue) ![Built with Nitrostack](https://img.shields.io/badge/Built%20with-Nitrostack-0A66FF) ![Status](https://img.shields.io/badge/status-live-brightgreen) ![Track](https://img.shields.io/badge/track-Manufacturing%20%26%20Industry%204.0-orange)

**Team Bloopers — Amrita University Coimbatore**

**UptimeAgent** is an [MCP (Model Context Protocol)](https://nitrostack.ai) server that extends AI assistants — like Claude, Cursor, ChatGPT, and any MCP-compatible client — with real predictive-maintenance capabilities, running on real NASA turbofan engine sensor data. It is built and deployed on [NitroStack](https://nitrostack.ai), the framework for building, deploying, and sharing MCP apps.

## Table of Contents

- [Overview](#overview)
- [What is MCP?](#what-is-mcp)
- [Features](#features)
- [The Data](#the-data)
- [Live Demo](#live-demo)
- [Getting Started](#getting-started)
- [Connect to an MCP Client](#connect-to-an-mcp-client)
- [Testing in NitroStack Studio](#testing-in-nitrostack-studio)
- [Deploy Your Own MCP App](#deploy-your-own-mcp-app)
- [Explore More MCP Apps](#explore-more-mcp-apps)
- [FAQ](#faq)
- [Keywords](#keywords)
- [License](#license)

## Overview

**Problem:** Manufacturers run one of two costly maintenance strategies. Reactive maintenance fixes machines only after failure, causing expensive unplanned downtime. Fixed-schedule maintenance services machines on a calendar regardless of actual condition, wasting money on machines that are still healthy. Predictive maintenance — servicing a machine exactly when its sensor data says it needs it — solves both, but normally requires a human to notice an anomaly, then separately estimate its severity, then separately request a repair recommendation.

**Solution:** UptimeAgent removes those manual hops by exposing three MCP tools designed to be chained autonomously by an LLM agent in a single turn:

1. **`analyze_sensor_reading(machineId)`** compares a machine's recent sensor readings against its own healthy baseline to detect anomalies — returns anomaly `true`/`false`, severity (`low`/`moderate`/`high`), and which sensor(s) triggered it.
2. **`predict_failure_window(machineId)`** fits a trend line to the machine's recent readings and projects how many cycles/days remain before it crosses a critical threshold, with a confidence score.
3. **`generate_work_order(machineId)`** combines both analyses with a maintenance-manual lookup to produce an actionable ticket: urgency level, issue description, recommended repair action, and estimated remaining life.

Ask the agent *"How's Engine 3 doing?"* and — without being asked three separate questions — it calls `analyze_sensor_reading`, decides from the result whether to call `predict_failure_window`, and if the issue is significant, calls `generate_work_order` to produce a finished ticket. All three tools are marked read-only/non-destructive (`readOnlyHint`) so a chat client doesn't gate the chain behind confirmation prompts, and every tool also works standalone — each recomputes from the underlying data rather than depending on a previous call.

## What is MCP?

The **Model Context Protocol (MCP)** is an open standard that lets AI assistants securely connect to external tools, data sources, and services. Instead of being limited to what it was trained on, an AI model can call **MCP servers** to fetch live data, run actions, and integrate with real systems.

UptimeAgent is one such MCP server. Learn more about building and shipping MCP apps at [nitrostack.ai](https://nitrostack.ai).

## Features

- 🔌 **MCP-native** — works with any MCP-compatible client (Claude, Cursor, ChatGPT, and more)
- 🛠️ **Tools, resources, prompts & a widget** — all four MCP primitives implemented, not just the minimum two required
- 🔗 **Genuinely chainable** — tool descriptions and annotations are written so an LLM autonomously calls all three tools in sequence from one question, not three
- 📡 **Real data, not synthetic** — built on the actual NASA C-MAPSS FD001 turbofan degradation dataset, with sensors empirically selected for signal strength, not guessed
- ⚡ **Deployed on NitroStack Cloud** — reliable, hosted, and instantly shareable
- 🔒 **Secure by design** — no secrets required at all; the dataset is static and local, nothing calls out to third-party APIs at runtime
- 🧮 **Consistent and defensible** — the anomaly/RUL model is deterministic z-score-vs-baseline and least-squares trend projection, not opaque ML; every threshold is documented in code

## The Data

Built from the **real** [NASA C-MAPSS Turbofan Engine Degradation dataset](https://www.kaggle.com/datasets/behrad3d/nasa-cmaps) (FD001 train split — same content as Kaggle `behrad3d/nasa-cmaps`), not synthetic values. The raw source file is committed at `data/raw/train_FD001.txt`; `scripts/import-real-data.mjs` derives `data/*.json` from it.

- **100 real engines** in the source file, each run in simulation to its actual real failure. We use units **1–15** as `engine-01`…`engine-15`.
- **3 real sensors** — the dataset has 21 simulated sensors and 3 operational settings, but no vibration/accelerometer reading (it's a thermodynamic simulation, not an instrumented physical rig). We picked the 3 sensors with the strongest, most consistent degradation signal across all 100 real engines (empirically measured, not guessed):

  | App name | Real sensor | Meaning | Baseline → real end-of-life |
  |---|---|---|---|
  | `temperature` | sensor 4, T50 | LPT outlet temperature (°R) | 1402.9 → 1428.9 |
  | `pressure` | sensor 11, Ps30 | HPC outlet static pressure (psia) | 47.36 → 48.14 |
  | `rotationalSpeed` | sensor 14, NRc | corrected core speed (rpm) | 8137.4 → 8166.9 |

- **4 engines** (`engine-03`, `engine-07`, `engine-11`, `engine-14`) are exposed through their **full real run**, ending at real failure — genuinely degrading, not fabricated.
- **11 engines** are exposed only through the **first 35% of their real recorded run** — a real early-life slice, chosen because it empirically keeps every sensor's anomaly z-score below the "moderate" threshold (verified per-engine against our own detection algorithm before picking that cutoff). No values are invented; we're just choosing how much of each real run to show.
- Regenerate anytime with `node scripts/import-real-data.mjs` — deterministic given the same source file (only cosmetic metadata like install dates uses a seeded RNG; sensor values are 100% the real file's numbers).

## Live Demo

🚀 **Live MCP server:** https://uptimeagent-6a64ec6c-team-bloopers-amrita-university-coimbatore.app.nitrocloud.ai

💬 **Hosted chat client:** https://nitrochat-uptimeagen-team-bloopers-amrita-university-coimbatore.app.nitrocloud.ai

Open the chat link and ask *"How's Engine 3 doing?"* to see the full 3-tool chain run live against real sensor data.

## Getting Started

### Prerequisites

- Node.js 18+ (20.x preferred)
- An MCP-compatible client for testing (NitroStack Studio, Claude Desktop, Cursor, etc.)

### Installation

```bash
git clone https://github.com/Saicharan-Billakanti/uptimeagent.git
cd uptimeagent
npm install
```

No environment variables or API keys are required — the dataset is static and local, and the server doesn't call any third-party APIs at runtime.

### Run (development)

```bash
npm run dev
```

Starts the MCP server (STDIO transport) plus the widget dev server, with TypeScript watch mode enabled.

### Run (production)

```bash
npm run build
npm start
```

## Connect to an MCP Client

Add this server to your MCP client configuration. A typical entry looks like:

```json
{
  "mcpServers": {
    "uptimeagent-server": {
      "url": "https://uptimeagent-6a64ec6c-team-bloopers-amrita-university-coimbatore.app.nitrocloud.ai/mcp"
    }
  }
}
```

Restart your client and `analyze_sensor_reading`, `predict_failure_window`, `generate_work_order`, the three `fleet://` resources, and the `diagnose-issue` prompt will all be available to your AI assistant.

## Testing in NitroStack Studio

1. `npm run dev`
2. In NitroStack Studio: **Add Server → Nitro Project tab** → open this folder → **Studio App Canvas**
3. **Tools** page → Execute Tool → try `analyze_sensor_reading` / `predict_failure_window` / `generate_work_order` with `machineId: "engine-03"` (degrading, real data) or `"engine-01"` (healthy, real data)
4. **Resources** page → confirm the three `fleet://...` resources load
5. **Prompts** page → run `diagnose-issue`
6. **AI Chat** → ask *"How's Engine 3 doing?"* and watch it chain all three tools autonomously (works best with a stronger model — very small/fast models occasionally narrate the final step instead of completing it)

## Deploy Your Own MCP App

Want to build and ship an MCP server like this one? **[NitroStack](https://nitrostack.ai)** lets you create, deploy, and host MCP apps in minutes — no infrastructure to manage.

🚀 **Start building:** [https://nitrostack.ai](https://nitrostack.ai)

## Explore More MCP Apps

- 📖 Discover and share MCP projects with the community on [r/mcptothemoon](https://www.reddit.com/r/mcptothemoon/)
- 🧰 Browse a growing catalog of MCP apps on [NitroStack](https://nitrostack.ai/apps)

## FAQ

### What is an MCP server?

An MCP server implements the Model Context Protocol to expose tools, resources, and prompts that AI assistants can call. It lets an AI model take real actions and access live data instead of relying only on what it was trained on.

### What does UptimeAgent do?

It watches a fleet of turbofan engines using real NASA sensor data and, from a single natural-language question, autonomously checks for anomalies, predicts how much useful life a degrading engine has left, and generates a structured maintenance work order — no manual multi-step triage required.

### Why does UptimeAgent use real data instead of a synthetic dataset?

Early versions used synthetic data matching the schema of the NASA C-MAPSS dataset. We since switched to the real FD001 file itself (see [The Data](#the-data)) — the sensor mapping and degradation signal are empirically measured from that real file, not fabricated.

### Which AI clients does this work with?

Any MCP-compatible client, including NitroStack Studio, Claude Desktop, Cursor, and ChatGPT. New clients are adding MCP support regularly.

### How do I deploy my own MCP app?

Use [NitroStack](https://nitrostack.ai) to build, deploy, and host MCP apps without managing infrastructure.

## Keywords

`Manufacturing & Industry 4.0` · `UptimeAgent` · `predictive maintenance` · `MCP` · `Model Context Protocol` · `MCP server` · `MCP app` · `agentic AI` · `AI agents` · `LLM tools` · `Claude MCP` · `NitroStack` · `NASA C-MAPSS` · `turbofan engine` · `deploy MCP server`

## License

MIT © 2026 Team Bloopers, Amrita University Coimbatore

---

Built with ❤️ using the Model Context Protocol on [NitroStack](https://nitrostack.ai). Share your MCP app on [r/mcptothemoon](https://www.reddit.com/r/mcptothemoon/).
