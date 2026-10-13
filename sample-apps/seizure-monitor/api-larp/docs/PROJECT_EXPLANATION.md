# Project explanation

## The problem

API compatibility is a distributed-systems problem disguised as a schema-diff problem.

A provider can change its OpenAPI document, update its implementation, and pass every local test while consumers maintained in other repositories still expect the previous response shape. Traditional diff tools identify structural changes but do not answer the release question: **does production consumer code rely on what changed?**

This creates three recurring failures:

1. **Visibility failure:** the provider does not know every affected consumer.
2. **Evidence failure:** reviewers see a severity label without the code that justifies it.
3. **Governance failure:** findings do not become an owned, auditable decision and remediation path.

## The APIGuard approach

APIGuard connects five layers that are usually separate:

```text
contract compatibility
→ consumer-code evidence
→ contextual risk classification
→ ownership and release policy
→ guarded remediation
```

It exposes that workflow as a NitroStack MCP server so an engineer can ask a natural question before pushing or releasing a contract change. The assistant chooses the tools, but APIGuard keeps authoritative computations and mutations on the server.

## What makes the result trustworthy

### Semantic changes are deterministic

The diff engine compares the baseline and candidate OpenAPI 3.0 documents, resolves supported local references, and emits typed changes with stable identifiers, operations, JSON paths, rationales, and breaking/non-breaking direction.

### Evidence has provenance

Consumer evidence is not an anonymous pasted snippet. An `EvidenceSnapshotV2` ties it to a repository, branch, exact commit, query, file, line range, timestamp, and SHA-256 content hash. Coverage and repository failures remain part of the result.

### AI is bounded

Mechanical cases are classified without a model. Only ambiguous executable evidence is sent to Gemini, OpenAI, or Anthropic. The provider receives no tools. Its structured output is validated and reconciled against the known evidence path and linked semantic change IDs. Failure becomes deterministic fallback, not approval.

### Governance is explicit

Ownership and policy are independent deterministic steps. A human records `APPROVE` or `BLOCK` against a specific assessment version with an idempotency key. Incomplete evidence cannot be approved.

### Mutation is guarded

Opening a migration PR requires a blocked assessment, explicit confirmation, a server-side allow-list, an impacted file, an assessment-pinned commit, and an exact source hash. APIGuard writes a namespaced branch and requires GitHub to create a draft. It never merges.

## Why MCP is the right interface

MCP provides distinct primitives for the job:

- **Tools** perform analysis, governance, and explicit mutations.
- **Resources** expose contracts, snapshots, assessments, scope, and evidence bundles as readable state.
- **Prompt** teaches compatible clients the safe review sequence.
- **Widgets** render structured results next to the conversation.
- **Health checks** expose evidence/classifier readiness.

This is more reliable than embedding the entire workflow in one prompt because state, schemas, validation, and authority remain in code.

## Example: the risky User API release

The candidate contract changes `id` from integer to string, removes required `name`, adds optional `fullName`, and widens `status` with `suspended`.

Pinned consumers demonstrate different failure modes:

- React destructures and displays `name` and expects a numeric `id`.
- Python rejects non-integer IDs and accepts only two status values.
- Go declares `ID int64`, requires `Name`, and rejects unknown status values.

APIGuard produces a high-severity assessment, resolves ownership, applies strict policy, records a block, and can create a draft migration PR from the exact pinned consumer source.

## Product boundary

APIGuard is intentionally not:

- a complete dependency graph
- a replacement for consumer tests
- an autonomous code-merging agent
- a GitHub required check by default
- a production multi-tenant persistence service
- proof that every generated migration is correct

Its job is to make release risk visible, evidence-backed, owned, and actionable before an unsafe change reaches production.

## Success criteria

The project succeeds when a reviewer can answer, with inspectable evidence:

1. What changed?
2. Which consumers appear affected?
3. How confident are we, and what could not be verified?
4. Who owns each impacted path?
5. Which policy rules block or allow the release?
6. Who made the final decision against which version?
7. Was remediation opened safely without modifying or merging the default branch?
