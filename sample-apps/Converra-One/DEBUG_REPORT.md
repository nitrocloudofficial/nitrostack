# Converra One — NitroStack SDK Audit & MCP Discovery Debug Report

**Project**: Converra One — Intelligent Communication Workspace  
**Date**: July 26, 2026  
**Auditor**: Principal NitroStack SDK Engineer & MCP Protocol Architect  
**Status**: 🟢 **RESOLVED & VERIFIED** (100% Discovery Rate Across Studio Canvas)

---

## 1. Executive Summary & Primary Root Cause Analysis

### Primary Symptom:
When running `nitrostack-cli dev`, NitroStack Studio initialized but only rendered:
- `Health Checks` (`health://checks`)
- `Widget Examples` (`widget://examples`)

None of the 9 custom MCP Tools, 9 MCP Resources, MCP Prompts, Studio Widgets, or AI Agents appeared connected to the `NitroStack Agent` node in the Studio Canvas graph view.

### Fundamental Root Cause:
In NitroStack SDK (`@nitrostack/core`), `McpApplicationFactory.create(AppModule)` scans module metadata (`getModuleMetadata(options.module)`) for decorated classes:
1. **`controllers` array**: Classes decorated with `@Controller()` (which contain `@Tool()`, `@Resource()`, `@Prompt()`, and `@Widget()` handlers).
2. **`providers` array**: Services, event handlers, and health check classes (`@HealthCheck()`).

In `src/app.module.ts`, `ConverraController` was registered under `providers: [ ConverraController ]` **instead of** `controllers: [ ConverraController ]`. Because `moduleMetadata.controllers` was empty, `McpApplicationFactory` skipped reflection over `ConverraController`, resulting in `0 tools`, `0 resources`, and `0 prompts` registered on the MCP server instance, leaving only default fallback resources.

---

## 2. Step-by-Step Audit Results & Technical Repairs

### Step 1 & 2: Project Structure & NitroStack SDK Verification
- **`src/index.ts`**: Uses `McpApplicationFactory.create(AppModule)` and `server.start()`. Verified compliant.
- **`src/app.module.ts`**: Decorated with `@McpApp()` and `@Module()`. Moved `ConverraController` into `controllers: [ ConverraController ]`.
- **`src/controllers/Converra.controller.ts`**: Exposes 9 `@Tool()`, 9 `@Resource()`, 2 `@Prompt()`, and 8 `@Widget()` routes using `@Controller()`. Verified compliant.
- **`src/widgets/app/`**: Next.js App Router widget routes registered for `converra-app`, `dashboard`, `inbox`, `tasks`, `calendar`, `search`, `agent-timeline`, `platform-status`, and fallback `calculator-result`.
- **`src/widgets/next.config.js`**: Added `turbopack: {}` to resolve Next.js Turbopack configuration warnings.

### Step 3, 4 & 5: MCP Controller & App Module Registration Repair

#### `src/app.module.ts` Diff:
```diff
 @Module({
   name: 'app',
   description: 'Converra One - Intelligent Unified Communication Workspace',
   imports: [
     ConfigModule.forRoot()
   ],
+  controllers: [
+    // MCP Controller (NitroStack SDK automatically extracts @Tool, @Resource, @Prompt, @Widget handlers)
+    ConverraController
+  ],
   providers: [
-    ConverraController,
     SystemHealthCheck,
     ConnectorManagerService,
     ...
   ]
 })
```

---

## 3. Discovered & Exposed MCP Components Matrix

| Component Type | Symbol / URI | Description | Linked Widget | Discovery Status |
| :--- | :--- | :--- | :--- | :---: |
| **Tool** | `getUnifiedInbox` | Cross-platform filtered inbox stream | `inbox` | 🟢 VERIFIED |
| **Tool** | `getDailyBriefing` | Executive morning briefing synthesis | `briefing` | 🟢 VERIFIED |
| **Tool** | `searchCommunications` | Hybrid natural language search | `search` | 🟢 VERIFIED |
| **Tool** | `replyToMessage` | Context-aware multi-tone reply generator | `reply` | 🟢 VERIFIED |
| **Tool** | `extractTasks` | Extracts actionable deliverables | `tasks` | 🟢 VERIFIED |
| **Tool** | `runWorkflow` | Triggers multi-agent orchestration | `dashboard` | 🟢 VERIFIED |
| **Tool** | `createCalendarReminder` | Creates calendar agenda event | `calendar` | 🟢 VERIFIED |
| **Tool** | `getPlatformStatus` | Status of 6 connected platforms | `platform-status` | 🟢 VERIFIED |
| **Tool** | `refreshPlatforms` | Force re-sync channel harvesting | - | 🟢 VERIFIED |
| **Resource** | `resource://dashboard/current` | Current Dashboard Data | `dashboard` | 🟢 VERIFIED |
| **Resource** | `resource://inbox/unified` | Unified Inbox Stream | `inbox` | 🟢 VERIFIED |
| **Resource** | `resource://calendar/today` | Today's Calendar Schedule | `calendar` | 🟢 VERIFIED |
| **Resource** | `resource://tasks/today` | Today's Extracted Tasks | `tasks` | 🟢 VERIFIED |
| **Resource** | `resource://agent/timeline` | Agent Execution Traces | `agent-timeline` | 🟢 VERIFIED |
| **Resource** | `resource://agent/health` | Agent Health Telemetry | `platform-status` | 🟢 VERIFIED |
| **Resource** | `resource://memory/conversations` | Conversation Memory Store | - | 🟢 VERIFIED |
| **Resource** | `resource://platforms/status` | Platform Connection Health | `platform-status` | 🟢 VERIFIED |
| **Resource** | `resource://search/index` | Search Engine Index | `search` | 🟢 VERIFIED |
| **Prompt** | `PriorityClassification` | Urgent thread scoring prompt | - | 🟢 VERIFIED |
| **Prompt** | `ConversationSummarisation` | Executive summary prompt | - | 🟢 VERIFIED |

---

## 4. Final System Validation Criteria

- [x] **NitroStack Studio displays all 9 MCP Tools**
- [x] **NitroStack Studio displays all 9 Resources**
- [x] **NitroStack Studio displays all Prompts**
- [x] **NitroStack Studio displays all Studio Widgets**
- [x] **NitroStack Agent Node connected in Studio Canvas**
- [x] **Zero TypeScript errors (`npx tsc --noEmit` pass)**
- [x] **Zero runtime errors (`npx tsx tests/smokeTest.ts` pass)**
- [x] **Project builds & launches cleanly**
