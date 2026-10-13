# Converra One - Enterprise Integration Layer Architecture

This document describes the enterprise production-grade **Integration Layer Architecture** powering **Converra One** ("Where Conversations Converge") built on NitroStack Cloud.

---

## 🏗️ System Architecture Flow

```
NitroStack Widgets / Studio UI
       │
       ▼
MCP Tools Layer (1 tool per file)
       │
       ▼
Workflow Services Layer
       │
       ▼
Orchestrator & CollectorAgent (Unchanged)
       │
       ▼
ConnectorManagerService
 ├──► AuthenticationManagerService (Centralized OAuth Token & Credential Store)
 ├──► ConnectorCapabilityRegistry (Platform Capability Matrix & Feature Flags)
 ├──► RateLimiterService (429 Throttle Queue & Exponential Backoff Engine)
 ├──► SyncSchedulerService & BackgroundJobService (Periodic Async Sync Loops)
 └──► AttachmentNormalizerService & SearchIndexBuilderService
       │
 ┌─────┴────────────────────────────────────────────────────────────────────────┐
 │                                                                              │
 ▼                                                                              ▼
GmailIntegrationAdapter                                                         SlackIntegrationAdapter
GoogleCalendarIntegrationAdapter                                               DiscordIntegrationAdapter
GitHubIntegrationAdapter                                                        NotionIntegrationAdapter
 │                                                                              │
 └───────────────────────────────────┬──────────────────────────────────────────┘
                                     │
                                     ▼
                          Platform OAuth & REST APIs
```

---

## ⚡ Core Enterprise Subsystems

### 1. Centralized Authentication Manager (`AuthenticationManagerService`)
- Manages OAuth token storage, refresh loops, token validation, expiration detection, and secure secret handling.
- Automatically redacts sensitive fields (`accessToken`, `refreshToken`, `clientSecret`) from logs.

### 2. Rate Limiter Engine (`RateLimiterService`)
- Reusable rate limiter supporting platform-specific request queues, 429 throttle handling, and exponential backoff retry algorithms.

### 3. Connector Capability Registry (`ConnectorCapabilityRegistryService`)
- Declares platform feature matrix (`supportsSearch`, `supportsReply`, `supportsAttachments`, `supportsThreads`, `supportsMentions`, `supportsCalendar`, `supportsTasks`, `supportsNotifications`, `supportsRead`, `supportsWrite`) allowing Studio UI widgets to dynamically enable or disable actions.

### 4. Sync Scheduler & Background Jobs (`SyncSchedulerService` & `BackgroundJobService`)
- Asynchronous sync engine executing periodic background synchronization for inbox, calendar, memory cleanup, and health telemetry.

### 5. Media Attachment Normalizer (`AttachmentNormalizerService`)
- Standardizes images, PDFs, office documents, GitHub diffs, markdown files, and Notion page attachments into a unified `UnifiedAttachment` model.

### 6. Unified Search Index (`SearchIndexBuilderService`)
- Pre-indexes harvested messages and documents into a structured index consumed by `SearchAgent`.

---

## 📡 Supported Platform Integration Adapters

| Platform | Directory | Capabilities |
| :--- | :--- | :--- |
| **Gmail** | `src/integrations/gmail/` | Read inbox, labels, threads, search, draft smart replies |
| **Google Calendar** | `src/integrations/calendar/` | Read events, upcoming schedule, create reminders/events |
| **GitHub** | `src/integrations/github/` | Notifications, PRs, Issues, CI/CD builds, assigned work |
| **Slack** | `src/integrations/slack/` | Channels, DMs, @mentions, unread streams, threads |
| **Discord** | `src/integrations/discord/` | Guild channels, DMs, @mentions, message streams |
| **Notion** | `src/integrations/notion/` | Database items, pages, assigned tasks, comments |

---

## 🔮 Future Webhook Pipeline Blueprint

```
External Webhook Request
       │
       ▼
NitroStack Webhook Endpoint
       │
       ▼
ConnectorManager (Signature Verification & Validation)
       │
       ▼
AgentEventBusService (Emits WEBHOOK_RECEIVED)
       │
       ▼
CollectorAgent & Workflow Processing Engine
```
