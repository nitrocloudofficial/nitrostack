# VeriCite — Integration Report

**Phase:** Repository Integration & Production Hardening
**Date:** 2026-07-26
**Predecessors:** `RepositoryAudit.md` (Phase 1), `PHASE2_REPORT.md` (Phase 2)
**Status:** Inspection complete. **No code modified.**

---

## 0. Correction to Phase 1

Phase 1 concluded *"There is one repository, not four."* **That was wrong.** All four repositories are present, as zip archives at the repo root:

| Archive | Contents |
|---|---|
| `project.zip` | Claim Extraction Module — PDF parsing, Groq LLM extraction, DTOs, matcher |
| `vericite-verification-engine.zip` | Verification Engine — Crossref + OpenAlex + Semantic Scholar + Groq support verifier |
| `vericite-project.zip` | UI Repository — Vite/React frontend + Python FastAPI backend |

I missed them because bash never started in Phase 1 and my Glob patterns filtered to `*.{ts,tsx,json,md,js}` — `.zip` never matched. The Phase 1 integration strategy was therefore built on an incomplete inventory, and this report supersedes it.

---

## 1. Build gates — measured, not assumed

The sandbox is up this session. Everything below was **executed**.

| Gate | Result | Evidence |
|---|---|---|
| Server `tsc --noEmit` | ✅ **PASS** | 0 errors, exit 0 |
| Widget `tsc --noEmit` | ✅ **PASS** | 0 errors, exit 0 |
| Server emit (`tsc -p`) | ✅ **PASS** | full JS output produced |
| MCP tool registration | ✅ **PASS (static)** | `extract_claims`, `verify_citation`, `run_full_audit` + `@Widget('integrity-report')` all present in compiled `dist/` |
| `run_full_audit` execution | ✅ **PASS** | 4 documents, real orchestrator, 0 errors |
| Demo document execution | ✅ **PASS** | see §3 matrix |
| Live provider path | ✅ **PASS** | Crossref + OpenAlex returned real records with a 2,068-char abstract |
| Widget rendering | ⚠️ **NOT TESTED** | `next build` needs the Linux SWC binary; installed tree is `@next/swc-win32-x64-msvc` |

Two caveats on method, stated plainly:

- `node_modules` was installed on Windows, so `.bin` shims exec `node.exe`. I installed a Linux TypeScript to type-check against the (platform-independent) `.d.ts` files.
- For the runtime harness I stubbed `@nitrostack/core` with no-op decorators plus real zod. Loading the genuine package over the mounted filesystem took 38 s per import. **The decorators are inert when classes are instantiated directly**, so the pipeline logic under test is the real thing — but full NitroStack DI resolution and MCP transport were not exercised in-sandbox. Your `dist/` is newer than `src/`, which corroborates that your Windows `npm run build` already passed post-Phase-2.

**Your claim that the project builds is confirmed.** Phase 2 shipped clean.

---

## 2. Teammate module inventory

### 2.1 Verification Engine — production quality, ready to adopt

```
verification/
├── verification.service.ts     3-provider parallel fan-out, cache, composite confidence
├── verification.module.ts      lazy singleton, exposes verifyCitation()
├── services/crossref.service.ts          DOI lookup → title fallback, Zod-validated
├── services/openalex.service.ts          abstract reconstruction, concepts, citation count
├── services/semantic-scholar.service.ts  third corroborating source
├── services/support-verifier.service.ts  Groq llama-3.3-70b, temp 0.1, JSON schema
├── utils/{api-client,retry,logger}.ts
└── tests/verification.test.ts            ← the only tests in the entire project
```

This is the strongest code in the project. `tsc --noEmit` passes under a **stricter** config than the main repo (`exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `noPropertyAccessFromIndexSignature`). It has Zod validation at every provider boundary, 30-minute result caching, hard per-provider timeouts, retry with backoff, and graceful degradation when a key is missing.

**Executed live.** With a clean `OPENALEX_EMAIL`:

```
existence : FOUND          confidence: 0.3667
source    : Crossref, OpenAlex
doi       : 10.1007/978-3-031-84300-6_13     citedBy: 6596
evidence  : "The dominant sequence transduction models are based on complex
             recurrent or convolutional neural networks in an encoder-..."
```

It retrieved the genuine abstract. Semantic Scholar returned 429 (no API key) and was handled gracefully.

### 2.2 Claim Extraction Module — prototype, does not compile

| File | State |
|---|---|
| `dto/claim.dto.ts` | **EMPTY (0 bytes)** |
| `dto/matched-claim.dto.ts` | **EMPTY (0 bytes)** |
| `test.ts` | **EMPTY (0 bytes)** |
| `dto/reference.dto.ts` | `Reference` interface only |
| `services/claim-extractor.services.ts` | imports `../prompts/claim.prompt` — **file is `claim.prompts.ts`** (broken) |
| `services/Matcher.services.ts` | imports `Claim` from the empty `claim.dto` (broken) |

Three broken/empty files mean this module cannot build. There is no error handling, no JSON-shape validation on LLM output, no retry, no timeout. It also needs `groq-sdk` and `pdf-parse`, **neither of which is in the root `package.json`**.

Its genuinely valuable ideas: PDF ingestion via `pdf-parse`, LLM-based claim extraction, and citation-number matching. Those are worth harvesting — the code around them is not.

### 2.3 UI Repository — different stack, not integrable

Vite + React 19 + Tailwind + Chart.js + react-pdf, talking to a **Python FastAPI** backend over HTTP with its own PyMuPDF parser and its own hardcoded heuristic classifier. Different language, different runtime, different transport from the NitroStack MCP widget.

**Recommendation: do not integrate.** Two backends implementing the same audit differently is a correctness liability, and porting the whole app is out of scope. `ResultsCharts.jsx`, `IntegrityScore.jsx` and `PDFComparisonViewer.jsx` are worth reading as design references for Phase 6 widget work.

---

## 3. Pipeline execution — measured

Real orchestrator, four documents, offline (deterministic) mode:

| Doc | score | severity | verdict | claims | sup | con | unrel | miss | cites | resolved | retracted | coverage |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **A** high-quality | 61 | AMBER | MODERATE_TRUST | 9 | 6 | 0 | 3 | 5 | 3 | 3 | 0 | 0.44 |
| **B** unsupported | 0 | RED | CRITICAL | 4 | 0 | 0 | 4 | 4 | 0 | 0 | 0 | 0.00 |
| **C** mixed | 42 | RED | LOW_TRUST | 9 | 4 | 0 | 5 | 6 | 2 | 2 | 0 | 0.33 |
| **D** contradictory | 5 | RED | CRITICAL | 8 | 1 | 3 | 3 | 4 | 3 | 3 | 1 | 0.50 |

**Phase 2's core objective holds up:** 4 distinct scores, 3 distinct verdict levels, `CONTRADICTED` reachable, retraction detected, `metadata` populated, `existence` varying, evidence arrays surviving to the report. The always-CRITICAL degeneracy is gone.

**But Document A should have scored ~100/GREEN/HIGH_TRUST and scored 61/AMBER.** That gap is bug I-1.

---

## 4. Findings

### I-1 · **P0** · Reference list is extracted as claims

The single most damaging bug in the system. Isolated test — a 2-sentence body with a 2-entry reference list:

```
BODY SENTENCES = 2 ; EXTRACTED CLAIMS = 7
  0: [statistical] markers=["[1]"] :: Observed global mean surface temperature has increased…   ← real
  1: [causal]      markers=["[2]"] :: Attention mechanisms improve neural sequence model…       ← real
  2: [factual]     markers=["[1]"] :: References [1] Hegerl, G., Zwiers, F.                     ← PHANTOM
  3: [factual]     markers=[]      :: Attribution of observed global surface warming…           ← PHANTOM
  4: [factual]     markers=[]      :: Nature Climate Change.                                    ← PHANTOM
  5: [factual]     markers=[]      :: Attention mechanisms in sequence transduction models.     ← PHANTOM
  6: [factual]     markers=[]      :: Advances in Neural Information Processing Systems.        ← PHANTOM
```

**3.5× claim inflation.** Root cause: `ClaimExtractorService.splitIntoSentences()` collapses all newlines to spaces *before* sentence splitting, so `NON_CLAIM_PATTERNS`' anchored guards (`/^\[\d+\]/`, `/^references$/i`) can never match — the reference block is no longer at the start of anything.

Damage compounds through the whole scoring chain:

- phantom claims carry no markers → `missingCitation` inflates (Doc A: 5 of 9)
- `citationCoverage` craters (Doc A: 0.44 instead of 1.00)
- coverage penalty applies at near-maximum → **~39 points lost on Doc A**
- reference titles match fixture titles verbatim → spurious `SUPPORTED` at `confidence = 1.0`
- Doc D produced a `CONTRADICTED` verdict at confidence 1.0 on a *reference-list fragment*

**Fix:** strip the reference block before claim extraction. `CitationExtractorService.isolateReferenceBlock()` already locates it — the orchestrator should split the document once and pass body-only text to the claim extractor. Small change, single seam, no interface break.

### I-2 · **P0** · Evidence is retrieved by claim text, not by citation

`ScholarlyApiService.findEvidence()` searches Crossref using the **claim sentence**. That answers "does any paper anywhere discuss this topic?" — but VeriCite's actual question is **"does the paper this claim cites support it?"**

Live evidence of the failure mode:

```
[Crossref] rel=0.5  stance=SUPPORTING  abstract=NO   | Attention is All You Need... Unless You Are a CISO
[Crossref] rel=0.5  stance=SUPPORTING  abstract=NO   | Attention via Synaptic Plasticity is All You Need
[Crossref] rel=0.42 stance=SUPPORTING  abstract=yes  | 1882-P: Attention Is All You Need: Temporal Transformer…
```

Fuzzy title matches on unrelated papers, **two with no abstract at all, both scored `SUPPORTING`** — because `relevance 0.5 ≥ MIN_RELEVANCE_SUPPORT 0.35` and the analyzer's no-abstract branch defaults to support on title overlap alone. This is a false-positive generator: the system will report `SUPPORTED` for papers it knows nothing about.

The teammate engine does this correctly — DOI first, title/raw fallback, three providers, abstract required before a support verdict is issued. **This is the central integration case.**

### I-3 · **P1** · Two competing contract definitions

`vericite-verification-engine/src/shared/contracts.ts` is the **pre-Phase-2** contract file. Adopting the engine requires reconciling:

| Field | Engine (old) | Canonical (current) |
|---|---|---|
| `Claim.citationMarker` | `string` | `citationMarkers: string[]` |
| `Claim.citationId` | `string` | `citationIds: string[]` |
| `Claim.category` / `extractionConfidence` / `context` | absent | required |
| `VerificationResult.citationId` | `string` | `citationIds: string[]` |
| `supportingEvidence` / `contradictingEvidence` | absent | required |
| `AuditSummary` | 6 fields | 13 fields |
| `AuditReport` | no verdict/score/severity | full |

The engine's `verifyCitation(claim, citation)` signature is clean and worth preserving. An adapter at the boundary — not a rewrite of either side — is the right move.

### I-4 · **P1** · Configuration defects

| Issue | Impact |
|---|---|
| `.env` has **CRLF** line endings | Values carry a trailing `\r`. Interpolated into a `User-Agent` header this throws `Invalid character in header content` — **Crossref failed 100% of the time** until I stripped it. Verified: same call succeeded with a clean value. |
| `CONTACT_EMAIL=your_email@domain.com` | Unfilled placeholder. My Phase 2 code only omits `mailto` when the string is **empty**, so it currently sends a fake address to Crossref — precisely the thing I said it should never do. My bug; needs a validity check, not just an emptiness check. |
| `GROQ_API_KEY` is 26 chars, returns **401** | Invalid or truncated (real keys are `gsk_…`, ~56 chars). **The entire LLM support-verification path is dead.** Both teammate modules depend on it. |
| No `SEMANTIC_SCHOLAR_API_KEY` | Confirmed 429 rate-limiting on every call. Degrades to 2 providers. |
| `axios`, `groq-sdk`, `pdf-parse` absent from root `package.json` | Neither teammate module can run inside the server as-is. |

### I-5 · **P2** · Carried-over items

| ID | Item |
|---|---|
| F-10/F-13 | `src/modules/calculator/` (4 files) + `src/widgets/app/calculator-result/` still present. Inert, but `convert_temperature` still holds the unsanitised `path.join(cwd,'uploads',input.file_name)` write. |
| F-8 | Concurrency still batched, not sliding-window. |
| F-14 | **Zero tests in the main repo.** The only test file in the entire project is the verification engine's. |
| §3.3 | Orchestrator still fused to the MCP controller. |
| I-6 | `contradiction.analyzer.ts` becomes redundant if the LLM support verifier is adopted — keep it as the offline/no-key fallback, do not run both. |

---

## 5. Integration plan

Ordered by value and risk. **No code changed yet — awaiting your go-ahead.**

| # | Change | Files | Risk |
|---|---|---|---|
| **1** | **Strip reference block before claim extraction** (I-1) | `audit.tools.ts`, `claim-extractor.service.ts`, export helper from `citation-extractor.service.ts` | Low — one seam, no interface change |
| **2** | **Fix config** (I-4): normalise `.env` to LF, validate `CONTACT_EMAIL` shape before sending, document the Groq key requirement | `.env`, `scholarly-api.service.ts`, `.env.example` | Low |
| **3** | **Adopt the Verification Engine** (I-2, I-3): vendor `verification/` into `src/modules/verification/`, add a thin adapter mapping canonical `Claim`/`Citation` → engine input and engine `VerificationResult` → canonical, delete the engine's stale `contracts.ts`, point it at `src/shared/contracts.ts` | new `src/modules/verification/**`, `audit.module.ts`, `audit.tools.ts`, `package.json` (+axios) | **Medium — the main integration** |
| **4** | Retarget retrieval to citation-first, claim-text only as fallback for uncited claims | `scholarly-api.service.ts` | Medium |
| **5** | Keep `ContradictionAnalyzer` as the offline / no-Groq-key fallback; select at runtime | `support-verifier.service.ts` | Low |
| **6** | Harvest PDF ingestion from the claim module; **discard** its broken DTO/matcher layer | new `src/modules/extraction/pdf-parser.service.ts`, `package.json` (+pdf-parse) | Low |
| **7** | Delete calculator module and widget page (I-5) | removals only | None |
| **8** | Port the engine's `verification.test.ts` and add pure-function tests for mapper / verdict / analyzer | new `tests/**`, `package.json` | Low |

**Steps 1 and 2 alone should move Document A from 61/AMBER to ~100/GREEN.** I suggest doing those two first and re-running the harness before touching step 3, so the scoring fix is verified in isolation.

---

## 6. Decisions I need from you

1. **Groq key.** The one in `.env` returns 401. The LLM support verifier — the strongest component in the project — is dead without a valid key. Replace it, or should I wire the heuristic analyzer as the permanent default with the LLM as opt-in?
2. **Verification Engine adoption.** Vendor it into `src/modules/verification/` (recommended — single repo, single build), or keep it as a separate package dependency?
3. **UI repository.** Confirm we're discarding it and keeping the NitroStack widget as the only frontend.
4. **Semantic Scholar key.** Free tier is being rate-limited on every call. Get a key, or drop that provider and run with two?

---

## 7. Readiness

| Dimension | Phase 2 | Now | Note |
|---|---|---|---|
| Contract hygiene | 9/10 | 7/10 | Downgraded — a second competing contract file arrived with the engine |
| Functional correctness | 7/10 (unverified) | **6/10 (verified)** | Executes end to end; I-1 materially distorts every score |
| Evidence pipeline | 7/10 | 5/10 | Live providers confirmed working, but I-2 makes retrieval answer the wrong question |
| Production hardening | 7/10 | 7/10 | Unchanged |
| Tests | 0/10 | 1/10 | One test file exists — in an unintegrated module |
| Build health | unverified | **9/10** | Both type-checks clean, runtime clean |

**Overall: 6.5/10.** Verified-executing rather than assumed-working, which is worth more than the number suggests. Steps 1–3 above should reach ~8/10.

---

## 8. Bottom line

Phase 2's contract work holds: the pipeline runs, degeneracy is gone, and both builds are clean — now measured rather than asserted. Two P0 bugs stand between this and a defensible product: **the reference list is being audited as if it were the paper's argument**, and **evidence is retrieved for the wrong question**. The fix for the second is already written, tested, and sitting in `vericite-verification-engine.zip`.

Awaiting your answers to §6 before I modify anything.
