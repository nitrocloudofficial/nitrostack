# Converra One - MCP Server & Multi-Agent Architecture

This document describes the enterprise production-grade **MCP Server** and **Agentic AI Orchestration Engine** powering **Converra One** ("Where Conversations Converge") built on the official NitroStack SDK (`@nitrostack/core`).

---

## 🏗️ System Architecture Diagram

```
NitroStack Studio / Studio UI Widgets
            │
            ▼
   MCP Tools Layer (1 tool per file)
   • getUnifiedInbox
   • getDailyBriefing
   • searchCommunications
   • replyToMessage
   • extractTasks
   • runWorkflow
   • createCalendarReminder
   • getPlatformStatus
   • refreshPlatforms
            │
            ▼
  Workflow Services Layer
   • DashboardWorkflowService
   • InboxWorkflowService
   • SearchWorkflowService
   • ReplyWorkflowService
   • CalendarWorkflowService
   • TaskWorkflowService
            │
            ▼
   OrchestratorAgent (Pipeline Coordinator & Event Bus Emitter)
            │
 ┌──────────┴──────────────────────────────────────────────────────────────────┐
 │                                                                             │
 ▼                                                                             ▼
CollectorAgent ───► PriorityAgent ───► SummaryAgent ───► TaskAgent ───► ReplyAgent
 │                                                            │
 ▼                                                            ▼
ConnectorManager                                         CalendarAgent
 │                                                            │
 ▼                                                            ▼
Integration Adapters (Gmail, Slack, Discord, GitHub, Notion)  MemoryAgent & SearchAgent
 │
 ▼
Mock Providers (Phase 3) ──► OAuth Providers (Phase 4) ──► Real Platform APIs
```

---

## ⚡ Architectural Core Components

### 1. Workflow Service Layer (`src/workflows/`)
Decouples UI widgets and MCP tools from internal agent orchestration logic. Coordinates domain workflows for Dashboard, Inbox, Search, Smart Reply, Calendar, and Tasks.

### 2. Connector Manager & Integration Adapters (`src/services/ConnectorManager.service.ts`)
Decouples `CollectorAgent` from specific provider APIs. Uses provider adapters (`MockGmailAdapter`, `MockSlackAdapter`, `MockGitHubAdapter`, etc.) allowing seamless Phase 4 real OAuth/API connectivity without altering agent code.

### 3. Master Orchestrator Pipeline (`src/modules/orchestrator/OrchestratorAgent.ts`)
Executes sequential multi-agent workflows:
`Collector` → `Priority` → `Summary` → `Task` → `Calendar` → `Memory` → `Reply` → `Dashboard Data Payload`.

### 4. Live Agent Execution Timeline & Health Telemetry
- **`resource://agent/timeline` (`timeline.resource.ts`)**: Exposes live step-by-step agent workflow execution traces (`workflowId`, `toolInvoked`, `agentName`, `executionOrder`, `start/end timestamps`, `input/output summaries`, `latency`).
- **`resource://agent/health` (`health.resource.ts`)**: Exposes telemetry metrics (`status`, `messagesProcessed`, `avgExecutionTimeMs`, `successRate`, `failureCount`).

### 5. In-Memory Event Bus & Memory Cache (`src/services/`)
- **`AgentEventBusService`**: Pub/Sub event bus emitting granular agent execution state transitions (`COLLECTION_COMPLETED`, `PRIORITY_SCORED`, `SUMMARY_GENERATED`, etc.).
- **`AgentMemoryCacheService`**: High-performance in-memory cache reducing redundant agent runs.

### 6. Modular Single-File MCP Tools & Resources (`src/tools/` & `src/resources/`)
Every MCP tool and resource adheres strictly to Single Responsibility Principle (SRP) with 1 tool/resource per file.

---

## 🛠️ MCP Tool Index

| Tool Name | File Path | Description |
| :--- | :--- | :--- |
| `getUnifiedInbox` | `src/tools/getUnifiedInbox.tool.ts` | Fetches cross-platform filtered inbox stream |
| `getDailyBriefing` | `src/tools/getDailyBriefing.tool.ts` | Synthesizes executive morning briefing |
| `searchCommunications` | `src/tools/searchCommunications.tool.ts` | Performs hybrid natural language search |
| `replyToMessage` | `src/tools/replyToMessage.tool.ts` | Generates context-aware smart response drafts |
| `extractTasks` | `src/tools/extractTasks.tool.ts` | Extracts action items, deliverables, and due dates |
| `runWorkflow` | `src/tools/runWorkflow.tool.ts` | Triggers master multi-agent pipeline |
| `createCalendarReminder` | `src/tools/createCalendarReminder.tool.ts` | Creates calendar reminder event |
| `getPlatformStatus` | `src/tools/getPlatformStatus.tool.ts` | Returns 6-platform connector health statuses |
| `refreshPlatforms` | `src/tools/refreshPlatforms.tool.ts` | Forces channel re-sync |

---

## 📡 MCP Resource Index

| Resource URI | File Path | Description |
| :--- | :--- | :--- |
| `resource://dashboard/current` | `src/resources/dashboard.resource.ts` | Aggregated Dashboard Payload |
| `resource://inbox/unified` | `src/resources/inbox.resource.ts` | Multi-platform Unified Inbox Stream |
| `resource://tasks/today` | `src/resources/task.resource.ts` | Today's Pending Tasks |
| `resource://calendar/today` | `src/resources/calendar.resource.ts` | Today's Schedule Timeline |
| `resource://agent/timeline` | `src/resources/timeline.resource.ts` | Live Agent Execution Timeline Traces |
| `resource://agent/health` | `src/resources/health.resource.ts` | Agent Telemetry & Health Metrics |
| `resource://memory/conversations` | `src/resources/memory.resource.ts` | Cross-Channel Commitment Memory Store |
| `resource://platforms/status` | `src/resources/platform.resource.ts` | Platform Connector Health Statuses |
| `resource://search/index` | `src/resources/search.resource.ts` | Search Index Data |
