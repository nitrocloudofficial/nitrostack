## Unified Semiconductor Lifecycle MCP Server

> **Track:** Manufacturing & Industry Platform  
> **Framework:** [NitroStack](https://nitrostack.ai) (MCP Framework + SDK)  
> **Testing Environment:** NitroStudio  
> **Protocol:** Model Context Protocol (MCP)  
> **Language:** TypeScript  

---

## 1. Overview

Semiconductor manufacturing data is fragmented across five disconnected enterprise systems: EDA/PCB design tools, MES manufacturing telemetry platforms, quality/test diagnostics systems, product documentation repositories, and shipping/trade compliance databases. None of these systems interoperate natively, so answering a cross-domain question — for example, *"why did this wafer lot's yield drop, and does it affect a shipment already in transit?"* — requires an engineer to manually query four or five separate tools and correlate the results by hand.

This project implements a **Unified Semiconductor Lifecycle MCP Server**: a single MCP server that exposes each fragmented domain as a typed, callable tool, plus an orchestration layer that autonomously chains these tools together to answer cross-domain questions in one request. An AI agent connected to this server (via NitroStudio's chat interface, or any MCP-compatible client) can ask a natural-language question and receive a synthesized, root-cause-level answer — replacing what would otherwise be a multi-team, multi-day manual investigation.

---

## 2. Problem Statement & Solution

### The Fragmentation Problem

| Domain | Typical System | Data Held |
| :--- | :--- | :--- |
| **Design** | Cadence Virtuoso / Altium | Netlists, layout revisions, GDSII/OASIS metadata |
| **Manufacturing** | GE Vernova MES / Siemens MES | Chamber pressure, thermal logs, lot movement logs |
| **Quality & Test** | STDF binary logs | Wafer yield maps, bin failure statistics |
| **Documentation** | SharePoint / Confluence | Datasheets, compliance specs, thermal/voltage limits |
| **Shipping & Trade** | SAP / ERP | Customs codes, export control classification (ECCN), tariffs |

Because these systems are siloed:
- Root-cause analysis of a yield or quality issue is slow and manual.
- Compliance risk (e.g., an export-controlled part shipping to a restricted destination) can go unnoticed until it causes a customs hold or a regulatory violation.

### The Solution

A single MCP server exposing six modules — five domain modules that each wrap one fragmented system, and one orchestrator module that performs autonomous cross-domain correlation. The orchestrator is the component that elevates this from "API aggregator" to "agentic system": it doesn't just fetch data, it reasons across data sources to produce a synthesized diagnosis.

---

## 3. System Architecture

```
┌──────────────────────────────────────────────────────────┐
│              AI Client (NitroStudio Chat / any MCP client) │
│   "Why did Lot LOT-8923's yield drop, and is the affected  │
│    shipment export-compliant?"                             │
└────────────────────────────┬───────────────────────────────┘
                             │ Model Context Protocol (MCP)
                             ▼
┌──────────────────────────────────────────────────────────┐
│          Orchestrator Module — RootCauseAnalysis         │
│  Chains calls across all five domain modules, correlates │
│  results, and returns one synthesized answer             │
└──────┬──────────┬──────────┬──────────┬──────────┬───────┘
       ▼          ▼          ▼          ▼          ▼
   Design     Manufacturing  Quality    Product    Shipping
   Module     Module         Module     Doc Module Module
       │          │             │           │          │
       ▼          ▼             ▼           ▼          ▼
  Cadence/    GE Vernova    STDF Logs / SharePoint Customs /
  Virtuoso    MES           Yield Maps  Docs       ERP DBs
  (mocked)    (mocked)      (mocked)    (mocked)   (mocked)
```

### Runtime Architecture (NitroStudio ↔ NitroStack project)

```
┌─────────────────────────────────────────────────────────────────┐
│                    NitroStudio (Standalone App)                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐               │
│  │    Chat     │  │   Tools     │  │    Logs     │               │
│  │  Interface  │  │   Panel     │  │   Viewer    │               │
│  └─────────────┘  └─────────────┘  └─────────────┘               │
│                           │                                       │
│                    ┌──────┴──────┐                                │
│                    │ MCP Client  │                                │
│                    └──────┬──────┘                                │
└───────────────────────────┼───────────────────────────────────────┘
                            │ stdio
┌───────────────────────────┼───────────────────────────────────────┐
│               NitroStack Project (this codebase)                  │
│                           │                                       │
│  ┌────────────────────────▼────────────────────────┐              │
│  │              MCP Server (stdio transport)         │              │
│  └───────────────────────────────────────────────────┘              │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 4. Module & Tool Specifications

Each tool is defined using NitroStack's `@Tool` decorator with a Zod input schema for runtime validation and automatic form generation in NitroStudio.

### 4.1 `get_cadence_design_revision`
- **Module:** `DesignModule` (`src/modules/design`)
- **Purpose:** Retrieves layout/IP block revision metadata without returning raw multi-gigabyte GDSII/OASIS binaries — only the metadata an LLM needs to reason about a design change.
- **Input Schema:**
  ```typescript
  z.object({
    revisionId: z.string().describe('The revision identifier for the IP block or PCB layout, e.g. REV-SERDES-PHY-v2.3')
  })
  ```
- **Example Output:**
  ```json
  {
    "revisionId": "REV-SERDES-PHY-v2.3",
    "designer": "A. Sharma",
    "ipBlock": "SERDES_PHY_BLOCK",
    "changes": "Adjusted metal layer 4 trace spacing to satisfy DRC rules and reduce crosstalk.",
    "timestamp": "2026-03-24T14:30:00Z"
  }
  ```

### 4.2 `get_manufacturing_mes_telemetry`
- **Module:** `ManufacturingMESModule` (`src/modules/manufacturing`)
- **Purpose:** Fetches machine-level process telemetry (chamber pressure, temperature, recipe, operator) for a given wafer lot, flagging any threshold excursions.
- **Input Schema:**
  ```typescript
  z.object({
    lotId: z.string().describe('The semiconductor lot ID, e.g. LOT-8923')
  })
  ```
- **Example Output:**
  ```json
  {
    "lotId": "LOT-8923",
    "stationId": "ETCH-CHAMBER-07",
    "recipeName": "POLY_SILICON_ETCH_V3",
    "chamberPressure": "14.2 mTorr (Exceeded threshold of 12.0 mTorr between 10:12–10:18)",
    "temperature": "185.4 C",
    "operatorId": "OP-4492"
  }
  ```

### 4.3 `get_lot_yield_summary`
- **Module:** `QualityTestModule` (`src/modules/quality`)
- **Purpose:** Parses STDF (Standard Test Data Format) binary test logs server-side and returns only a lightweight, summarized yield report — avoiding the payload bloat of raw binary test data.
- **Input Schema:**
  ```typescript
  z.object({
    lotId: z.string().describe('The lot identifier to fetch quality test summaries for')
  })
  ```
- **Example Output:**
  ```json
  {
    "lotId": "LOT-8923",
    "totalWafersTested": 25,
    "overallYield": "81.4%",
    "failingBins": [
      { "binCode": "BIN_12_LEAKAGE", "count": 184, "impact": "High power consumption" },
      { "binCode": "BIN_04_TIMING", "count": 42, "impact": "Clock skew failure" }
    ]
  }
  ```

### 4.4 `get_product_datasheet_specs`
- **Module:** `ProductDocModule` (`src/modules/product`)
- **Purpose:** Searches SharePoint-style document repositories for a product's official datasheet, operating limits, and compliance certifications.
- **Input Schema:**
  ```typescript
  z.object({
    productId: z.string().describe('The product ID or part number, e.g. SERDES-PHY-BLOCK')
  })
  ```
- **Example Output:**
  ```json
  {
    "productId": "SERDES-PHY-BLOCK",
    "datasheetUrl": "https://company.sharepoint.com/specs/SERDES-v2.pdf",
    "operatingVoltage": "1.2V +/- 5%",
    "maxThermalThreshold": "105 C",
    "complianceCertifications": ["RoHS Compliant", "REACH Certified"]
  }
  ```

### 4.5 `get_shipping_and_trade_compliance`
- **Module:** `ShippingTradeModule` (`src/modules/shipping`)
- **Purpose:** Retrieves international shipment logistics, export control classification (ECCN), HS code, applicable tariffs, and customs status for a given shipment.
- **Input Schema:**
  ```typescript
  z.object({
    shipmentId: z.string().describe('The tracking/shipment ID, e.g. SHIP-2026-04471')
  })
  ```
- **Example Output:**
  ```json
  {
    "shipmentId": "SHIP-2026-04471",
    "origin": "Taiwan (Hsinchu)",
    "destination": "United States (Austin, TX)",
    "eccnClassification": "3A090.a (Export Controlled)",
    "hsCode": "8542.31.0000",
    "applicableTariffs": "25% Section 301 Tariff + 2.5% Base Duty",
    "status": "Customs Hold: Missing Dual-Use License Endorsement"
  }
  ```

### 4.6 `analyze_yield_root_cause` (Orchestrator — Agentic Core)
- **Module:** `RootCauseAnalysisModule` (`src/modules/root-cause-analysis`)
- **Purpose:** The agentic centerpiece of the system. Given a lot ID (and optionally a shipment ID), this tool autonomously calls the manufacturing, quality, and design tools internally, correlates the results to identify a probable root cause, and — if a shipment is linked — checks whether that shipment carries downstream compliance or quality risk.
- **Input Schema:**
  ```typescript
  z.object({
    lotId: z.string().describe('The wafer lot ID to investigate'),
    shipmentId: z.string().optional().describe('Optional shipment ID to cross-check for downstream risk')
  })
  ```
- **Internal Logic Execution Flow:**
  1. Call `get_lot_yield_summary(lotId)` → obtain failing bins and overall yield.
  2. Call `get_manufacturing_mes_telemetry(lotId)` → obtain process parameter data.
  3. **Correlate:** match process threshold excursions with failure modes implied by bin codes (e.g., pressure excursion during etch ↔ `BIN_12_LEAKAGE`).
  4. Call `get_cadence_design_revision(revisionId)` for any design revision associated with the product to rule out or implicate layout changes.
  5. If `shipmentId` is provided, call `get_shipping_and_trade_compliance(shipmentId)` and flag downstream compliance risk.
- **Example Output:**
  ```json
  {
    "lotId": "LOT-8923",
    "overallYield": "81.4%",
    "likelyRootCause": "Chamber pressure excursion (14.2 mTorr vs. 12.0 mTorr threshold) during POLY_SILICON_ETCH_V3 correlates with elevated BIN_12_LEAKAGE failures (184 units) — consistent with incomplete etch causing leakage paths.",
    "designImplicated": false,
    "designNote": "No design revision changes found in the relevant window; root cause is process-based, not layout-based.",
    "shipmentRisk": {
      "shipmentId": "SHIP-2026-04471",
      "risk": true,
      "reason": "Shipment is on independent customs hold (missing dual-use license endorsement) — recommend resolving both the yield issue and the compliance hold before shipment release."
    }
  }
  ```

---

## 5. Security Architecture

An `AuthGuard` is applied at the application level via `APP_GUARD`, requiring a valid authorization header on every tool invocation. This reflects real-world handling requirements for sensitive semiconductor IP (design revisions, yield data) and export-controlled shipment details.

```typescript
export class AuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): boolean {
    const request = context.switchToMcp().getRequestHeaders();
    return !!request['authorization'];
  }
}
```

---

## 6. Project Structure

```
src/
    app.module.ts                   # Root application module registering all 6 modules
    index.ts                        # Server entry point and stdio bootstrap
    modules/
        design/                     # Cadence Design Revision Module
            design.module.ts
            design.service.ts
            design.tools.ts
        manufacturing/              # GE Vernova MES Telemetry Module
            manufacturing.module.ts
            manufacturing.service.ts
            manufacturing.tools.ts
        quality/                    # STDF Quality & Test Diagnostics Module
            quality.module.ts
            quality.service.ts
            quality.tools.ts
        product/                    # Product Datasheets & Specs Module
            product.module.ts
            product.service.ts
            product.tools.ts
        shipping/                   # Shipping & Trade Compliance Module
            shipping.module.ts
            shipping.service.ts
            shipping.tools.ts
        root-cause-analysis/        # Agentic Orchestrator Module
            root-cause-analysis.module.ts
            root-cause-analysis.service.ts
            root-cause-analysis.tools.ts
    widgets/                        # Optional Widget UI components
```

---

## 7. Data Model Consistency

All five domain modules reference the same core identifiers so the orchestrator can join records across them without mismatches:

| Field | Format | Example |
| :--- | :--- | :--- |
| `lotId` | `LOT-####` | `LOT-8923` |
| `revisionId` | `REV-<block>-v#.#` | `REV-SERDES-PHY-v2.3` |
| `shipmentId` | `SHIP-YYYY-#####` | `SHIP-2026-04471` |
| `productId` | uppercase block name | `SERDES-PHY-BLOCK` |
| `stationId` | `<PROCESS>-CHAMBER-##` | `ETCH-CHAMBER-07` |
| `eccnClassification` | ECCN format | `3A090.a` |
| `hsCode` | HS code format | `8542.31.0000` |

---

## 8. Why This Demonstrates Genuine Agentic Behavior

1. **Beyond API Aggregation:** The five domain modules alone would constitute an API aggregator — useful, but not agentic.
2. **Autonomous Multi-Step Reasoning:** The orchestrator tool (`analyze_yield_root_cause`) decides which downstream tools to call, correlates disparate data types (numeric process telemetry, categorical bin codes, textual design change logs, compliance status strings), and produces a synthesized diagnosis a human would otherwise need four separate systems and a cross-functional meeting to arrive at.
3. **Generalization:** A user can ask *"is Lot X's shipment safe to release"*, *"what caused the yield drop"*, or *"is this design revision implicated in a quality issue"* — all of which route through the same underlying tools via different reasoning paths, rather than being hardcoded single-purpose scripts.

---

## 9. Getting Started

### Prerequisites
- Node.js >= 18
- npm or pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/rohith-1205/SemiComply.git
cd SemiComply/semiconductor-mcp

# Install dependencies
npm install
```

### Development & Build Commands

```bash
# Start development server with live reload
npm run dev

# Build production bundle
npm run build

# Start production server
npm start
```

### Visual Testing with NitroStudio

1. Download and install [NitroStudio](https://nitrostack.ai/studio).
2. Connect NitroStudio to your local project using the stdio transport option.
3. Use the **Tools Panel** to test individual tools, or use the **Chat Interface** for natural language multi-tool orchestration.

---

## 10. Mock Chat Transcripts

### Scenario 1 — Root cause investigation with shipment cross-check
> **User:** Why did Lot LOT-8923's yield drop, and does it affect any pending shipments?
>
> **AI:** Let me investigate this for you.  
> `[Calling tool: analyze_yield_root_cause]`  
> `[Input: { "lotId": "LOT-8923", "shipmentId": "SHIP-2026-04471" }]`  
>
> Here's what I found:  
> - **Yield:** 81.4% overall (down from expected ~95%+ baseline)  
> - **Root cause:** The etch chamber (`ETCH-CHAMBER-07`) recorded a pressure excursion of 14.2 mTorr against a 12.0 mTorr threshold during the `POLY_SILICON_ETCH_V3` recipe, between 10:12–10:18. This correlates directly with 184 units failing `BIN_12_LEAKAGE` — consistent with an incomplete etch creating unintended leakage paths.  
> - **Design check:** No recent design revisions are implicated — the issue is process-based, not a layout defect.  
> - **Shipment risk:** `SHIP-2026-04471`, which is tied to this lot, is currently on an independent customs hold due to a missing dual-use license endorsement (ECCN 3A090.a, export-controlled). I'd recommend resolving both the yield root cause and the compliance hold before this shipment is released.

### Scenario 2 — Manual single-tool lookup
> **User:** Show me the MES telemetry for LOT-8923  
>
> **AI:** `[Calling tool: get_manufacturing_mes_telemetry]`  
> `[Input: { "lotId": "LOT-8923" }]`  
>
> Here's the telemetry for Lot LOT-8923:  
> - Station: `ETCH-CHAMBER-07`  
> - Recipe: `POLY_SILICON_ETCH_V3`  
> - Chamber pressure: 14.2 mTorr (exceeded the 12.0 mTorr threshold between 10:12 and 10:18)  
> - Temperature: 185.4°C  
> - Operator: `OP-4492`  
>
> This pressure excursion is a likely contributor to the elevated leakage failures seen in this lot's yield report — want me to pull the full yield summary to confirm?

### Scenario 3 — Compliance-focused query
> **User:** Is shipment SHIP-2026-04471 clear to leave the country?  
>
> **AI:** `[Calling tool: get_shipping_and_trade_compliance]`  
> `[Input: { "shipmentId": "SHIP-2026-04471" }]`  
>
> No — this shipment is currently on a **customs hold**.  
> - Route: Taiwan (Hsinchu) → United States (Austin, TX)  
> - ECCN classification: 3A090.a (export-controlled)  
> - HS code: 8542.31.0000  
> - Applicable tariffs: 25% Section 301 Tariff + 2.5% Base Duty  
> - Hold reason: Missing dual-use license endorsement  

### Scenario 4 — Unauthorized access attempt (Security demonstration)
> **User:** `[Tool call made without an authorization header present]`  
>
> **AI:** `[Calling tool: get_manufacturing_mes_telemetry]`  
> `[Input: { "lotId": "LOT-8923" }]`  
>
> ❌ **Request blocked:** Missing authorization header. `AuthGuard` denied this tool invocation. Please provide a valid authorization token.

---

## 11. Known Limitations & Notes

- All underlying data sources (Cadence, MES, STDF, SharePoint, ERP) are mocked with realistic sample JSON for demonstration purposes; in production, each service layer would connect to live database or enterprise API endpoints.
- Mock values (bin codes, ECCN classification, HS code, pressure thresholds) reflect realistic semiconductor industry conventions.
- The orchestrator's correlation logic is rule-based in this implementation for deterministic demo behavior; it can be extended with an internal LLM call for dynamic correlation reasoning.
