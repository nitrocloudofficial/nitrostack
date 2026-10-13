# SentinelPay AI — Architecture

This document summarizes the implemented architecture. For the full
design rationale, see the original technical specification.

## Layers

```
┌─────────────────────────────────────────────────────────────┐
│ AI Agent (external, NitroStack AI Chat / ChatGPT)             │
└───────────────────────────┬───────────────────────────────────┘
                             │ MCP tool/resource/prompt calls
┌───────────────────────────▼───────────────────────────────────┐
│ modules/*.tools.ts, *.resources.ts, investigation.prompts.ts   │
│  - tool-runtime.ts / resource-runtime.ts: shared adapter        │
│    pipeline (auth → authz → validation → service → audit)       │
└───────────────────────────┬───────────────────────────────────┘
                             │
┌───────────────────────────▼───────────────────────────────────┐
│ services/*.service.ts                                           │
│  - transaction / vendor / invoice / history: read-only lookups   │
│  - policy / risk: deterministic engines                          │
│  - investigation: orchestrates the full pipeline                  │
│  - audit: append-only event log                                   │
└───────────────────────────┬───────────────────────────────────┘
                             │
┌───────────────────────────▼───────────────────────────────────┐
│ domain/                                                          │
│  - models.ts: canonical types                                    │
│  - schemas.ts: runtime input validation                           │
│  - evidence.ts: evidence normalization/provenance (never guesses)  │
│  - errors.ts: typed application errors                             │
└───────────────────────────┬───────────────────────────────────┘
                             │
┌───────────────────────────▼───────────────────────────────────┐
│ services/fixtures.ts → data/*.json                               │
│  - the only module that touches the filesystem                   │
│  - read-only, in-memory indexed by primary key                    │
└─────────────────────────────────────────────────────────────────┘
```

Cross-cutting: `security/*` (auth, least-privilege authorization, input
envelope validation, prompt-injection defense), `observability/*` (logger,
metrics, tracing, audit event definitions), `health/health.ts`.

## Control flow — one investigation

1. Agent calls `getTransaction` → transaction record (hard dependency; a
   missing transaction aborts the case).
2. Agent calls `verifyVendor` → verified beneficiary account, or an
   `IncompleteEvidenceError` that degrades to recorded evidence rather than
   aborting.
3. Agent calls `analyzeInvoice` → invoice record, including duplicate flag.
4. Agent calls `getPaymentHistory` → computed average/max amounts.
5. `domain/evidence.ts` reconciles all of the above into a normalized
   `Evidence[]` array — comparing `transaction.beneficiaryAccount` against
   `vendor.verifiedBeneficiaryAccount` (the two canonical mismatch fields),
   checking invoice/transaction agreement, duplicate status, and the
   amount-vs-history multiplier.
6. Agent calls `evaluatePolicy` with that evidence → policy violations.
7. Agent calls `calculateRisk` with three boolean indicators derived from
   evidence/policy → a capped, classified risk score.
8. Agent calls `prepareApproval` → a case in status
   `WAITING_FOR_HUMAN_APPROVAL`. No further step exists that can move money.

`services/investigation.service.ts` runs this same sequence internally as a
single orchestrated call (`investigate(transactionId, correlationId)`),
useful for tests and for the `investigation://{caseId}` resource; the
individual tools remain independently callable by an agent that wants to
narrate each step.

## Deterministic engines

**Risk** (`services/risk.service.ts`):

```
rawScore = beneficiaryMismatch*35 + amountAnomaly*32 + policyViolation*20
riskScore = min(rawScore, 100)

0–30   LOW
31–60  MEDIUM
61–100 HIGH
```

**Policy** (`services/policy.service.ts`):

```
amount > approvalThreshold (₹500,000)   → PAYMENT_APPROVAL_THRESHOLD
beneficiary mismatch                     → BENEFICIARY_VERIFICATION_REQUIRED
duplicate invoice                        → DUPLICATE_INVOICE
missing mandatory evidence                → MISSING_MANDATORY_EVIDENCE
```

Both engines are pure functions over their inputs — no LLM call, no
external I/O, fully reproducible given the same fixture data.

## Why no database, queue, or vector store

The MVP's evidence sources are static and small enough to hold entirely in
memory, so a database adds operational risk without solving a real problem
at this scale. There is no unstructured-document search requirement, so no
vector database or RAG layer exists. See `docs/threat-model.md` and the
specification's §24/§25 for the production-scale extension points
(managed database, external identity, KMS-backed secrets, real audit
store, external financial integrations).
