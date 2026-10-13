# System Contracts, Data Schemas, and Response Envelopes

This document details the standardized response envelope contract and core domain data schemas defined in `mcp/src/domain/response-envelope.ts` and `mcp/src/domain/knowledge-card.ts`.

## Response Envelope Contract (hm.v1)

All tool responses emitted by the MCP server conform to the `hm.v1` standardized envelope format.

### Envelope Structure

The envelope structure distinguishes operational product outcomes from system infrastructure failures.

```
+-------------------------------------------------------------------------------+
|                             hm.v1 Response Envelope                            |
+-------------------------------------------------------------------------------+
|  contractVersion : "hm.v1"                                                    |
|  requestId       : UUID String                                                |
|  ok              : Boolean (true for product outcomes, false for failures)    |
|  status          : Status String                                              |
|  warnings        : String Array                                               |
|                                                                               |
|  [If ok == true]                                                              |
|  - Payload Data Fields (count, fixes, unifiedDiff, evidence, card, etc.)      |
|                                                                               |
|  [If ok == false]                                                             |
|  - error         : { code: String, message: String, retryable: Boolean }      |
+-------------------------------------------------------------------------------+
```

### Status Code Taxonomy

Envelope statuses are divided into operational product outcomes and infrastructure failures:

* Product Outcomes (`ok: true`):
  * `HIT`: Search query returned one or more matching verified records.
  * `MISS`: Search query returned zero matching records.
  * `DEGRADED`: Vector embedding search was unavailable; results reflect lexical BM25 search only.
  * `PASS`: Code verification completed with exit code 0.
  * `FAIL`: Code verification completed with non-zero exit code.
  * `TIMEOUT`: Code verification was terminated due to process timeout.
  * `STORED`: Fix was successfully validated and indexed into Elasticsearch.
  * `REJECTED`: Submission failed validation gates (digest mismatch, unverified run, or environment mismatch).
  * `NOT_FOUND`: Looked up knowledge card identifier does not exist.
* Infrastructure Failures (`ok: false`):
  * `DEPENDENCY_UNAVAILABLE`: Required backend service (Elasticsearch or embedding provider) is offline or unconfigured.
  * `INVALID_INPUT`: Request payload failed Zod schema validation.

## Knowledge Card Schema

Location: `mcp/src/domain/knowledge-card.ts`

The Knowledge Card represents a verified software patch stored in the index.

### Schema Fields

* `schemaVersion`: Literal string (`hm.v1`).
* `id`: Stable lowercase slug matching `/^[a-z][a-z0-9]*(?:[_-][a-z0-9]+)*$/`.
* `problem`: Description of the error or problem solved.
* `errorType`: String identifying the error class.
* `stacktrace`: Optional error log or trace text.
* `environment`: Object containing `language`, optional `version`, optional `framework`, and optional `packageVersions` record map.
* `patch`: Unified git diff patch string containing `--- ` and `+++ ` headers.
* `verification`: Object containing `status` (`PASS` or `FAIL`), `score` (0 to 1), `lastVerified` (ISO date string), `sandbox` (`docker`), optional `exitCode`, optional `durationMs`, optional `stdout`, and optional `stderr`.
* `metrics`: Object containing `reuseCount`.
* `provenance`: Optional object tracking `source` (`seed` or `agent-submitted`), `category`, `addedAt`, and `addedBy`.
* `embedding`: Optional dense vector array.
* `embeddingModel` and `embeddingDimensions`: Optional model metadata strings and dimension numbers.

### Refinement Rules for Indexing Trust

The schema applies a Zod `superRefine` validation block to enforce data integrity:

* `PASS` Verification Rules: A card with `verification.status: PASS` must have `exitCode === 0`, a valid `durationMs` value, and non-empty `stdout` or `stderr` execution log evidence. Cards lacking execution evidence fail validation.
* Embedding Vector Rules: If an `embedding` vector array is present alongside `embeddingDimensions`, vector length must equal `embeddingDimensions`.

The utility function `isTrustedForIndexing(card)` returns `true` only when the candidate object parses cleanly against the schema and satisfies all `PASS` verification rules.
