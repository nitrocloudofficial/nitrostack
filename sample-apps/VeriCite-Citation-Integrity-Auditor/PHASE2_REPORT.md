# VeriCite — Phase 2 Report

**Phase:** Contract Reconciliation & Pipeline Repair
**Date:** 2026-07-26
**Predecessor:** `RepositoryAudit.md` (Phase 1)
**Scope discipline:** no UI redesign, no styling, no charts, no demo assets, no documentation work. Those remain later phases.

---

## ⚠️ Validation status — READ FIRST

> The Linux sandbox did not boot during this session (same failure as Phase 1, now across both). **None of the four validation gates you specified were executed.** No line of this refactor has been seen by a compiler.

| Gate | Status |
|---|---|
| `npx tsc --noEmit -p tsconfig.json` | ❌ **NOT RUN** |
| `npm run build` | ❌ **NOT RUN** |
| `npm --prefix src/widgets run build` | ❌ **NOT RUN** |
| Zero TypeScript errors | ❌ **UNVERIFIED** |
| Documents A–D executed | ❌ **NOT RUN** |

Per the workflow we agreed: **please run these and paste the output. I will fix whatever the compiler reports.**

```bash
cd C:\Users\adith\mp-mcp-server

# 1 — Delete the dead calculator module (I could not run rm without the sandbox)
rmdir /s /q src\modules\calculator
rmdir /s /q src\widgets\app\calculator-result

# 2 — Type-check the server
npx tsc --noEmit -p tsconfig.json

# 3 — Build the server
npm run build

# 4 — Build the widget
npm --prefix src/widgets run build

# 5 — Smoke-test offline (deterministic, no network)
set VERICITE_OFFLINE=true && npm start
```

§7 lists, in priority order, exactly where I expect failures and what the fix is for each. §8 explains why the score-behaviour claims in §5 are nonetheless traceable without a compiler.

---

## 1. What was wrong, in one paragraph

Three independent field-level mismatches across the anti-corruption layer compounded into a single degenerate output. The extractor emitted `citationMarkers` (plural array) while the mapper read `citationMarker` (singular string) — always `''`. The verifier never produced `citationId`, so `mapVerification` wrote `''` — and `buildSummary` counted `!r.citationId` as a missing citation, making `missingCitation === totalClaims` unconditionally. That drove the Integrity Score to a clamped `0` and tripped `missingRatio > 0.5`, the verdict engine's first branch, forcing `CRITICAL`. Separately the ACL discarded `supportingEvidence` and `contradictingEvidence` entirely while reading `metadata` and `existence`, which the verifier never set — so every claim card rendered empty. And the scholarly "API" was a two-key mock that no real sentence could match, so every claim resolved to `NOT_ENOUGH_EVIDENCE` at confidence 0.

**The fix was not to patch the mapper.** It was to make every stage emit the same canonical contract, so these mismatches become compile errors instead of empty strings.

---

## 2. Files changed

### 2.1 Rewritten

| File | Why |
|---|---|
| `src/shared/contracts.ts` | Canonical home for every cross-boundary type. Added `EvidenceRecord`, `ExtractionResult`, `ClaimCategory`, `EvidenceStance`. `Claim` absorbed the old private `ExtractedClaim` (now carries `category`, `extractionConfidence`, `context`, `paragraphIndex`, `citationMarkers[]`, `citationIds[]`). `VerificationResult` gained `supportingEvidence` / `contradictingEvidence` so evidence can no longer be dropped at a boundary. `TrustVerdict` gained `inconclusive`. `AuditSummary` gained six citation-coverage fields. `AuditReport` gained `offlineMode`. Deleted the four unused extension interfaces (two were verbatim duplicates of the other two) and replaced them with four stage contracts that each have a real implementor. |
| `src/modules/audit/audit.mapper.ts` | Stopped being a translator — there is nothing left to translate. Now normalises (clamps, defaults), aggregates, scores, assembles. Deleted `ExtractedClaim`, `ExtractedCitation`, `LocalVerificationResult`, `ExtractionOutput`, `mapExtraction()`, `PLACEHOLDER_STATUS_MAP`, `CONTRACT_STATUSES`, `translateStatus()`. **`missingCitation` is now derived from `claim.citationIds.length === 0`** — the single change that breaks the degeneracy. |
| `src/modules/audit/trust-verdict.engine.ts` | Removed the `missingRatio > 0.5 → CRITICAL` hard gate. Contradiction is now proportional (`CRITICAL_CONTRADICTION_RATIO`), with any contradiction capping the ceiling at `MODERATE_TRUST`. Added `inconclusive` so "we could not complete the audit" stops being laundered into "this document is untrustworthy". Reasoning now cites real evidence — resolved reference counts, retractions, named contradicting papers. |
| `src/modules/audit/scholarly-api.service.ts` | **Mock deleted.** `findWork()` (Crossref) and `getWorkByDoi()` (OpenAlex) — previously written, correct, and called by nobody — are now the live path. Added `findEvidence()` (search + OpenAlex enrichment for abstracts + stance scoring) and `resolveCitation()`. Added offline fixture mode. Typed provider errors replace silent `null`s. `verifyCitationByDoi()` and the `Math.random()` `getCitationMetadata()` deleted. |
| `src/modules/audit/support-verifier.service.ts` | Emits canonical `VerificationResult` with `existence`, `metadata`, `evidence` and both evidence arrays populated. Stance now comes from `ContradictionAnalyzer`, not from a relevance threshold. Deleted its private duplicate `VerificationResult` interface, plus the uncalled `verifyMultipleClaims()` and `generateSummaryReport()` (the latter was the module's only `any`). |
| `src/modules/audit/claim-extractor.service.ts` | Heuristics unchanged — they were sound. Output contract changed to canonical `Claim`. Four near-identical push blocks collapsed into one classify-then-build step (precedence preserved exactly: statistical → causal → comparative → factual). |
| `src/modules/audit/audit.tools.ts` | `AuditMapper.mapCitations(undefined)` deleted. Pipeline is now extract claims → extract + link + resolve citations → retrieve evidence → verify → assemble. Retry consults `isRetryable()` instead of `msg.startsWith('Invalid')`. Fixed the unreachable `buildErrorResult('unknown', …)` branch by keying tasks to claim ids. `withTimeout` now clears its timer so a settled race cannot hold the event loop open. |
| `src/modules/audit/audit.module.ts` | Registered `CitationExtractorService`. |

### 2.2 New

| File | Purpose |
|---|---|
| `src/modules/audit/citation-extractor.service.ts` | The missing pipeline stage. Isolates the reference section, parses numbered and author-year entries, extracts DOI/year/authors/title/journal, and resolves inline markers — including ranges (`[1-3]`) and lists (`[1,2]`) — to citation ids. |
| `src/modules/audit/contradiction.analyzer.ts` | Deterministic stance detection over abstracts: relevance gate → retraction → negation cues → polarity antonyms → numeric disagreement. Pure, offline-capable, explainable. |
| `src/modules/audit/evidence-fixtures.ts` | Eight recorded scholarly records for `VERICITE_OFFLINE=true`. Infrastructure for determinism, **not** demo content — see §6. |

### 2.3 Edited

| File | Change |
|---|---|
| `src/shared/constants.ts` | Added `SCORING`, `SEVERITY_THRESHOLDS`, `VERDICT_THRESHOLDS`, `EVIDENCE`, `OFFLINE_ENV_FLAG`. Scoring weights moved out of `audit.mapper.ts` module scope. |
| `src/shared/error.ts` | Added `retryable` to the base class, `ProviderResponseError`, `InvalidInputError`, `isRetryable()`, `describeError()`. The file had **zero imports anywhere** before this phase; it is now on the live path. |
| `src/widgets/app/integrity-report/page.tsx` | **Deleted the 90-line type mirror and the duplicate `COLORS` palette.** Now imports both from `src/shared`. Fixed `claim.citationMarker` → `claim.citationMarkers`. No styling, layout or component changes. |
| `.env.example` | Documented `CONTACT_EMAIL` (read at runtime but previously undocumented) and `VERICITE_OFFLINE`. |
| `package.json` | Description was a literal `npx` command string. |
| `src/widgets/package.json` | Renamed `calculator-widgets` → `vericite-widgets`. |

### 2.4 Not done — blocked

`src/modules/calculator/` (4 files) and `src/widgets/app/calculator-result/` are dead code and still on disk: file deletion needs a shell and the sandbox never came up. **They are inert** — unreferenced by `AppModule`, importing nothing I touched, so they cannot break the build. Removal commands are in the block at the top. Note `calculator.tools.ts#convert_temperature` still contains the unsanitised `path.join(cwd, 'uploads', input.file_name)` write flagged as F-13; it is unreachable while the module stays unregistered, but it should go.

---

## 3. Contract unification — before and after

| Type | Before | After |
|---|---|---|
| `ExtractedClaim` | 2 incompatible definitions (`claim-extractor.service.ts:3`, `audit.mapper.ts:36`) | **Eliminated.** Absorbed into canonical `Claim`. |
| `VerificationResult` | 2 incompatible definitions (`contracts.ts:100`, `support-verifier.service.ts:4`) + `LocalVerificationResult` bridge | **1**, in `contracts.ts`. Bridge deleted. |
| `Citation` | 1 canonical + `ExtractedCitation` ACL DTO | **1**. |
| `Claim` / `AuditReport` / `AuditSummary` | 1 each, but mirrored in the widget | **1 each**, imported by the widget. |
| `COLORS` | 2 copies | **1**, in `constants.ts`. |
| Widget view types | 6 interfaces + 4 unions hand-mirrored, no compile-time link | **0.** Imported. Drift is now a compile error. |
| Extension interfaces | 4 declared, 0 implemented, 2 verbatim duplicates | **4 stage contracts, all implemented.** |

Implementors: `ClaimExtractorService : IClaimExtractionService` · `CitationExtractorService : ICitationExtractionService` · `ScholarlyApiService : IScholarlyEvidenceService` · `SupportVerifierService : IVerificationService`.

---

## 4. Field-survival trace

Every property, extractor → widget. This is the deliverable Task 3 asked for.

### 4.1 Claim

| Field | Extractor | Citation linker | Mapper | Report | Widget |
|---|---|---|---|---|---|
| `id` | ✅ | ✅ | ✅ | ✅ | ✅ joins results |
| `text` | ✅ | ✅ | ✅ | ✅ | ✅ card title |
| `category` | ✅ | ✅ | ✅ | ✅ | available |
| `extractionConfidence` | ✅ | ✅ | ✅ clamped | ✅ | available |
| `context` | ✅ | ✅ | ✅ | ✅ | available |
| `paragraphIndex` | ✅ | ✅ | ✅ | ✅ | available |
| `citationMarkers[]` | ✅ | ✅ | ✅ | ✅ | ✅ rendered |
| `citationIds[]` | `[]` | ✅ **populated** | ✅ | ✅ | drives coverage |

*Was:* `category`, `confidence`, `context`, `lineNumber` silently dropped; `citationMarker` always `''`; `citationId` always `''`.

### 4.2 VerificationResult

| Field | Verifier | Mapper | Report | Widget |
|---|---|---|---|---|
| `claimId` | ✅ | ✅ | ✅ | ✅ |
| `citationIds[]` | ✅ | ✅ | ✅ | available |
| `existence` | ✅ **real** | ✅ | ✅ | available |
| `status` | ✅ | ✅ | ✅ | ✅ badge + filter |
| `confidence` | ✅ | ✅ clamped | ✅ | ✅ percentage |
| `reason` | ✅ | ✅ | ✅ | ✅ detail panel |
| `supportingEvidence[]` | ✅ | ✅ **survives** | ✅ | available |
| `contradictingEvidence[]` | ✅ | ✅ **survives** | ✅ | available |
| `evidence` | ✅ snippet | ✅ | ✅ | ✅ quote block |
| `metadata.*` | ✅ **populated** | ✅ | ✅ | ✅ title/authors/DOI/source |
| `error` | on failure | ✅ | ✅ | available |

*Was:* both evidence arrays discarded at the boundary; `existence` always `'AMBIGUOUS'`; every `metadata` field `undefined`, so the expanded card was always empty.

### 4.3 Citation — entirely new downstream

`id · raw · marker · title · authors · journal · year · doi · url · resolved · retracted · resolvedBy` all survive to `AuditReport.citations`. *Was:* hardcoded `[]`.

---

## 5. Verdict degeneracy — the arithmetic

### 5.1 Old behaviour (any input)

```
missingCitation === totalClaims          (citationId always '')
numerator = N·40 − N·50 = −10N
score     = clamp(round(−10N/N)) = 0
missingRatio = 1.0 > 0.5                 → CRITICAL, always
avgConfidence = 0                        → verdict confidence 0.1
```

### 5.2 New model

```
scored  = results where status ≠ ERROR       // provider outages excluded
base    = mean(STATUS_POINTS[status])        // 100 / 45 / 25 / 0
score   = clamp(base
                − (1 − citationCoverage)·25
                − min(retractedCitations·10, 20))

CRITICAL       score < 35  OR contradictedRatio ≥ 0.15
LOW_TRUST      score < 60  OR supportedRatio < 0.35
MODERATE_TRUST score < 80  OR supportedRatio < 0.70  OR any contradiction
HIGH_TRUST     otherwise
```

Excluding `ERROR` from the denominator is deliberate: a provider outage is our failure, not the author's, and must not be scored as though the document were unsupported. Errors still surface in the summary, still lower verdict confidence, and past 60% trigger `inconclusive`.

### 5.3 Predicted behaviour for Documents A–D

Derived by hand from the arithmetic above — **not observed**, since nothing ran.

| Doc | Composition | base | coverage | score | severity | level |
|---|---|---|---|---|---|---|
| **A** high quality | all SUPPORTED, full refs | 100 | 1.0 | **100** | GREEN | HIGH_TRUST |
| **B** unsupported | all UNRELATED, no refs | 25 | 0.0 | **0** | RED | CRITICAL |
| **C** mixed | ~50% SUPPORTED, ~50% NOT_ENOUGH, ~60% cited | ~73 | 0.6 | **~63** | AMBER | MODERATE_TRUST |
| **D** contradictory | ≥1 CONTRADICTED at ratio ≥ 0.15 | ≤60 | varies | **~35–50** | RED | CRITICAL |

Four distinct scores, three distinct severities, three distinct verdict levels. **Task 6 is satisfied by construction** — the degenerate path is arithmetically unreachable now, because `missingCitation` can only equal `totalClaims` when genuinely no claim carries a citation.

---

## 6. Two decisions worth flagging

**Contradiction detection is heuristic, not a model.** Per your choice. Precedence: relevance gate → retraction → negation cues near shared vocabulary → polarity antonyms → percentage disagreement. It is deterministic, free, offline-capable and explainable — every stance carries a reason string that reaches the widget. **Recall is materially lower than an LLM judge would achieve.** It will catch explicit negation ("we found no evidence…") and directional conflict ("increases" vs "decreases"), and will miss subtler methodological or scope-limited contradictions. Precision is protected by requiring ≥2 shared content terms in the window around a negation cue, so an unrelated null finding elsewhere in an abstract does not read as refuting our claim.

**Offline fixtures are infrastructure, not demo content.** I kept them minimal and honest: evidence carries `provider: "Fixture"` through to `VerificationResult.metadata.source` and the widget's source chip; `AuditReport.offlineMode` flags the whole run; and a claim matching no fixture returns **no** evidence, exactly as a live miss would. Fixtures never fabricate a match. The corpus includes one genuinely retracted work so the contradiction and retraction paths are exercisable without network.

---

## 7. Where I expect the build to fail

Ordered by likelihood. Each has a known fix.

1. **Widget importing `COLORS` from outside the Next root** — `src/widgets/app/integrity-report/page.tsx` does `import { COLORS } from '../../../shared/constants'`. This is a *runtime* import crossing the Next.js project boundary; webpack may refuse to transpile a file outside the root. The `import type` lines are safe (erased before webpack sees them). **Fix if it fails:** add `COLORS` to a widget-local module, or add the path to `transpilePackages` / a webpack alias in `next.config.js`. I chose the correct-architecture option over the safe one because deduplicating `COLORS` was an explicit task; tell me if you'd rather I take the local copy.
2. **`AbortSignal.timeout` / `Response` types** — used in `scholarly-api.service.ts`. Needs `@types/node` ≥18 with `lib: ["ES2022"]` and `types: ["node"]`. Should resolve, but if `Response` is unknown, add `"DOM"` to `lib` or import `undici-types`.
3. **`override readonly retryable`** — subclass property overrides in `error.ts`. Correct under `useDefineForClassFields` (default at ES2022), but if `override` is rejected, drop the keyword.
4. **Exhaustive `switch` returns** — `titleFor` and `narrate` in the verdict engine return from all four union branches with no `default`. TypeScript should prove exhaustiveness; if it complains about a missing return, add an explicit `default`.
5. **Unused-import noise** — a large refactor across 11 files. Trivially fixable, but expect a few.

---

## 8. Why §5 is trustworthy without a compiler

The scoring claims are arithmetic over a handful of integers, traceable by reading `buildSummary` → `computeIntegrityScore` → `determineLevel`. A compile error would prevent the code running at all; it would not silently produce different numbers. What I genuinely **cannot** vouch for without execution:

- whether the citation-extractor regexes parse real-world reference lists at usable precision (unmeasured — this is the weakest new component)
- whether live Crossref/OpenAlex responses match my assumed payload shapes
- whether contradiction recall is high enough to fire on a real Document D
- widget render behaviour
- end-to-end latency under real network conditions

---

## 9. Remaining issues

### Carried from Phase 1, deliberately out of scope

| ID | Issue |
|---|---|
| F-8 | `runWithConcurrency` is still batched, not a sliding window. One slow claim idles four workers; worst case at the 100-claim cap is ~10 min vs ~2 min. Deliberately left — Phase 3 hardening. |
| F-10/F-13 | Calculator module still on disk (§2.4), including the path-traversal write. |
| F-14 | **Still zero tests.** `AuditMapper`, `TrustVerdictEngine` and `ContradictionAnalyzer` are pure static classes and would have caught the original F-1 immediately. |
| §3.3 | Orchestrator still fused to the MCP controller; not unit-testable without a fabricated `ExecutionContext`. |
| §3.3 | No `providers/` layer — `fetch` still lives inside a business service. I kept it there deliberately to avoid changing DI wiring I cannot compile. |

### New, introduced this phase

| Issue | Severity | Note |
|---|---|---|
| Citation-extractor precision unmeasured | **High** | Heuristic reference parsing is brittle across styles. Needs a labelled corpus. Under-parsing depresses `citationCoverage` and therefore every score. |
| Contradiction recall unmeasured | **High** | No ground truth yet. |
| Per-claim request fan-out | Medium | Up to 1 Crossref + 2 OpenAlex calls per claim. At the 100-claim cap that is ~300 requests — rate-limit risk without `CONTACT_EMAIL`, and no caching yet. |
| No response-shape validation | Medium | Provider payloads are cast, not validated. A shape change fails at runtime, not at the boundary. Zod schemas belong in the Phase 3 providers layer. |
| No evidence cache | Medium | Identical claims re-query on every run. |
| `Claim.page` never populated | Low | Contract field with no producer — needs a PDF path. |
| Author/title/journal parsing is positional | Low | Works for common styles, will mis-slice unusual ones. |

---

## 10. Phase 3 readiness

**Ready, conditional on the build passing.** Recommended order:

1. **Close the build** — you run the gates, I fix. *Blocks everything.*
2. **Tests first, before more features.** `ContradictionAnalyzer`, `AuditMapper`, `TrustVerdictEngine`, `CitationExtractorService` are all pure and fully unit-testable with no mocks. This phase changed a lot of scoring logic with no regression net, which is the largest risk on the board.
3. Extract the orchestrator from the MCP controller.
4. Extract a `providers/` layer with Zod validation and caching.
5. Sliding-window concurrency (F-8).
6. Measure extractor precision/recall against a labelled corpus — and report the real number rather than overclaiming.

Phase 6 (widget) should stay after this. It now has varied real data to render, which it did not before.

---

## 11. Production readiness

| Dimension | Phase 1 | Now | Note |
|---|---|---|---|
| Architecture & layering | 8/10 | 8/10 | Preserved as instructed; orchestrator/controller fusion unresolved. |
| Contract hygiene | 3/10 | **9/10** | One definition per type; widget compile-linked. |
| Functional correctness | 1/10 | **7/10** | Degeneracy eliminated; unverified by execution. |
| Evidence pipeline | 2/10 | **7/10** | Real providers live; heuristic stance, no caching. |
| Production hardening | 6/10 | **7/10** | Typed errors on the live path, timer leak fixed, dead branch fixed; concurrency still batched. |
| Widget | 7/10 | 7/10 | Untouched by design, minus the duplication. |
| Tests | 0/10 | **0/10** | Unchanged. The dominant risk. |
| Docs & repo polish | 1/10 | 2/10 | `.env.example` and package metadata only. |

**Overall: 4/10 → 6.5/10** — capped by zero tests and zero executed verification. On a clean build plus the four documents behaving as §5.3 predicts, this is a **7.5/10**. It cannot honestly exceed that until there is a regression suite.

---

## 12. Task completion

| # | Task | Status |
|---|---|---|
| 1 | Unify all contract models | ✅ §3 |
| 2 | Repair the anti-corruption layer | ✅ §4 |
| 3 | Repair claim → verification flow | ✅ §4, traced |
| 4 | Wire real services | ✅ §2.1 — mock deleted, `findWork`/`getWorkByDoi` live |
| 5 | Citation pipeline | ✅ `mapCitations(undefined)` gone; new stage |
| 6 | Fix verdict degeneracy | ✅ §5 — arithmetically, pending execution |
| 7 | Preserve architecture | ✅ all layers intact; only interfaces repaired |
| — | **Validation** | ❌ **BLOCKED — sandbox unavailable** |

**Phase 2 is code-complete and validation-incomplete.** I am not calling it finished, and per your instruction I have not started any UI or documentation work. Run the gates in the block at the top and send me the output.
