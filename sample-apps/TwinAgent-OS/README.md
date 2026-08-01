# TwinAgent OS — Proactive Enterprise Digital Twin & MCP Server

TwinAgent OS is a proactive enterprise digital twin backend engine and Model Context Protocol (MCP) server built with **NitroStack**. It aggregates organizational graph telemetry, predicts project risks and team burnout, executes automated workflows, and provides AI tools, resources, and prompt templates for enterprise workspace management.

## 🚀 Features

- **Proactive AI Digital Twin**: Real-time modeling of enterprise nodes (projects, tasks, users, organizations, knowledge graphs).
- **15 Enterprise MCP Tools**:
  - `predictProjectRisk`, `predictBurnout`, `updateTask`, `searchKnowledge`
  - `organizationHealth`, `summarizeProject`, `recommendAssignee`, `findExpert`
  - `runWorkflow`, `approveAction`, `syncConnector`, `calculateDigitalTwin`
  - `getGraph`, `globalSearch`, `getAuditLogs`
- **4 Telemetry Resources**: Enterprise Memory Timeline, Enterprise Knowledge Graph, Telemetry Dashboard, System Health.
- **3 Prompt Templates**: Risk Mitigation Briefing, Workload Rebalancing, Organizational Memory Synthesis.
- **Prisma & PostgreSQL Integration**: Full schema supporting Digital Twin snapshots, memory events, audit logs, and workflow executions.
- **NitroStack CLI & NitroCloud Ready**: Built for native deployment on NitroCloud.

## 📁 Architecture & Tech Stack

- **Framework**: Fastify / TypeScript / NitroStack CLI
- **Database**: PostgreSQL with Prisma ORM
- **Protocol**: Model Context Protocol (MCP) over Stdio & HTTP/SSE
- **Validation & Safety**: JWT authentication, rate limiting, CORS, Helmet, correlation tracking

## 🛠️ Getting Started

### Prerequisites

- Node.js >= 18
- PostgreSQL database (or Docker Compose)

### Installation

```bash
# Clone the repository and navigate to TwinAgent-OS
cd sample-apps/TwinAgent-OS

# Copy environment template
cp .env.example .env

# Install dependencies
npm install

# Generate Prisma client
npm run prisma:generate
```

### Development

```bash
# Run with NitroStack CLI in development mode
npm run dev

# Or start Fastify server directly
npm run backend:dev
```

### Building & Running Production

```bash
# Build with NitroStack CLI
npm run build

# Start production server
npm run start:prod
```

## 📄 License

MIT
