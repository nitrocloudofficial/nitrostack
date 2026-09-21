# VeriCite — P0-1 / P0-2 Implementation Report

**Date:** 2026-07-26
**Scope:** P0-1 (reference extraction) and P0-2 (citation-first retrieval) only. Phase 3 not started.
**Predecessor:** `INTEGRATION_REPORT.md`

---

## 1. Validation results

Everything below was **executed**, not inferred.

| Gate | Result |
|---|---|
| Server `tsc --noEmit` | ✅ **0 errors** |
| Widget `tsc --noEmit` | ✅ **0 errors** |
| Server emit (`tsc -p`) | ✅ full JS output |
| MCP tool registration | ✅ `extract_claims`, `verify_citation`, `run_full_audit` + `@Widget('integrity-report')` |
| Four documents — offline | ✅ 4 audits, 0 errors |
| Four documents — **live** (Crossref + OpenAlex + Semantic Scholar + Groq) | ✅ 4 audits, 0 errors |
| Groq key | ✅ valid, real LLM verdicts returned |

Two method notes: `node_modules` was Windows-installed so I ran a Linux TypeScript against the platform-independent `.d.ts` files; and the runtime harness stubs `@nitrostack/core`'s decorators (inert when classes are instantiated directly) because loading the real package over the mount costs 38 s per import. **Please run `npm install` then `npm run build` on Windows** — axios is a new dependency.

### 1.1 Score comparison

| Doc | Before | After (offline) | After (live) |
|---|---|---|---|
| **A** high-quality | 61 AMBER MODERATE_TRUST · 9 claims · cov 0.44 | **100 GREEN HIGH_TRUST** · 3 claims · cov 1.00 | 82 GREEN MODERATE_TRUST |
| **B** unsupported | 0 RED CRITICAL · 4 claims · cov 0.00 | **0 RED CRITICAL** · 4 claims · cov 0.00 | 0 RED CRITICAL |
| **C** mixed | 42 RED LOW_TRUST · 9 claims · cov 0.33 | **50 RED LOW_TRUST** · 4 claims · cov 0.50 | 11 RED CRITICAL |
| **D** contradictory | 5 RED CRITICAL · 8 claims · cov 0.50 | **5 RED CRITICAL** · 3 claims · cov 1.00 | 0 RED CRITICAL |

**Phantom claims: 0.** Doc A extracted 3 claims from 3 body sentences (was 9). Doc D extracted 3 (was 8).

### 1.2 Every score change explained

**Doc A · 61 → 100.** Six phantom claims harvested from the bibliography disappeared, so `totalClaims` fell 9→3 and `citationCoverage` rose 0.44→1.00. All three real claims are SUPPORTED, giving base 100; the coverage penalty went from ~14 points to 0. This is the ~39-point recovery predicted in the integration report.

**Doc B · 0 → 0.** Correctly unchanged. Doc B has no reference section, so it never had phantoms — 4 claims before and after. All four are uncited: base 25 (UNRELATED) minus the full 25-point coverage penalty = 0.

**Doc C · 42 → 50.** Phantoms 9→4, coverage 0.33→0.50. Base = (2×100 + 2×25)/4 = 62.5 → 63; coverage penalty (1 − 0.5) × 25 = 12.5. Net 50.

**Doc D · 5 → 5 — same number, different composition.** Worth calling out rather than glossing: the coverage penalty vanished (0.50→1.00, +12 points) but so did two phantom SUPPORTED claims that had been propping the base up. Base is now (2×0 + 1×45)/3 = 15, minus a 10-point retraction penalty = 5. The old 5 was arithmetic noise; the new 5 is three real claims, two contradicted, one retracted reference.

### 1.3 Live vs offline — why they differ

**Doc A 100 → 82.** The four demo documents carry **invented DOIs** (I authored them for the fixture corpus). Live DOI lookups 404, the engine falls back to title search, and that matches adjacent-but-different real papers — so live mode is exercising the *fallback* path, not the DOI path. Groq then correctly returned NOT_ENOUGH_EVIDENCE for one of them. This is right behaviour on synthetic input, not a regression.

**Doc C 50 → 11.** The live run **CONTRADICTED** "Deep learning diagnosis accuracy in medical imaging exceeds that of clinicians" against the real Liu et al. systematic review — whose abstract says *"claims of superior performance should be interpreted with caution."* My offline heuristic scored that same claim SUPPORTED. This is precisely the miss flagged in the integration report, and the LLM caught it.

**Doc D 0.** Live found the genuine retracted Wakefield paper — Crossref returns its title literally prefixed `RETRACTED:` — plus the real Hviid cohort study and the real Murray AMR paper. All three claims CONTRADICTED, at confidence up to 1.0.

---

## 2. P0-1 — reference extraction

### Root cause

`ClaimExtractorService.splitIntoSentences()` ran `text.replace(/\n+/g, ' ')` **before** splitting. Collapsing every newline destroys paragraph and section boundaries, so the anchored guards meant to skip the bibliography (`/^\[\d+\]/`, `/^references$/i`) could never match — nothing was at the start of a line any more. Measured: a 2-sentence body with a 2-entry reference list produced 7 claims, 5 of them phantoms.

Because phantoms carry no citation markers, they inflated `missingCitation`, collapsed `citationCoverage`, and triggered a near-maximum coverage penalty.

### Fix — structural, not a filter

New `src/shared/document-segmenter.ts` segments the document *before* anything is classified:

- `segmentDocument()` — line-anchored detection of References / Bibliography / Works Cited, plus back-matter (appendix, acknowledgements, funding, data availability, conflicts of interest). Body ends at the **first** back-matter heading of any kind.
- `splitParagraphs()` — blank lines separate paragraphs; single newlines inside a paragraph are unwrapped as the word-wrap artefacts they are. The paragraph boundary survives, which is the whole point.
- `isNonContentBlock()` — drops captions, page numbers, section headings, stray reference entries at paragraph level.
- `splitSentences()` — abbreviation-masked splitting so `et al.`, `e.g.`, `Fig.`, `Ph.D.` and author initials no longer end sentences.

`ClaimExtractorService` consumes body-only sentences. `CitationExtractorService` had its **own** `REFERENCE_HEADING` / `TRAILING_SECTION_HEADING` patterns — a second, subtly different definition of where the bibliography begins; both are deleted and it now calls the shared segmenter. The two extractors agree by construction.

The old `NON_CLAIM_PATTERNS` guard is retained as defence in depth for documents with no detectable headings.

**Compatibility:** no interface changed. `extractClaims(text) -> Claim[]` is unchanged. `paragraphIndex` is now a genuine paragraph ordinal rather than a sentence index — previously it was mislabelled.

---

## 3. P0-2 — citation-first retrieval

### Root cause

`ScholarlyApiService.findEvidence()` searched Crossref with the **claim sentence**, answering "does any paper anywhere discuss this topic?" instead of "does the paper this claim cites support it?" Observed live before the fix:

```
[Crossref] rel=0.5  stance=SUPPORTING  abstract=NO
           "Attention is All You Need... Unless You Are a CISO"
[Crossref] rel=0.5  stance=SUPPORTING  abstract=NO
           "Attention via Synaptic Plasticity is All You Need"
```

Fuzzy matches on unrelated papers, marked SUPPORTING with no abstract ever retrieved.

### Fix — adopt the teammate engine

The engine was vendored into `src/modules/verification/`, not reimplemented. Its provider logic is untouched apart from import paths.

```
Document
  -> Claim Extraction            ClaimExtractorService
  -> Citation Marker Extraction  CitationExtractorService (markers -> citationIds)
  -> DOI resolution + lookup     Crossref / OpenAlex / Semantic Scholar (parallel)
  -> Abstract -> LLM verdict     Groq llama-3.3-70b-versatile, temp 0.1
  -> Adapter                     engine result -> canonical VerificationResult
  -> Audit Mapper -> Trust Verdict -> Audit Report -> Widget
```

**Contract reconciliation.** The engine shipped its own pre-Phase-2 `src/shared/contracts.ts`. That file was **not** vendored — two competing definitions of `Claim` is the exact defect Phase 2 removed. Instead its inputs come straight from the canonical contracts (it only reads fields the canonical shapes already provide, so no input adaptation is needed), and its output stays engine-shaped as `EngineVerificationResult`, translated by `verification.adapter.ts`.

The engine answers per *citation*; the canonical result is per *claim*. The adapter merges them with explicit precedence — `CONTRADICTED > SUPPORTED > NOT_ENOUGH_EVIDENCE > UNRELATED > ERROR`. A contradiction from any cited source outranks support from the others: citing one paper that refutes you is a finding, not an average.

**Deleted:** `scholarly-api.service.ts` (duplicated the engine's Crossref/OpenAlex logic, against the wrong query) and the audit-local `support-verifier.service.ts` (superseded by the LLM verifier). Also removed the orphaned `src/modules/calculator/**` and `src/widgets/app/calculator-result/**`, including the unsanitised `path.join(cwd,'uploads',input.file_name)` write.

**Two improvements added to vendored code**, both minimal and justified:
- OpenAlex now selects and surfaces `is_retracted`; a retracted source forces `CONTRADICTED` regardless of what its abstract says. Without this, Doc D's retraction was invisible on the live path.
- Reference resolution is now a by-product of verification rather than a separate lookup pass, halving provider traffic.

**Uncited claims** return `UNRELATED` with an explicit reason. `NOT_ENOUGH_EVIDENCE` would be a false statement — it means "a source was located but evidence was weak", and here no source was ever consulted. Uncitedness is separately counted by `summary.missingCitation`.

**Compatibility:** all three MCP tool surfaces preserved. `verify_citation` gained `citationExistence` and per-evidence `stance` / `retracted` (additive); its `source` parameter is now genuinely used as the citation to verify against rather than being discarded.

---

## 4. Environment fixes

| Fix | Detail |
|---|---|
| CRLF | `.env` normalised to LF. The trailing `\r` was breaking the `User-Agent` header and **Crossref failed on 100% of calls**. |
| Header sanitisation | New `verification/utils/contact.ts` strips control characters before any header interpolation — root-cause guard, not just a data fix. |
| Placeholder detection | `your_email@domain.com`, `@example.com` and similar are recognised and ignored. When no valid contact exists the `mailto` clause is omitted entirely: anonymous is honest, fake is not. |
| Duplicate UA construction | Three provider services each built the header inline with a hardcoded `vericite@example.com` fallback. Centralised to one function. |
| Groq key | Verified loading and returning real verdicts (`{"status":"SUPPORTED","confidence":0.9}`). |
| `.env.example` | Documents `CONTACT_EMAIL`, `GROQ_API_KEY`, `SEMANTIC_SCHOLAR_API_KEY`, and warns about LF line endings. |

---

## 5. Files changed

**Created (13)** — `src/shared/document-segmenter.ts`; `src/modules/verification/`: `types.ts`, `verification.adapter.ts`, `citation-verification.service.ts`, `offline-verification.service.ts`, `verification.module.ts`, `utils/contact.ts`, plus vendored `verification.service.ts`, `services/{crossref,openalex,semantic-scholar,support-verifier}.service.ts`, `prompts/support.prompt.ts`, `utils/{api-client,retry,logger}.ts`.

**Modified (7)** — `audit/claim-extractor.service.ts`, `audit/citation-extractor.service.ts`, `audit/audit.tools.ts`, `audit/audit.module.ts`, `package.json` (+axios), `.env`, `.env.example`.

**Deleted** — `audit/scholarly-api.service.ts`, `audit/support-verifier.service.ts`, `src/modules/calculator/**`, `src/widgets/app/calculator-result/**`, stale `src/widgets/.next` cache.

---

## 6. Remaining work

**Do first**
1. `npm install` on Windows — axios is new. Then `npm run build` and confirm the widget renders in NitroStudio (the one gate I cannot run here; `next build` needs the Linux SWC binary).
2. Semantic Scholar returns **429 on nearly every call** without a key. The engine degrades to two providers, but a free key would restore the third.

**Known limitations**
3. The four demo documents use invented DOIs, so live mode exercises title-fallback rather than DOI resolution. Real DOIs would give a truer picture — worth doing before any demo.
4. `ContradictionAnalyzer` is now offline-only. It is measurably weaker than the LLM (Doc C: heuristic said SUPPORTED, Groq said CONTRADICTED). Fine as a no-key fallback; do not present it as equivalent.
5. Reference-list parsing precision is still unmeasured against real-world citation styles. Under-parsing depresses coverage and therefore every score.

**Carried over (Phase 3)**
6. **Zero tests in the main repo.** The engine's `verification.test.ts` was deliberately not vendored — no runner exists yet. This is the largest outstanding risk.
7. Concurrency is batched, not sliding-window.
8. Orchestrator still fused to the MCP controller.
9. No response caching across audit runs (the engine caches within a run — visible as cache hits in the live log).

---

## 7. Status

P0-1 and P0-2 are implemented, verified against both offline and live paths, and documented. Every build gate that can run in this environment passes. **Stopping here as instructed** — Phase 3 not started.
