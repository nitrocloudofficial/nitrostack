# Project Context: ALE Supply Chain Management (SCM) MCP Server

## Overview

**ALE SCM** is an enterprise-grade Model Context Protocol (MCP) server built with **NitroStack** (TypeScript/Node.js). It provides automated document ingestion, master data validation, supply chain workflow orchestration, exception handling, and interactive frontend widgets for AI clients (such as Claude Desktop, NitroStudio, or custom MCP clients).

---

## Core Architecture & Tech Stack

- **Framework**: NitroStack SDK (`@nitrostack/core`, `@nitrostack/cli`)
- **Language & Runtime**: TypeScript (ES2022, Node.js ES Modules)
- **AI Integration**: Anthropic Claude API (`ClaudeClient` using `claude-haiku-20240307` and `claude-sonnet-4-5`)
- **Schema Validation**: Zod (`zod`)
- **Transports**:
    - **Development**: STDIO
    - **Production**: Dual transport (STDIO + HTTP SSE)
- **UI & Widgets**: Next.js React frontend (`src/widgets`) utilizing `@nitrostack/widgets` / `@modelcontextprotocol/ext-apps`
- **Persistence**: JSON file stores (`data/master-data.json`, `data/exceptions.json`)

---

## Architecture Diagram

```
                             ┌───────────────────────────────────────┐
                             │           MCP Client / Studio         │
                             └───────────────────┬───────────────────┘
                                                 │ MCP (STDIO / SSE)
                                                 ▼
                             ┌───────────────────────────────────────┐
                             │              AppModule                │
                             │       (x-api-key ApiKeyGuard)         │
                             └───┬───────────┬───────────┬───────────┘
                                 │           │           │
       ┌─────────────────────────┘           │           └─────────────────────────┐
       ▼                                     ▼                                     ▼
┌───────────────────────────┐   ┌───────────────────────────┐   ┌───────────────────────────┐
│     IngestionModule       │   │     MasterDataModule      │   │    OrchestratorModule     │
├───────────────────────────┤   ├───────────────────────────┤   ├───────────────────────────┤
│ • classify_document       │   │ • validate_against_mdata  │   │ • execute_workflow        │
│ • extract_line_items      │   │ • recommend_hs_code       │   │ • match_invoice_to_po     │
│ • extract_document_data   │   │ • MasterDataService       │   │ • flag_exception          │
│ • ingest_document         │   │   (JSON Store & PO Lookup)│   │ • route_task              │
│ • ingestion://status      │   └───────────────────────────┘   │ • ValidationService       │
└──────────────┬────────────┘                                   │ • ExceptionService        │
               │                                                └─────────────┬─────────────┘
               ▼                                                              ▼
┌───────────────────────────┐                                   ┌───────────────────────────┐
│       ClaudeClient        │                                   │     Interactive Widget    │
│  (Anthropic Messages API) │                                   │     @Widget('invoice-result')
└───────────────────────────┘                                   └───────────────────────────┘
```

---

## Directory Structure

```
SCM/
├── .agents/                    # NitroStack skills & agent configurations
│   └── skills/                 # Architectural & security guidance skills
├── data/                       # Local JSON persistence storage
│   ├── master-data.json        # Master Purchase Orders store
│   └── exceptions.json        # Processed exception logs
├── src/
│   ├── index.ts                # Main server entry point (McpApplicationFactory)
│   ├── app.module.ts           # Root module with McpApp configuration
│   ├── health/
│   │   └── system.health.ts    # Background system memory and uptime health check
│   ├── shared/
│   │   ├── api-key.guard.ts    # Guard verifying x-api-key header
│   │   ├── claude.client.ts   # Claude API wrapper with Zod parsing & retries
│   │   └── schemas.ts          # Shared Zod schemas and TypeScript types
│   ├── modules/
│   │   ├── ingestion/          # Document Ingestion module (Classify & Extract)
│   │   │   ├── ingestion.module.ts
│   │   │   ├── ingestion.tools.ts
│   │   │   └── ingestion.exception.filter.ts
│   │   ├── master-data/        # Master Data lookup & HS-code recommendation
│   │   │   ├── master-data.module.ts
│   │   │   ├── master-data.service.ts
│   │   │   └── master-data.tools.ts
│   │   ├── orchestrator/       # End-to-end Workflow Orchestration
│   │   │   ├── orchestrator.module.ts
│   │   │   ├── orchestrator.tools.ts
│   │   │   ├── validation.service.ts
│   │   │   └── exception.service.ts
│   └── widgets/                # Next.js frontend widgets for tool outputs
│       └── invoice-result/     # Invoice processing visualizer UI
├── sop_rules.yaml              # Standard Operating Procedure workflow configuration
├── package.json
└── tsconfig.json
```

---

## Detailed Module Breakdown & Features

### 1. Ingestion Module (`src/modules/ingestion`)

Handles unstructured supply-chain documents (PDFs, text, images in base64) to classify and extract structured invoice information.

- **`ingestion_classify_document` (Tool)**
    - **Purpose**: Fast document type classification using the first 2,000 characters.
    - **Inputs**: `filename` (string), `content` (plain-text).
    - **Outputs**: `docType` (`invoice` | `po` | `packing_list` | `unknown`), `confidence` (0.0 to 1.0).
    - **Model**: `claude-haiku-20240307` with `temperature: 0.1`.
    - **Protections**: `@UseGuards(ApiKeyGuard)`, `@RateLimit({ requests: 60, window: '1m' })`.

- **`ingestion_extract_invoice_line_items` (Tool)**
    - **Purpose**: Line-item level extraction from document text.
    - **Inputs**: `content` (plain-text).
    - **Outputs**: Array of line items (`sku`, `description`, `quantity`, `unitPrice`, `total`).

- **`ingestion_extract_document_data` (Tool)**
    - **Purpose**: Extracts full invoice data matching `ExtractedInvoiceSchema`.
    - **Inputs**: `content` (plain-text), `mimeType` (e.g. `application/pdf`, `text/plain`).
    - **Outputs**: `invoiceNumber`, `poNumber`, `vendor`, `invoiceDate`, `totalAmount`, `lineItems`.
    - **Protections**: `@UseGuards(ApiKeyGuard)`, `@RateLimit({ requests: 30, window: '1m' })`.

- **`ingestion_ingest_document` (Tool)**
    - **Purpose**: End-to-end base64 document ingestion pipeline in a single call.
    - **Inputs**: `file_name`, `file_type`, `file_content` (Base64 or Data-URL string).
    - **Logic**: Decodes Base64 → Classifies document → Conditionally extracts structured invoice if classified as `invoice` (confidence ≥ 0.5).

- **`ingestion://status` (Resource)**
    - **Purpose**: Dynamic JSON resource describing module status, version, supported document types, and exposed tools.

- **`IngestionExceptionFilter` (Exception Filter)**
    - **Purpose**: Catches unhandled tool errors and maps them to clean JSON error payloads (`{ success: false, error, message, timestamp }`).

---

### 2. Master Data Module (`src/modules/master-data`)

Manages verification of purchase orders against stored records and provides product tariff classification assistance.

- **`MasterDataService` (Service)**
    - Manages persistence using `data/master-data.json`.
    - Pre-seeded with 5 sample PO records (`PO-001` through `PO-005`), including intentional mismatch test cases (`PO-004`).

- **`validate_against_master_data` (Tool)**
    - **Purpose**: Instant pure SQLite/JSON lookup without LLM overhead.
    - **Inputs**: `sku`, `poNumber`.
    - **Outputs**: `exists` (boolean), `poRecord` (`PurchaseOrder` | `null`).

- **`recommend_hs_code` (Tool)**
    - **Purpose**: Recommends Harmonized System (HS) tariff codes for line item classification.
    - **Inputs**: `productDescription`.
    - **Outputs**: `hsCode`, `confidence`, `description`.
    - **Logic**: Keyword matching against stub database (laptops `8471.30`, batteries `8507.60`, monitors `8528.52`, chairs `9401.30`).

---

### 3. Orchestrator Module (`src/modules/orchestrator`)

Coordinates end-to-end business workflows, rule validation, exception handling, and stakeholder routing.

- **`ValidationService` (Service)**
    - Performs 3-way matching between extracted invoices and Master Data POs.
    - Enforces strict tolerance checks (1% tolerance for `unitPrice` and `quantity`).
    - Generates human-readable discrepancy messages for price/quantity mismatches.

- **`ExceptionService` (Service)**
    - Logs and persists workflow exception records with UUIDs into `data/exceptions.json`.

- **`match_invoice_to_po` (Tool)**
    - **Purpose**: Compares extracted invoice data against purchase order details.
    - **Outputs**: `status` (`match` | `mismatch` | `exception`), `discrepancies` (array of strings).

- **`flag_exception` (Tool)**
    - **Purpose**: Registers a workflow exception to local store.
    - **Inputs**: `workflowId`, `reason`, `data`.

- **`route_task` (Tool)**
    - **Purpose**: Simulates task escalation to internal teams (`finance_team`, `procurement_team`).
    - **Inputs**: `task`, `stakeholder`, `priority` (`low` | `medium` | `high`).

- **`execute_workflow` (Tool & Widget Handler)**
    - **Purpose**: Main entry point for the automated `invoice_processing` SOP workflow.
    - **Pipeline Steps**:
        1. **Classify**: Determines document type via `ingestion_classify_document`. Aborts if not an invoice.
        2. **Extract**: Extracts invoice schema via `ingestion_extract_document_data`.
        3. **Validate PO**: Checks PO existence via `MasterDataService`. If missing, flags exception and routes high-priority task to `procurement_team`.
        4. **Match**: Executes line item verification via `ValidationService`.
        5. **Handle Result**: If mismatch occurs, flags exception and routes high-priority task to `finance_team`. If clean match, auto-approves invoice.
    - **UI Widget**: Annotated with `@Widget('invoice-result')` to render an interactive web interface in client environments.

---

### 4. System Health Check (`src/health/system.health.ts`)

---

### 5. System Health Check (`src/health/system.health.ts`)

- **`SystemHealthCheck` (`@HealthCheck('system')`)**
    - Monitors node process heap memory and server uptime.
    - Runs automatically every 30 seconds.
    - Flags system as `degraded` if heap memory usage exceeds 90%.

---

### 6. Shared Utilities & Security

- **`ApiKeyGuard` (`src/shared/api-key.guard.ts`)**:
    - Inspects incoming request context for `x-api-key` header matching process environment variable `ALE_API_KEY`.
- **`ClaudeClient` (`src/shared/claude.client.ts`)**:
    - Clean HTTP wrapper around `https://api.anthropic.com/v1/messages`.
    - Supports model selection (`claude-haiku-20240307`, `claude-sonnet-4-5`).
    - Features `completeAndParse<T>` with automatic retry and Zod validation.

---

## Environment Variables (`.env`)

| Variable              | Description                                    | Default / Example             |
| --------------------- | ---------------------------------------------- | ----------------------------- |
| `NITRO_LOG_LEVEL`     | Application logging level                      | `info`                        |
| `NITROSTACK_APP_MODE` | Application runtime mode                       | `universal`                   |
| `MCP_TRANSPORT_TYPE`  | Server transport mode                          | `stdio` (dev) / `dual` (prod) |
| `PORT`                | HTTP SSE server port                           | `3000`                        |
| `HOST`                | Server bind host                               | `localhost`                   |
| `ANTHROPIC_API_KEY`   | Anthropic API key for Claude integration       | `sk-ant-...`                  |
| `ALE_API_KEY`         | API key required for client header `x-api-key` | `your-secret-key-here`        |

---

## Execution & Command Guide

```bash
# Install dependencies
npm run dev           # Start development server with live reload
npm run build         # Compile TypeScript and bundle frontend widgets
npm start             # Build and run production server
```
