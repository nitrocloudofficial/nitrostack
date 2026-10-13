# Converra One

> **Where Conversations Converge.**

Converra One is an intelligent communication workspace that unifies communications across multiple platforms into a single, cohesive dashboard. Built on the **NitroStack Agentic AI Platform** and powered by **Model Context Protocol (MCP)**, Converra One brings together emails, chat messages, pull requests, tasks, and calendar events into one prioritized view.

---

## 🌟 Overview

Modern professionals spend hours context-switching across Gmail, Slack, Discord, GitHub, Notion, and Google Calendar. Converra One solves this fragmentation using autonomous AI agents that:
- **Prioritize** incoming communications across all channels based on urgency and relevance.
- **Summarize** long threads and generate executive briefings.
- **Extract tasks** and commitments automatically from conversations.
- **Suggest context-aware replies** with customizable tones.
- **Remember commitments** and manage deadlines seamlessly.

---

## 🏗️ Architecture & Stack

- **Framework**: NitroStack (`@nitrostack/core`, `@nitrostack/cli`)
- **Protocol**: Model Context Protocol (MCP)
- **Language**: TypeScript (ES2022, Strict ESM)
- **Runtime**: Node.js v20+
- **Platform**: NitroStack Cloud & Local Development Server

```
                  +-----------------------------------+
                  |        NitroStack Studio /        |
                  |     Converra One Dashboard        |
                  +-----------------------------------+
                                    | (MCP Protocol)
                                    v
                  +-----------------------------------+
                  |      Converra One MCP Server      |
                  +-----------------------------------+
                                    |
     +------------------------------+------------------------------+
     |                              |                              |
     v                              v                              v
[AI Agent Modules]         [Shared Framework]           [Platform Integrations]
- Collector Agent          - Models & Interfaces         - Gmail
- Priority Classifier      - Custom Error Handling       - Slack
- Thread Summarizer        - Config & Utilities          - Discord
- Task Extractor           - Abstract Base Classes       - GitHub
- Reply Generator                                        - Notion
- Commitment Memory                                      - Calendar
```

---

## 📂 Project Structure

For a detailed, complete break down of every directory and file, see [`PROJECT_TREE.md`](PROJECT_TREE.md).

```
Converra_One/
├── src/
│   ├── modules/          # Agentic AI Feature Modules
│   ├── integrations/     # Platform Provider Connectors
│   ├── widgets/          # NitroStack UI Dashboard Widgets
│   ├── shared/           # Framework Interfaces, Models, Constants, Errors, Utils
│   ├── prompts/          # MCP Prompts
│   ├── resources/        # MCP Resources
│   ├── tools/            # MCP Tools
│   ├── health/           # System & Provider Health Monitors
│   ├── app.module.ts     # Root McpApp Bootstrapper
│   └── index.ts          # Application Entrypoint
├── nitrostack.config.ts  # NitroStack Cloud Deployment Manifest
└── Dockerfile            # Containerization Specification
```

---

## 🛠️ Development Workflow

### Prerequisites
- **Node.js**: `v20.x` or later
- **npm**: `v10.x` or later

### Installation

```bash
# Clone the repository
git clone https://github.com/Harish7997Q/Converra_One.git
cd Converra_One

# Install dependencies
npm install
```

### Development Server

```bash
# Start development server with hot reload
npm run dev
```

### Production Build & Test

```bash
# Verify TypeScript compilation
npx tsc --noEmit

# Build production bundle
npm run build

# Start production server
npm run start:prod
```

---

## 🗺️ Future Implementation Phases

Refer to [`IMPLEMENTATION_PLAN.md`](IMPLEMENTATION_PLAN.md) for the multi-phase execution plan:
- **Phase 1**: Project Foundation, Shared Models & Architecture *(Completed)*
- **Phase 2**: Platform Connectors (Gmail, Slack, Discord, GitHub, Notion, Calendar)
- **Phase 3**: Multi-Agent Intelligence Engine (Priority, Summary, Task, Reply, Memory)
- **Phase 4**: NitroStack UI Widgets & Dashboard Integration
- **Phase 5**: Cloud Deployment & Hackathon Polish

---

## 📄 License

Built for the **NitroStack Agentic AI Hackathon**.
