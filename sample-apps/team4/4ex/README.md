# Enterprise Knowledge Integrity MCP Server

> **An MCP server that detects when authoritative enterprise knowledge changes, traces what depends on it, finds contradictions, assesses risk, proposes fixes, and records everything — all through MCP tools an LLM can orchestrate.**

Built on the [NitroStack](https://github.com/nitrostack) framework with TypeScript, Zod validation, and JSON file persistence.

---

## What It Does

When an enterprise updates a policy (discount limits, data retention rules, security requirements), every document, playbook, and training material that references that policy may become outdated or contradictory. This MCP server automates the entire knowledge integrity lifecycle:

1. **Detect** which authoritative facts changed between policy versions (v1 → v2)
2. **Trace** every document and claim that depends on the changed fact via a dependency graph
3. **Find** contradictions where documents disagree with the new authoritative value
4. **Assess** risk using deterministic scoring based on customer-facing exposure, financial impact, compliance, and document criticality
5. **Propose** human-approved remediations — the server never auto-applies changes
6. **Record** every decision in a full audit trail with rollback support

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    MCP Client (LLM)                          │
│              Claude Desktop / Cursor / IDE                   │
└──────────────────────┬──────────────────────────────────────┘
                       │ MCP Protocol (JSON-RPC 2.0)
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              NitroStack MCP Server                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                  │
│  │  Tools   │  │Resources │  │ Prompts  │                  │
│  │  (14)    │  │  (7)     │  │  (7)     │                  │
│  └────┬─────┘  └────┬─────┘  └──────────┘                  │
│       │              │                                      │
│  ┌────▼──────────────▼─────────────────────────────┐       │
│  │        ErrorHandlingMiddleware                    │       │
│  │   Consistent error formatting for all tools      │       │
│  └────┬──────────────┬─────────────────────────────┘       │
│       │              │                                      │
│  ┌────▼──────────────▼─────────────────────────────┐       │
│  │              Service Layer (12 services)          │       │
│  │  ChangeDetection │ Dependency │ Validation       │       │
│  │  Conflict        │ Risk       │ Remediation      │       │
│  │  Provenance      │ Audit      │ Drift            │       │
│  │  Report          │ Batch      │ PdfIngestion     │       │
│  └──────────────────────┬──────────────────────────┘       │
│                         │                                    │
│  ┌──────────────────────▼──────────────────────────┐       │
│  │           DataLoaderService                      │       │
│  │    JSON persistence + opt-in PDF ingestion       │       │
│  └──────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                  Data Layer (JSON + PDF)                     │
│  authoritative_sources.json  ← current policy facts (v2)    │
│  authoritative_sources_v1.json  ← previous version (v1)     │
│  documents.json  ← enterprise docs with claims              │
│  dependencies.json  ← fact → document mappings              │
│  pending_updates.json  ← remediation proposals              │
│  audit_log.json  ← approved/rejected/applied history        │
│  pdfs/security-policy.pdf  ← PDF-based authoritative source │
└─────────────────────────────────────────────────────────────┘
```

## Quick Start

```bash
# Install dependencies
npm install

# Build the server
npm run build

# Run all tests (23 tests across 5 suites)
npm test

# Start in development mode (stdio transport)
npm run dev

# Start in production mode
npm run start:prod
```

### Individual Test Suites

```bash
npm run test:phase4    # Core service tests (9 tests)
npm run test:phase7    # Remediation tests (2 tests)
npm run test:phase8    # Investigation + batch tests (3 tests)
npm run test:phase9    # MCP server lifecycle tests (6 tests)
npm run test:phase10   # Drift/report/batch tests (3 tests)
```

## MCP Tools (14)

All tools are wrapped with `ErrorHandlingMiddleware` for consistent error formatting (INPUT_VALIDATION_ERROR, DATA_INTEGRITY_ERROR, INTERNAL_ERROR).

| Tool | Read-only | Description |
|------|-----------|-------------|
| `detect_source_changes` | ✅ | Compare v1 vs v2 authoritative sources |
| `find_affected_knowledge` | ✅ | Trace dependency graph from a changed fact |
| `validate_claim` | ✅ | Check if a claim matches its authoritative value |
| `detect_knowledge_conflicts` | ✅ | Find all contradictions for a fact |
| `trace_knowledge_provenance` | ✅ | Show origin and version history of a claim |
| `assess_knowledge_risk` | ✅ | Score risk of a conflict (0–100) |
| `propose_knowledge_update` | ❌ | Create a remediation proposal |
| `approve_knowledge_update` | ❌ | Apply an approved fix |
| `reject_knowledge_update` | ❌ | Reject a proposal |
| `get_audit_log` | ✅ | View remediation history |
| `investigate_knowledge_change` | ✅ | Full read-only investigation pipeline |
| `batch_approve_updates` | ❌ | Approve multiple proposals with risk ceiling |
| `generate_compliance_report` | ✅ | Compliance report for auditors |
| `get_knowledge_drift_summary` | ✅ | Knowledge staleness dashboard |

### Tool Details

- **`investigate_knowledge_change`** runs the complete pipeline (detect → trace → validate → conflict → risk) in a single call without modifying anything. Individual failures are caught per-change so one bad fact doesn't kill the entire investigation.
- **`batch_approve_updates`** supports a `risk_ceiling` parameter to automatically skip proposals above a given risk level (e.g., only approve LOW and MEDIUM risk proposals).
- **`generate_compliance_report`** aggregates conflicts, risk scores, remediation history, and per-department health into a single deliverable for auditors.

## MCP Resources (7)

| Resource URI | Description |
|-------------|-------------|
| `knowledge://sources` | Current authoritative sources and facts |
| `knowledge://documents` | Enterprise documents with claims |
| `knowledge://pending-updates` | Proposals awaiting approval |
| `knowledge://audit-log` | Complete remediation history |
| `knowledge://dependency-graph` | Full fact → document dependency tree |
| `knowledge://health-metrics` | Overall knowledge health score |
| `knowledge://source-owners` | Source ownership and classification |

## MCP Prompts (7)

| Prompt | Description |
|--------|-------------|
| `investigate_policy_change` | Step-by-step investigation guide |
| `knowledge_health_check` | Health assessment checklist |
| `compliance_audit_report` | Auditor-ready report template |
| `department_knowledge_review` | Per-department review guide |
| `remediation_planning` | Fix planning workflow |
| `executive_knowledge_briefing` | Executive summary template |
| `rollback_assessment` | Rollback decision framework |

## Project Structure

```
src/
  index.ts                          # Entry point (McpApplicationFactory)
  app.module.ts                     # Root @McpApp module
  types/index.ts                    # TypeScript interfaces
  modules/knowledge/
    knowledge.tools.ts              # 14 MCP tool handlers
    knowledge.resources.ts          # 7 MCP resources
    knowledge.prompts.ts            # 7 MCP prompts
    knowledge.module.ts             # Module registration (all services)
  services/
    data-loader.service.ts          # JSON/PDF data access + Zod validation
    change-detection.service.ts     # v1 vs v2 comparison
    dependency.service.ts           # Dependency graph traversal
    validation.service.ts           # Deterministic claim validation
    conflict.service.ts             # Cross-document contradiction detection
    provenance.service.ts           # Claim origin tracing
    risk.service.ts                 # Deterministic weighted risk scoring
    remediation.service.ts          # Proposal CRUD + approval/rollback
    audit.service.ts                # Audit trail management
    drift.service.ts                # Knowledge staleness metrics
    report.service.ts               # Compliance reports + dept health
    batch.service.ts                # Batch approve/reject with risk ceiling
    pdf-ingestion.service.ts        # PDF parsing (opt-in via loadPdfSources)
  middleware/
    error-handling.middleware.ts    # Error formatting for all tools
  health/
    system.health.ts                # System resource monitoring
  data/
    authoritative_sources.json      # Current policy facts (v2)
    authoritative_sources_v1.json   # Previous version (v1)
    documents.json                  # Enterprise documents + claims
    dependencies.json               # Fact → document mappings
    pending_updates.json            # Remediation proposals
    audit_log.json                  # Decision history
    pdfs/
      security-policy.pdf           # PDF-based authoritative source
tests/
  phase4.test.ts                    # Core service tests (9 tests)
  phase7.test.ts                    # Remediation tests (2 tests)
  phase8.test.ts                    # Investigation + batch tests (3 tests)
  phase9.test.ts                    # MCP server lifecycle tests (6 tests)
  phase10.test.ts                   # Drift/report/batch tests (3 tests)
```

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `NITRO_LOG_LEVEL` | `info` | Logging verbosity |
| `NITROSTACK_APP_MODE` | `development` | App mode |
| `MCP_TRANSPORT_TYPE` | auto-detected | `stdio`, `http`, or `dual` |

## Claude Desktop Integration

Add this to your Claude Desktop MCP config (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "knowledge-integrity": {
      "command": "node",
      "args": ["dist/index.js"],
      "cwd": "/absolute/path/to/my-mcp-server",
      "env": {
        "NITROSTACK_APP_MODE": "production"
      }
    }
  }
}
```

## Key Design Decisions

- **Human-in-the-loop**: The server never auto-applies changes. Every fix goes through `propose → approve → apply` with full audit logging. Rejected proposals are permanent.
- **Deterministic risk scoring**: Risk is calculated server-side with a fixed weighted algorithm (customer-facing, financial, compliance, operational impact + document criticality). The LLM explains the score; it doesn't calculate it.
- **Read-only investigation**: `investigate_knowledge_change` runs the full pipeline without modifying anything. It also has per-change error handling so individual failures don't crash the entire investigation.
- **JSON persistence**: Simple, auditable, version-controllable. No database required. Files use atomic writes (write-to-temp + rename) to prevent corruption.
- **Error handling middleware**: All 14 tools are wrapped with `ErrorHandlingMiddleware` via `@UseMiddleware`, providing consistent error formatting (INPUT_VALIDATION_ERROR, DATA_INTEGRITY_ERROR, INTERNAL_ERROR).
- **Opt-in PDF ingestion**: PDF sources are parsed via `DataLoaderService.loadPdfSources()` but NOT auto-merged into the main data set. This keeps the core change detection pipeline fast and predictable.
- **Scoped metrics**: Compliance reports and health metrics scope their applied/remediated counts to the same conflict set being measured, preventing misleading cross-scope subtractions.
- **Strict TypeScript**: `strict: true` with Zod schema validation at all data boundaries. Claims use `string | null` (not empty strings) to preserve null semantics.

## Security

- **Command injection prevention**: PDF ingestion uses `execFileSync` with argument arrays (not string interpolation) to prevent shell injection via crafted filenames.
- **Input validation**: All tool inputs are validated with Zod schemas including `.min()` and `.max()` length constraints.
- **No auto-apply**: Remediation proposals require explicit human approval before any data is modified.
- **Audit trail**: Every approved, rejected, or applied change is recorded with timestamps and reasoning.

## Test Coverage

| Suite | Tests | What's Tested |
|-------|-------|---------------|
| phase4 | 9 | Change detection, dependency traversal, validation, conflicts, provenance, risk scoring |
| phase7 | 2 | Full propose → approve → apply lifecycle, stale proposal rejection |
| phase8 | 3 | Investigation pipeline (read-only), batch operations, prompt definitions |
| phase9 | 6 | MCP server boot, tool/resource/prompt registration, graceful shutdown |
| phase10 | 3 | Drift metrics, compliance reports, batch approve with risk ceiling |
| **Total** | **23** | |

## License

MIT
