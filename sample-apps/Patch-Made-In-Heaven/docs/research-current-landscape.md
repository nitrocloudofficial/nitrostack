# Current Landscape Research: Patch Made In Heaven

**Research date:** 2026-07-25  
**Source policy:** Primary and official sources only  
**Purpose:** Evidence for the Patch Made In Heaven PRD, especially interoperability, differentiation, retrieval quality, deployment, and verification requirements.

## Executive Summary

Patch Made In Heaven's defensible product wedge is not generic coding-agent memory or automated incident remediation. It is an agent-neutral MCP service for retrieving reusable error-to-patch artifacts with inspectable verification evidence across sessions and repositories.

The strongest requirements implied by the current landscape are:

1. Treat the MCP tool surface as a versioned API with valid input and output schemas.
2. Test local `stdio` and deployed Streamable HTTP separately; do not assume NitroCloud remote interoperability.
3. Evaluate hybrid retrieval with exact-error and paraphrased-symptom queries.
4. Define `verified` narrowly as evidence from a bounded reproducer or test run, not universal correctness.
5. Harden Docker execution explicitly because containers have no resource limits by default and are not a complete security boundary for arbitrary multitenant code.

## 1. Model Context Protocol

### Sourced Facts

- The current MCP specification revision is `2025-11-25`.
- MCP defines two standard transports: local `stdio` and Streamable HTTP.
- Streamable HTTP replaced the older HTTP+SSE transport. A remote server exposes a single MCP endpoint supporting HTTP POST and GET.
- A Streamable HTTP server must validate the `Origin` header. Local servers should bind to `127.0.0.1`, and servers should authenticate connections.

Source: [MCP 2025-11-25 transports](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports)

- The MCP HTTP authorization model requires OAuth 2.1 behavior, RFC 9728 protected-resource metadata, authorization-server discovery, and RFC 8707 resource indicators.
- Servers must validate that access tokens were issued for their resource and must not pass an inbound MCP token through to an upstream API.
- Authorization endpoints require HTTPS in production, and clients must use PKCE where applicable.

Source: [MCP 2025-11-25 authorization](https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization)

- Every tool requires a valid JSON Schema input schema.
- Tools may declare an output schema. If present, the server's structured result must conform to it, and clients should validate it.
- For backward compatibility, structured results should also include serialized text content.
- Clients must treat tool annotations as untrusted unless they trust the server.

Source: [MCP 2025-11-25 tools](https://modelcontextprotocol.io/specification/2025-11-25/server/tools)

- MCP Tasks can represent long-running calls, including tool calls, but Tasks are experimental in the `2025-11-25` specification.

Source: [MCP 2025-11-25 tasks](https://modelcontextprotocol.io/specification/2025-11-25/basic/utilities/tasks)

### PRD Implications (Inference)

- The six Patch Made In Heaven tool names, inputs, and structured result envelopes should be treated as a versioned cross-client API.
- Contract tests should cover tool discovery, schema validity, successful calls, validation failures, and text fallback behavior.
- Local `stdio` acceptance and deployed Streamable HTTP acceptance should be separate release gates.
- Remote acceptance should include origin rejection, unauthenticated rejection, scope enforcement, token audience validation, and successful authorized calls.
- Experimental MCP Tasks should not be a Phase 1 dependency. Their adoption should depend on measured `verify_fix` duration and confirmed client support.

## 2. Elasticsearch Hybrid Retrieval

### Sourced Facts

- Elastic recommends hybrid full-text and vector retrieval using Reciprocal Rank Fusion (RRF).
- The RRF retriever combines independently ranked result sets, such as BM25 and kNN, without requiring raw scores to share a scale.
- Increasing `rank_window_size` can improve relevance at a performance cost.
- The RRF retriever does not support every search feature; current exclusions include scroll, sort, and rescore.

Sources:

- [Elastic hybrid search](https://www.elastic.co/docs/solutions/search/hybrid-search)
- [Elastic RRF reference](https://www.elastic.co/docs/reference/elasticsearch/rest-apis/reciprocal-rank-fusion)

- Increasing kNN `num_candidates` generally improves recall at additional query cost.
- A filter attached directly to the kNN query is a pre-filter. Filters applied elsewhere may be post-filters and can produce fewer than `k` results.

Source: [Elastic kNN query reference](https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-knn-query)

- Elastic recommends explicit mappings for production use cases.
- Changing a field type later requires reindexing.
- Index aliases support an atomic swap to a replacement index, enabling mapping evolution without changing the application query target.

Sources:

- [Elastic index fundamentals](https://www.elastic.co/docs/manage-data/data-store/index-basics)
- [Elastic aliases](https://www.elastic.co/guide/en/elasticsearch/reference/current/aliases.html)

### PRD Implications (Inference)

- Exact error tokens, exception names, stack frames, and command output require lexical retrieval. Paraphrased symptoms and conceptually similar failures require vector retrieval.
- Search evaluation should include both query types and report Recall@k or success@k, MRR, and p50/p95 latency.
- Numeric latency and relevance targets should be set after measuring the selected Elasticsearch deployment and embedding model, not invented from vendor documentation.
- Each physical index generation should record the embedding provider, model identifier, model version, vector dimension, and creation time.
- The service should fail clearly on embedding dimension mismatch instead of silently indexing incompatible vectors.
- The exact Elasticsearch version and subscription used for the hackathon must be proven to support the selected RRF retriever request before the checkpoint is considered complete.

## 3. NitroStack and NitroCloud

### Sourced Facts

- NitroStack presents itself as a TypeScript, decorator-based MCP framework using Zod schemas, with built-in authentication patterns and NitroStudio development tooling.

Sources:

- [NitroStack documentation](https://docs.nitrostack.ai/)
- [NitroStudio overview](https://docs.nitrostack.ai/studio/overview)

- NitroCloud's deployment documentation claims deployment through `nitrostack deploy`, deployment in under 60 seconds, autoscaling, built-in monitoring, automatic SSL, a global CDN, and a free tier.

Source: [NitroStack cloud deployment](https://docs.nitrostack.ai/deployment/cloud)

- NitroStack's public documentation is inconsistent or incomplete about transport behavior:
  - The CLI development command is documented as starting an MCP server over `stdio`.
  - The starter template is described as providing `stdio` plus HTTP.
  - The OAuth guide describes MCP communication over `stdio` and HTTP endpoints for OAuth metadata.
- The reviewed official pages do not define the NitroCloud deployment's MCP protocol revision or prove `2025-11-25` Streamable HTTP behavior.

Sources:

- [NitroStack dev command](https://docs.nitrostack.ai/cli/dev)
- [NitroStack starter template](https://docs.nitrostack.ai/templates/starter)
- [NitroStack OAuth guide](https://docs.nitrostack.ai/sdk/typescript/auth/oauth)

### PRD Implications (Inference)

- NitroCloud claims should be treated as vendor claims, not Patch Made In Heaven service-level objectives.
- A deployed endpoint must pass an end-to-end Streamable HTTP test from a standard MCP client before remote compatibility is claimed.
- The implementation should pin the exact NitroStack SDK and CLI versions used by the repository. Public docs alternate between package and executable names, so commands should be proven against the pinned versions.
- NitroStudio success is useful development evidence but does not replace deployed-client interoperability testing.

## 4. Adjacent Official Offerings

### Sourced Facts

#### GitHub Copilot Memory

- Copilot Memory is currently a public preview.
- Repository facts include citations to supporting code and are revalidated against the current branch before use.
- Repository facts can be reused by authorized users and Copilot features but remain scoped to the same repository.

Source: [GitHub Copilot Memory](https://docs.github.com/en/copilot/concepts/agents/copilot-memory)

#### Sentry Seer

- Sentry Seer combines issue telemetry, including stack traces, traces, logs, and profiles, with code context.
- Its workflow can identify a root cause, propose a solution, generate code changes, and open a pull request.

Sources:

- [Sentry Seer](https://docs.sentry.io/product/ai-in-sentry/seer)
- [Sentry Seer Issue Fix API](https://docs.sentry.io/api/seer/start-seer-issue-fix/)

#### GitHub Coding Agents

- GitHub documents security validation of third-party coding-agent output using CodeQL and secret scanning before a pull request is finalized.

Source: [GitHub third-party coding agents](https://docs.github.com/en/copilot/concepts/agents/about-third-party-coding-agents)

### PRD Implications (Inference)

- Patch Made In Heaven should not position itself as general repository memory. Its stored unit is a reusable problem, error signature, patch, and verification record rather than an uncategorized repository fact.
- It should not claim to replace telemetry-based root-cause analysis or autonomous PR generation.
- Its differentiation is portable retrieval of prior verified fixes across compatible clients, sessions, and repositories through MCP.
- Provenance, execution evidence, and secret scanning are part of the product value, not back-office implementation details.

## 5. Docker Verification and Security

### Sourced Facts

- Docker containers have no CPU or memory limits by default.
- Docker's `none` network driver leaves only the loopback interface and can isolate a container from external networks.
- Docker supplies a default seccomp allowlist and recommends retaining it rather than running unconfined.
- Rootless mode runs the daemon and containers without root privileges to mitigate daemon and runtime vulnerabilities.
- Docker supports read-only root filesystems, Linux capability removal, and `no-new-privileges`.
- Docker warns that privileged containers are not secure sandboxes. It also warns that access to the Docker daemon or socket is highly sensitive.

Sources:

- [Docker resource constraints](https://docs.docker.com/engine/containers/resource_constraints/)
- [Docker none network driver](https://docs.docker.com/engine/network/drivers/none/)
- [Docker seccomp profiles](https://docs.docker.com/engine/security/seccomp/)
- [Docker rootless mode](https://docs.docker.com/engine/security/rootless/)
- [Docker container run reference](https://docs.docker.com/reference/cli/docker/container/run)
- [Docker Engine security](https://docs.docker.com/engine/security/)

### PRD Implications (Inference)

- `verified` should mean that a declared reproducer or test command succeeded inside the supported runner under recorded constraints. It must not mean the patch is universally correct.
- Verification evidence should include the exit status, bounded stdout/stderr, test command, runner image and digest or version, duration, timestamp, and relevant environment metadata.
- Sandbox requirements should include:
  - no external network;
  - non-root execution, with rootless Docker where the host permits it;
  - read-only root filesystem except a disposable work directory;
  - dropped capabilities and `no-new-privileges`;
  - default or stricter seccomp;
  - explicit CPU, memory, PID, wall-time, and output limits;
  - no Docker socket, arbitrary host mount, privileged mode, or host namespace;
  - cleanup on success, failure, and timeout;
  - secret and personally identifiable information redaction before logs or fixes are indexed.
- Docker verification is appropriate for a controlled hackathon corpus, but should be described as risk reduction rather than a sufficient security boundary for arbitrary untrusted multitenant execution.

## 6. Open Questions for the PRD

1. Which exact Codex, Claude, NitroStudio, and other MCP client versions must pass acceptance?
2. Is the hackathon demonstration local over `stdio`, remote over Streamable HTTP, or both?
3. Does the selected NitroCloud deployment expose a standards-compliant Streamable HTTP endpoint, and what authentication modes does it support?
4. Which embedding provider and model are permitted, and what are the cost, privacy, latency, dimension, and re-embedding policies?
5. What exact evidence changes a fix from submitted to verified, and when does verification expire or require rerunning?
6. How are dependencies made available while verification networking remains disabled?
7. Is the corpus public, team-scoped, or mixed, and which scopes govern read, submit, verify, and log access?
8. What provenance and license fields are mandatory before an error, reproducer, or patch can be shared?
9. What concurrency, rate, and queue limits protect the Docker host from verification abuse?
10. What labeled query set and measurable relevance thresholds define search quality for the demo?

## Research Boundary

This memo records current official documentation and product claims as of 2026-07-25. It does not validate live NitroCloud behavior, confirm a specific Elasticsearch subscription entitlement, benchmark Patch Made In Heaven, or establish that any vendor claim is a service-level guarantee. Those items require direct testing in the selected hackathon environment.
