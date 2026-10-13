---
title: Patch Made In Heaven Product Requirements
status: final
created: 2026-07-25
updated: 2026-07-25
---

# PRD: Patch Made In Heaven

## 0. Document Purpose

This PRD is the product contract for Patch Made In Heaven across human contributors, Codex sessions, Claude sessions, architecture work, implementation plans, stories, testing, and hackathon review. It defines required behavior and measurable outcomes, not detailed implementation. Technical decisions and brownfield context are preserved in `addendum.md`.

Source precedence is:

1. `PROJECT.md` and Accepted entries in `DECISIONS.md`
2. This PRD
3. `PHASES.md` and approved `Implementation_Plans/`
4. `HAcksMyMachine_Hackathon_Plan.md` and `test/treehacks26` as non-binding inspiration

When sources conflict, downstream sessions must follow the higher-precedence source and record the conflict rather than silently choosing.

This PRD narrows acceptable behavior through compatible additions to the existing six-tool `PROJECT.md` contract; Section 6 is normative within that boundary. Any proposal for an incompatible change to a tool name or required `PROJECT.md` input field requires updating `PROJECT.md` through the governance process before implementation.

## 1. Vision

AI coding agents repeatedly consume tokens and compute resources and spend developer time solving failures that another agent has already solved. Existing answers and agent memories may be useful, but they rarely prove that a proposed fix executed successfully in a matching environment.

Patch Made In Heaven is a shared, execution-verified memory layer for AI coding agents. An Agent searches before reasoning. On a Cache Hit, it receives an environment-compatible Verified Fix with its patch and Verification Evidence. On a Cache Miss, the Agent solves the problem, Patch Made In Heaven executes the Candidate Fix in an isolated Sandbox, and only a successful Verification Run can become a reusable Knowledge Card.

The product thesis is narrow: portable, inspectable, Verified Fixes reduce redundant debugging better than another unverified answer feed. The winning demo is the complete trust loop working across two different MCP Clients, not a long list of loosely connected features.

### 1.1 Why Now

MCP gives coding tools a shared protocol for discovering and calling external capabilities. Elasticsearch can combine exact error-token retrieval with semantic similarity. Together they make a client-neutral shared memory layer practical without requiring a custom plugin for each coding environment.

Adjacent products increasingly store repository facts or automate issue-to-code workflows. Patch Made In Heaven does not replace them. Its wedge is cross-session and cross-client reuse of error-to-patch artifacts whose execution evidence is part of the stored product object.

## 2. Target User

### 2.1 Primary Users

- **Machine user:** An MCP-compatible Agent operating through Cursor, Claude Desktop, VS Code, OpenHands, or another standards-compatible MCP Client.
- **Human user:** A developer who expects their Agent to resolve dependency, runtime, framework, build, and container failures quickly and transparently.

Cursor and Claude Desktop are the required cross-client demo surfaces; NitroStudio is the local inspection surface.

### 2.2 Secondary Users

- An engineering team seeking to reduce repeated agent reasoning and debugging time.
- A project operator or hackathon judge inspecting Knowledge Cards, patches, Verification Evidence, and system readiness.

### 2.3 Jobs To Be Done

- Find a trustworthy patch for a known error before spending tokens solving it again.
- Find related fixes when the same failure is described differently.
- Avoid applying a fix verified for the wrong language, framework, runtime, or package environment.
- Verify a newly discovered fix before sharing it.
- Inspect the exact patch and execution result before trusting or applying it.
- Make a fix created in one MCP Client immediately reusable by another.
- Distinguish a genuine Cache Miss from degraded search or infrastructure failure.

### 2.4 Non-Users in V1

- People seeking a public programming forum or discussion community.
- Users seeking profiles, reputation, voting, or social discovery.
- Teams seeking a full incident-management, observability, or automated pull-request platform.
- Users requiring arbitrary untrusted multi-tenant code execution at production scale.

### 2.5 Key User Journeys

#### UJ-1. Maya retrieves a known Verified Fix before her Agent reasons

- **Persona + context:** Maya is a backend developer using Cursor on a FastAPI project with a Pydantic version error.
- **Entry state:** Cursor is configured with the Patch Made In Heaven MCP Server and has the error plus Environment Fingerprint.
- **Path:** Maya asks Cursor to resolve the error. The Agent discovers `search_fix`, sends the stack trace and environment, and receives ranked Verified Fixes. It inspects the top Knowledge Card and requests the raw patch or Verification Evidence when needed.
- **Climax:** The matching patch is returned in less than one second with PASS evidence and an environment match, before the Agent performs independent debugging.
- **Resolution:** The Agent may apply the patch in Maya's repository. Patch Made In Heaven records reuse but never edits Maya's files itself.
- **Edge case:** If semantic retrieval is unavailable, the result explicitly says it used Lexical Fallback. If Elasticsearch is unavailable, the result is an infrastructure error, not a Cache Miss.

#### UJ-2. Arjun turns a Cache Miss into reusable memory

- **Persona + context:** Arjun is a TypeScript developer using Claude Desktop when his Agent encounters a failure absent from the Seed Corpus.
- **Entry state:** `search_fix` returned an explicit Cache Miss while the MCP Server remained healthy.
- **Path:** The Agent reasons about the failure and produces a Candidate Fix plus a reproducible Verification Command. It calls `verify_fix`. Patch Made In Heaven runs the candidate in a Sandbox and creates immutable Verification Evidence. The Agent then calls `submit_fix` with the problem, patch, Environment Fingerprint, and server-owned verification reference.
- **Climax:** A passing Verification Run creates a trusted Knowledge Card; a failed run creates no trusted card.
- **Resolution:** The new Knowledge Card becomes searchable and visible in the Inspector Dashboard.
- **Edge case:** A caller-provided PASS string or edited log cannot substitute for server-owned Verification Evidence.

#### UJ-3. Lina reuses Arjun's fix from a different MCP Client

- **Persona + context:** Lina uses Cursor in a separate session after Arjun completed UJ-2 in Claude Desktop.
- **Entry state:** Her Agent encounters the same underlying failure with a compatible Environment Fingerprint.
- **Path:** The Agent calls `search_fix`, receives Arjun's Knowledge Card, and inspects its patch and Verification Evidence.
- **Climax:** The new Verified Fix is available without restarting, reseeding, or sharing conversation history between clients.
- **Resolution:** Lina's Agent can apply the patch, and Patch Made In Heaven increments Reuse Count for the retrieval event without claiming that the patch was applied successfully.

#### UJ-4. Priya audits the demo through the Inspector Dashboard

- **Persona + context:** Priya is a hackathon judge evaluating whether the trust claim is real.
- **Entry state:** The live dashboard is open while UJ-1 through UJ-3 are demonstrated.
- **Path:** Priya browses live Knowledge Cards, selects the newly created card, compares its Environment Fingerprint, reads the unified diff, and inspects stdout, stderr, exit status, Sandbox identity, and verification time.
- **Climax:** The dashboard shows the same stored evidence returned by MCP, not a hardcoded or synthesized success state.
- **Resolution:** Priya can connect the product claim to observable execution evidence.

## 3. Glossary

- **Agent** - An AI coding system that calls Patch Made In Heaven through an MCP Client.
- **Cache Hit** - A search outcome containing at least one eligible Verified Fix.
- **Cache Miss** - A successful search with no eligible Verified Fix. It is not an infrastructure failure.
- **Candidate Fix** - A proposed solution that has not yet completed a successful Verification Run.
- **Environment Fingerprint** - Allowlisted language, runtime, framework, operating-system, and package-version metadata used to judge fix compatibility. It never contains arbitrary environment-variable values.
- **Inspector Dashboard** - The read-only web surface for browsing live Knowledge Cards and Verification Evidence.
- **Knowledge Card** - The stored product object containing a problem, Environment Fingerprint, patch, Verification Evidence, provenance, and real reuse metrics.
- **Lexical Fallback** - A clearly labelled search mode that uses keyword retrieval because semantic retrieval is unavailable.
- **MCP Client** - A standards-compatible application that connects to the MCP Server, such as Cursor or Claude Desktop.
- **MCP Server** - The Patch Made In Heaven server that exposes the six V1 tools.
- **Retrieval Confidence** - Ranking metadata derived from actual search signals. It is not Verification Status and never overrides eligibility.
- **Reuse Count** - The number of times a Knowledge Card was returned or explicitly retrieved. It does not prove that a caller applied the patch or resolved the failure.
- **Sandbox** - The constrained Docker execution environment used for a Verification Run.
- **Seed Corpus** - The initial collection of reproducibly verified Knowledge Cards available before live usage.
- **Verification Command** - The bounded command used to reproduce the expected behavior inside a Sandbox.
- **Verification Evidence** - Immutable stdout, stderr, exit status, duration, Sandbox identity, runtime image/version, and timestamp produced by Patch Made In Heaven.
- **Verification Run** - One Sandbox execution of a Candidate Fix and Verification Command.
- **Verification Status** - The factual outcome of a Verification Run: PASS, FAIL, or TIMEOUT. It is not a probability or ranking score.
- **Verified Fix** - A Candidate Fix whose successful Verification Run is linked to its Knowledge Card.
- **V1 / MVP** - The same hackathon product scope defined in Section 8. V2 features are outside both.

## 4. Product Principles

1. **Execution evidence over popularity.** A vote, assertion, or convincing explanation never creates a Verified Fix.
2. **Environment compatibility over generic relevance.** Search quality includes whether a patch was verified in a compatible environment.
3. **Honest states over demo theater.** Cache Miss, Lexical Fallback, timeout, dependency failure, and PASS are distinct observable outcomes.
4. **MCP interoperability over proprietary clients.** Standard tool contracts are the product boundary.
5. **A narrow complete loop over feature count.** Search, miss, verify, store, inspect, and cross-client reuse must work before adjacent features.
6. **The caller applies patches.** Patch Made In Heaven retrieves and verifies patches; it does not modify the caller's repository. [ASSUMPTION: The calling Agent, not Patch Made In Heaven, applies a returned patch to a repository.]

## 5. Features

### 5.1 MCP-Native Access

**Description:** An MCP Client can discover and call the complete V1 product surface without a Patch Made In Heaven-specific plugin. Realizes UJ-1, UJ-2, and UJ-3.

#### FR-1: Discover the six V1 tools

An MCP Client can connect to the MCP Server and discover exactly `search_fix`, `find_similar`, `verify_fix`, `submit_fix`, `get_patch`, and `get_execution_log`.

**Consequences (testable):**

- Tool discovery from the target Cursor and Claude Desktop versions returns all six names.
- `search_by_error`, `find_by_error`, and `list_related_fixes` are not part of the public V1 surface.
- No calculator starter tool is exposed by the production application.

#### FR-2: Enforce versioned tool contracts

The MCP Server validates every tool input and returns a structured result that conforms to its declared output contract.

**Consequences (testable):**

- Invalid inputs return an actionable validation error and perform no persistence or execution.
- Structured output distinguishes success, Cache Miss, Lexical Fallback, dependency failure, validation failure, timeout, Verification Run failure, and not-found.
- A serialized text representation is available for MCP Clients that do not consume structured content.
- Contract tests detect accidental breaking changes to tool names, inputs, or outputs.

### 5.2 Verified Fix Discovery

**Description:** An Agent searches trusted memory using both exact technical text and semantic meaning while preserving environment constraints. Realizes UJ-1 and UJ-3.

#### FR-3: Search by stack trace and environment

An Agent can call `search_fix` with a stack trace and language plus optional runtime version, framework, package versions, OS family, and architecture to receive ranked eligible Knowledge Cards.

**Consequences (testable):**

- Eligible results have a linked successful Verification Run.
- Exact language matching is mandatory.
- Framework and package-version constraints influence eligibility when supplied.
- Exact error tokens and stack frames contribute to ranking.
- Results identify their search mode and environment-match details.

**V1 Environment Eligibility Rules:**

| Environment field | Query rule | Card rule | Eligibility outcome |
|---|---|---|---|
| Language | Required; lowercase and trim whitespace | Required; normalize identically | Exact match is required; mismatch or missing value excludes |
| Runtime version | Optional | Required for version-specific fixes | When supplied by the query, exact normalized version is required; missing or mismatch excludes |
| Framework name | Optional; lowercase and trim whitespace | Optional | When supplied by the query, exact normalized name is required; missing or mismatch excludes |
| Framework version | Supplied through package versions when known | Optional | When supplied by the query, exact normalized version is required; missing or mismatch excludes |
| Package versions | Optional map, maximum 100 entries | Optional map | Every query-supplied package must exist on the card with the exact normalized version; any missing or conflicting entry excludes |
| OS family/architecture | Optional | Optional | When supplied by the query, exact normalized family and architecture are required; missing or mismatch excludes |
| Query-omitted optional field | Not supplied | Any value | Does not exclude; response marks the field `unspecified` rather than claiming a match |

V1 does not infer semantic-version compatibility ranges. A later version may add explicit ranges only through a versioned contract change and a labelled evaluation.

#### FR-4: Find semantically similar fixes

An Agent can call `find_similar` with a natural-language problem description and limit to retrieve Verified Fixes that express the same problem differently.

**Consequences (testable):**

- A labelled paraphrase benchmark retrieves relevant cards without requiring shared exact wording.
- `find_similar` never claims semantic behavior when only keyword retrieval occurred.
- The requested limit is bounded and respected.
- Because the binding V1 input has no Environment Fingerprint, `find_similar` is exploratory discovery. Its results have `applicationEligible: false`; an Agent must call `search_fix` with environment data before treating a related card as eligible.

#### FR-5: Fuse lexical and semantic relevance

The MCP Server combines lexical and dense-vector result sets into one ranked response in normal operation.

**Consequences (testable):**

- Both lexical and vector candidates contribute to the final ranking.
- Search-quality evaluation measures exact errors, paraphrases, abbreviations, environment mismatches, and unknown errors.
- Changing one signal's raw score range does not silently dominate the other signal.

#### FR-6: Return honest search states

An Agent can distinguish a Cache Hit, Cache Miss, Lexical Fallback, and search dependency failure.

**Consequences (testable):**

- A Cache Miss returns promptly with zero fixes and a healthy-search state.
- Missing Elasticsearch configuration or an Elasticsearch error is never returned as a Cache Miss.
- Missing semantic capability produces a labelled Lexical Fallback or explicit dependency failure according to configured policy.
- Responses do not expose credentials or provider error bodies containing secrets.

#### FR-7: Retrieve the source artifact and evidence

An Agent can call `get_patch` or `get_execution_log` for a Knowledge Card.

**Consequences (testable):**

- `get_patch` returns the stored unified diff without synthesis.
- `get_execution_log` returns stored Verification Evidence without rewriting a failed or missing run as success.
- Unknown IDs return not-found; dependency failures remain distinct.

### 5.3 Verification and Trusted Submission

**Description:** A Candidate Fix becomes shared memory only through a successful, server-owned Verification Run. Realizes UJ-2.

#### FR-8: Execute a Candidate Fix in a Sandbox

An Agent can call `verify_fix` with post-fix candidate source, a Verification Command, and an Environment Fingerprint. It may also supply optional baseline source and file path.

**Consequences (testable):**

- The command runs inside the Sandbox, never in a host shell.
- The Verification Run produces bounded stdout, stderr, exit status, duration, Sandbox identity, runtime image/version, and timestamp.
- Timeout, resource exhaustion, runtime mismatch, and command failure produce non-PASS outcomes.
- The Sandbox receives no platform secrets and no arbitrary host or Docker-socket access.
- The server derives the canonical unified diff from baseline source to post-fix candidate source and stores its SHA-256 digest with the Verification Run.
- When baseline source is omitted, V1 uses an empty baseline and returns a full-file addition diff. `submit_fix` must submit exactly the diff returned by `verify_fix`.

#### FR-9: Create server-owned Verification Evidence

Patch Made In Heaven creates an immutable verification reference only from an actual Verification Run.

**Consequences (testable):**

- Callers cannot set verification status, score, log, timestamp, or Sandbox identity.
- Verification Evidence is linked to the exact candidate content, canonical patch digest, Verification Command, and Environment Fingerprint used in the Verification Run.
- Evidence reuse is rejected if the candidate content, canonically normalized patch bytes, Verification Command, or Environment Fingerprint differs from the original Verification Run.

#### FR-10: Publish only a Verified Fix

An Agent can call `submit_fix` with the `PROJECT.md` fields: problem description, error log, patch, verification log, and Environment Fingerprint. The server matches the supplied verification log to its stored Verification Run and never trusts the supplied log by itself.

**Consequences (testable):**

- A matching successful Verification Run whose canonical patch digest equals the digest of the submitted patch creates or updates one Knowledge Card.
- Failed, expired, missing, mismatched, replayed-for-different-content, or caller-authored evidence cannot create a trusted Knowledge Card.
- The result reports whether persistence actually succeeded.
- Persistence failure never returns `indexed: true`.

#### FR-11: Reject failed candidates without poisoning trusted search

A failed Verification Run remains inspectable for the immediate caller but is never eligible for trusted retrieval.

**Consequences (testable):**

- Search returns no failed candidate.
- A failed submission attempt does not alter an existing Verified Fix.
- There is no forced-success or status-override path.

#### FR-12: Make a new Verified Fix immediately reusable

A successfully stored Knowledge Card becomes searchable by another MCP Client without manual reseeding or application restart.

**Consequences (testable):**

- UJ-2 followed by UJ-3 succeeds across Claude Desktop and Cursor.
- The Inspector Dashboard and MCP retrieval show the same Knowledge Card ID and Verification Evidence.

### 5.4 Knowledge Store and Cold Start

**Description:** Elasticsearch stores structured, auditable Knowledge Cards and begins the demo with useful verified coverage.

#### FR-13: Store a complete Knowledge Card

Every Knowledge Card conforms to one runtime-validated contract.

**Consequences (testable):**

- Required fields cover problem/error data, Environment Fingerprint, unified diff, Verification Evidence, provenance, embedding metadata, and real reuse metrics.
- A card missing successful Verification Evidence cannot enter trusted state.
- The stored embedding model/version/dimension can be identified for later reindexing.
- Invalid timestamps, scores, diffs, IDs, or non-finite vectors are rejected.
- V1 does not automatically expire a Verified Fix. Every response exposes `lastVerified`, and automatic confidence decay/re-verification remains V2.

#### FR-14: Provide the 60-card Seed Corpus

The MVP contains exactly 60 non-duplicate, reproducibly verified seed cards: 20 Python, 15 Node.js/TypeScript, 15 Docker, and 10 general dependency/environment fixes.

**Consequences (testable):**

- Every seed demonstrates failing-before and passing-after behavior.
- The Pydantic/FastAPI cache-hit demo reliably retrieves a matching Verified Fix.
- A seed that fails re-verification cannot be indexed as trusted.

#### FR-15: Seed and measure honestly

Seed ingestion and runtime metrics reflect real state.

**Consequences (testable):**

- Stable seed IDs make repeated ingestion idempotent.
- Two seed runs leave 60 cards rather than duplicating them.
- Seed ingestion reports created, updated, rejected, and failed counts.
- Reuse Count derives from real retrieval events and does not begin as invented popularity.
- Provenance identifies a seed card without implying community reuse.

### 5.5 Inspector Dashboard

**Description:** A human can inspect the live trust artifacts without turning the product into a social platform. Realizes UJ-4.

#### FR-16: Browse live Knowledge Cards

A dashboard user can browse Knowledge Cards from the live store and identify problem, error type, Environment Fingerprint, verification status, and real reuse count.

**Consequences (testable):**

- The list does not use hardcoded sample cards in production.
- Loading, empty, dependency-error, and populated states are visually distinct.
- A newly stored card can appear without rebuilding the dashboard.

#### FR-17: Inspect patch and Verification Evidence

A dashboard user can select a Knowledge Card and inspect its unified diff and full Verification Evidence.

**Consequences (testable):**

- The selected detail uses the same stored artifact returned through MCP.
- Long patches and logs remain readable without breaking the layout.
- FAIL evidence is never presented as a trusted Knowledge Card.

#### FR-18: Keep the dashboard read-only

The Inspector Dashboard cannot vote, discuss, edit, approve, or manually mark a Candidate Fix as verified.

**Consequences (testable):**

- No dashboard action can mutate verification status.
- No profile, reputation, forum, or discussion surface exists in V1.

### 5.6 Operations, Deployment, and Demo Readiness

**Description:** Operators and judges can tell whether the system is genuinely ready, and target MCP Clients can complete the full demo.

#### FR-19: Expose system capability health

An operator can determine whether MCP transport, Elasticsearch, semantic retrieval, and Sandbox verification are ready.

**Consequences (testable):**

- Health output distinguishes configured, reachable, degraded, and unavailable capabilities.
- Health output contains no credentials.
- Search and verification errors include a request/correlation identifier usable in server logs.

#### FR-20: Support local and remote MCP use

The MCP Server supports local development through stdio and an authenticated standards-compatible remote endpoint for the deployed demo.

All remote MCP operations require authentication. Authorization distinguishes read capabilities from write and execution capabilities, and write and execution access always have abuse controls.

**Consequences (testable):**

- NitroStudio can exercise the local tool contracts.
- Target Cursor and Claude Desktop versions can connect to the deployed endpoint.
- No remote capability is anonymously accessible.
- HTTPS and transport-origin protections are verified on the deployed endpoint.

#### FR-21: Complete the canonical demo without hidden setup

The product can demonstrate Cache Hit, Cache Miss, Verification Run, trusted storage, dashboard inspection, and cross-client reuse as one repeatable sequence.

**Consequences (testable):**

- The complete sequence succeeds three times before judging.
- No database record, log, or status is manually changed at any step to manufacture success.
- A fallback recording or local demo path is documented for an external platform outage, but the fallback is labelled and never presented as a live success.

## 6. Public API Contract

The public contract version is `hm.v1`. Every tool result contains:

- `contractVersion: "hm.v1"`
- `requestId: string`
- `ok: boolean`
- a tool-specific `status` discriminant
- `warnings: string[]`
- either tool-specific data or `error: { code: string; message: string; retryable: boolean }`

The same object is returned as structured content and as a serialized text representation for compatibility. Error messages are actionable but contain no secrets or raw provider response bodies.

### 6.1 Normative V1 Tool Shapes

| Tool | Required input fields | Optional input fields | Success data and status |
|---|---|---|---|
| `search_fix` | `stacktrace: string`, `language: string` | `runtimeVersion: string`, `framework: string`, `packageVersions: Record<string,string>`, `osFamily: string`, `architecture: string`, `limit: integer` | `status: HIT or MISS or DEGRADED`, `searchMode: hybrid_rrf or lexical_fallback`, `fixes: EligibleFixSummary[]` |
| `find_similar` | `query: string` | `limit: integer` | `status: HIT or MISS or DEGRADED`, `searchMode`, `applicationEligible: false`, `fixes: RelatedFixSummary[]` |
| `verify_fix` | `code: string`, `testCommand: string`, `environment: EnvironmentFingerprint` | `baselineCode: string`, `filePath: string` | `status: PASS or FAIL or TIMEOUT`, `verificationRunId`, canonical `diff`, `executionLog`, and complete Verification Evidence |
| `submit_fix` | `problemDescription: string`, `errorLog: string`, `patch: string`, `verificationLog: string`, `environment: EnvironmentFingerprint` | None in V1 | `status: STORED or REJECTED`, `knowledgeCardId`, `indexed: boolean`; STORED requires a matching server-owned Verification Run and patch digest |
| `get_patch` | `knowledgeCardId: string` | None | `status: OK or NOT_FOUND`, `unifiedDiff` when OK |
| `get_execution_log` | `knowledgeCardId: string` | None | `status: OK or NOT_FOUND`, complete stored Verification Evidence when OK |

Dependency and validation failures use `ok: false` with status `DEPENDENCY_UNAVAILABLE` or `INVALID_INPUT`. `MISS`, `DEGRADED`, `FAIL`, `TIMEOUT`, `REJECTED`, and `NOT_FOUND` are expected product outcomes and are never relabelled as successful equivalents.

### 6.2 Shared Data Projections

`EnvironmentFingerprint` contains:

- `language: string`
- optional `runtimeVersion: string`
- optional `framework: string`
- optional `packageVersions: Record<string,string>`
- optional `osFamily: string`
- optional `architecture: string`

`EligibleFixSummary` contains Knowledge Card ID, problem, error type, Environment Fingerprint, unified diff, Verification Status, verified timestamp, Retrieval Confidence, environment-match details, Reuse Count, and provenance. It is eligible only under the FR-3 table.

`RelatedFixSummary` contains the same descriptive and evidence metadata but is always marked `applicationEligible: false` until the caller performs `search_fix` with an Environment Fingerprint.

Verification Evidence contains Verification Run ID, Verification Status, canonical patch SHA-256, bounded stdout, bounded stderr, exit status, duration, Sandbox identity, runtime image/version, and timestamp.

### 6.3 Versioning Policy

- Compatible additions may add optional fields or new warning/error codes without changing `hm.v1`.
- Removing or renaming a tool, changing a required input, weakening trust semantics, or changing an existing field's type requires a new contract version and migration note.
- Contract schemas live in one version-controlled runtime-validation module and drive tool registration plus contract tests.
- Experimental MCP Tasks are not required for V1.

## 7. Non-Goals

- No voting, reputation, public discussion, social feed, or user profiles.
- No Fetch.ai or decentralized Agent discovery.
- No Kubernetes, Helm, ArgoCD, or custom resource definitions.
- No Modal, RunPod, or GPU infrastructure in V1.
- No Elastic Agent Builder abstraction; Elasticsearch is used directly.
- No automatic patch application or repository write access.
- No general-purpose code execution service.
- No promise that a Verified Fix is universally correct outside its recorded Environment Fingerprint.
- No fabricated verification, confidence, reuse, latency, or success data.
- No GitHub/Stack Overflow ingestion, organization-private instances, Agent SDK, or confidence-decay system in MVP.

## 8. MVP Scope

### 8.1 In Scope

- NitroStack TypeScript MCP Server.
- Exactly six V1 tools and their versioned contracts.
- Elasticsearch lexical plus dense-vector retrieval with RRF.
- Exact environment constraints and PASS-only trusted search.
- Locked-down Docker Verification Runs.
- Server-owned verification-to-submission trust chain.
- Sixty-card reproducibly verified Seed Corpus.
- Read-only live Inspector Dashboard.
- Local NitroStudio verification.
- Claude Desktop and Cursor acceptance.
- NitroCloud deployment when required transport and security capabilities are proven.
- Repeatable UJ-1 through UJ-4 demo.

[ASSUMPTION: English is the only required dashboard and tool-description language for the hackathon MVP.]

### 8.2 Out of Scope for MVP

- V2 tools such as `find_by_error` or `list_related_fixes`.
- Community and identity features.
- Multi-agent orchestration frameworks.
- Production-grade arbitrary multi-tenant execution.
- Automated dependency acquisition from an unrestricted network during Verification Runs.
- Enterprise tenancy, SSO, billing, retention controls, and regional data residency.
- Automated re-verification and confidence decay.

## 9. Cross-Cutting Non-Functional Requirements

### NFR-1: Retrieval Performance

- A warmed Cache Hit on the target demo deployment has p95 end-to-end `search_fix` latency below 1 second.
- A Cache Miss returns without waiting for Agent reasoning.
- Measurements include network, embedding, and Elasticsearch time and identify the test environment.

### NFR-2: Retrieval Quality

- The labelled Phase 1 evaluation achieves at least 80% hit@1 and 90% hit@3 overall.
- `search_fix` gives wrong-language and unverified cards 0% eligibility. `find_similar` remains exploratory under FR-4.
- Exact-error and paraphrase subsets are reported separately so one cannot hide the other's regression.
- Evaluation protocol `search-eval-v1` contains at least 40 labelled queries: at least 10 exact errors, 10 paraphrases, 10 environment conflicts, and 10 expected misses.
- Latency is measured after five warm-up queries, with three recorded repetitions per query at concurrency one. The report records corpus version, embedding model/version, Elasticsearch version/tier, server commit, hardware/deployment, p50, and p95.

### NFR-3: Sandbox Isolation

- The MVP profile defaults to a 10-second wall timeout and never exceeds 30 seconds per public Verification Run.
- A public Verification Run is limited to 1 CPU, 512 MiB memory, 64 processes, 64 MiB ephemeral writes, and 64 KiB each for captured stdout and stderr.
- Network access is disabled by default.
- The Sandbox is non-privileged, drops unnecessary capabilities, prevents privilege escalation, and has a read-only base filesystem with only bounded ephemeral writes.
- No Docker socket, arbitrary host path, platform secret, or inherited secret environment is available.
- Container and temporary-file cleanup occurs after PASS, FAIL, timeout, and process interruption.

### NFR-4: Data and Secret Safety

- Only allowlisted Environment Fingerprint fields are persisted.
- V1 input limits are: candidate code 256 KiB, patch 256 KiB, stack trace or error log 128 KiB, problem description or semantic query 16 KiB, Verification Command 4 KiB, 100 package entries, and 128 characters per package key or version.
- Search result `limit` defaults to 5 and is constrained to 1-20.
- Stored stdout and stderr use the NFR-3 64 KiB per-stream cap and record whether truncation occurred.
- Known credential patterns are rejected or redacted before persistence and before logging.
- Secret values are loaded from environment configuration and never returned by health, tool, dashboard, or error output.

### NFR-5: Integrity and Auditability

- Verification Evidence is immutable and content-linked.
- Trusted state is derived from real Verification Evidence, never a caller flag.
- Every persistence and verification attempt has a correlation identifier and outcome.
- Knowledge Card, patch, and evidence retrieval agree on identity and status.

### NFR-6: Reliability and Failure Semantics

- Index initialization and seeding are idempotent.
- Existing incompatible mappings are detected and never destructively recreated automatically.
- Bulk item failures, provider failures, and partial results are surfaced.
- No catch-all converts infrastructure failure into not-found, Cache Miss, PASS, or success.

### NFR-7: Interoperability

- Public tool schemas use valid JSON Schema through the framework contract.
- Local stdio and deployed remote transport are tested with real target clients.
- The deployed endpoint satisfies the MCP transport behavior supported by those clients at the pinned versions.

### NFR-8: Observability

- Structured logs cover request ID, tool, duration, outcome, search mode, result count, Verification Run ID, and dependency status.
- Logs never contain credentials, and logged user-controlled content is bounded.
- Operators can diagnose which external dependency caused a degraded or failed request.

### NFR-9: Maintainability

- One runtime-validated Knowledge Card contract is shared across indexing, tools, seeding, tests, and the dashboard data boundary.
- Typecheck, unit tests, integration tests, contract tests, search evaluation, and production build are repeatable commands.
- Dependency versions used for the demo are locked and auditable.

### NFR-10: Dashboard Usability

- The Inspector Dashboard is responsive across common mobile and desktop widths.
- Keyboard users can select and inspect a Knowledge Card.
- Status is communicated with text as well as color.
- Code and logs can be read and copied without overlapping or truncating critical content.

## 10. Constraints and Guardrails

### 10.1 Binding Technology Constraints

- MCP framework and language: NitroStack with TypeScript and Zod.
- Hosting target: NitroCloud.
- Search and storage: raw Elasticsearch with lexical and dense-vector retrieval plus RRF.
- Verification runtime: Docker, not Modal.
- Dashboard: Next.js, React, and Tailwind CSS.

### 10.2 Safety Guardrails

- No host-shell execution of a caller-controlled Verification Command.
- No manual or caller-controlled promotion into trusted state.
- No autonomous destructive index migration.
- No weakening a test, security control, or CI gate to produce a passing checkpoint.

### 10.3 Delivery Guardrails

- Delivery follows `PHASES.md` one phase at a time.
- Phase execution and push gates follow the active approved `Implementation_Plans/` file.
- Delivery mechanics, branch policy, and local-governance handling are specified in `addendum.md` and `AGENTS.md`, not redefined here.

### 10.4 Launch Topology and Gates

**Primary Phase 5 topology:** Cursor and Claude Desktop connect through authenticated remote MCP transport to the NitroCloud MCP Server. The MCP Server uses Elasticsearch and reaches a Docker-capable verification boundary without exposing Docker control to clients. The Inspector Dashboard reads the same Knowledge Cards.

**Minimum trustworthy fallback:** The complete six-tool MCP Server, Docker Sandbox, and Inspector Dashboard run locally while using the target Elasticsearch deployment. Cursor and Claude Desktop connect through local stdio or loopback transport. This fallback can be used for judging only when labelled "local demo"; it satisfies the trust-loop demo but does not satisfy NitroCloud deployment completion.

**Capability deadline:** Before Phase 3 plan approval, architecture must prove that NitroCloud can either run or securely reach the Docker verification boundary and that target clients can use its authenticated remote MCP transport.

**Stop/go rules:**

- If the primary topology is proven, Phase 3 and Phase 5 may target it.
- If remote transport works but Docker verification does not, remote `verify_fix` and `submit_fix` remain disabled; the team may continue with the local fallback but cannot claim live deployment completion.
- If authenticated remote transport is not proven, no public NitroCloud endpoint is accepted and the demo remains local.
- Host-shell execution, anonymous remote execution, or fabricated Verification Evidence is never an approved fallback.

## 11. Success Metrics

### Primary

- **SM-1: Known-fix speed** - p95 warmed `search_fix` Cache Hit below 1 second on the target demo deployment. Validates FR-3, FR-5, FR-6 and NFR-1.
- **SM-2: Trust integrity** - 100% of trusted Knowledge Cards have content-linked successful Verification Evidence; 0 failed or caller-asserted fixes are eligible. Validates FR-8 through FR-11 and NFR-5.
- **SM-3: Cross-client reuse** - a fix verified and stored from Claude Desktop is retrievable from Cursor without manual synchronization in the staged test, and vice versa. Validates FR-1, FR-12, FR-20, and FR-21.
- **SM-4: Retrieval quality** - at least 80% hit@1, 90% hit@3, and 100% wrong-language/unverified exclusion on the labelled evaluation set. Validates FR-3 through FR-6 and NFR-2.

### Secondary

- **SM-5: Cold-start readiness** - exactly 60 non-duplicate seed cards pass failing-before/passing-after verification and idempotent ingestion. Validates FR-14 and FR-15.
- **SM-6: Evidence parity** - 100% of sampled dashboard cards show the same patch and Verification Evidence as MCP retrieval. Validates FR-7, FR-16, and FR-17.
- **SM-7: Demo repeatability** - the canonical UJ-1 through UJ-4 sequence succeeds three consecutive times before judging without manual state manipulation. Validates FR-21.
- **SM-8: Contract compatibility** - the six tools are discovered and exercised successfully from pinned target versions of Cursor, Claude Desktop, and NitroStudio. Validates FR-1, FR-2, and FR-20.
- **SM-9: Reduced repeated reasoning** - on a paired benchmark of at least 10 known Seed Corpus failures using the same Agent/model settings, Patch Made In Heaven reduces median time to an actionable patch by at least 50% versus independent Agent reasoning. Report model-token usage when the client exposes it. Validates the Vision, FR-3, and SM-1.

### Counter-Metrics

- **SM-C1: Card count is not success** - do not increase corpus size by accepting unverifiable, duplicate, low-value, or fabricated cards. Counterbalances SM-5.
- **SM-C2: Reuse count is not trust** - popularity never overrides environment mismatch or missing Verification Evidence. Counterbalances any future reuse optimization.
- **SM-C3: Demo smoothness is not truth** - never suppress, relabel, or force a failure into PASS to protect the demonstration. Counterbalances SM-7.
- **SM-C4: Fast response is not correct retrieval** - latency improvement cannot reduce NFR-2 quality or trust filters. Counterbalances SM-1.
- **SM-C5: Benchmark design is not optimization** - use identical prompts, model/client versions, environment, and failure cases for both SM-9 arms; do not select only cases where retrieval wins. Counterbalances SM-9.

## 12. Risks and Mitigations

| Risk | Product impact | Mitigation / release condition |
|---|---|---|
| Docker is unavailable inside NitroCloud | Live `verify_fix` cannot satisfy the core trust loop | Prove capability before Phase 3/5 acceptance; if unavailable, require a separately approved verifier architecture rather than host execution |
| NitroCloud remote transport or authentication is incompatible with target MCP Clients | Clients cannot connect to the live server | Pin versions and run real Streamable HTTP/client acceptance before declaring deployment complete |
| Embedding provider/model/dimension changes | Index incompatibility or degraded retrieval | Record provider/model/version/dimension, validate at startup, and require explicit reindexing |
| Elasticsearch RRF/kNN feature or license mismatch | Claimed hybrid retrieval is unavailable | Test the exact target deployment in Phase 1 and label Lexical Fallback honestly |
| Seed fixes look plausible but are not reproducible | Demo and product trust collapse | Require failing-before/passing-after verification for every seed and reject unverifiable cards |
| Logs or stack traces contain secrets | Sensitive data enters shared memory | Bound inputs and redact/reject credentials before persistence and logging |
| Public verification is abused | Resource exhaustion or unsafe workload | Authenticate remote write/execute use and enforce rate/resource limits |
| Environment matching is too weak | A technically relevant but incompatible patch is returned | Require language matching and apply framework and package constraints; evaluate false-positive cases |
| External services fail during judging | Demo sequence breaks | Rehearse local and live paths; use a clearly labelled fallback recording without fabricating live status |
| Multiple coding sessions drift from requirements | Incompatible implementations and rework | Use this PRD, stable IDs, approved checkpoint plans, `HANDOFF.md`, and live Deviation Logs |

## 13. Open Questions

1. **NitroCloud capability proof**
   - **Class:** Phase 3 blocker
   - **Owner:** Architecture / Phase 3 planner
   - **Question:** Can the target NitroCloud deployment provide authenticated remote MCP transport and securely reach a Docker verification boundary?
   - **Resolution condition:** Demonstrate the primary topology in Section 10.4 or formally select the labelled local fallback before Phase 3 approval.
2. **Embedding choice**
   - **Class:** CP2 blocker
   - **Owner:** Phase 1 CP2
   - **Question:** Which provider, model, dimension, cost ceiling, privacy terms, and re-embedding policy are accepted?
   - **Resolution condition:** Record the selection and successful dimension/capability smoke test before creating the first live vector index.
3. **Dependency installation**
   - **Class:** Phase 3 blocker
   - **Owner:** Phase 3 architecture
   - **Question:** Which dependencies may a network-disabled Verification Run use, and how are approved runtime images prepared?
   - **Resolution condition:** Publish the versioned runtime-image/allowlist policy before supporting public submissions.
4. **Remote access mechanism**
   - **Class:** Phase 5 public-release blocker
   - **Owner:** Deployment / security
   - **Question:** Which standard-compatible identity mechanism, rate limits, and read versus write/execute scopes implement FR-20?
   - **Resolution condition:** Pass authenticated target-client tests before sharing a public URL.
5. **Corpus provenance**
   - **Class:** CP6 blocker
   - **Owner:** Phase 1 corpus work
   - **Question:** Which sourcing, licensing, secret-scanning, and attribution rules apply to seed and future patches?
   - **Resolution condition:** Approve a corpus policy before adding the Python Seed Corpus.
6. **Verification retention**
   - **Class:** Phase 3 blocker
   - **Owner:** Product / security
   - **Question:** How long are failed Verification Run logs retained, and which authenticated roles may retrieve them?
   - **Resolution condition:** Record retention and access rules before Phase 3 data modeling is accepted.

## 14. Assumptions Index

- **A-1 from Product Principle 6:** The calling Agent, not Patch Made In Heaven, applies a returned patch to a repository.
- **A-2 from MVP Scope:** English is the only required dashboard and tool-description language for the hackathon MVP.
