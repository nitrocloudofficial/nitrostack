# Verification report

Last updated: 2026-07-26

## Executive verdict

**Demo ready with deployment restrictions.**

The local NitroStack build, credential-free suite, real Gemini classification, file-backed state transitions, and guarded GitHub draft-PR path have been exercised successfully. The public NitroCloud endpoint must still be smoke-tested after every rollout to confirm it serves the same commit and environment configuration. Generated migrations remain subject to repository CI and human review.

## Executed quality gates

| Command | Result | Evidence |
|---|---|---|
| `npm run typecheck` | PASS | Server TypeScript completed with exit code 0 |
| `npm test` | PASS | 17 tests, 0 failures |
| `npm run build` | PASS | NitroStack compiled TypeScript and bundled 6 widget applications/7 widget outputs |
| GitHub Actions `CI` | PASS | Clean Node 20 install, type-check, test, and build on `main` |
| GitHub Actions `Deploy` | PASS | Quality gate followed by Docker build/push to GHCR |

One local build attempt encountered a Windows `EBUSY` lock held by stale development processes. After those project-specific processes were stopped, the same build completed successfully. This was an environment lock, not a source/compiler failure.

## Offline test coverage

The 17-test suite verifies:

- inline contract-pair registration and stable hashes
- semantic diff for required-property removal, type change, response enum widening, and safe optional addition
- direction-aware enum behavior
- prompt-injection resistance
- comment-only false-positive handling
- test-file deterministic tagging
- migration-action repository/path reconciliation
- targeted snapshot refresh restricted to the requested consumer repository
- blocked-release migration-readiness semantics
- release-decision transition and idempotency
- GitHub writes disabled by default
- real-publication adapter behavior with mocked protocol responses
- draft migration PR construction from a pinned commit
- complete impacted-file retrieval and guarded source hashing
- idempotent PR replay and pinned ancestry verification
- repository-scope state changes and idempotent removal

These are unit/integration tests with controlled adapters. They are not presented as proof of the hosted environment.

## End-to-end rehearsal

The exact main build was started through MCP stdio with:

- pinned `risky` snapshot evidence
- `USE_LLM=true`
- Gemini selected
- a 30-second bounded model timeout
- GitHub writes enabled only for `arckrisofficial/apiguard-go-consumer`

Observed result:

| Field | Verified value |
|---|---|
| Assessment | `asm_ebdddb8b-3410-4547-a81c-9416f263352f` |
| Analysis | `COMPLETE` |
| Severity | `HIGH` |
| Classifier | `llm` |
| Model status | `success` |
| Confirmed impacts | 3 |
| Owner assignments | 3 |
| Strict policy | `BLOCK` |
| Human decision | `BLOCKED_PENDING_MIGRATION` |
| Evidence package | `pkg_333af84512d3c858` |

## Real GitHub write verification

The guarded MCP write path created:

- [Draft Go migration PR #1](https://github.com/arckrisofficial/apiguard-go-consumer/pull/1)
- [Published APIGuard assessment comment](https://github.com/arckrisofficial/apiguard-go-consumer/pull/1#issuecomment-5082574255)

Verified properties:

- PR is open and draft
- PR is unmerged
- base branch is `main`
- merge state was reported clean at verification time
- exactly one impacted file was changed
- branch is namespaced under `apiguard/`
- parent is the assessment-pinned commit `1cb53e40d43e4fbd4c15bff45cf7d29aabe88810`
- publication returned a real GitHub comment URL
- no direct write to the default branch occurred

The Go toolchain was not installed in the verification environment, so the generated Go change was not locally compiled. The PR therefore remains a review artifact, not production-ready code.

## Runtime MCP surface

Source and local runtime registration agree on:

- 14 tools
- 6 resources
- 1 prompt
- 6 widget applications
- 2 health checks

The exact list is maintained in the root [README](README.md#mcp-surface) and in [NitroStudio inputs](NITROSTUDIO_INPUT_GUIDE.md).

## Verified safety behavior

- invalid snapshot content hashes stop assessment
- live GitHub rate-limit failure is reported as a limitation rather than silently treated as complete coverage
- model timeout/invalid output produces deterministic fallback and visible limitations
- incomplete assessments cannot be approved
- block decisions require a reason
- repository writes require both a global flag and exact allow-list
- migration files must match impacted evidence paths
- stale source hashes are rejected
- PRs are draft-only and idempotent
- APIGuard contains no merge operation

## Remaining limitations

### P0 before an authenticated production deployment

- Add MCP authentication or an authenticated gateway before enabling GitHub writes on a public endpoint.
- Replace or constrain arbitrary URL contract fetching to prevent server-side request abuse.

### P1 for production hardening

- Replace file-backed state with shared durable storage for multiple replicas.
- Add a real GitHub Check/CI integration if the decision must enforce merge policy.
- Expand provider-protocol and external-failure integration tests.
- Run target repository tests automatically before describing a migration as ready.

### P2 improvements

- Expand OpenAPI 3.1/YAML/polymorphism support.
- Add metrics for provider latency, evidence coverage, and fallback rate.
- Add a deployment revision resource so clients can prove which Git commit is live.

## Judge-safe conclusion

APIGuard is a genuine MCP server with a verified analysis, governance, and guarded draft-PR workflow. It should be described as a release-decision assistant and remediation orchestrator—not as complete dependency discovery, a required GitHub check, autonomous production migration, or audit-grade database.
