# VeriCite — Testing

## Running

```bash
npm test              # compiles then runs 132 tests
npm run test:coverage # with V8 coverage
npm run verify        # typecheck + build + tests
```

Framework is Node's built-in `node:test` — no test-runner dependency. `pretest` compiles `src/` and `tests/` to `.test-build/` via `tsconfig.test.json`, so tests type-check against the real contracts.

**The suite is hermetic.** Every integration test forces `VERICITE_OFFLINE=true`. No network, no API keys, no rate limits, deterministic. Provider failure and timeout behaviour is exercised with explicit fakes, not by hoping a real endpoint misbehaves.

## Layout

```
tests/
├── helpers/harness.ts              fixtures, fakes, demo loader
├── unit/
│   ├── document-segmenter.test.ts  segmentation, paragraphs, sentences
│   ├── claim-extractor.test.ts     extraction + P0-1 regression guards
│   ├── citation-extractor.test.ts  parsing, linking, inference
│   ├── audit-mapper.test.ts        summary, scoring, normalisation
│   ├── trust-verdict.test.ts       classification + degeneracy guards
│   └── verification.test.ts        analyzer, adapter, offline, config
└── integration/
    ├── run-full-audit.test.ts      end-to-end pipeline
    ├── widget-contract.test.ts     every field the widget reads
    └── demo-documents.test.ts      the real corpus in Test cases/
```

## Coverage of required scenarios

| Scenario | Where |
|---|---|
| Empty document | `run-full-audit` › input guards |
| Bibliography only | `run-full-audit` › document shapes; `claim-extractor` |
| Uncited claims | `run-full-audit`; `verification.adapter` |
| Contradictory claims | `run-full-audit`; `ContradictionAnalyzer` |
| Fake references | `run-full-audit`; `OfflineVerificationService` |
| Retracted papers | `run-full-audit`; analyzer; verdict engine |
| Duplicate citations | `citation-extractor`; `run-full-audit` |
| Malformed citations | `citation-extractor`; `run-full-audit` |
| Large documents | `claim-extractor` (150 claims); `run-full-audit` (cap at 100) |
| Timeout handling | `run-full-audit` › `HangingVerificationService` |
| Provider failures | `run-full-audit` › `ExplodingVerificationService` |
| Groq unavailable | `config.validateConfig`; offline path |
| Offline fallback | every integration test; `OfflineVerificationService` |
| Widget data contract | `widget-contract.test.ts` |

## Regression guards

Tests that exist because the bug was real and shipped:

- **Phantom claims.** A bibliography-only document must yield **zero** claims. Before the segmenter fix, a 2-sentence body with a 2-entry reference list produced 7 claims, 5 of them harvested from the bibliography.
- **`missingCitation` derivation.** Must come from `claim.citationIds`, not from a verification field. The original bug made it always equal `totalClaims`, flooring every score to 0.
- **Verdict degeneracy.** All four trust levels must be reachable, and a mostly-uncited document must not automatically be `CRITICAL`. `CRITICAL` was previously the only reachable level.
- **Evidence survival.** `metadata.paperTitle` and `metadata.source` must be populated when a citation resolves. They were previously always `undefined`, so every expanded claim card in the widget rendered empty.
- **CRLF in `.env`.** `politeUserAgent()` must strip control characters. A trailing `\r` made Crossref fail on 100% of requests.
- **Author-year markers.** `(Vaswani et al., 2017)` must be detected. The original regex required a second capitalised surname after "et al.", so the commonest citation form in academia never matched and author-year papers looked entirely uncited.
- **Negation scope.** An unrelated null finding elsewhere in an abstract must not read as refuting the claim.

## Known limitations

Stated plainly rather than buried.

**Inferred citations are low precision.** A paper citing `(Vaswani et al., 2017)` with no reference list gets a best-effort citation built from author, year and the citing sentence's content words. This resolves to *something* far more often than it resolves to the *right* thing. Measured live on `Transformer_survey.txt`: 13/13 inferred citations resolved, but matches included tangential works. DOI-backed references are materially more reliable. Before the topic-seeding fix the same document produced three false `CONTRADICTED` verdicts against unrelated papers.

**Reference-list parsing precision is unmeasured** against the long tail of real citation styles. Under-parsing depresses `citationCoverage` and therefore every score.

**Contradiction recall depends on the abstract.** Papers whose abstract does not state the contradicted finding will not be caught. The offline `ContradictionAnalyzer` heuristic is measurably weaker than the Groq verdict — on one demo claim the heuristic said `SUPPORTED` where the LLM correctly said `CONTRADICTED`. Do not present offline results as equivalent to live ones.

**Semantic Scholar is rate limited without a key** and returns HTTP 429 on most calls, so the live path usually runs on two providers rather than three.

**No live-network tests in the suite.** Deliberate — CI must not depend on third-party uptime or burn quota. The live path is verified manually; see [DEPLOYMENT.md](DEPLOYMENT.md#smoke-test).

**Widget rendering is not automatically tested.** `widget-contract.test.ts` pins the data contract the widget reads, and the widget type-checks against the same contracts, but no browser test asserts pixels.
