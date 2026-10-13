# Patch Made In Heaven PRD Addendum

This addendum preserves architecture constraints, brownfield facts, reference-project lessons, current research, and delivery mechanics that are necessary for downstream sessions but do not belong in the capability-focused PRD.

## 1. Binding Architecture Decisions

1. **Decision 001:** TypeScript and NitroStack for the MCP Server; NitroCloud is the hosting target.
2. **Decision 002:** Elasticsearch owns indexing and retrieval, combining BM25, dense vectors, and RRF. Do not add a separate vector store.
3. **Decision 003:** A fix must pass Sandbox execution before trusted indexing.
4. **Decision 004:** Kubernetes and decentralized Agent frameworks are excluded.
5. **Decision 005:** Docker is the V1 Sandbox; Modal is deferred.
6. **Decision 006:** Cold start requires 50-80 verified fixes. The approved Phase 1 target is exactly 60.
7. **Decision 007:** No voting, profiles, discussions, Fetch.ai, GPU infrastructure, or Elastic Agent Builder abstraction.

Only a human can accept or supersede a decision in `DECISIONS.md`.

## 2. Brownfield Baseline

The repository is not an empty scaffold, but its current product code is a prototype and does not satisfy the PRD:

- `mcp/src/services/elastic.client.ts` creates `hacksmymachine-fixes`, but `search_fix` and `find_similar` are lexical-only. There is no query embedding, kNN, RRF, or honest search-mode metadata.
- Search does not filter to PASS evidence, ignores package-version constraints, and treats several dependency failures as empty/not-found results.
- `mcp/src/services/sandbox.client.ts` creates a temp directory but interpolates caller input into a host shell. It is not Docker isolation.
- `submit_fix` trusts caller-supplied status, defaults to PASS, can index FAIL, and can report `indexed: true` without Elasticsearch.
- Knowledge Cards do not store real stdout, stderr, exit status, duration, or an immutable verification reference.
- `get_execution_log` synthesizes success text rather than returning stored evidence.
- The current Seed Corpus has four synthetic records with unsupported reuse and verification claims.
- The current dashboard renders three hardcoded records and no real execution log.
- The application exposes a seventh `search_by_error` tool outside the binding six-tool V1 contract.
- The calculator starter module/widgets remain and must not be part of the production tool surface.

Primary brownfield files:

- `mcp/src/services/elastic.client.ts`
- `mcp/src/services/sandbox.client.ts`
- `mcp/src/services/seed.data.ts`
- `mcp/src/tools/search.tool.ts`
- `mcp/src/tools/retrieve.tool.ts`
- `mcp/src/tools/verify.tool.ts`
- `mcp/src/tools/submit.tool.ts`
- `mcp/src/app.module.ts`
- `web/app/page.tsx`

## 3. Reference Lessons from `test/treehacks26`

### Reuse as patterns

- Explicit index creation at application lifecycle boundaries.
- Code-aware lexical analysis for abbreviations and technical tokens.
- Multi-signal retrieval fused through RRF.
- List/detail inspection with readable metadata and code blocks.
- Explicit loading, empty, error, and selected-detail states.
- The narrative sequence: search, inspect, execute, preserve evidence, reuse.

### Do not copy

- `test_sandboxes.py` executes code in a host subprocess and can convert a failure into a fake success.
- The FastAPI/forum/vote/profile architecture conflicts with the accepted product scope.
- Fetch.ai, RunPod, payments, Agent marketplaces, and Elastic Agent Builder are excluded.
- Silent reranker fallback is incompatible with the PRD's honest search states.
- Ignoring frontend type errors or fetch failures is incompatible with checkpoint quality gates.
- Existing-index checks without mapping compatibility validation are insufficient.

## 4. Current Standards and Official Sources

Research was performed on 2026-07-25 using official sources. The full memo is in `research-current-landscape.md`.

### MCP

- MCP transport specification (2025-11-25): local stdio and remote Streamable HTTP. Remote servers must validate Origin; local HTTP binding should avoid exposing all interfaces.
  - https://modelcontextprotocol.io/specification/2025-11-25/basic/transports
- MCP authorization specifies OAuth-related discovery, HTTPS, audience binding, and token-handling requirements for protected remote resources.
  - https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization
- MCP tools use JSON Schema contracts and may declare output schemas; results must conform when declared.
  - https://modelcontextprotocol.io/specification/2025-11-25/server/tools
- MCP Tasks are experimental and are not a V1 dependency.
  - https://modelcontextprotocol.io/specification/2025-11-25/basic/utilities/tasks

### Elasticsearch

- Elastic recommends hybrid search that combines full-text and vector retrieval; RRF combines independently ranked result lists without requiring raw-score normalization.
  - https://www.elastic.co/docs/solutions/search/hybrid-search
  - https://www.elastic.co/docs/reference/elasticsearch/rest-apis/reciprocal-rank-fusion
- kNN candidate counts trade query cost for recall; filter placement affects whether filtering occurs before or after candidate selection.
  - https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-knn-query
- Explicit mappings are appropriate for production; changing incompatible field types requires reindexing. Aliases can support controlled index replacement.
  - https://www.elastic.co/docs/manage-data/data-store/index-basics
  - https://www.elastic.co/guide/en/elasticsearch/reference/current/aliases.html

### NitroStack and NitroCloud

- Official documentation presents a TypeScript/Zod decorator-based MCP framework with Studio tooling.
  - https://docs.nitrostack.ai/
  - https://docs.nitrostack.ai/studio/overview
- NitroCloud documents deployment, HTTPS, scaling, monitoring, and a free tier as vendor capabilities, not product SLAs.
  - https://docs.nitrostack.ai/deployment/cloud
- Public documentation does not clearly prove that the deployed endpoint implements the target MCP Streamable HTTP behavior. Treat this as an acceptance test, not an assumption.

### Adjacent products

- GitHub Copilot Memory stores and revalidates repository-scoped facts with code citations.
  - https://docs.github.com/en/copilot/concepts/agents/copilot-memory
- Sentry Seer uses issue telemetry and code context to propose changes and open pull requests.
  - https://docs.sentry.io/product/ai-in-sentry/seer
- Patch Made In Heaven's defensible distinction is not generic memory or incident automation. It is MCP-portable, environment-aware error-to-patch reuse with inspectable execution evidence.

### Docker

- Docker documents that containers have no resource limits by default and provides controls for network isolation, resource limits, seccomp, rootless operation, capability removal, read-only filesystems, and privilege prevention.
  - https://docs.docker.com/engine/containers/resource_constraints/
  - https://docs.docker.com/engine/network/drivers/none/
  - https://docs.docker.com/engine/security/seccomp/
  - https://docs.docker.com/engine/security/rootless/
  - https://docs.docker.com/reference/cli/docker/container/run
- Docker reduces risk but is not treated as sufficient isolation for arbitrary hostile multi-tenant production workloads.

## 5. Delivery Contract

### Phase order

1. Core memory, hybrid search, verified Seed Corpus
2. NitroStack MCP contract completion
3. public verification/submission trust chain
4. NitroStudio and target-client validation
5. deployment, live Inspector Dashboard, and demo readiness

### Phase 1 checkpoints

Phase 1 uses `Implementation_Plans/PHASE_01_CHECKPOINTS.md`:

1. Toolchain, CI, configuration, and domain contract
2. Embedding client
3. Elasticsearch index lifecycle
4. Hybrid retrieval
5. locked-down Docker execution primitive
6. Python Seed Corpus
7. Node.js/TypeScript Seed Corpus
8. Docker Seed Corpus
9. general corpus and idempotent seeding
10. retrieval evaluation and phase closure

Every checkpoint:

- runs focused and prior fast checks;
- produces logical Conventional Commits;
- stops before push;
- requires a single-use confirmation to push only to `origin/feat/phase-01-core-search`;
- does not authorize merge, deployment, history rewriting, or the next push.

## 6. Technical Design Questions for Downstream Architecture

1. Exact OpenAI-compatible embedding provider, model, dimension, batching, cost, timeout, and re-embedding policy.
2. Versioned index versus fixed index plus alias, including non-destructive mapping migration.
3. Exact server-owned Verification Evidence token/reference format and replay prevention.
4. Runtime-image allowlist and how offline dependencies enter a Sandbox.
5. Docker availability in NitroCloud and the boundary for a separately hosted verifier if unavailable.
6. Standard remote MCP transport and authentication behavior at the pinned NitroStack/NitroCloud versions.
7. Client identity, authorization scopes, concurrency, and rate limiting for read, write, and execute.
8. Patch/log secret detection, provenance, licensing, retention, and deletion policy.
9. Search evaluation dataset ownership, measurement repeatability, Recall@k/MRR reporting, and latency instrumentation.

These questions must be answered in architecture or the applicable phase plan. They do not authorize implementation outside the active checkpoint.

