# Changelog

All notable changes to VeriCite. Format follows [Keep a Changelog](https://keepachangelog.com/1.1.0/); versioning is [SemVer](https://semver.org/).

## [1.0.0] — 2026-07-26

First production-ready release. Four repositories integrated into one MCP server, two P0 correctness defects fixed, a test suite added, and the whole pipeline verified end to end against live scholarly providers.

### Added

- **Test suite** — 132 tests on Node's built-in runner, no test-runner dependency. Unit coverage for segmentation, extraction, mapping, verdict and adapter logic; integration coverage for the full pipeline, the widget data contract and the demo corpus. Hermetic: offline by default, no network or keys required.
- **`shared/document-segmenter.ts`** — single definition of where a paper's argument ends and its apparatus begins. Paragraph-preserving, abbreviation-aware sentence splitting.
- **`shared/config.ts`** — validated, range-clamped runtime configuration with startup diagnostics. Malformed values fall back to documented defaults; startup never fails on config.
- **`shared/cache.ts`** — bounded TTL/LRU cache. Replaces the engine's unbounded internal map.
- **`modules/verification/`** — the teammate verification engine, vendored: Crossref, OpenAlex, Semantic Scholar in parallel, plus a Groq `llama-3.3-70b-versatile` support verdict with Zod-validated output.
- **`verification.adapter.ts`** — anti-corruption layer merging per-citation engine results into canonical per-claim results, with explicit status precedence.
- **`offline-verification.service.ts`** — fixture-backed fallback, labelled `provider: "Fixture"` end to end.
- **Citation inference** — author-year markers with no reference list now produce a searchable citation instead of being treated as uncited.
- **Retraction detection** — OpenAlex `is_retracted` surfaces through to the verdict; a retracted source forces `CONTRADICTED`.
- **`TrustVerdict.inconclusive`** — distinguishes "we could not complete the audit" from "this document is untrustworthy".
- **Widget** — claim-distribution and citation-coverage charts (inline SVG), evidence distribution, search, sort, offline-provenance banner, malformed-payload error state.
- **Docs** — `README`, `ARCHITECTURE`, `INTEGRATION`, `TESTING`, `DEPLOYMENT`, this changelog.

### Fixed

- **P0: bibliography extracted as claims.** Newlines were collapsed before sentence splitting, destroying section boundaries, so the anchored guards meant to skip the reference list could never match. Measured: a 2-sentence body with a 2-entry reference list produced 7 claims, 5 phantom. Phantoms are uncited, so they inflated `missingCitation`, collapsed `citationCoverage`, and triggered a near-maximum penalty — roughly 39 points. Fixed structurally by segmenting before extraction. Document A recovered from 61/AMBER to **100/GREEN**.
- **P0: evidence retrieved for the wrong question.** Retrieval searched Crossref with the *claim sentence*, answering "does any paper discuss this topic?" rather than "does the cited paper support this claim?". Observed live: `"Attention is All You Need... Unless You Are a CISO"` scored `SUPPORTING` with no abstract retrieved. Replaced with citation-first retrieval.
- **Always-`CRITICAL` verdict.** `missingCitation` was derived from a verification field that never existed, so it always equalled `totalClaims`, flooring every score to 0 and tripping the `missingRatio > 0.5` gate. All four trust levels are now reachable.
- **Evidence discarded at the boundary.** The mapper dropped `supportingEvidence`/`contradictingEvidence` while reading `metadata` and `existence`, which no producer set — so every expanded claim card in the widget rendered empty.
- **CRLF `.env` broke Crossref entirely.** A trailing `\r` in `CONTACT_EMAIL` produced `Invalid character in header content`, failing **100%** of Crossref requests. Control characters are now stripped at one central point.
- **Placeholder contact addresses were sent to polite pools.** `your_email@domain.com` and `@example.com` variants are detected and ignored; VeriCite sends no contact rather than a fake one.
- **Author-year citations never matched.** The marker regex required a second capitalised surname after "et al.", so `(Vaswani et al., 2017)` — the commonest form in academia — never matched and author-year papers looked entirely uncited.
- **Inferred citations resolved to unrelated works.** `"Vaswani (2017)"` alone gave Crossref nothing topical to rank on; live it matched *"Art and Merchandise in Keith Haring's Pop Shop"* and produced three false contradictions. Queries are now seeded with content words from the citing sentence.
- **Unrelated null findings read as contradictions.** A negation cue anywhere in an abstract could refute the claim. The scope window is now forward-weighted, matching how negation actually works.
- **Divider rules parsed as citations.** Rows of `=` in plain-text papers became reference entries.
- **Missing per-claim timeout.** A provider that accepted a connection then never responded would hang the entire audit. Now bounded by `VERICITE_CLAIM_BUDGET_MS`.
- **Unbounded cache.** The engine's DOI cache had no entry cap and evicted only on read — a slow leak in a long-lived MCP process.
- **Unreachable error branch.** `Promise.allSettled` results could not be attributed to their claim; tasks are now keyed.
- **Timer leak in `withTimeout`.** A settled race held the event loop for the full timeout window.
- **Retry decided by string matching.** `msg.startsWith('Invalid')` replaced with typed `isRetryable()`.
- **Stale widget type cache.** A cached `.next` directory referencing deleted routes broke the widget type-check.

### Changed

- **Contracts unified.** One definition per type in `src/shared/contracts.ts`. The widget imports them directly — its 90-line hand-maintained mirror is gone, so contract drift is now a compile error rather than a silent render bug.
- **Scoring model.** Mean status points minus a proportional citation-coverage penalty and a capped retraction penalty. `ERROR` claims are excluded from the denominator: a provider outage is our failure, not the author's.
- **Verdict classification.** Contradiction influence is proportional; any contradiction caps the ceiling at `MODERATE_TRUST`. The `missingRatio > 0.5` cliff is gone.
- **Uncited claims** report `UNRELATED` with an explicit reason, not `NOT_ENOUGH_EVIDENCE` — no source was consulted, so claiming weak evidence would be false.
- **Reference resolution** is a by-product of verification rather than a separate lookup pass, halving provider traffic.
- **`verify_citation`** now uses its `source` parameter as the citation to verify against; previously it was accepted and discarded. Response gained `citationExistence`, and per-evidence `stance`, `stanceReason`, `retracted`.

### Removed

- `audit/scholarly-api.service.ts` — duplicated provider logic, wrong query.
- `audit/support-verifier.service.ts` — superseded by the LLM verifier.
- `modules/calculator/**` and `widgets/app/calculator-result/**` — template scaffold, including an unsanitised `path.join(cwd, 'uploads', input.file_name)` file write.
- The engine's stale `src/shared/contracts.ts` — never vendored.
- Duplicate section-heading regexes, `COLORS` palette, and four unused extension interfaces.

### Known limitations

Inferred citations (author-year with no bibliography) are materially less precise than DOI-backed ones. Reference-list parsing precision is unmeasured against the long tail of citation styles. Contradiction detection depends on the abstract stating the finding. Semantic Scholar rate-limits without a key. No PDF ingestion. Concurrency is batched, not sliding-window. Details in [TESTING.md](TESTING.md#known-limitations).
