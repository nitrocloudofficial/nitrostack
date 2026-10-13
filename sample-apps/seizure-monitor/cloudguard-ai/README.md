<div align="center">

# CloudGuard AI 🛡️

**Autonomous FinOps & SecOps Agent for Enterprise Cloud Infrastructure**

An MCP server that lets any LLM audit cloud spend, detect security exposure, and drive remediation workflows — without ever holding write access to your infrastructure.

[![NitroStack](https://img.shields.io/badge/Built%20with-NitroStack-0052CC?style=for-the-badge)](https://nitrostack.ai)
[![MCP](https://img.shields.io/badge/Protocol-MCP%20v1.0-blueviolet?style=for-the-badge)](https://modelcontextprotocol.io)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node](https://img.shields.io/badge/Node-18%2B-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

**Track:** 🤖 Enterprise AI & Workplace Automation
**Event:** NitroStack × Amrita University Hackathon 2026

</div>

---

## Table of Contents

- [The Problem](#the-problem)
- [What CloudGuard AI Does](#what-cloudguard-ai-does)
- [Why This Design Wins](#why-this-design-wins)
- [System Architecture](#system-architecture)
- [Tool Reference](#tool-reference)
- [Technology Stack](#technology-stack)
- [Quickstart](#quickstart)
- [Configuration](#configuration)
- [Connecting to Claude and ChatGPT](#connecting-to-claude-and-chatgpt)
- [Usage Walkthroughs](#usage-walkthroughs)
- [Project Structure](#project-structure)
- [Mock Data Model](#mock-data-model)
- [Deployment to NitroCloud](#deployment-to-nitrocloud)
- [Security Model](#security-model)
- [Troubleshooting](#troubleshooting)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

---

## The Problem

Enterprise cloud environments leak money and expose attack surface in the same way: quietly, continuously, and faster than any human team can audit.

A mid-size engineering org runs hundreds of compute instances. Some were spun up for a sprint two quarters ago and never terminated. Some are GPU nodes idling at 2% CPU while billing $3/hour. Meanwhile, an S3 bucket sits publicly readable because someone loosened an ACL during a debugging session and never reverted it.

Finding these requires correlating four separate data sources — inventory, utilization telemetry, security findings, and the org directory that tells you *who to actually contact*. Doing it manually is a recurring multi-hour task that nobody wants and everybody postpones. Doing it with naive automation produces false positives: a nightly ETL job looks exactly like an idle instance if you only check the CPU average.

**CloudGuard AI turns that recurring manual audit into a conversation.** You ask an LLM to audit your cloud; it reasons over live infrastructure data through MCP tools, distinguishes genuine waste from periodic workloads, identifies resource owners by name and email, and drafts remediation — while every mutation stays behind a human approval gate.

---

## What CloudGuard AI Does

### 💰 Cost Waste Detection (FinOps)

Correlates hourly cost rates against CPU utilization telemetry to surface infrastructure that costs money without doing work.

- Scans the full compute inventory with owner and team tags intact
- Applies a configurable idle threshold (default: 10% CPU) rather than a hardcoded rule
- Computes precise monthly and annualized waste per instance
- Returns raw utilization data so the LLM can distinguish a flat idle curve from a spiky periodic workload

The threshold is an *input*, not a constant. The reasoning about what the numbers mean happens in the model, which is the entire point of exposing this over MCP instead of writing a dashboard.

### 🔐 Security Posture Assessment (SecOps)

Audits findings across severity tiers and resolves them to accountable humans.

- Filters findings by `critical` / `high` / `medium` / `low`
- Covers public bucket exposure, open ingress rules, unencrypted volumes, outdated kernels with known CVEs
- Resolves resource ownership through an enterprise directory lookup — by user ID, team name, or partial name match
- Surfaces escalation contacts so alerts route to a team lead, not into a void

### 🔧 Remediation Workflow

Generates the fix, files the ticket, notifies the channel, and closes the loop.

- Produces executable Terraform HCL and AWS CLI remediation snippets per finding
- Creates live GitHub issues via the REST API, labelled `security` / `finops` / `automated-remediation`
- Dispatches Slack Block Kit incident cards with **Approve & Apply** and **Escalate to Lead** action buttons
- Closes resolved GitHub issues programmatically with `state_reason: completed`
- Exposes a single atomic `run_full_secops_audit` that chains the entire pipeline for one-command execution

### 📊 Executive Reporting

Compiles a posture scorecard suitable for a leadership readout: overall security score, per-framework compliance percentages (SOC 2 Type II, CIS AWS Foundations, HIPAA), financial impact, and live telemetry health.

---

## Why This Design Wins

| Principle | How CloudGuard implements it |
| :--- | :--- |
| **Zero write access, structurally** | The MCP surface exposes no `terminate_instance`, no `delete_bucket`, no `apply_patch`. This isn't an IAM policy that could be misconfigured — the capability does not exist in the tool schema. |
| **Reasoning over rules** | Tools return data and thresholds are parameters. The LLM decides what constitutes waste. No hardcoded business logic to maintain as your environment changes. |
| **Swappable data layer** | `CloudProviderAdapter` sits between tools and data. `MockCloudService` reads JSON today; an `AwsCloudService` reading live EC2/S3/Security Hub drops into the same interface with zero tool changes. |
| **Human-in-the-loop by construction** | `HumanApprovalGuard` validates sign-off before any state-changing operation. Slack cards carry explicit approve/escalate actions rather than auto-executing. |
| **Ownership resolution** | Findings resolve to a named person with an email and an escalation path — the difference between an alert that gets actioned and one that gets ignored. |
| **Credentials never in source** | All integration secrets load from environment variables. Nothing sensitive is committed, and the server degrades gracefully with a clear `skipped` status when integrations aren't configured. |
| **Offline-capable demo** | Full mock dataset ships in-repo. No AWS account, no credentials, no network required to run the complete audit pipeline. |

---

## System Architecture

CloudGuard AI is a four-layer system. Each layer knows only about the one beneath it.

```
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 4 — AI CLIENT                                            │
│                                                                 │
│  Claude Desktop  ·  ChatGPT Developer Mode  ·  NitroStudio      │
│                                                                 │
│  Role: reasoning engine. Holds zero business logic.             │
│  Decides which tools to call, interprets results, drafts        │
│  narrative summaries, requests human approval.                  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                  MCP Protocol over HTTP / SSE
                             │
┌────────────────────────────┴────────────────────────────────────┐
│  LAYER 3 — MCP SURFACE                                          │
│                                                                 │
│  @Tool · @Resource · @Prompt decorators (@nitrostack/core)       │
│  10 Tools  +  1 Resource  +  1 Prompt                           │
│                                                                 │
│  Zod schemas validate every input at runtime before it          │
│  reaches domain logic. Schema is auto-published to the client.  │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────┴────────────────────────────────────┐
│  LAYER 2 — DOMAIN SERVICES                                      │
│                                                                 │
│  UtilizationService    → workload shape classification          │
│  MockCloudService      → data adapter implementation            │
│  CloudProviderAdapter  → swappable provider interface           │
│  HumanApprovalGuard    → sign-off validation gate               │
│  GitHub REST client    → issue create / patch / close           │
│  Slack Block Kit client→ incident card dispatch                 │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────┴────────────────────────────────────┐
│  LAYER 1 — DATA SOURCES  (read-only)                            │
│                                                                 │
│  compute.json            → EC2 inventory, cost, owner tags      │
│  metrics.json            → hourly CPU timeseries per instance   │
│  security_findings.json  → audit results by severity            │
│  org_directory.json      → teams, owners, escalation contacts   │
│                                                                 │
│  In production: AWS SDK → EC2 · RDS · S3 · Security Hub         │
└─────────────────────────────────────────────────────────────────┘
```

### End-to-End Audit Sequence

```
Human: "Execute the full SecOps audit"
   │
   ▼
LLM recognizes intent, calls run_full_secops_audit()
   │
   ├──▶ Reads compute.json + metrics.json + security_findings.json
   │
   ├──▶ Correlates cost against utilization
   │      └─ flags legacy-analytics-gpu, jenkins-build-executor-orphaned
   │      └─ protects ml-training-cluster-master (periodic ML workload)
   │
   ├──▶ Resolves FIND-101 owner via org_directory.json
   │
   ├──▶ POST api.github.com/repos/{owner}/{repo}/issues
   │      └─ P1 ticket created, labelled, assigned
   │
   └──▶ POST hooks.slack.com/services/...
          └─ Block Kit card to #cloudguard-alerts
             with [Approve & Apply] [Escalate to Lead]
   │
   ▼
LLM: "Found $4,250/mo waste across 2 instances. Filed issue #7.
      Slack card posted. Approve remediation?"
   │
   ▼
Human approves
   │
   ▼
LLM calls remediate_security_leak({ issueNumber: 7 })
   │
   └──▶ PATCH github issue → state: closed, state_reason: completed
   │
   ▼
Audit closed. Full trail in GitHub + Slack.
```

---

## Tool Reference

CloudGuard AI exposes **10 tools, 1 resource, and 1 prompt** over MCP.

### Tools

| # | Tool | Domain | Purpose | Inputs |
| :-- | :--- | :--- | :--- | :--- |
| 1 | `scan_cloud_inventory` | FinOps | Enumerate compute instances with state, cost/hr, and owner tags | `teamTag?: string` |
| 2 | `audit_security_risks` | SecOps | Retrieve security findings, optionally filtered by severity | `severity?: 'low'\|'medium'\|'high'\|'critical'` |
| 3 | `calculate_idle_waste` | FinOps | Correlate cost against CPU utilization to compute monthly waste | `maxCpuThreshold?: number` (default `10`) |
| 4 | `get_owner_contact` | Directory | Resolve a resource owner or team to a named contact with escalation path | `ownerTagOrTeam: string` |
| 5 | `execute_security_patch` | Remediation | Generate Terraform HCL and AWS CLI remediation for a finding | `findingId: string` |
| 6 | `send_slack_alert` | Integration | Dispatch a Block Kit incident card with interactive action buttons | `severity`, `title`, `summary`, `owner`, `remediationCode?` |
| 7 | `create_github_issue` | Integration | File a live P1 security ticket via the GitHub REST API | `title`, `findingId`, `assignee`, `severity`, `remediationSnippet?`, `repoOwner?`, `repoName?` |
| 8 | `run_full_secops_audit` | Orchestration | Atomic end-to-end pipeline: scan → analyse → file ticket → alert | *(none)* |
| 9 | `remediate_security_leak` | Remediation | Apply the fix and close the corresponding GitHub issue | `issueNumber?: number` (default `1`) |
| 10 | `get_security_scorecard` | Reporting | Executive posture score, compliance ratings, financial impact | *(none)* |

### Resource

| URI | Name | Returns |
| :--- | :--- | :--- |
| `cloudguard://status` | `cloudguard_status` | Engine health, telemetry mode, loaded datasets, integration configuration state, last sync timestamp |

### Prompt

| Name | Description |
| :--- | :--- |
| `full_secops_audit` | Pre-packaged expert audit prompt. Instructs the client to run the complete scan, file the GitHub ticket, and post the Slack alert in one turn. |

---

## Technology Stack

**Core**
- [`@nitrostack/core`](https://nitrostack.ai) — MCP server framework with decorator-based tool registration
- Node.js 18+ (20.x recommended)
- TypeScript 5.3, strict mode
- Zod — runtime input schema validation
- `reflect-metadata` — decorator metadata support
- `dotenv` — environment configuration

**Integrations**
- GitHub REST API `2022-11-28` — issue creation, patching, closure
- Slack Incoming Webhooks + Block Kit — rich interactive incident cards
- AWS SDK *(production path)* — EC2, RDS, S3, Security Hub

**Tooling**
- NitroStack CLI — scaffolding, build, deploy
- NitroStudio — desktop MCP inspector and debugger
- NitroCloud — serverless hosting with a permanent HTTPS endpoint

---

## Quickstart

### Prerequisites

| Requirement | Version | Notes |
| :--- | :--- | :--- |
| Node.js | 18+ (20.x recommended) | [nodejs.org](https://nodejs.org/) |
| npm | 9+ | Bundled with Node |
| Git | any | For deployment |
| NitroStack CLI | latest | `npm install -g @nitrostack/cli` |

### Installation

```bash
git clone https://github.com/rakesh94m/cloudguard-ai.git
cd cloudguard-ai
npm install
```

### Configure

```bash
cp .env.example .env
```

Open `.env` and fill in your values. **Every field is optional** — CloudGuard runs a complete audit against mock data with an empty `.env`. Integrations that aren't configured return a clear `skipped` status instead of failing.

### Run

```bash
npm run dev
```

You should see:

```
✅ Application initialized with 10 tools, 1 resources, 1 prompts
🌐 MCP Streamable HTTP transport listening on http://localhost:3000/mcp
```

| Endpoint | Purpose |
| :--- | :--- |
| `http://localhost:3000/mcp` | Streamable HTTP transport — Claude's preferred |
| `http://localhost:3000/sse` | Server-Sent Events — ChatGPT's preferred |
| `http://localhost:3001` | NitroStudio Inspector — visual MCP debugger |

### Verify

```bash
npm run build        # compile TypeScript to dist/
npm run start:prod   # run compiled output
```

---

## Configuration

All configuration lives in `.env`. **No credential is ever hardcoded in source.**

```env
# ─── Server ────────────────────────────────────────────────
NODE_ENV=development
PORT=3000

# ─── Cloud Provider ────────────────────────────────────────
CLOUD_PROVIDER=mock              # 'mock' | 'aws'
MOCK_DATA_PATH=./data/mock

# ─── GitHub Integration (optional) ─────────────────────────
GITHUB_TOKEN=
GITHUB_REPO_OWNER=
GITHUB_REPO_NAME=

# ─── Slack Integration (optional) ──────────────────────────
SLACK_WEBHOOK_URL=

# ─── NitroCloud ────────────────────────────────────────────
NITROSTACK_APP_MODE=openai       # set 'openai' for ChatGPT compatibility
AWS_REGION=us-east-1
```

### Variable Reference

| Variable | Required | Effect if unset |
| :--- | :---: | :--- |
| `PORT` | No | Defaults to `3000` |
| `CLOUD_PROVIDER` | No | Defaults to `mock` |
| `GITHUB_TOKEN` | No | `create_github_issue` and `remediate_security_leak` return `status: 'skipped'` |
| `GITHUB_REPO_OWNER` | No | Same as above |
| `GITHUB_REPO_NAME` | No | Same as above |
| `SLACK_WEBHOOK_URL` | No | `send_slack_alert` returns `status: 'skipped'` |

### Obtaining Credentials

**GitHub Personal Access Token** — [github.com/settings/tokens](https://github.com/settings/tokens) → Generate new token (classic) → scope `repo`. Fine-grained tokens work too; grant *Issues: Read and write* on the target repository.

**Slack Incoming Webhook** — [api.slack.com/apps](https://api.slack.com/apps) → your app → *Incoming Webhooks* → *Add New Webhook to Workspace* → select the target channel.

> ⚠️ **Never commit `.env`.** It is listed in `.gitignore`. If a credential is ever exposed, revoke it immediately at its source rather than relying on removing it from the repository — pushed secrets should be treated as compromised.

---

## Connecting to Claude and ChatGPT

### Claude — Desktop or Web

1. Open **claude.ai** or **Claude Desktop**
2. **Settings → Connectors → Add custom connector**
3. Configure:
   - **Name:** `CloudGuard AI`
   - **URL:** `https://<your-app>.nitrocloud.app/mcp`
   - **Advanced settings:** leave empty (no OAuth required)
4. **Add → Connect**
5. In a new chat, enable CloudGuard AI from the tools menu
6. Verify: *"List the tools available from CloudGuard AI"* — you should see all ten

### ChatGPT — Developer Mode

Requires a Plus, Pro, or Enterprise subscription.

1. **Settings → Apps & Connectors → Advanced → Developer Mode** `ON`
2. **Create App**
3. Configure:
   - **Name:** `CloudGuard AI`
   - **Description:** `Cloud cost and security anomaly detection`
   - **MCP URL:** `https://<your-app>.nitrocloud.app/sse` ← note `/sse`, not `/mcp`
   - **Authentication:** No Auth
4. **Create App → Connect**
5. Enable in a new Developer Mode chat — all ten tools auto-discover

### Local Testing Before Deployment

Expose your local server with ngrok:

```bash
npm run dev          # terminal 1
ngrok http 3000      # terminal 2
```

Register the ngrok HTTPS URL with `/mcp` or `/sse` appended. The URL rotates each session, so this is development-only.

### `/mcp` vs `/sse`

Both transports are served simultaneously by the same process.

| Endpoint | Transport | Client |
| :--- | :--- | :--- |
| `/mcp` | Streamable HTTP | Claude (faster, preferred) |
| `/sse` | Server-Sent Events | ChatGPT |

---

## Usage Walkthroughs

### 1. Full Pipeline — One Command

> **Prompt:** *"Execute the full SecOps audit."*

**Execution trace:**
1. `run_full_secops_audit()` invoked with no arguments
2. Reads `compute.json` and `security_findings.json`
3. Calls `create_github_issue()` internally → live POST to GitHub REST API
4. Calls `send_slack_alert()` internally → live POST to Slack webhook
5. Returns audit summary, GitHub issue number and URL, Slack dispatch confirmation

This is the demo tool. One prompt, complete end-to-end pipeline, live external side effects.

### 2. Targeted Inventory Scan

> **Prompt:** *"Scan the cloud inventory for all instances owned by the analytics team."*

`scan_cloud_inventory({ teamTag: "analytics" })` filters `compute.json` case-insensitively and returns matching instances with names, types, hourly cost, and owner tags — plus total scanned versus matched counts for context.

### 3. Waste Analysis with a Custom Threshold

> **Prompt:** *"Find every instance running under 5% CPU and tell me what it's costing us annually."*

`calculate_idle_waste({ maxCpuThreshold: 5 })` joins `compute.json` against `metrics.json`, computes `costPerHour × 24 × 30` for each idle instance, and returns a per-instance breakdown plus the aggregate monthly figure. The LLM annualizes and narrates.

**The ETL trap:** `ml-training-cluster-master` ($3.06/hr) shows low *average* CPU but spikes hard on a training schedule. Because the tool returns the raw timeseries rather than just a boolean, the model can recognize the periodic shape and correctly protect it — where a threshold-only rule would have flagged your most expensive production workload for termination.

### 4. Owner Resolution and Escalation

> **Prompt:** *"Who owns FIND-101, and what's their escalation contact?"*

`audit_security_risks({ severity: "critical" })` surfaces the finding, then `get_owner_contact()` resolves the owner tag against `org_directory.json` — matching on user ID, team, or partial name — and returns the named individual, email, team, and escalation path.

### 5. Remediation Round Trip

> **Prompt:** *"Generate the fix for the S3 public access issue, file it, then close it out."*

1. `audit_security_risks()` → identifies `FIND-101`
2. `execute_security_patch({ findingId: "FIND-101" })` → returns Terraform HCL and AWS CLI
3. `create_github_issue()` → files P1 with the patch embedded in the body
4. *Human reviews and approves*
5. `remediate_security_leak({ issueNumber: 7 })` → `PATCH` closes the issue as completed

### 6. Executive Readout

> **Prompt:** *"Generate an executive security posture scorecard."*

`get_security_scorecard()` returns the overall score (94/100), per-framework compliance (SOC 2 Type II 98%, CIS AWS Foundations 92%, HIPAA 100%), financial impact ($4,250/mo waste, $51K/year savings potential), and live telemetry health.

---

## Project Structure

```
cloudguard-ai/
│
├── README.md                                  ← you are here
├── package.json
├── tsconfig.json
├── .env.example                               ← config template
├── .gitignore
│
├── src/
│   ├── index.ts                               ← MCP bootstrap; all 10 tools registered here
│   │
│   ├── modules/                               ← extracted domain logic (refactor in progress)
│   │   ├── analysis/
│   │   │   ├── analysis.tools.ts              ← inventory scan, waste calculation
│   │   │   └── utilization.service.ts         ← workload shape classification
│   │   ├── security/
│   │   │   └── security.tools.ts              ← findings audit, severity filtering
│   │   ├── remediation/
│   │   │   ├── remediation.tools.ts           ← patch generation, issue closure
│   │   │   ├── templates/
│   │   │   │   ├── secure-bucket.tf.tmpl      ← S3 public access block
│   │   │   │   ├── restrict-sg.tf.tmpl        ← security group ingress restriction
│   │   │   │   └── terminate-instance.tf.tmpl ← instance teardown (draft only)
│   │   │   └── docs/
│   │   │       ├── IDEA.md
│   │   │       └── README.md
│   │   └── workflow/
│   │       └── workflow.tools.ts              ← GitHub + Slack orchestration
│   │
│   ├── services/
│   │   ├── cloud-provider.adapter.ts          ← swappable provider interface
│   │   └── mock-cloud.service.ts              ← JSON-backed implementation
│   │
│   └── guards/
│       └── human-approval.guard.ts            ← sign-off validation gate
│
├── data/
│   └── mock/
│       ├── compute.json                       ← 8 EC2 instances
│       ├── metrics.json                       ← 168h CPU timeseries per instance
│       ├── security_findings.json             ← 8 findings, critical → low
│       └── org_directory.json                 ← teams, owners, escalation contacts
│
├── test-all.ts                                ← full suite
├── test-person2.ts                            ← analysis module
├── test-person3.ts                            ← security module
└── test-person4.ts                            ← workflow module
```

### Key Files

| File | Role |
| :--- | :--- |
| `src/index.ts` | Application entry point. Defines `CloudGuardTools` with all `@Tool`, `@Resource`, and `@Prompt` decorators, plus the root `AppModule`. |
| `src/services/cloud-provider.adapter.ts` | The seam that makes the data layer swappable. Implement this interface against the AWS SDK and nothing above it changes. |
| `src/guards/human-approval.guard.ts` | Validates human sign-off before state-changing operations execute. |
| `src/modules/analysis/utilization.service.ts` | Classifies workload shape — flat-idle versus periodic — so genuine waste is separated from scheduled jobs. |

---

## Mock Data Model

CloudGuard ships with a complete synthetic environment so the full pipeline runs offline with no AWS account.

**Why mock data**
- Instant demos with no API latency or rate limits
- Zero risk of touching real infrastructure
- Reproducible results across every run
- Works on conference-hall Wi-Fi

### `compute.json` — 8 EC2 instances

| Instance | Rate | Expected Verdict |
| :--- | ---: | :--- |
| `legacy-analytics-gpu` | $1.20/hr | 🔴 **Waste** — GPU node, sustained low CPU |
| `jenkins-build-executor-orphaned` | $0.768/hr | 🔴 **Waste** — abandoned build server |
| `ml-training-cluster-master` | $3.06/hr | 🟢 **Protected** — periodic ML workload, not idle |
| `dev-sandbox-db-replica` | $0.52/hr | 🟢 Healthy |
| `prod-k8s-worker-node-01` | $0.34/hr | 🟢 Healthy |
| `prod-auth-service-01` | $0.0672/hr | 🟢 Healthy |
| `marketing-staging-api` | $0.0416/hr | 🟢 Healthy |

The spread from $0.04 to $3.06/hr is deliberate — it makes the cost-weighted reasoning visible rather than trivial.

### `metrics.json`

168 hourly CPU samples (7 full days) per instance. Long enough for daily and weekly periodicity to be distinguishable from a flat idle baseline.

### `security_findings.json` — 8 findings

| ID | Severity | Finding |
| :--- | :--- | :--- |
| `FIND-101` | 🔴 CRITICAL | S3 bucket publicly readable |
| `FIND-102` | 🟠 HIGH | SSH port 22 open to `0.0.0.0/0` |
| `FIND-103` | 🟡 MEDIUM | Outdated OS kernel with known CVE |
| *(+5 more)* | | Hardcoded keys, unencrypted volumes, IAM misconfigurations |

### `org_directory.json`

Employee records with `userId`, `name`, `email`, `team`, and escalation contact. This is what converts a resource ID into an accountable human.

### Switching to Live AWS

1. Set `CLOUD_PROVIDER=aws` in `.env`
2. Supply AWS credentials via IAM role or access key
3. Implement `AwsCloudService` against the `CloudProviderAdapter` interface
4. **No changes to tools, resources, prompts, or business logic** — the adapter absorbs the difference

---

## Deployment to NitroCloud

NitroCloud provides serverless hosting with a permanent HTTPS URL that survives redeployments.

### Method A — NitroStudio Deploy

1. Open NitroStudio and connect your project directory
2. Header bar → **Link to App…** → **Create Cloud App** (or select existing)
3. Click **Deploy** — NitroStudio runs `npm run build` locally, uploads the package, and opens a confirmation tab
4. Click **Deploy Now**

### Method B — GitHub Continuous Deployment

1. Push your repository:
   ```bash
   git add .
   git commit -m "CloudGuard AI"
   git push origin main
   ```
2. [NitroCloud Dashboard](https://nitrostack.ai/cloud) → **Apps → cloudguard-ai → MCP → Deployments**
3. Under **Deploy from GitHub**, authorize the NitroStack GitHub App
4. Connect `rakesh94m/cloudguard-ai`, branch `main`
5. **Link Repository & Enable Auto-Deploy**

Every push to `main` now triggers a live build.

> ⚠️ **Critical:** copy every variable from your local `.env` into **NitroCloud → Settings → Environment Variables**. Your `.env` is gitignored and will not be deployed. Without this, GitHub and Slack integrations return `skipped` in production.

### Verify

```bash
curl https://<your-app>.nitrocloud.app/mcp
curl https://<your-app>.nitrocloud.app/sse
```

Both should return MCP protocol responses, not `404`.

Your NitroCloud URL is stable across all future deployments — register it once in Claude or ChatGPT and it keeps working.

---

## Security Model

Security posture is a design property of CloudGuard, not a configuration option.

### The Agent Cannot Mutate Infrastructure

There is no `terminate_instance` tool. No `delete_bucket`. No `modify_security_group`. The MCP surface exposes read operations and *draft* generation only. An LLM connected to CloudGuard is structurally incapable of destroying infrastructure, because the capability was never published to it.

Compare this to the permission-gated approach — where a `terminate` tool exists but is guarded by an IAM policy. That model fails open under misconfiguration. This one has nothing to misconfigure.

`terminate-instance.tf.tmpl` exists in the remediation templates, but it produces Terraform *text* for a human to review and apply. CloudGuard never executes it.

### Credentials Are Never in Source

Every secret — GitHub token, Slack webhook — loads from environment variables at startup. Nothing sensitive appears in any committed file. `.env` is gitignored; `.env.example` contains empty placeholders only.

When an integration is unconfigured, the corresponding tool returns:

```json
{
  "status": "skipped",
  "message": "GitHub integration not configured. Set GITHUB_TOKEN, GITHUB_REPO_OWNER, and GITHUB_REPO_NAME in your .env file."
}
```

Explicit and diagnosable, rather than a silent failure or a confusing 401.

### Human Approval Gate

`HumanApprovalGuard` validates sign-off before state-changing operations proceed. Slack incident cards carry **Approve & Apply Patch** and **Escalate to Lead** buttons — the workflow pauses for a human decision rather than auto-executing.

### Runtime Input Validation

Every tool input is validated by a Zod schema before reaching domain logic. Malformed or adversarial arguments from a model are rejected at the boundary with a clear schema error.

### External Audit Trail

Every finding that leads to action produces a durable, external record. GitHub issues capture what was found, what remediation was proposed, who it was assigned to, and when it closed. Slack incident cards capture who was notified and when. Neither record lives inside CloudGuard, so neither can be silently rewritten by the agent.

### Reporting a Vulnerability

Open a GitHub issue with the `security` label, or contact the maintainers directly for anything sensitive.

---

## Troubleshooting

| Symptom | Cause | Fix |
| :--- | :--- | :--- |
| `Application initialized with 0 tools` | Decorator metadata not emitted | Confirm `"experimentalDecorators": true` and `"emitDecoratorMetadata": true` in `tsconfig.json`, and that `import 'reflect-metadata'` is the first line of `index.ts` |
| Tools return empty arrays | Mock data not found | `readMockData` resolves relative to `process.cwd()` — run npm scripts from the project root, not from `src/` |
| `status: "skipped"` on GitHub/Slack tools | Environment variables unset | Populate `.env` locally; populate NitroCloud → Settings → Environment Variables in production |
| GitHub returns `401 Bad credentials` | Token expired or wrong scope | Regenerate with `repo` scope (classic) or *Issues: Read and write* (fine-grained) |
| GitHub returns `404 Not Found` | Repo path wrong, or token lacks access | Verify `GITHUB_REPO_OWNER` and `GITHUB_REPO_NAME` match an existing repo the token can reach |
| Slack returns `no_service` | Webhook revoked or malformed | Regenerate the Incoming Webhook in your Slack app settings |
| Claude can't connect | Wrong endpoint suffix | Claude needs `/mcp`; ChatGPT needs `/sse` |
| ngrok URL stopped working | Free-tier URLs rotate per session | Restart ngrok and re-register, or deploy to NitroCloud for a stable URL |
| `push declined — repository rule violations` | A secret was committed | Revoke the credential at its source, move it to `.env`, and rewrite the offending commit before pushing |

### Local Debugging with NitroStudio

```bash
npm run dev
```

Open `http://localhost:3001`. The Inspector lets you enumerate every registered tool and resource, invoke tools with arbitrary test inputs, view raw responses, and debug Zod schema validation errors — all without an LLM client attached.

### Test Suite

```bash
npx tsx test-all.ts        # complete suite
npx tsx test-person2.ts    # analysis module
npx tsx test-person3.ts    # security module
npx tsx test-person4.ts    # workflow module
```

---

## Roadmap

- [ ] **Live AWS adapter** — `AwsCloudService` against EC2, RDS, S3, and Security Hub
- [ ] **Multi-cloud** — GCP and Azure providers behind the same adapter interface
- [ ] **Slack interactivity endpoint** — handle Approve/Escalate button callbacks server-side
- [ ] **Automated PR generation** — open a remediation pull request, not just an issue
- [ ] **Cost forecasting** — project spend trajectory from historical utilization
- [ ] **Anomaly detection** — statistical baselining instead of static thresholds
- [ ] **RBAC** — scope tool access by requesting user's team and role
- [ ] **Persistent audit store** — durable database backing for compliance retention

---

## Contributing

1. Preserve the layer boundaries: **Data → Services → MCP Surface → Client**
2. Register new tools on `CloudGuardTools` in `src/index.ts`; extract shared logic into `src/modules/`
3. Define a Zod schema for every input — no untyped parameters
4. Add coverage to the relevant `test-*.ts` file
5. Document new tools in the [Tool Reference](#tool-reference) table
6. TypeScript strict mode, no exceptions
7. **Never commit a credential.** Configuration goes in `.env`; `.env.example` gets an empty placeholder

---

## License

Released under the MIT License.

Submitted to the **NitroStack × Amrita University Hackathon 2026**.

---

## Support

| Resource | Link |
| :--- | :--- |
| NitroStack Documentation | [docs.nitrostack.ai](https://docs.nitrostack.ai) |
| MCP Specification | [modelcontextprotocol.io](https://modelcontextprotocol.io) |
| GitHub Issues | [rakesh94m/cloudguard-ai/issues](https://github.com/rakesh94m/cloudguard-ai/issues) |

---

<div align="center">

**Built with NitroStack MCP Framework**

*Cloud infrastructure your AI can audit — but never break.*

[Deploy on NitroCloud →](https://nitrostack.ai/cloud)

</div>
