<<<<<<< HEAD
# CottonFlow AI — Agentic AI Factory Operations Manager

An MCP (Model Context Protocol) server for smart textile manufacturing that enables AI agents to monitor cascading factory failures and autonomously coordinate cross-department responses.

## 🎯 Overview

CottonFlow AI is a production-ready MCP server deployed on NitroStack that demonstrates:

- **Real-time diagnostics** across machine health, environmental conditions, and production status
- **Intelligent orchestration** of multi-department incident responses
- **Live external data integration** with the Open-Meteo weather API for factory climate monitoring
- **Queryable resources** for live factory state (machines, lines, orders, inventory, environment)
- **Reusable prompt templates** for risk briefings, incident response planning, and shift handovers
- **Interactive dashboard widget** for visualizing production and machine health

## 🏗️ Architecture

### Modules

#### **Diagnostics Module** (`src/modules/diagnostics/`)
Monitors factory health and detects anomalies.

**Tools:**
- `checkMachineHealth(machineId)` — Returns vibration, temperature, RPM, predicted failure window
- `getEnvironmentalConditions(zoneId)` — **Real Open-Meteo API integration** for humidity/temperature
- `getProductionStatus(lineId)` — Returns batch, order priority, yarn breakage rate + **renders factory-dashboard widget**

**Resources:**
- `factory://machines/{machineId}/status` — Machine health data
- `factory://lines/{lineId}/production` — Line production status
- `factory://inventory/spare-parts` — Spare parts inventory
- `factory://orders/active` — Active production orders
- `factory://environment/{zoneId}` — Zone environmental conditions

**Prompts:**
- `daily-risk-briefing` — Summarizes all active risks
- `incident-response-plan` — Generates coordinated response plan
- `shift-handover-report` — Shift status summary

#### **Operations Module** (`src/modules/operations/`)
Coordinates corrective actions across departments.

**Tools:**
- `coordinateIncidentResponse(machineId, zoneId, orderId)` — **Orchestrates 5 sub-actions atomically:**
  1. Reassigns production batch to healthy line
  2. Adjusts environmental settings (humidity)
  3. Creates maintenance work order
  4. Notifies all relevant managers
  5. Updates delivery estimate
- `reassignProductionBatch(fromLineId, toLineId, batchId)` — Moves batch between lines
- `adjustEnvironmentalSettings(zoneId, targetHumidity)` — Adjusts zone humidity
- `createMaintenanceWorkOrder(machineId, issueType, urgency)` — Creates work order
- `checkSparePartAvailability(partId)` — Checks spare parts inventory
- `notifyManager(department, message, urgency)` — Sends notifications
- `updateDeliveryEstimate(orderId, newEta)` — Updates order ETA

### Data Model

**Factory State** (`fixtures/factory-state.json`):
- **6 Machines** across 3 production lines with vibration, temperature, RPM, and failure prediction
- **3 Production Lines** with yarn breakage rates and batch tracking
- **4 Active Orders** with priority levels and delivery dates
- **4 Spare Parts** with inventory levels and reorder thresholds
- **2 Environmental Zones** with humidity and temperature monitoring

All entities include `imageUrl` fields for visual representation in widgets.

### Widget

**Factory Dashboard** (`src/widgets/app/factory-dashboard/page.tsx`):
- Displays production line status with real-time metrics
- Shows associated order details (customer, priority, ETA)
- Color-coded risk indicators (critical/warning/normal)
- Responsive design with dark/light theme support
- Renders when `getProductionStatus` tool is called

## 🔌 External API Integration

### Open-Meteo Weather API (Real, No Auth Required)

The `getEnvironmentalConditions` tool integrates with **Open-Meteo** to pull real humidity and temperature data:

```typescript
// Real API call to Open-Meteo
const response = await fetch(
  'https://api.open-meteo.com/v1/forecast?latitude=35.7796&longitude=-78.6382&current=temperature_2m,relative_humidity_2m&timezone=America/New_York'
);
```

**Location:** North Carolina textile hub (35.7796°N, 78.6382°W)

**Data returned:**
- Current humidity percentage
- Current temperature (°C)
- Timezone-aware timestamps

**Fallback:** If API fails, uses fixture data from `factory-state.json`

**Why this matters:** Demonstrates genuine external data integration. All other factory state (machines, orders, inventory) is simulated but realistic.

## 🚀 Core Demo Scenario

The flagship end-to-end flow demonstrates cascading failure detection and coordinated response:

### Turn 1: Detect Cascading Failure
```
User: "Check machine M-12 and production line L-1 — is there a cascading failure?"

Agent calls:
- checkMachineHealth("M-12") → vibration 8.2mm/s (rising), temp 72°C, failure window 45 min
- getEnvironmentalConditions("zone-1") → humidity 42% (below 55% target)
- getProductionStatus("L-1") → yarn breakage 4.2% (rising), high-priority export order at risk

Result: Renders factory-dashboard widget showing all three signals together
```

### Turn 2: Coordinate Incident Response
```
User: "Coordinate an incident response: M-12 vibration spike, low humidity in zone-1, and urgent export order at risk on 2026-08-02."

Agent calls:
- coordinateIncidentResponse(
    machineId: "M-12",
    zoneId: "zone-1",
    orderId: "ORD-2026-001",
    targetLineId: "L-2",
    targetHumidity: 55
  )

Orchestrated actions:
1. ✅ Batch reassigned from L-1 to L-2 (healthy line)
2. ✅ Humidity adjusted to 55% in zone-1
3. ✅ Maintenance work order created for M-12 (bearing replacement)
4. ✅ Managers notified (maintenance, production, facilities)
5. ✅ Delivery estimate updated (+2 hours contingency)

Result: Summary of all coordinated actions with success status
```

## 📊 Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    MCP Client (Claude, etc)                 │
└────────────────────────┬────────────────────────────────────┘
                         │
                    ┌────▼─────┐
                    │ MCP Tools │
                    └────┬─────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
   ┌────▼────┐    ┌─────▼──────┐   ┌────▼────┐
   │Diagnostics   │ Operations │   │Resources │
   │  Module      │   Module   │   │  (Live)  │
   └────┬────┘    └─────┬──────┘   └────┬────┘
        │                │               │
        └────────────────┼───────────────┘
                         │
                    ┌────▼──────────────┐
                    │ FactoryStateService│
                    │ (In-Memory State)  │
                    └────┬───────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
   ┌────▼────┐    ┌─────▼──────┐   ┌────▼────┐
   │Fixtures  │    │Open-Meteo  │   │Widgets   │
   │(JSON)    │    │API (Real)  │   │(React)   │
   └──────────┘    └────────────┘   └──────────┘
```

## 🛠️ Setup & Development

### Prerequisites
- Node.js 18+
- npm 9+
- NitroStack CLI
=======
# CottonFLOW AI

> CottonFlow AI is an AI-powered manufacturing intelligence platform built for the textile industry.

![Model Context Protocol](https://img.shields.io/badge/Model%20Context%20Protocol-MCP-blue) ![Built with Nitrostack](https://img.shields.io/badge/Built%20with-Nitrostack-0A66FF) ![Status](https://img.shields.io/badge/status-live-brightgreen)

**CottonFLOW AI** is an [MCP (Model Context Protocol)](https://nitrostack.ai) server that extends AI assistants — like Claude, Cursor, and any MCP-compatible client — with new, real-world capabilities. It is built and deployed on [Nitrostack](https://nitrostack.ai), the fastest way to build, deploy, and share MCP apps.

## Table of Contents

- [Overview](#overview)
- [What is MCP?](#what-is-mcp)
- [Features](#features)
- [Live Demo](#live-demo)
- [Getting Started](#getting-started)
- [Connect to an MCP Client](#connect-to-an-mcp-client)
- [Deploy Your Own MCP App](#deploy-your-own-mcp-app)
- [Explore More MCP Apps](#explore-more-mcp-apps)
- [FAQ](#faq)
- [Keywords](#keywords)
- [License](#license)

## Overview

CottonFlow AI is an AI-powered manufacturing intelligence platform built for the textile industry. It connects spinning, weaving, quality control, maintenance, and production into a unified system that monitors operations in real time, predicts equipment failures, detects anomalies before they become costly, and provides actionable insights through intelligent dashboards. By transforming disconnected factory data into proactive decisions, CottonFlow AI helps mills reduce downtime, improve efficiency, minimize waste, and maximize productivity.

## What is MCP?

The **Model Context Protocol (MCP)** is an open standard that lets AI assistants securely connect to external tools, data sources, and services. Instead of being limited to what it was trained on, an AI model can call **MCP servers** to fetch live data, run actions, and integrate with real systems.

This project is one such MCP server. Learn more about building and shipping MCP apps at [nitrostack.ai](https://nitrostack.ai).

## Features

- 🔌 **MCP-native** — works with any MCP-compatible client (Claude, Cursor, and more)
- 🛠️ **Tools, resources & prompts** — exposes structured capabilities to AI agents
- ⚡ **Deployed on Nitrostack** — reliable, hosted, and instantly shareable
- 🔐 **Secure by design** — secrets stay in environment variables, never in code
- 🧩 **Composable** — combine with other MCP apps to build powerful AI workflows

## Live Demo

🚀 **Live MCP endpoint:** https://cottonflow-mcp-6a6c78f2-zero-response-time-srmist.app.nitrocloud.ai

Point your MCP client at the endpoint above to try it instantly. Prefer a hosted setup? Deploy your own in minutes on [Nitrostack](https://nitrostack.ai).

## Getting Started

### Prerequisites

- Node.js 18+ (or your project runtime)
- An MCP-compatible client (Claude Desktop, Cursor, etc.)
>>>>>>> bd6fc52edf3059bdd0dff37ef4ef8e5d68283078

### Installation

```bash
<<<<<<< HEAD
# Install dependencies
npm install

# Install widget dependencies
npm --prefix src/widgets install

# Start dev server
npm run dev
```

### Environment Variables

No API keys required! Open-Meteo is free and doesn't require authentication.

Optional `.env`:
```
NODE_ENV=development
LOG_LEVEL=info
```

## 📝 API Reference

### Tools

#### checkMachineHealth
```typescript
checkMachineHealth({
  machineId: "M-12"  // Required: Machine ID
})

Returns: {
  success: boolean
  machineId: string
  name: string
  vibration: number          // mm/s
  vibrationTrend: string     // "rising" | "stable" | "falling"
  temperature: number        // °C
  rpm: number
  predictedFailureWindow: number | null  // minutes
  isHealthy: boolean
  riskLevel: string          // "critical" | "warning" | "normal"
  imageUrl: string
}
```

#### getEnvironmentalConditions
```typescript
getEnvironmentalConditions({
  zoneId: "zone-1"  // Required: Zone ID
})

Returns: {
  success: boolean
  zoneId: string
  name: string
  currentHumidity: number    // % (from Open-Meteo API)
  targetHumidity: number     // %
  humidityTrend: string      // "rising" | "stable" | "falling"
  temperature: number        // °C (from Open-Meteo API)
  isOptimal: boolean
  riskLevel: string          // "critical" | "warning" | "normal"
  dataSource: string         // "open-meteo-api"
}
```

#### getProductionStatus
```typescript
getProductionStatus({
  lineId: "L-1"  // Required: Line ID
})

Returns: {
  success: boolean
  lineId: string
  name: string
  zone: string
  status: string
  currentBatchId: string
  yarnBreakageRate: number   // %
  yarnBreakageTrend: string  // "rising" | "stable" | "falling"
  isHealthy: boolean
  riskLevel: string          // "critical" | "warning" | "normal"
  associatedOrder: {
    id: string
    customerName: string
    priority: string         // "high" | "medium" | "low"
    quantity: number
    dueDate: string
    currentEta: string
  } | null
  imageUrl: string
}

// Renders: factory-dashboard widget
```

#### coordinateIncidentResponse
```typescript
coordinateIncidentResponse({
  machineId: "M-12",           // Required
  zoneId: "zone-1",            // Required
  orderId: "ORD-2026-001",     // Required
  targetLineId?: "L-2",        // Optional, defaults to "L-2"
  targetHumidity?: 55          // Optional, defaults to 55
})

Returns: {
  success: boolean
  actions: Array<{
    action: string
    status: "completed" | "failed"
    details: object
  }>
  summary: string
}

// Orchestrates:
// 1. reassignProductionBatch
// 2. adjustEnvironmentalSettings
// 3. createMaintenanceWorkOrder
// 4. notifyManager (x3 departments)
// 5. updateDeliveryEstimate
```

### Resources

All resources return JSON via MCP Resource protocol:

- `factory://machines/{machineId}/status` — Machine details
- `factory://lines/{lineId}/production` — Line status + machines + order
- `factory://inventory/spare-parts` — All spare parts + low-stock alerts
- `factory://orders/active` — All active orders + priority summary
- `factory://environment/{zoneId}` — Zone conditions + lines in zone

### Prompts

- `daily-risk-briefing` — Risk summary across all systems
- `incident-response-plan` — Coordinated response template
- `shift-handover-report` — Shift status for handover

## 🧪 Testing

### Smoke Tests
```bash
# Test individual tools
npm run dev

# In MCP Chat:
# "Check machine M-12 health status"
# "What are the environmental conditions in zone-1?"
# "Show me the production status for line L-1"
# "Coordinate an incident response for machine M-12..."
```

### Full Conversation Test
```bash
# Runs the 2-turn demo scenario
agent-trigger-conversation-test
```

## 📦 Deployment

### NitroStack Deployment

```bash
# Build
npm run build

# Start
npm run start:prod
```

The server will:
1. Load factory state from `fixtures/factory-state.json`
2. Register all tools, resources, and prompts
3. Listen for MCP client connections
4. Serve widgets via Next.js

### Docker (Optional)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm install && npm --prefix src/widgets install
RUN npm run build
CMD ["npm", "run", "start:prod"]
```

## 📋 Project Structure

```
cottonflow-ai/
├── fixtures/
│   └── factory-state.json          # Fixture data (6 machines, 3 lines, 4 orders, etc)
├── src/
│   ├── app.module.ts               # Root MCP app module
│   ├── index.ts                    # Entry point
│   ├── modules/
│   │   ├── diagnostics/
│   │   │   ├── diagnostics.module.ts
│   │   │   ├── diagnostics.tools.ts        # 3 tools
│   │   │   ├── diagnostics.resources.ts    # 5 resources
│   │   │   ├── diagnostics.prompts.ts      # 3 prompts
│   │   │   └── factory-state.service.ts    # State management
│   │   └── operations/
│   │       ├── operations.module.ts
│   │       ├── operations.tools.ts         # 7 tools (1 orchestrator + 6 sub-actions)
│   │       ├── operations.resources.ts
│   │       └── operations.prompts.ts
│   ├── health/
│   │   └── system.health.ts
│   └── widgets/
│       └── app/
│           └── factory-dashboard/
│               └── page.tsx                # Dashboard widget
├── package.json
├── tsconfig.json
└── README.md
```

## 🔍 Key Implementation Details

### Real vs Simulated Data

| Component | Type | Source |
|-----------|------|--------|
| Machine vibration, temp, RPM | Simulated | `factory-state.json` |
| Yarn breakage rates | Simulated | `factory-state.json` |
| Orders, inventory | Simulated | `factory-state.json` |
| **Humidity, temperature** | **REAL** | **Open-Meteo API** |
| Work orders, notifications | Simulated | In-memory (created on-demand) |

### Error Handling

- **API Timeout:** Falls back to fixture data
- **Invalid IDs:** Returns error with helpful message
- **Missing Resources:** Returns 404-style JSON response
- **Concurrent Calls:** Thread-safe via in-memory state

### Logging

All tool calls and decisions are logged via `context.logger`:
```typescript
context.logger.info(`Checking machine health for ${input.machineId}`);
context.logger.error(`Open-Meteo API call failed: ${error}`);
```

## 🎨 Widget Design

The factory-dashboard widget follows NitroStack design principles:

- **Responsive:** Works on desktop, tablet, mobile
- **Theme-aware:** Dark/light mode support
- **Accessible:** Semantic HTML, color contrast
- **Performant:** Vanilla CSS (no Tailwind), minimal re-renders
- **Defensive:** Null checks, fallback images, error states

## 📚 References

- [NitroStack Documentation](https://docs.nitrostack.ai)
- [MCP Specification](https://modelcontextprotocol.io)
- [Open-Meteo API Docs](https://open-meteo.com/en/docs)

## 📄 License

MIT

## 👥 Author

Built with NitroStack Studio

---

**Status:** ✅ Production Ready

**Last Updated:** 2026-08-02

**Version:** 1.0.0
=======
git clone https://github.com/your-username/your-mcp-project.git
cd cottonflow-ai
npm install
```

### Configuration

Copy the example environment file and add your own values:

```bash
cp .env.example .env
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
    "cottonflow-ai": {
      "url": "https://cottonflow-mcp-6a6c78f2-zero-response-time-srmist.app.nitrocloud.ai"
    }
  }
}
```

Restart your client and the tools from this MCP server will be available to your AI assistant.

## Deploy Your Own MCP App

Want to build and ship an MCP server like this one? **[Nitrostack](https://nitrostack.ai)** lets you create, deploy, and host MCP apps in minutes — no infrastructure to manage.

👉 **Start building:** [https://nitrostack.ai](https://nitrostack.ai)

## Explore More MCP Apps

- 🌙 Discover and share MCP projects with the community on [r/mcptothemoon](https://www.reddit.com/r/mcptothemoon/)
- 🧰 Browse a growing catalog of MCP apps on [Nitrostack](https://nitrostack.ai/apps)

## FAQ

### What is an MCP server?

An MCP server implements the Model Context Protocol to expose tools, resources, and prompts that AI assistants can call. It lets an AI model take real actions and access live data.

### What does CottonFLOW AI do?

CottonFlow AI is an AI-powered manufacturing intelligence platform built for the textile industry.

### Which AI clients does this work with?

Any MCP-compatible client, including Claude Desktop and Cursor. New clients are adding MCP support regularly.

### How do I deploy my own MCP app?

Use [Nitrostack](https://nitrostack.ai) to build, deploy, and host MCP apps without managing infrastructure.

## Keywords

`Manufacturing & Industry 4.0` · `CottonFLOW AI` · `MCP` · `Model Context Protocol` · `MCP server` · `MCP app` · `AI tools` · `AI agents` · `LLM tools` · `Claude MCP` · `Nitrostack` · `deploy MCP server` · `build MCP app`

## License

MIT © 2026

---

Built with ❤️ using the Model Context Protocol on [Nitrostack](https://nitrostack.ai). Share your MCP app on [r/mcptothemoon](https://www.reddit.com/r/mcptothemoon/).
>>>>>>> bd6fc52edf3059bdd0dff37ef4ef8e5d68283078
