<div align="center">

# 🛡️ DomainExpansion.ai
### MCP-Native API Attack Surface & BOLA Detection Engine

**Your API's real attack surface isn't what's in the spec. It's what's in the logs.**

[![CI](https://github.com/bodapatisaikrishna/domainexpansion/actions/workflows/ci.yml/badge.svg)](https://github.com/bodapatisaikrishna/domainexpansion/actions/workflows/ci.yml)
[![Tests](https://img.shields.io/badge/tests-111%20passing-brightgreen)](#tests)
[![Live](https://img.shields.io/badge/status-live-brightgreen)](#live-deployment)
[![Model Context Protocol](https://img.shields.io/badge/Model%20Context%20Protocol-MCP-blue)](https://modelcontextprotocol.io)
[![Built with NitroStack](https://img.shields.io/badge/Built%20with-NitroStack-0A66FF)](https://nitrostack.ai)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**[🚀 Live Demo](#live-deployment)** · **[⚡ 2-Minute Judge Verification](#for-judges-verify-in-under-2-minutes)** · **[📖 Detection Algorithms](docs/DETECTION.md)**

</div>

---

## Table of Contents

- [Live Deployment](#live-deployment)
- [For Judges: Verify in Under 2 Minutes](#for-judges-verify-in-under-2-minutes)
- [Overview](#overview)
- [What is MCP?](#what-is-mcp)
- [Features](#features)
- [How It Works: Deterministic Engine, Agentic Triage](#how-it-works-deterministic-engine-agentic-triage)
- [The Seven Detection Rules](#the-seven-detection-rules)
- [Attack Session Reconstruction](#attack-session-reconstruction-the-story-not-the-list)
- [Security Considerations](#security-considerations)
- [External Data Source: APIs.guru](#external-data-source-the-apisguru-registry)
- [MCP Surface](#mcp-surface)
- [Connect to an MCP Client](#connect-to-an-mcp-client)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Usage: The Demo Sequence](#usage-the-demo-sequence)
- [Sample Dataset](#sample-dataset)
- [Real-Data Validation](#real-data-validation-not-just-a-fixture-we-wrote-ourselves)
- [Limitations](#limitations)
- [FAQ](#faq)
- [Judging Rubric Mapping](#how-this-maps-to-the-judging-rubric)
- [Tests](#tests)
- [License](#license)

---

## Live Deployment

## 🔗 [domainexpansion-6a64d....app.nitrocloud.ai](https://domainexpansion-6a64d-neural-nexus-amrita-university-coimbatore.app.nitrocloud.ai/)

Verified live via a real MCP JSON-RPC handshake (`initialize` → `tools/list`) — all **11 tools** respond correctly with a real session id, and via a full manual pass through the actual chat interface. Deploys are auto-triggered by a push to `main` — every commit on this branch is live within minutes.

## For Judges: Verify in Under 2 Minutes

Open the live deployment link above (it's a chat interface — NitroChat) and paste this one prompt:

> *"Ingest the acme-prod logs, import our OpenAPI spec, then scan for all authorization risks and show me the API topology."*

Expect, in order: **8,252** records / **120** actors / **34** endpoints ingested → **27** documented against the spec → a ranked findings list covering **all seven detection rules** (R1 BOLA on `/api/v1/orders/{orderId}`, R2 enumeration on documents, R3 missing-auth on `/internal/v0/export/customers`, R4 an invoice status-leak, R5 seven shadow endpoints, R6 an unguarded webhook delete, R7 three log-injection attempts) → a topology graph with shadow endpoints visually flagged. `/api/v1/admin/feature-flags` and `/api/v1/auth/login` should show **zero** findings — they're the deliberate false-positive controls.

Then, to see the rest of the surface in one more prompt:

> *"Show me the evidence for the BOLA finding, generate a Jest regression test for it, reconstruct the attack session for the account behind the enumeration finding, and check the Stripe API from the APIs.guru registry against my traffic."*

The reconstructed session should read as a story, not a list: a handful of ordinary single requests, then one entry reading **"×60 (60 distinct)"** on `/api/v1/users/{userId}/documents/{docId}` with a CRITICAL marker — the entire enumeration burst collapsed into one line instead of 60.

This was run against the live deployment on 2026-07-26 and passed on every point above — see the [full demo sequence](#usage-the-demo-sequence) below for what each response should look like if you want to check line by line.

---

## Overview

Published API specs drift from what a service actually does in production. New endpoints ship without ever being documented ("shadow APIs"). Object-level authorization checks get missed on individual routes even when the rest of the API enforces them correctly. Both classes of bug are invisible to a spec reviewer — they only show up in traffic.

**DomainExpansion.ai** turns raw access logs into a reconstructed picture of the real API surface, runs seven deterministic detection rules against it, and hands an agent — or a human — a ranked, evidence-backed set of leads instead of a wall of log lines. Point it at production access logs and it hands back real BOLA and shadow-API risks, each one backed by the exact log line that proves it, not a guess. No log line ever reaches an LLM without being neutralised first, so a payload trying to prompt-inject the agent reading the report shows up as a finding, not as a successful attack.

## What is MCP?

The **Model Context Protocol (MCP)** is an open standard that lets AI assistants securely connect to external tools, data sources, and services. Instead of being limited to what it was trained on, an AI model can call **MCP servers** to fetch live data, run actions, and integrate with real systems.

This project is an MCP server built on **[NitroStack](https://nitrostack.ai)**, exposing the full trio of MCP primitives — Tools, Resources, and Prompts — to any MCP-compatible client (Claude, ChatGPT Apps, Cursor, and more).

## Features

- 🔍 **Seven deterministic detection rules** — BOLA, enumeration, missing auth, existence oracles, shadow endpoints, unguarded writes, log injection — each mapped to a real CWE
- 📖 **Story, not a list** — attack session reconstruction turns a flat findings list into a minute-by-minute narrative of what one account actually did
- 🧾 **Evidence-backed, always** — every finding cites the exact log records that triggered it, addressable by URI, never a bare assertion
- 🛡️ **Structurally isolates untrusted input** — attacker-planted prompt-injection payloads in logs are neutralised before they ever reach an LLM or a screen
- 🌐 **Real external data source** — diffs your live traffic against a real published API contract fetched from the APIs.guru registry, cache-first and offline-capable
- 🔌 **MCP-native end to end** — 11 tools, 6 resources, 4 prompts, 5 interactive widgets, all confirmed at the protocol level, not just by counting decorators
- 🧪 **Validated on real, uncurated data** — not only self-written fixtures; tested against a real 50,000-line third-party log corpus with a disclosed synthetic injection
- ✅ **111 automated tests**, CI on every push, deployed live and auto-redeploying

## How It Works: Deterministic Engine, Agentic Triage

The detection logic lives entirely in `src/engine/**` — pure functions over plain data, no I/O, no network, no LLM calls, no clock, no randomness. Identical input always produces an identical, identically-ordered finding set. That separation is deliberate: a security tool that hallucinates findings is worse than none, so nothing about *whether* something is a finding is ever left to a language model. The MCP layer (`src/modules/surface/`) is a thin adapter — validate input, call the engine, shape the output — with **zero detection logic of its own**.

The agentic part sits above that boundary: an LLM client (via `audit_brief`, `remediation_plan`, `incident_handoff`) reasons about *what to do* with the findings — who probably owns the affected service, what to prioritise, how to phrase a ticket — using only the engine's already-computed, already-safe output. The engine decides facts; the agent decides communication and next steps. Neither one does the other's job.

## The Seven Detection Rules

| Rule | CWE | Trigger |
|---|---|---|
| `R1_CROSS_ACTOR` | [CWE-639](https://cwe.mitre.org/data/definitions/639.html) Authorization Bypass Through User-Controlled Key | For a path-param position, ≥2 distinct non-admin/service accounts both received a 2xx on the *same* concrete object value |
| `R2_ENUMERATION` | [CWE-799](https://cwe.mitre.org/data/definitions/799.html) Improper Control of Interaction Frequency | One account touches ≥20 distinct values at the template's most specific param position inside any 120-second sliding window |
| `R3_AUTH_GAP` | [CWE-306](https://cwe.mitre.org/data/definitions/306.html) Missing Authentication for Critical Function | A template with ≥200 requests has **zero** 401/403 responses ever, while at least one sibling template at the same path depth correctly denies unauthorized access |
| `R4_EXISTENCE_ORACLE` | [CWE-204](https://cwe.mitre.org/data/definitions/204.html) Observable Response Discrepancy | Same param position returns 401 for some concrete object IDs and 404 for others — existence is observable to an unauthenticated caller |
| `R5_SHADOW` | [CWE-1059](https://cwe.mitre.org/data/definitions/1059.html) Insufficient Documentation | Observed template is absent from the imported spec (position-based match — see below); without a spec, falls back to a path-prefix/traffic-percentile heuristic |
| `R6_UNGUARDED_WRITE` | [CWE-285](https://cwe.mitre.org/data/definitions/285.html) Improper Authorization | A mutating (POST/PUT/PATCH/DELETE) endpoint with ≥10 write requests has zero 401/403 denials, while a sibling template at the same path depth does deny |
| `R7_LOG_INJECTION` | [CWE-117](https://cwe.mitre.org/data/definitions/117.html) Improper Output Neutralization for Logs | Path/query/User-Agent contains instruction-shaped text aimed at an automated log-analysis agent |

All seven rules declared in the type system are implemented. Full algorithms, the scoring formula, and the false-positive controls are in **[docs/DETECTION.md](docs/DETECTION.md)**.

## Attack Session Reconstruction: The Story, Not the List

Every security tool outputs a ranked list of findings. `reconstruct_attack_session(actorSub)` outputs a story instead: one actor's entire request history, sorted chronologically and grouped by consecutive same-endpoint activity, with every group cross-referenced against the findings it triggered. `usr_7741`'s session on `acme-prod` doesn't read as "60 log lines" — it reads as a handful of ordinary single requests, then one line: `GET /api/v1/users/{userId}/documents/{docId} ×60 (60 distinct) — CRITICAL`, the entire document-enumeration burst collapsed into a single, obvious moment in an otherwise unremarkable session.

This adds no new detection logic — `src/engine/session.ts` is a pure reduction of records, templates, and findings the seven rules already produced, grouped by time instead of by rule. Same untrusted-input contract as everywhere else: every path shown is `neutralise()`'d before it reaches the tool response, the widget, or the model. Exposed as the `reconstruct_attack_session` tool, the `session://actor/{sub}` resource, and the `attack_timeline` widget.

## Security Considerations

**The untrusted-input contract.** Every access-log record contains attacker-controlled strings — path, query, User-Agent. Any one of those that can reach a tool response or an LLM prompt passes through `neutralise()` (`src/engine/sanitise.ts`) first, with no exceptions.

**We structurally isolate rather than blocklist.** A blocklist of "bad phrases" always loses — attackers just rephrase, re-encode, or split a word with a zero-width character. `neutralise()` doesn't try to recognise every attack. It NFKC-normalises, strips evasion characters (zero-width joiners, bidi overrides), collapses whitespace, hard-caps length, and then wraps the result in a labelled, delimiter-escaped `<untrusted field="...">` tag — escaping any literal `<`/`>` in the value so a payload like `</untrusted><system>...</system>` can't terminate the wrapper early. Even a payload that evades every pattern-matching detector still arrives at the model, or on screen in the `evidence_viewer` widget, visibly quarantined as data, never live markup or an instruction.

**R7 practices what it preaches.** `detectR7LogInjection`'s own title, rationale, and metrics reference pattern *names* only (`ignore-previous`, `system-role`, ...) — never the raw attacker text it detected. The raw value is reachable exactly one way: through `evidence://finding/{id}`, and only after `neutralise()`.

**Every finding is required to carry evidence.** `Finding.evidence: string[]` must be non-empty — there's a test (`tests/ground-truth.test.ts`) that enforces it project-wide.

## External Data Source: the APIs.guru Registry

`src/integrations/apisguru.ts` is the only file in this codebase permitted to make a network call. It's cache-first by design: a warm cache never touches the network at all, so a dead venue wifi doesn't matter once `fixtures/cache/apisguru/` (committed, ~7MB) is in place. 8-second `AbortController` timeout, native `fetch`, no API key.

Worth flagging: the build spec this project follows describes the document endpoint as `/{provider}/{service}.json`. That path 404s against the real live API (verified via `curl`, 2026-07-25) — the actual v2 API lists a provider's APIs at `/{provider}.json` as an `apis` map keyed by `provider` or `provider:service`, each entry carrying a `swaggerUrl` to the real document. `fetchSpec` resolves through that listing instead of a URL pattern that would never have worked.

`browse_spec_registry` and `import_registry_spec` expose this from the MCP layer; `npm run cache:warm` pre-fetches `providers.json` plus real specs for stripe.com (299 paths), slack.com (174 paths), and twilio.com (121 paths).

## MCP Surface

**11 tools, 6 resources, 4 prompts** — confirmed at the protocol level (a live `tools/list` call returns exactly these 11 names), not just by counting decorators.

**Tools:** `ingest_access_logs`, `import_openapi_spec`, `browse_spec_registry`, `import_registry_spec`, `get_api_topology`, `list_shadow_endpoints`, `scan_authorization_risks`, `get_finding_evidence`, `reconstruct_attack_session`, `export_reconstructed_spec`, `generate_authz_test_suite`. Every tool returns `{ok:true, data, suggestedNext?}` or `{ok:false, code, message, nextAction}` — none ever throws. `suggestedNext` is populated on every success so an agent can walk the whole investigation (ingest → import spec → scan → fetch evidence → reconstruct the session → generate a regression test) without being told the next step by a human.

**Resources:** `logs://fixtures/{scenarioId}`, `registry://apisguru/{provider}/{service}`, `evidence://finding/{findingId}`, `session://actor/{sub}`, `spec://reconstructed/latest`, `findings://latest`. The evidence and session resources are the deliberate design bet here: findings — and now whole attack narratives — are **citable by URI** rather than dumped into the model's context wholesale. An agent — or a human reading the transcript — can trace exactly which log lines justify a claim, and the untrusted-input contract is enforced exactly once, at the resource, instead of by every caller remembering to neutralise it themselves.

**Prompts:** `audit_brief`, `exec_summary`, `remediation_plan`, `incident_handoff`.

## Connect to an MCP Client

Add this server to your MCP client configuration:

```json
{
  "mcpServers": {
    "domainexpansion": {
      "url": "https://domainexpansion-6a64d-neural-nexus-amrita-university-coimbatore.app.nitrocloud.ai/mcp"
    }
  }
}
```

Restart your client and all 11 tools, 6 resources, and 4 prompts from this server become available to your AI assistant. Locally, `npm run dev` exposes the same server over stdio for any MCP-compatible client pointed at this project directory.

## Architecture

```
src/
├── engine/            pure detection logic — no I/O, no network, no NitroStack, no React
│   ├── types.ts           AccessLogRecord, EndpointTemplate, Finding, Topology, ToolResult
│   ├── templatise.ts      trie-based path -> {param} template collapsing (regex + Jaccard rules)
│   ├── topology.ts        aggregateEndpoints, buildTopology
│   ├── spec.ts            parseOpenApiTemplates, diffSpec (position-based matching)
│   ├── sanitise.ts        neutralise(), detectInjectionAttempt()
│   ├── adapters/          real-world log format -> AccessLogRecord (Combined/Common Log Format, AWS ALB)
│   ├── rules/             R1–R7, one file each, shared DetectionContext
│   ├── score.ts           scoreFindings — exposure/sensitivity multipliers, R5 escalation
│   ├── artifacts.ts       exportReconstructedSpec, generateAuthzTestSuite
│   ├── session.ts         reconstructAttackSession — presentation-shaping only, no new detection logic
│   └── index.ts           runDetection — the engine's single entry point
├── integrations/
│   └── apisguru.ts    the ONLY network-calling code — cache-first, never throws
├── modules/surface/   NitroStack MCP layer — thin adapter, zero detection logic
│   ├── state.ts           in-memory store: ingested records + raw spec paths, nothing derived
│   ├── surface.tools.ts, surface.resources.ts, surface.prompts.ts, surface.module.ts
│   └── yaml.ts            dependency-free JSON->YAML for export_reconstructed_spec
├── widgets/           React presentation only — bound 1:1 to a tool via @Widget
│   └── app/{topology-graph,findings-list,evidence-viewer,surface-scorecard,attack-timeline}/page.tsx
├── app.module.ts, index.ts
fixtures/
├── logs/acme-prod.jsonl       8,252 seeded access-log records
├── spec/acme-openapi.json     27-path OpenAPI 3.0 document
├── ground-truth.json          the manifest tests/ground-truth.test.ts checks against
└── cache/apisguru/            committed, warm — demo works with the network unplugged
tests/                 vitest — ground-truth assertions live here
scripts/               generate-fixtures.ts, warm-cache.ts
```

## Getting Started

### Prerequisites

Node.js ≥20.

### Installation

```bash
git clone https://github.com/bodapatisaikrishna/domainexpansion.git
cd domainexpansion
npm install
```

### Configuration

**No secrets, no API keys, no `.env` file are needed to run this project.** Every tool that touches the network (`browse_spec_registry`, `import_registry_spec`) talks to the unauthenticated, public APIs.guru API.

### Run

```bash
npm run fixtures       # regenerates fixtures/logs, fixtures/spec, fixtures/ground-truth.json
npm run cache:warm     # pre-fetches the APIs.guru cache (requires network once; committed afterward)
npm run dev            # boots the MCP server (stdio) + widget dev server on :3001
```

## Usage: The Demo Sequence

Copy-pasteable agent prompts, in order:

1. *"Ingest the acme-prod access logs."* → `ingest_access_logs({ source: 'fixture', fixtureId: 'acme-prod' })`
2. *"Import the OpenAPI spec for this API."* → `import_openapi_spec({ source: 'fixture', fixtureId: 'acme-openapi' })`
3. *"Show me the API topology."* → `get_api_topology({})` — renders the `topology_graph` widget
4. *"Scan for authorization risks."* → `scan_authorization_risks({})` — renders `findings_list`; expect `/internal/v0/export/customers` CRITICAL with both `R3_AUTH_GAP` and `R5_SHADOW`
5. *"Show me the evidence for the top finding."* → `get_finding_evidence({ findingId: '<id from step 4>' })` — renders `evidence_viewer`
6. *"Reconstruct the attack session for that finding's actor."* → `reconstruct_attack_session({ actorSub: '<sub from the evidence records>' })` — renders `attack_timeline`: the actor's whole request history as a grouped, chronological narrative, not another findings list. On `usr_7741` this reads as a handful of ordinary single requests, then one line — `×60 (60 distinct)` on `/api/v1/users/{userId}/documents/{docId}`, CRITICAL — instead of 60 separate rows.
7. *"Generate a regression test for that finding."* → `generate_authz_test_suite({ findingId: '<id>' })`
8. *"What providers does the APIs.guru registry have?"* → `browse_spec_registry({})`, then `import_registry_spec({ provider: 'stripe.com' })` to diff traffic against a real published contract

## Sample Dataset

`fixtures/logs/acme-prod.jsonl` plants eight conditions, deterministically (seeded mulberry32 PRNG — regenerating with `npm run fixtures` produces byte-identical output):

| # | Condition | Expected result |
|---|---|---|
| 1 | `GET /api/v1/orders/{orderId}` — object 10432 fetched by 3 distinct user accounts | `R1_CROSS_ACTOR`, HIGH+ |
| 2 | `GET /internal/v0/export/customers` — 4,100 requests, zero 401/403 ever, absent from spec | `R3_AUTH_GAP` + `R5_SHADOW`, CRITICAL |
| 3 | `usr_7741` touches 60 distinct `docId`s in an 88-second window | `R2_ENUMERATION`, HIGH+ |
| 4 | Three prompt-injection variants (plain phrase, zero-width-split word, `system:` role injection) | `R7_LOG_INJECTION`, HIGH+ |
| 5 | `GET /api/v1/admin/feature-flags` — documented, role-gated correctly | **CONTROL — must not be flagged** |
| 6 | `POST /api/v1/auth/login` — documented, high 401 volume from many IPs (normal failed logins) | **CONTROL — must not be flagged** |
| 7 | `GET /api/v1/invoices/{invoiceId}` — 404 for nonexistent IDs, 401 for existing IDs | `R4_EXISTENCE_ORACLE`, MEDIUM+ |
| 8 | `DELETE /api/v1/webhooks/{hookId}` — 31 deletes, all 204, zero 4xx | `R6_UNGUARDED_WRITE`, MEDIUM+ |

34 endpoint templates observed, 27 documented, 7 shadow.

## Real-Data Validation: Not Just a Fixture We Wrote Ourselves

Passing tests against `acme-prod` proves the detection engine is internally consistent — it agrees with the same person who wrote both the detector and the expected answers. It doesn't prove the tool finds anything in real, messy, non-curated traffic. `scripts/validate-real-data.ts` is the actual answer to that:

1. Downloads **NASA-HTTP (July 1995)** — a real, public, widely-used research access-log corpus from a static file server with zero API traffic, zero authentication, zero attacks of any kind. This is the noisy background.
2. Generates a small, **fully disclosed** block of synthetic Combined Log Format lines (`generateDisclosedInjection()` in that script — every line is deterministic, and the function's header comment lists exactly what's injected and why: nothing hidden).
3. Concatenates real background + disclosed injection, runs it through the real tool layer, and checks whether the seven rules found exactly what was planted — inside 50,000+ lines of genuinely unrelated real traffic, not in isolation.

```bash
npx tsx scripts/validate-real-data.ts
```

Actual output from the last run — all six disclosed patterns found, none missed:

```
R1_CROSS_ACTOR         on /api/v1/accounts/{id}        -> FOUND  (severity=CRITICAL, score=89)
R2_ENUMERATION         on /api/v1/documents/{docId}    -> FOUND  (severity=HIGH, score=83)
R3_AUTH_GAP            on /api/v1/reports              -> FOUND  (severity=HIGH, score=70)
R4_EXISTENCE_ORACLE    on /api/v1/invoices/{invoiceId} -> FOUND  (severity=MEDIUM, score=60)
R6_UNGUARDED_WRITE     on /api/v1/sessions/{id}        -> FOUND  (severity=MEDIUM, score=55)
R7_LOG_INJECTION       on /api/v1/accounts/{id}        -> FOUND  (severity=CRITICAL, score=85)

ALL disclosed injections were found.
```

This does **not** prove the tool would have found real vulnerabilities already sitting in NASA's 1995 traffic — there are none; it's a static file server. It proves the seven detection rules correctly identify their attack shapes when buried in a real, disorganised background instead of only in an isolated dataset built to pass its own test. `fixtures/real-data-validation/` (both the real NASA sample and the disclosed injection block) is committed, and `tests/real-data-validation.test.ts` locks this exact result in as a permanent regression test.

## Limitations

**Access logs cannot prove an authorization violation.** This tool surfaces prioritised, evidence-backed *leads* — patterns strongly correlated with real BOLA/shadow-API/log-injection incidents — not confirmed breaches. A human (or the owning team, via `generate_authz_test_suite`) still has to verify against the actual service.

**Requires an authenticated-subject field in the log schema.** `AccessLogRecord.actor.sub` is what `R1`/`R2` key off of; a log format without a stable per-request principal identifier can't be analysed by those two rules (they'd simply never fire, not silently mis-fire). `ingest_access_logs` accepts two real-world formats directly, each with its own honest gap:
- `source: 'combined-log-format'` — Apache/nginx Combined/Common Log Format (`src/engine/adapters/combined-log-format.ts`). No latency field (`latencyMs` reads 0), and `actor.sub` only populates when the source server was configured to log an authenticated user (HTTP Basic Auth or an auth-proxy module) — most real deployments don't do this by default.
- `source: 'aws-alb'` — AWS Application Load Balancer access logs (`src/engine/adapters/aws-alb.ts`). Has real latency data (sum of the three ALB processing-time fields), but `actor.sub`/`role` are always `null` — an ALB sits below the application layer and has no concept of an authenticated user at all.

**`R5_SHADOW`'s no-spec heuristic is exactly that — a heuristic.** It flags known internal/debug/legacy path prefixes and low-traffic endpoints with no OPTIONS/HEAD support (with an API-shape pre-filter to exclude static assets — see [docs/DETECTION.md](docs/DETECTION.md)). With a real spec imported, shadow classification is exact (position-based diff, not the heuristic).

**The live deployment does not enforce authentication.** Anyone with the URL can drive the tools directly — there's no OAuth/token check in front of this demo instance. For a tool whose purpose is finding *missing* authorization checks, this is worth stating plainly rather than waiting to be asked: it's an explicit scope decision for a hackathon demo (`@nitrostack/core`'s built-in `OAuthModule` supports wiring this in — see its startup warning in the server logs — it just isn't configured here), not an oversight discovered later.

## FAQ

**Is this an ML model finding vulnerabilities?**
No, and deliberately so. All seven rules are deterministic, hand-written algorithms — sliding windows, position-based diffing, sibling-denial comparisons. A security tool that hallucinates findings is worse than none. See [How It Works](#how-it-works-deterministic-engine-agentic-triage).

**How do I know this isn't just passing a test it wrote itself?**
It's validated two ways: against a hand-built fixture with known-planted answers (`tests/ground-truth.test.ts`), *and* against a real, uncurated 50,000-line third-party log corpus with a disclosed injection block, where nothing about the surrounding data was authored to make detection easier. See [Real-Data Validation](#real-data-validation-not-just-a-fixture-we-wrote-ourselves).

**Does the live server enforce authentication?**
No — stated explicitly in [Limitations](#limitations), not discovered later. It's a scoped decision for a hackathon demo instance, not an oversight.

**What happens with a payload trying to prompt-inject the agent?**
It gets neutralised — NFKC-normalised, stripped of evasion characters, and wrapped in a labelled `<untrusted>` tag — before it can reach an LLM prompt or render as live markup anywhere. See [Security Considerations](#security-considerations).

**Can I point this at my own real logs?**
Yes — Apache/nginx Combined Log Format and AWS ALB access logs are both supported directly (`ingest_access_logs` with `source: 'combined-log-format'` or `'aws-alb'`), alongside the bundled fixture and raw JSON records.

**How is this different from existing API security platforms?**
Detection techniques here (position-based diffing, sliding-window enumeration, sibling-denial heuristics) are well-understood, not novel research. What's distinctive is the MCP-native packaging: findings citable by resource URI instead of dumped into an LLM's context, a whole attack narrative reconstructable in one tool call, and an agent that can walk the entire investigation via `suggestedNext` without a human telling it the next step.

## How This Maps to the Judging Rubric

| Criterion | Where to look |
|---|---|
| **Technical quality** — correct Tools/Resources/Prompts, error handling, security | 11 tools / 6 resources / 4 prompts, all confirmed at the protocol level (see "For Judges" above); every tool returns a typed `ToolResult`, never throws; the untrusted-input contract (`neutralise()`) is enforced once at the resource/tool boundary, not by each caller |
| **Innovation** — novel use of MCP primitives, impactful data-source combinations | Findings are citable by `evidence://` URI rather than dumped into context; a real external registry (APIs.guru) diffs live traffic against a third party's *actual* published contract, not a mock; attack sessions reconstructed as narrative, not lists |
| **Real-world impact** — genuine problem, feasible, scalable | BOLA and shadow APIs are OWASP API Top 10 mainstays; validated against a real, uncurated 50,000-line third-party log corpus (NASA-HTTP), not only self-written fixtures — see [Real-Data Validation](#real-data-validation-not-just-a-fixture-we-wrote-ourselves) |
| **Demo & presentation** | Live deployed link above, a 2-minute copy-paste verification sequence, and the full architecture/algorithm writeup in this file and [docs/DETECTION.md](docs/DETECTION.md) |
| **Completeness** — working deployment, external integration, end-to-end | Deployed on NitroCloud, auto-redeploys on push, verified via both raw protocol calls and the actual chat UI; APIs.guru integration works fully offline once cache-warmed |

## Tests

```bash
npm test          # vitest run — 111 tests across 13 files
npm run typecheck # tsc --noEmit
```

CI (`.github/workflows/ci.yml`) runs both on every push and pull request to `main` — the badge at the top of this file reflects the current state of `main`, not a claim.

`tests/ground-truth.test.ts` is the load-bearing suite: it runs the real detection pipeline against the real fixture data and asserts all six ground-truth properties — every expected finding present at its minimum severity, the two control endpoints get nothing, the export/customers finding is CRITICAL with both rules, every finding has non-empty evidence and a well-formed `evidenceUri`, no finding echoes raw attacker text, and the whole pipeline is deterministic across repeated runs. Every other engine module (`templatise.ts`, `topology.ts`, `spec.ts`, `sanitise.ts`, `artifacts.ts`, `session.ts`, the APIs.guru integration) has its own dedicated test file, plus `tests/surface.integration.test.ts` exercises the real MCP tool layer end to end via NitroStack's `TestingModule`.

## License

[MIT](LICENSE) © 2026 Sai Krishna Bodapati

---

<div align="center">

Built with the [Model Context Protocol](https://modelcontextprotocol.io) on [NitroStack](https://nitrostack.ai)

</div>
