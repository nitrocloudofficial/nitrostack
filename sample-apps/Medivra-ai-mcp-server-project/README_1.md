# Medivra-ai

> MEDIVRA AI is a unified AI-powered healthcare platform connecting Patients, Doctors, Hospitals, Pharmacies, and Administrators — with a real agentic MCP layer for prescription OCR, blood report analysis, and grounded health Q&A.

![Model Context Protocol](https://img.shields.io/badge/Model%20Context%20Protocol-MCP-blue) ![Built with Nitrostack](https://img.shields.io/badge/Built%20with-Nitrostack-0A66FF) ![Status](https://img.shields.io/badge/status-live-brightgreen)

**Medivra-ai** is an [MCP (Model Context Protocol)](https://nitrostack.ai) server that extends AI assistants — like Claude, Cursor, and any MCP-compatible client — with new, real-world healthcare capabilities. It is built and deployed on [Nitrostack](https://nitrostack.ai), the fastest way to build, deploy, and share MCP apps.

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

Medivra AI is a unified AI-powered healthcare platform connecting Patients, Doctors, Hospitals, Pharmacies, and Administrators. This repository contains its **MCP server** — the agentic layer that lets any MCP-compatible AI assistant read a prescription, interpret a blood report, or answer a grounded health question, using the same Gemini-powered logic that runs the live Medivra AI web app.

## What is MCP?

The **Model Context Protocol (MCP)** is an open standard that lets AI assistants securely connect to external tools, data sources, and services. Instead of being limited to what it was trained on, an AI model can call **MCP servers** to fetch live data, run actions, and integrate with real systems.

This project is one such MCP server. Learn more about building and shipping MCP apps at [nitrostack.ai](https://nitrostack.ai).

## Features

- 🔌 **MCP-native** — works with any MCP-compatible client (Claude, Cursor, and more)
- 🧾 **`ocr_medical_document`** — real Gemini Vision OCR on a prescription or blood report image/PDF, transcribing exactly what's on the page
- 💊 **`parse_prescription`** — turns OCR text into structured patient, doctor, and medicine data (dosage, timing, duration), grounded strictly in what was actually transcribed
- 🩸 **`parse_blood_report`** — extracts lab parameters, flags Normal/Low/High/Critical status against reference ranges, and returns a summarized risk level
- 🩺 **`query_health_assistant`** — a grounded, agentic Q&A tool that answers health questions using the patient's live medicine and report history, not generic advice
- 🛠️ **Tools, resources & prompts** — exposes structured capabilities to AI agents via real NitroStack `@Tool` definitions, not a single-prompt wrapper
- ⚡ **Deployed on Nitrocloud** — reliable, hosted, and instantly shareable
- 🔐 **Secure by design** — the Gemini API key stays in `.env`, never in code
- 🧩 **Composable** — combine with other MCP apps to build larger healthcare AI workflows

## Getting Started

### Prerequisites

- Node.js 18+
- An MCP-compatible client (Claude Desktop, Cursor, NitroStudio, etc.)
- A free Gemini API key from [aistudio.google.com/apikey](https://aistudio.google.com/apikey)

### Installation

```bash
git clone https://github.com/<your-username>/<your-repo>.git
cd medivra-ai/Medivra-ai
npm install
```

> Note: the MCP server lives in the `Medivra-ai/` subfolder of this repo — that's the NitroStack project. The top-level folder is the separate patient-facing web app.

### Configuration

Copy the example environment file and add your own values:

```bash
cp .env.example .env
```

Then set your key inside `.env`:

```
GEMINI_API_KEY=your_key_here
```

### Run

```bash
npm run start
```

## Connect to an MCP Client

Add this server to your MCP client configuration. A typical entry looks like:

```json
{
  "mcpServers": {
    "medivra-ai": {
      "command": "npm",
      "args": ["run", "start"]
    }
  }
}
```

Restart your client and the four tools (`ocr_medical_document`, `parse_prescription`, `parse_blood_report`, `query_health_assistant`) will be available to your AI assistant.

## Deploy Your Own MCP App

Want to build and ship an MCP server like this one? **[Nitrostack](https://nitrostack.ai)** lets you create, deploy, and host MCP apps in minutes — no infrastructure to manage. Medivra AI itself is deployed on **Nitrocloud**.

👉 **Start building:** [https://nitrostack.ai](https://nitrostack.ai)

👉 **Live deployment:** `<add your Nitrocloud deployment link here>`

## Explore More MCP Apps

- 🌙 Discover and share MCP projects with the community on [r/mcptothemoon](https://www.reddit.com/r/mcptothemoon/)
- 🧰 Browse a growing catalog of MCP apps on [Nitrostack](https://nitrostack.ai/apps)

## FAQ

### What is an MCP server?

An MCP server implements the Model Context Protocol to expose tools, resources, and prompts that AI assistants can call. It lets an AI model take real actions and access live data.

### What does Medivra-ai do?

It gives any MCP-compatible AI assistant real healthcare capabilities: transcribing a prescription or blood report image via Vision OCR, converting that into structured, verified data, and answering health questions grounded in the patient's actual medicine and report history — rather than generic, ungrounded answers.

### Which AI clients does this work with?

Any MCP-compatible client, including Claude Desktop, Cursor, and NitroStudio. New clients are adding MCP support regularly.

### How do I deploy my own MCP app?

Use [Nitrostack](https://nitrostack.ai) to build, deploy, and host MCP apps without managing infrastructure.

## Keywords

`HealthTech & Life Sciences` · `Medivra-ai` · `MCP` · `Model Context Protocol` · `MCP server` · `MCP app` · `AI tools` · `AI agents` · `LLM tools` · `Claude MCP` · `Nitrostack` · `Gemini Vision OCR` · `prescription parsing` · `blood report analysis` · `deploy MCP server` · `build MCP app`

## License

MIT © 2026

---

Built with ❤️ using the Model Context Protocol on [Nitrostack](https://nitrostack.ai). Share your MCP app on [r/mcptothemoon](https://www.reddit.com/r/mcptothemoon/).
