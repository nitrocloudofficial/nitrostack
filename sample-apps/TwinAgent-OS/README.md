# TwinAgent OS — Proactive Enterprise Digital Twin & MCP Server

**TwinAgent OS** is a proactive enterprise digital twin backend engine and Model Context Protocol (MCP) server built with **NitroStack**. It aggregates organizational graph telemetry, models multi-dimensional digital twins of projects, teams, and employees, predicts delivery risks and burnout, executes automated approval workflows, and exposes a comprehensive MCP interface with 15 tools, 4 telemetry resources, and 3 prompt templates.

---

## 📑 Table of Contents

- [Overview \& Architecture](#-overview--architecture)
- [Model Context Protocol (MCP) Specification](#-model-context-protocol-mcp-specification)
  - [15 Enterprise MCP Tools](#15-enterprise-mcp-tools)
  - [4 Telemetry Resources](#4-telemetry-resources)
  - [3 Reusable Prompt Templates](#3-reusable-prompt-templates)
- [Multi-Transport Client Connection Guide](#-multi-transport-client-connection-guide)
  - [NitroStudio](#nitrostudio)
  - [Claude Desktop](#claude-desktop)
  - [Cursor IDE](#cursor-ide)
  - [Gemini CLI / Agent](#gemini-cli--agent)
- [REST API Reference](#-rest-api-reference)
- [Database Schema \& Data Models](#-database-schema--data-models)
- [Getting Started \& Environment Configuration](#-getting-started--environment-configuration)
- [Development, Building \& Deployment](#-development-building--deployment)
- [Testing \& Validation](#-testing--validation)

---

## 🏛️ Overview & Architecture

TwinAgent OS bridges real-time telemetry from enterprise tools (GitHub, Slack, Jira, Google Workspace) into an interactive **Organizational Knowledge Graph** and **Digital Twin Engine**.

```
                         ┌──────────────────────────────────────────────┐
                         │              AI Agents & Clients             │
                         │ (NitroStudio / Claude / Cursor / Gemini / SSE)│
                         └──────────────────────┬───────────────────────┘
                                                │
                                      ┌─────────┴─────────┐
                                      │   MCP Protocol    │
                                      │  (STDIO / SSE)    │
                                      └─────────┬─────────┘
                                                │
┌───────────────────────────────────────────────▼───────────────────────────────────────────────┐
│                                       TwinAgent OS Engine                                     │
├───────────────────────────────────────────────────────────────────────────────────────────────┤
│ ┌───────────────────────────┐ ┌───────────────────────────┐ ┌──────────────────────────────┐ │
│ │    Digital Twin Engine    │ │  Graph & Memory Pipeline  │ │      Predictive Engine       │ │
│ │  (User/Project Scores)    │ │   (Knowledge Timeline)    │ │   (Burnout & Risk Models)    │ │
│ └───────────────────────────┘ └───────────────────────────┘ └──────────────────────────────┘ │
│ ┌───────────────────────────┐ ┌───────────────────────────┐ ┌──────────────────────────────┐ │
│ │    Workflow Engine        │ │   Enterprise Connectors   │ │    Security & Audit Logs    │ │
│ │ (Approval Gates & Actions)│ │ (GitHub, Slack, Jira)     │ │   (RBAC & JWT Validation)    │ │
│ └───────────────────────────┘ └───────────────────────────┘ └──────────────────────────────┘ │
└───────────────────────────────────────────────┬───────────────────────────────────────────────┘
                                                │
                                      ┌─────────▼─────────┐
                                      │ PostgreSQL/Prisma │
                                      └───────────────────┘
```

---

## ⚡ Model Context Protocol (MCP) Specification

TwinAgent OS provides full support for the Model Context Protocol over both **STDIO** and **HTTP/SSE** transports.

### 15 Enterprise MCP Tools

| Tool Name | Description | Required Parameters | Input Schema Properties |
| :--- | :--- | :--- | :--- |
| **`predictProjectRisk`** | Calculates real-time project risk score, health score, delivery confidence, and task completion metrics. | `projectId` | `projectId` (string UUID) |
| **`predictBurnout`** | Scans an organization for employee burnout risks, workload imbalances, and delayed project dependencies. | `organizationId` | `organizationId` (string UUID) |
| **`updateTask`** | Updates status, priority, or risk score of an enterprise task. | `taskId`, `userId` | `taskId`, `userId`, `status` (BACKLOG, TODO, IN_PROGRESS, IN_REVIEW, DONE, BLOCKED), `priority` (LOW, MEDIUM, HIGH, URGENT, CRITICAL), `riskScore` (number 0-100) |
| **`searchKnowledge`** | Performs semantic & keyword search across organizational memory entries and decisions. | `organizationId`, `query` | `organizationId`, `query`, `category` (optional string) |
| **`organizationHealth`** | Retrieves real-time executive dashboard metrics including overall digital twin health, burnout index, and velocity. | `organizationId` | `organizationId` (string UUID) |
| **`summarizeProject`** | Retrieves comprehensive project details including tasks, milestones, sprints, and assigned team members. | `projectId` | `projectId` (string UUID) |
| **`recommendAssignee`** | Recommends optimal task assignee based on current workload capacity and skill availability. | `organizationId` | `organizationId`, `requiredSkills` (array of strings) |
| **`findExpert`** | Finds organizational experts by specific skill name and proficiency level. | `organizationId`, `skillName` | `organizationId`, `skillName` (string) |
| **`runWorkflow`** | Triggers an automated TwinAgent workflow or approval gate. | `workflowId`, `requesterId` | `workflowId`, `requesterId`, `payload` (object) |
| **`approveAction`** | Reviews and approves or rejects a pending workflow action gate. | `approvalId`, `reviewerId`, `status` | `approvalId`, `reviewerId`, `status` (APPROVED, REJECTED), `reason` (optional string) |
| **`syncConnector`** | Triggers synchronization job for connected enterprise accounts (GitHub, Slack, Jira, Google Workspace). | `accountId` | `accountId`, `mode` (FULL, INCREMENTAL) |
| **`calculateDigitalTwin`** | Recalculates multi-dimensional digital twin scores for a target user or project. | `targetType`, `targetId` | `targetType` (USER, PROJECT), `targetId` (string UUID) |
| **`getGraph`** | Retrieves Enterprise Knowledge Graph nodes and relationship edges for an organization. | `organizationId` | `organizationId` (string UUID) |
| **`globalSearch`** | Executes global search across tasks, projects, users, and organizational memory. | `organizationId`, `query` | `organizationId`, `query` (string) |
| **`getAuditLogs`** | Retrieves organization security audit logs for compliance review. | `organizationId` | `organizationId` (string UUID) |

---

### 4 Telemetry Resources

| Resource URI | Name | MIME Type | Description |
| :--- | :--- | :--- | :--- |
| `twinagent://memory/timeline` | Organizational Timeline Memory | `application/json` | Historical timeline of enterprise decisions, meetings, and project milestones |
| `twinagent://graph/enterprise` | Enterprise Knowledge Graph | `application/json` | Graph structure mapping employees, projects, dependencies, and ownerships |
| `twinagent://analytics/dashboard` | Organizational Telemetry Dashboard | `application/json` | Real-time telemetry indicators covering health, burnout index, and project risks |
| `twinagent://system/health` | TwinAgent Engine System Health | `application/json` | Runtime health metrics for REST, WebSocket, Redis, and Database services |

---

### 3 Reusable Prompt Templates

#### 1. `summarize_project_risk`
- **Description**: Generates an executive risk mitigation briefing for a project based on telemetry scores and dependency bottlenecks.
- **Arguments**: `projectId` (required)
- **Prompt Logic**: Invokes `predictProjectRisk` and `summarizeProject` tools to evaluate delivery confidence, blocked dependencies, and a 3-step mitigation strategy.

#### 2. `recommend_workload_rebalance`
- **Description**: Generates actionable task rebalancing recommendations for employees experiencing burnout risk.
- **Arguments**: `organizationId` (required)
- **Prompt Logic**: Scans organization using `predictBurnout` and `recommendAssignee` tools to reallocate workload for employees over 120% capacity.

#### 3. `query_organizational_memory`
- **Description**: Synthesizes past decisions, meeting outcomes, and historical patterns for a specific topic.
- **Arguments**: `topic` (required)
- **Prompt Logic**: Queries enterprise memory for topics using `searchKnowledge` and `twinagent://memory/timeline` resources.

---

## 🔌 Multi-Transport Client Connection Guide

### NitroStudio

#### Option A: STDIO Command Connection (Recommended)
- **Server Name**: `TwinAgent OS`
- **Connection Type**: `STDIO`
- **Command**: `npm`
- **Arguments**: `run`, `--silent`, `mcp:start`
- **Working Directory**: `/path/to/nitrostack/sample-apps/TwinAgent-OS`
- **Environment**: `{"NODE_ENV": "production"}`

#### Option B: URL / SSE Connection
- **Server Name**: `TwinAgent OS (SSE)`
- **Connection Type**: `SSE` / `HTTP`
- **Server URL**: `http://localhost:4000/api/v1/mcp/sse`

---

### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "twinagent-os": {
      "command": "npx",
      "args": [
        "-y",
        "tsx",
        "/path/to/nitrostack/sample-apps/TwinAgent-OS/src/mcp/cli.ts"
      ],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

---

### Cursor IDE

1. Open **Cursor Settings** ➔ **Features** ➔ **MCP Servers** ➔ **+ Add New MCP Server**.
2. Fill in:
   - **Name**: `twinagent-os`
   - **Type**: `command`
   - **Command**: `npx -y tsx /path/to/nitrostack/sample-apps/TwinAgent-OS/src/mcp/cli.ts`

---

### Gemini CLI / Agent

Add to `~/.gemini/mcp_servers.json`:

```json
{
  "mcpServers": {
    "twinagent-os": {
      "command": "npx",
      "args": [
        "-y",
        "tsx",
        "/path/to/nitrostack/sample-apps/TwinAgent-OS/src/mcp/cli.ts"
      ]
    }
  }
}
```

---

## 🌐 REST API Reference

The backend REST API runs on port `4000` (or `PORT` environment variable) under `/api/v1`:

| Module | Route Prefix | Key Endpoints | Description |
| :--- | :--- | :--- | :--- |
| **Auth** | `/api/v1/auth` | `POST /login`, `POST /register`, `GET /me` | JWT authentication and session management |
| **Digital Twin** | `/api/v1/twin` | `GET /scores`, `POST /calculate` | Compute multi-dimensional twin scores |
| **Prediction** | `/api/v1/predictions`| `GET /project-risk`, `GET /burnout` | Project risk and employee burnout modeling |
| **MCP SSE** | `/api/v1/mcp` | `GET /sse`, `POST /messages` | HTTP Server-Sent Events stream for MCP |
| **Graph** | `/api/v1/graph` | `GET /nodes`, `GET /edges` | Knowledge graph retrieval and querying |
| **Memory** | `/api/v1/memory` | `GET /timeline`, `POST /entries` | Organizational timeline and decision log |
| **Workflows** | `/api/v1/workflows` | `GET /`, `POST /execute`, `POST /approve` | Automated workflow execution & approval gates |
| **Tasks** | `/api/v1/tasks` | `GET /`, `POST /`, `PATCH /:id` | Task management and risk scoring |
| **Projects** | `/api/v1/projects` | `GET /`, `POST /`, `GET /:id/summary` | Project tracking and milestone analytics |
| **Organizations**| `/api/v1/organizations`| `GET /:id/health`, `GET /:id/audit-logs`| Organization management and audit logs |
| **Integrations** | `/api/v1/connectors` | `GET /`, `POST /sync` | Enterprise connector sync (GitHub, Slack, Jira) |

---

## 🗄️ Database Schema & Data Models

TwinAgent OS uses **Prisma ORM** connected to PostgreSQL. Key data models include:

- **`Organization`**: Multi-tenant container holding departments, teams, projects, and security settings.
- **`User`**: Enterprise members with RBAC roles (`EMPLOYEE`, `MANAGER`, `EXECUTIVE`, `ADMIN`, `OWNER`).
- **`Project`**: Projects with status (`PLANNING`, `ACTIVE`, `ON_HOLD`, `COMPLETED`, `CANCELLED`, `AT_RISK`) and risk metrics.
- **`Task`**: Enterprise tasks with priorities (`LOW`, `MEDIUM`, `HIGH`, `URGENT`, `CRITICAL`), statuses, and risk scores.
- **`TwinSnapshot`**: Historical multi-dimensional digital twin scores and health snapshots.
- **`MemoryEntry`**: Timeline of decisions, architectural notes, and meeting summaries.
- **`GraphNode` & `GraphEdge`**: Enterprise Knowledge Graph nodes and directional relationships.
- **`Workflow` & `ApprovalGate`**: Multi-step automated workflows with approval requirements.
- **`Prediction`**: AI-generated predictions covering burnout, project delays, bottlenecks, and bus factors.
- **`AuditLog`**: Immutable audit logs tracking security events and user actions.

---

## 🛠️ Getting Started & Environment Configuration

### Environment Variables (`.env.example`)

```env
PORT=4000
HOST=0.0.0.0
NODE_ENV=development
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/twinagent_db?schema=public"
JWT_SECRET="super-secret-twinagent-key"
CORS_ORIGIN="*"
REDIS_URL="redis://localhost:6379"
```

### Installation Steps

```bash
# 1. Clone the repository
git clone https://github.com/realrichelle19/nitrostack.git
cd nitrostack/sample-apps/TwinAgent-OS

# 2. Configure environment
cp .env.example .env

# 3. Install dependencies
npm install

# 4. Generate Prisma client
npm run prisma:generate
```

---

## 🚀 Development, Building & Deployment

### Development Commands

```bash
# Run with NitroStack CLI dev mode
npm run dev

# Start backend Fastify watcher directly
npm run backend:dev

# Run Stdio MCP Server directly
npm run mcp:start
```

### Production Build & Deployment

```bash
# Compile TypeScript & generate Prisma client via NitroStack CLI
npm run build

# Start production server
npm run start:prod
```

### Docker Setup

```bash
# Run with Docker Compose (PostgreSQL + TwinAgent OS)
docker-compose up --build -d
```

---

## 🧪 Testing & Validation

```bash
# Run unit & integration test suite (Vitest)
npm run test

# Run automated MCP protocol compatibility validator
npm run validate:mcp

# Typecheck TypeScript files
npm run typecheck

# Run linter & formatter
npm run lint
npm run format
```

---

## 📄 License

Distributed under the MIT License. Built with **[NitroStack](https://nitrostack.ai)** ⚡
