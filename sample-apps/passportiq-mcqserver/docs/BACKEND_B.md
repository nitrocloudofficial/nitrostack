# Backend B — Duplicate Detection, Risk Graph & Pipeline Plumbing

Owner: **Backend B**. This document is the handoff for the other three roles.
Read the **Integration contract** section if you only have two minutes.

---

## 1. What Backend B delivers

| Deliverable | Where | State |
| --- | --- | --- |
| MCP server bootstrap + tool registration (the shell everyone plugs into) | `src/index.ts`, `src/app.module.ts` | done |
| `detect_duplicate_signals` — cross-application reuse detection | `src/modules/pipeline/tools/duplicate-detector.tools.ts` | done |
| `build_risk_graph` — applicant link-analysis graph (the demo reveal) | `src/modules/pipeline/tools/graph-builder.tools.ts` | done |
| Synthetic dataset with planted overlaps | `src/data/seed-applications.json` | done, 9 apps / 32 docs |
| `ctx.emit` event wiring + `PipelineNotificationService` | `src/bootstrap/execution-context.bridge.ts`, `src/modules/pipeline/services/` | done |
| `officer_decide` + `PipelineCompleteGuard` | `src/modules/pipeline/tools/officer-decision.tools.ts`, `.../guards/` | done |
| `visual_similarity_flag` | — | **cut** (see §7) |

Plus, unplanned but necessary so the branch runs end-to-end for everyone:
6 read tools for the frontends, a `run_verification_pipeline` orchestrator,
3 widget HTML routes (their absence **crashes the server at boot** — see §6),
and 7 env-gated placeholder stages for Backend A.

---

## 2. Run it

```bash
npm install
npx tsx src/index.ts      # boots the real server on stdio
npm run test:all          # typecheck + 67 seed checks + 106 acceptance checks
```

A healthy boot ends with:

```
✅ Application initialized with 17 tools, 0 resources, 0 prompts
✓ ExecutionContext bridge installed (ctx.emit + ctx.input) on 17 tool(s)
✓ PassportIQ ready — 9 seeded applications loaded
⚠️  PLACEHOLDER STAGES ACTIVE (7): document_validate, ocr_extract, ...
```

That last warning is intentional and loud: **the demo must never silently run on
placeholders.** It disappears the moment you set `PASSPORTIQ_STAGE_STUBS=off`.

### Environment flags

| Variable | Default | Effect |
| --- | --- | --- |
| `PASSPORTIQ_STAGE_STUBS` | on | `off` unregisters the 7 Backend A placeholders. Set this once real stages land. |
| `PASSPORTIQ_ALLOW_UNGUARDED_DECISION` | unset | `true` bypasses `PipelineCompleteGuard`. Debug only — boot prints a warning, because the human-in-the-loop gate *is* the pitch. |
| `NODE_ENV` | unset | unset/`development`/`dev` ⇒ stdio only. Anything else ⇒ dual stdio+HTTP on `PORT`/`HOST`. |

---

## 3. The 17 tools

**Backend B owns 10:**

| Tool | Purpose |
| --- | --- |
| `detect_duplicate_signals` | Phone / address / document-hash / name+DOB reuse across applications |
| `build_risk_graph` | Nodes + edges + clusters for the fraud graph |
| `officer_decide` | Records the human decision. Guarded. |
| `run_verification_pipeline` | Drives all stages in order, emits progress events |
| `list_applications` | Queue view, optional `status` filter |
| `get_application` | One application + documents + decision |
| `list_applicant_clusters` | Every connected component, largest first |
| `get_pipeline_events` | Cursor-based event stream (`sinceSequence`) |
| `get_pipeline_progress` | Stage completion, gate status, `blockedReason` |
| `get_audit_trail` | Append-only decision log |

**Backend A owns 7** (currently placeholders): `document_validate`, `ocr_extract`,
`check_identity_consistency`, `check_address_consistency`, `evaluate_rules`,
`score_risk`, `explain_risk`.

---

## 4. Integration contract — read this one

Everything below is frozen by the team's `contracts.md`. Types live in
`src/contracts/` and are the single source of truth; import them rather than
re-typing shapes.

```ts
import { RiskGraph, DuplicateSignalReport, DecisionRecord } from './contracts/index.js';
```

### Backend A — consuming Backend B

Do **not** re-run detection. Read the already-computed results out of
`PipelineStateService`:

```ts
const dup = this.state.getStageResult<DuplicateSignalReport>(applicationId, 'detect_duplicate_signals');
const graph = this.state.getStageResult<RiskGraph>(applicationId, 'build_risk_graph');
```

`run_verification_pipeline` guarantees both have run before `evaluate_rules` and
`score_risk`. The placeholder `evaluate_rules` already does exactly this and fires
`DUP-010` / `GRF-020`; use it as the reference implementation and delete it.

`score_risk` **must** emit a field literally named `score` — `getRiskScore()` reads
that key, and `PipelineCompleteGuard` reads `getRiskScore()`. Rename it and the
decision gate silently never opens.

### Frontend B — `GraphView`

`build_risk_graph` returns, per `contracts.md`:

- `nodes[]` — `{ id, type, label, applicationId?, severity }`
- `edges[]` — `{ source, target, signalType, weight }`
- `clusters[]` — largest first; `applicationIds[]` per cluster
- `stats` — `{ nodeCount, edgeCount, clusterCount, isolatedApplicationCount, density }`

Node/edge identity is **deterministic** — a re-run is byte-identical (asserted in
the acceptance suite). Layout may be cached safely.

### Frontend A — dashboard

Poll `get_pipeline_events` with `sinceSequence` (never `events.at(-1)`; use the
returned stream-wide `latestSequence`, which is correct even when your page filter
drops the newest event). `get_pipeline_progress` returns a human-readable
`blockedReason` string — render it verbatim so the officer knows *why* the decision
button is disabled.

---

## 5. Demo data — the planted rings

`src/data/seed-applications.json`: 9 applications, 32 documents. Overlaps are
deliberate and are asserted in `tests/seed-integrity.test.ts`, so a careless edit
fails CI instead of failing on stage.

| Ring | Applications | Shared signals |
| --- | --- | --- |
| **RING-ALPHA** | `PIQ-2026-2001` … `2004` (4 apps) | 5 direct signals on 2001: phone→2002, phone→2003, address→2003, address→2004, photo hash→2004 |
| **RING-BETA** | 2 apps | name + DOB |
| Clean controls | 3 apps | none — these must stay isolated |

Cluster sizes are exactly `[4, 2, 1, 1, 1]`.

**Demo subject: `PIQ-2026-2001`** (centre of RING-ALPHA, risk score 74).
**Clean baseline: `PIQ-2026-1003`** (untouched — `1002` is already consumed by tests).

Normalization is deterministic on purpose (`signal-normalizer.ts`): `"M.G. Road"`
and `"MG Road"` must collapse to the same key, or the reveal is flaky. Intra-word
punctuation is deleted *before* token-splitting; that fix alone recovered a link
the graph was missing.

---

## 6. Landmines — please read before editing

These are all real failures that cost time. Each one is also commented at the
site in code.

1. **`@Module({ imports })` is not walked recursively.** Every module must be
   listed **flat** in `app.module.ts` or its tools silently never register.
2. **DI needs explicit `@Injectable({ deps: [...] })`.** Under ESM,
   `design:paramtypes` is empty, so core injects `undefined` **without erroring**.
   You get a `TypeError` deep in a tool call instead. Every controller, service
   and guard here declares `deps`.
3. **`@Widget('x')` throws at boot** if `src/widgets/out/<route>/index.html` does
   not exist — it takes down the whole server for the whole team. Manifest URIs
   must be exactly `ui://widget/next-<route>.html`.
4. **Core never validates tool input.** `inputSchema` is only converted to JSON
   Schema for `tools/list`. `officer_decide` therefore calls `safeParse` itself —
   without it, `decision: 'maybe'` wrote a row with `status: undefined` into the
   append-only audit trail. Do the same in any new write tool.
5. **Never remove `PipelineNotificationService` from `providers`.** It looks like
   dead code (nothing injects it). `@OnEvent` only writes metadata; the
   subscription is created when core resolves the instance. Drop it and you get an
   empty dashboard, an empty audit trail, and a gate that blocks forever with no
   visible cause.
6. **Don't add `@Cache`.** It prints `[Cache DEBUG]` to stdout, which corrupts the
   stdio MCP framing and litters the demo screen.
7. **Guards with constructor deps don't typecheck.** Core types guards as a no-arg
   constructor; use the `PipelineCompleteGuardRef` retyped export.
8. **`verification.module.ts` has `providers: []` on purpose.** Re-listing shared
   services there creates a *second* set of instances, so stage results land in a
   state service the guard never reads.
9. **The `OAuthModule` boot error is core's, not ours.** Core self-registers its
   own unused `OAuthModule`, which cannot resolve `OAUTH_CONFIG`; core's own eager
   pass logs-and-skips it. `src/bootstrap/silence-unused-oauth.ts` pre-seeds the
   instance slot so the eager pass skips it quietly. It no-ops if anyone ever
   configures OAuth for real.
10. **Tests must exit explicitly.** Core singletons hold event-loop handles, so
    `report()` calls `process.exit(0)` or `npm test` hangs forever on success.

---

## 7. Cut scope

`visual_similarity_flag` was flagged optional in the build doc and is **not
implemented**. Photo reuse is still detected — via exact document-image hash in
`detect_duplicate_signals`, which is what drives the RING-ALPHA photo edge. What is
missing is *perceptual* near-duplicate matching (a re-cropped or re-compressed
photo). The hash path covers the demo; the perceptual path is post-hackathon.

---

## 8. Test coverage

| Suite | Checks | Covers |
| --- | --- | --- |
| `tests/seed-integrity.test.ts` | 67 | Hand-written ring intent vs. computed clusters, exact normalizer variants, cluster sizes, byte-identical determinism |
| `tests/backend-b.acceptance.ts` | 106 | Tool registration, guard blocks→allows, contract-schema conformance, event emission, Backend A actually consuming Backend B output, error handling, determinism |

Both boot the **real** server (real DI, real `@OnEvent`, real guard, real bridge)
via `tests/harness.ts` — everything except `app.start()`. There are no mocks, so a
passing suite means the wired application works, not that a fake does.
