# Nitro Canvas Validation — Phase 3

**Date:** August 1, 2026  
**Auditor:** Lead Systems Architect  
**Execution Mode:** LIVE (Real HTTP APIs, Real Python Engines, Real NitroStack Discovery)

---

## Executive Summary

This audit is **brutally honest**. I examined every file, ran every system, and report exactly what works and what does not.

> [!IMPORTANT]
> **CRITICAL ARCHITECTURAL FINDING:** The Invenio repository contains **two disconnected execution layers**. The TypeScript NitroStack layer correctly discovers and registers all 50 tools, 10 agents, 10 MCPs, 6 workflows, and 10 visual nodes. But the TypeScript tool implementations are **stubs** that return hardcoded strings. The real business logic lives in a separate Python FastMCP layer that is **not wired** to the NitroStack TypeScript modules. See Step 10 for full details.

---

## Step 1: Project Discovery ✅

| Check | Result |
| :--- | :--- |
| `package.json` detected | ✅ True |
| Project name | `invenio` |
| `@nitrostack/core` dependency | ✅ Present |
| `@nitrostack/cli` devDependency | ✅ Present |
| `nitrostack` config in package.json | ✅ Present |
| `nitro.json` detected | ✅ Present |
| `nitro.json` version | 1.0 |
| `nitro.json` displayName | Invenio AI Research Ecosystem |
| `tsconfig.json` exists | ✅ True |
| `src/app.module.ts` exists | ✅ True |
| `node_modules/@nitrostack/core` exists | ✅ True |
| TypeScript compilation (`tsc --noEmit`) | ✅ Clean (0 errors) |

**Verdict:** Nitro Studio would discover this project. ✅

---

## Step 2: MCP Server Discovery ✅

All 10 expected MCP servers are present in **three layers**: `nitro.json` manifest, TypeScript NitroStack modules, and Python FastMCP modules.

| MCP ID | In nitro.json | TS Module | Python MCP | FastMCP |
| :--- | :---: | :---: | :---: | :---: |
| `research-mcp` | ✅ | ✅ | ✅ | ✅ |
| `correlation-mcp` | ✅ | ✅ | ✅ | ✅ |
| `evidence-mcp` | ✅ | ✅ | ✅ | ✅ |
| `knowledge-graph-mcp` | ✅ | ✅ | ✅ | ✅ |
| `planner-mcp` | ✅ | ✅ | ✅ | ✅ |
| `workflow-mcp` | ✅ | ✅ | ✅ | ✅ |
| `workspace-mcp` | ✅ | ✅ | ✅ | ✅ |
| `report-mcp` | ✅ | ✅ | ✅ | ✅ |
| `copilot-mcp` | ✅ | ✅ | ✅ | ✅ |
| `settings-mcp` | ✅ | ✅ | ✅ | ✅ |

---

## Step 3: Agent Discovery ✅

All 10 agents are declared in `nitro.json` and map 1:1 to their MCP backends.

| Agent | ID | Bound MCP |
| :--- | :--- | :--- |
| Planner Agent | `planner-agent` | `planner-mcp` |
| Research Agent | `research-agent` | `research-mcp` |
| Correlation Agent | `correlation-agent` | `correlation-mcp` |
| Evidence Agent | `evidence-agent` | `evidence-mcp` |
| Knowledge Graph Agent | `knowledge-graph-agent` | `knowledge-graph-mcp` |
| Workflow Agent | `workflow-agent` | `workflow-mcp` |
| Workspace Agent | `workspace-agent` | `workspace-mcp` |
| Report Agent | `report-agent` | `report-mcp` |
| Copilot Agent | `copilot-agent` | `copilot-mcp` |
| Settings Agent | `settings-agent` | `settings-mcp` |

---

## Step 4: Tool Discovery ✅ (with caveats)

The `verify_discovery.ts` script confirmed that NitroStack's `McpApplicationFactory` successfully registers exactly **50 tools**. Here is the per-MCP breakdown:

| MCP | Manifest | TS Tools | Python Tools | Match |
| :--- | :---: | :---: | :---: | :--- |
| Research MCP | 6 | 6 | 6 | ✅ |
| Correlation MCP | 6 | 6 | 7 | ✅ (manifest/TS match; Python has 1 extra) |
| Evidence MCP | 5 | 5 | 5 | ✅ |
| Knowledge Graph MCP | 5 | 5 | 5 | ✅ |
| Workflow MCP | 6 | 6 | 6 | ✅ |
| Planner MCP | 3 | 3 | 1 | ✅ (manifest/TS match; Python consolidated into 1 tool) |
| Copilot MCP | 4 | 4 | 1 | ✅ (manifest/TS match; Python consolidated into 1 tool) |
| Workspace MCP | 6 | 6 | 6 | ✅ |
| Report MCP | 6 | 6 | 6 | ✅ |
| Settings MCP | 3 | 3 | 3 | ✅ |
| **Totals** | **50** | **50** | **46** | |

> [!NOTE]
> The Planner and Copilot Python modules consolidate multiple tool operations into single powerful functions (`execute_autonomous_research` and `ask_copilot`). The TypeScript NitroStack layer exposes the original granular tool names as declared in `nitro.json`.

---

## Step 5: Visual Node Discovery ✅

All 10 visual nodes are declared with correct typed input/output schemas:

| Node | MCP | Inputs | Outputs |
| :--- | :--- | :--- | :--- |
| Research | `research-mcp` | `query` | `papers` |
| Correlation | `correlation-mcp` | `papers` | `gaps, opportunities` |
| Evidence | `evidence-mcp` | `gaps` | `evidence_chains` |
| Knowledge Graph | `knowledge-graph-mcp` | `evidence_chains` | `graph_data` |
| Planner | `planner-mcp` | `query` | `plan` |
| Workflow | `workflow-mcp` | `trigger` | `status` |
| Copilot | `copilot-mcp` | `context` | `suggestion` |
| Workspace | `workspace-mcp` | `graph_data, papers` | `document` |
| Report | `report-mcp` | `document` | `pdf, html` |
| Settings | `settings-mcp` | `key` | `config` |

---

## Step 6: Workflow Validation ✅

All 6 workflows are correctly defined with node connection sequences:

| Workflow | Nodes |
| :--- | :--- |
| Research Discovery | `research → correlation → evidence → knowledge-graph → workspace → report` |
| Copilot Session | `copilot → workflow → workspace` |
| Quick Search | `research → workspace` |
| Generate Report | `workspace → report` |
| Full Autonomous Research | `research → correlation → evidence → knowledge-graph → planner → workspace → report` |
| Invenio Demo | `research → correlation → evidence → knowledge-graph → planner → workspace → report` |

---

## Step 7-8: Live Pipeline Execution ✅

The **real** Python pipeline was executed with query `"Graph Neural Networks for Drug Discovery"`.

**6 state updates were streamed** — this is what a visual canvas would receive via WebSocket:

| Time | ResearchAgent | CorrelationAgent | EvidenceAgent | HypothesisAgent | ReportAgent |
| :---: | :---: | :---: | :---: | :---: | :---: |
| t=0.00s | ⏳ QUEUED | ⏳ QUEUED | ⏳ QUEUED | ⏳ QUEUED | ⏳ QUEUED |
| t=9.21s | ✅ COMPLETED | ⏳ QUEUED | ⏳ QUEUED | ⏳ QUEUED | ⏳ QUEUED |
| t=12.56s | ✅ COMPLETED | ✅ COMPLETED | ⏳ QUEUED | ⏳ QUEUED | ⏳ QUEUED |
| t=12.63s | ✅ COMPLETED | ✅ COMPLETED | ✅ COMPLETED | ⏳ QUEUED | ⏳ QUEUED |
| t=12.63s | ✅ COMPLETED | ✅ COMPLETED | ✅ COMPLETED | ✅ COMPLETED | ⏳ QUEUED |
| t=12.63s | ✅ COMPLETED | ✅ COMPLETED | ✅ COMPLETED | ✅ COMPLETED | ✅ COMPLETED |

**Total pipeline execution: 12.64s** (9.21s is live HTTP to scholarly APIs; 3.43s is Correlation + Evidence + Hypothesis + Report)

---

## Step 9: Package Passing ✅

Every agent produced a typed artifact that was consumed by the next agent:

| Agent | Package | Artifact Produced | State |
| :--- | :--- | :---: | :--- |
| ResearchAgent | ResearchPackage | ✅ Yes | COMPLETED |
| CorrelationAgent | CorrelationPackage | ✅ Yes | COMPLETED |
| EvidenceAgent | EvidencePackage | ✅ Yes | COMPLETED |
| HypothesisAgent | HypothesisPackage | ✅ Yes | COMPLETED |
| ReportAgent | ReportPackage | ✅ Yes | COMPLETED |

---

## Step 10: Backend Connection Audit ⚠️ CRITICAL

> [!CAUTION]
> **ARCHITECTURE GAP: TypeScript NitroStack layer is NOT connected to Python FastMCP backends.**

The repository contains **two separate execution layers**:

### Layer 1: TypeScript NitroStack (`src/modules/*.module.ts`)
- Registers 50 tools via `@Tool()` decorators from `@nitrostack/core`
- Uses `McpApplicationFactory` to boot the MCP server
- **ALL tool implementations return HARDCODED STRINGS**
- Example: `search_papers()` returns `'Search for scientific papers completed.'`
- **These do NOT call the Python FastMCP backends**

### Layer 2: Python FastMCP (`nitro/agents/*/__init__.py`)
- Registers real tools via `@mcp.tool()` decorators
- Contains **REAL** business logic (live HTTP requests to Semantic Scholar, OpenAlex, Crossref, etc.)
- Uses TF-IDF vectorization, KMeans clustering, cosine similarity
- Runs as standalone STDIO MCP servers via `mcp.run()`
- **NOT connected to the TypeScript NitroStack layer**

### Impact
When Nitro Studio discovers the project via NitroStack, it correctly sees 50 tools, 10 agents, 10 MCPs, and 6 workflows. But if it **executes** a tool through the NitroStack framework, it receives a stub string like `'Search for scientific papers completed.'` instead of real research data. The real engines are only invoked when Python code is run directly.

### Remediation Path
To fully bridge these layers, each TypeScript tool method should spawn or connect to its corresponding Python FastMCP server via STDIO and proxy the MCP JSON-RPC call. This is a well-defined integration task but has not been implemented yet.

---

## Step 11: Failure Recovery ✅

With Semantic Scholar artificially broken (injected `ConnectionError`):

| Agent | Status |
| :--- | :--- |
| ResearchAgent | ✅ COMPLETED (degraded — fewer papers) |
| CorrelationAgent | ✅ COMPLETED |
| EvidenceAgent | ✅ COMPLETED |
| HypothesisAgent | ✅ COMPLETED |
| ReportAgent | ✅ COMPLETED |

**Pipeline survived: ✅ YES** | Execution time: 9.04s

---

## Step 12: Performance ✅

| Metric | Value |
| :--- | :--- |
| Pipeline execution time | 12.64s |
| Current memory | 148.95 MB |
| Peak memory | 161.69 MB |
| Failure-recovery execution time | 9.04s |

---

## Runtime Log Evidence

The full validation log contains **346 lines** of real HTTP request traces proving live API calls to:
- `api.semanticscholar.org` (returned 429 — rate limited, no API key)
- `api.openalex.org` (returned 200 OK ✅)
- `api.crossref.org` (returned 200 OK ✅)
- `export.arxiv.org` (returned 200 OK ✅)
- `eutils.ncbi.nlm.nih.gov` (returned 200 OK ✅)
- `www.ebi.ac.uk/europepmc` (returned 200 OK ✅)
- `api.openaire.eu` (returned 200 OK ✅)
- `doaj.org` (returned 200 OK ✅)

---

## Final Verdict

| Category | Status | Notes |
| :--- | :---: | :--- |
| Project Discovery | ✅ PASS | NitroStack recognizes this as a native application |
| MCP Registration | ✅ PASS | All 10 MCPs discovered in all three layers |
| Agent Registration | ✅ PASS | All 10 agents mapped correctly |
| Tool Registration | ✅ PASS | 50/50 tools registered in NitroStack |
| Visual Nodes | ✅ PASS | All 10 nodes with correct I/O schemas |
| Workflows | ✅ PASS | 6 workflows with correct node sequences |
| Live Pipeline (Python) | ✅ PASS | Real HTTP calls, real engines, real packages |
| Package Passing | ✅ PASS | Typed packages flow correctly between agents |
| Failure Recovery | ✅ PASS | Pipeline survives provider outages |
| Performance | ✅ PASS | 12.64s end-to-end, 161 MB peak memory |
| **TS ↔ Python Bridge** | **⚠️ MISSING** | **TypeScript stubs do not proxy to Python backends** |

> [!WARNING]
> **Bottom Line:** Nitro Studio will **discover** everything perfectly. It will **display** every MCP, agent, tool, visual node, and workflow. But when it **executes** a tool through the NitroStack framework, it will receive a stub response, not real data. The real pipeline only runs when the Python layer is invoked directly. This is the single remaining integration gap.
