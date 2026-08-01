# Converra One - Master System Architecture

> **Where Conversations Converge.**

---

## 🏛️ End-to-End System Topology

```
NitroStack Studio App (ConverraStudioApp.tsx)
       │
       ▼
Centralized Application State (AppStateContext.tsx)
       │
       ▼
Explicit API Layer (`src/api/` - dashboard.api.ts, inbox.api.ts, search.api.ts, etc.)
       │
       ▼
MCP Tools Layer (`src/tools/` - 1 tool per file)
       │
       ▼
Workflow Services Layer (`src/workflows/`)
       │
       ▼
Master OrchestratorAgent (Pipeline Controller & Typed Event Bus)
       │
 ┌─────┴────────────────────────────────────────────────────────────────────────┐
 │                                                                              │
 ▼                                                                              ▼
CollectorAgent ──► PriorityAgent ──► SummaryAgent ──► TaskAgent ──► ReplyAgent ──► CalendarAgent
 │                                                                                        │
 ▼                                                                                        ▼
ConnectorManager (Auto-Switching: Mock / Real Adapters)                             MemoryAgent & SearchAgent
 │
 ▼
Integration Adapters (Gmail, Google Calendar, GitHub, Slack, Discord, Notion)
```

---

## 🔑 Key Architectural Highlights

1. **Multi-Agent Sequential Pipeline**: `Collector` → `Priority` → `Summary` → `Task` → `Calendar` → `Memory` → `Reply` → `Dashboard Payload`.
2. **Decoupled Integration Adapters**: 6 platform connectors managed by `ConnectorManagerService` with auto-switching fallback and `AuthenticationManagerService`.
3. **Modular MCP Infrastructure**: 9 single-file MCP Tools and 9 single-file MCP Resources (`resource://agent/timeline` and `resource://agent/health`).
4. **Resiliency & Performance**: Built-in 429 throttle handling with exponential backoff (`RateLimiterService`) and in-memory caching (`AgentMemoryCacheService`).
