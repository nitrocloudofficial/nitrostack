# GeoTrust AI — Business Authenticity Investigation MCP Server

> **Hackathon project.** GeoTrust AI is an MCP server that investigates small business loan applications for authenticity across four dimensions: identity, location, digital presence, and document integrity.

---

## Overview

```
┌─────────────────────────────────────────────────────┐
│                  GeoTrust AI Architecture            │
│                                                      │
│  ┌──────────────────────────────────────────────┐   │
│  │              KITCHEN (MCP Server)             │   │
│  │  document_reader  ─┐                         │   │
│  │  registry_checker  ├─→  CaseStore (shared)   │   │
│  │  address_checker   │         (Map<id,state>)  │   │
│  │  web_presence_checker ─┘                     │   │
│  │  score_case  ──────────→  Case (final output) │   │
│  │  registry://businesses  (Resource)            │   │
│  └─────────────────────┬────────────────────────┘   │
│                         │ MCP (STDIO)                │
│  ┌──────────────────────▼────────────────────────┐  │
│  │              CHEF (chef/investigate.ts)        │  │
│  │  NVIDIA NIM — meta/llama-3.3-70b-instruct     │  │
│  │  Decides: what to check, when to stop         │  │
│  │  Logs: TraceEvents with orchestrator /        │  │
│  │         evidence_challenger / risk_arbiter    │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

**Kitchen** = the NitroStack MCP server (`src/`). Holds tools. Waits to be called. Doesn't decide anything.  
**Chef** = `chef/investigate.ts`. Connects to the Kitchen as an MCP client, uses NVIDIA NIM with tool-calling to drive the investigation.

---

## Tools

| Tool | Description |
|---|---|
| `document_reader` | Extracts claims from uploaded docs (registration cert, ID, utility bill) |
| `registry_checker` | Looks up business in the practice registry dataset |
| `address_checker` | Verifies claimed address against GIS data, cross-checks with registry/utility bill |
| `web_presence_checker` | Checks domain age, Google listing, reviews, social media |
| `score_case` | Reads the full CaseState and computes four DimensionScores, overall score, and recommendation |

## Resources

| URI | Description |
|---|---|
| `registry://businesses` | Full Indian SME practice registry dataset (browsable in NitroStudio) |
| `registry://businesses/{registrationNumber}` | Single business lookup |

---

## Install

```bash
# Prerequisites: Node.js 20+
node -v

# Install dependencies
npm install

# Copy and fill in environment
cp .env.example .env
# Edit .env — set NVIDIA_API_KEY (get at https://build.nvidia.com)
```

---

## Environment Setup

```
NVIDIA_API_KEY=nvapi-...   # Required for Chef script (NVIDIA NIM)
NITRO_LOG_LEVEL=info       # Optional logging level
```

---

## Run

```bash
# Start the MCP server (for NitroStudio / NitroCloud)
npm run dev

# Run the Chef against a specific fixture
npm run chef:genuine     # Clean business — everything passes
npm run chef:suspicious  # Multiple red flags — escalate
npm run chef:ambiguous   # One mismatch, plausible explanation — request_evidence

# Run all three fixtures and compare
npm run chef:all

# Investigate a specific business
npm run chef -- --caseId case-999 --businessName "My Business" --regNum "U12345KA2020PTC999"
```

---

## Architecture

### Investigation Flow

1. **document_reader** extracts initial claims from documents (name, reg number, address, director)
2. **registry_checker** cross-checks against the registry dataset — flags name mismatches, inactive status, overdue filings
3. **address_checker** verifies the address in GIS data, cross-references registry vs utility bill addresses
4. **web_presence_checker** checks domain age (vs incorporation year), Google listing, reviews
5. **score_case** reads accumulated CaseState → computes DimensionScores → recommends action

### CaseStore

All tools write to a shared `Map<caseId, CaseState>` so each tool can see what prior tools found. This is what allows the scorer to see the full picture without each tool re-running the others.

### Scoring Weights

| Dimension | Weight |
|---|---|
| Identity | 35% |
| Location | 30% |
| Document Integrity | 20% |
| Digital Presence | 15% |

### Recommendation Logic

| Condition | Recommendation |
|---|---|
| Score ≥ 75, no contradictions | `proceed` |
| ≥ 2 contradictions + ≥ 2 low-scoring dimensions | `escalate` |
| ≥ 3 missing evidence + score < 50 | `flag_insufficient` |
| Everything else | `request_evidence` |

The critical design rule: **a single mismatch with a plausible explanation ≠ multiple independent red flags.** The ambiguous fixture (Apex Micro) gets `request_evidence`, not `escalate`.

---

## Modules

```
src/
├── shared-types.ts                     # Shared type contract
├── index.ts                            # Server bootstrap
├── app.module.ts                       # Root module
└── modules/
    ├── case-store/                     # Shared state
    ├── documents/                      # document_reader tool
    ├── registry/                       # registry_checker + registry://businesses Resource
    ├── address/                        # address_checker tool
    ├── web-presence/                   # web_presence_checker tool
    └── scoring/                        # score_case tool

chef/
├── investigate.ts                      # Chef script (NVIDIA NIM + MCP client)
└── fixtures/
    ├── genuine.ts                      # Priya Textiles — all clear
    ├── suspicious.ts                   # Coimbatore Steels — multiple red flags
    └── ambiguous.ts                    # Apex Micro — one mismatch, plausible cause
```

---

## Deployment (NitroStack Cloud)

See the project's deployment runbook. Short version:

1. `git push` to GitHub
2. NitroCloud → Create Nitrostack App → Deployments → Connect Repository → Enable Auto-Deploy
3. Deploy from GitHub → wait for `Live` status
4. Copy Service URL
