# SentinelPay AI — Reorganization / Completion Status

## Latest session: verified against the supplied Final Technical Specification, section by section

Cross-checked the repo against `SentinelPay_AI_Final_Technical_Specification.md`
(§3 folder structure, §5 tool contracts, §6 resources, §7 prompts, §10 data
models, §11.5 error codes, §12 security, §17 configuration, §28 MVP scope
lock, §35 locked reference data) with `npm run typecheck` / `build` / `test`
run after every change, not just read-through.

**Matches exactly (no changes needed):** folder structure (§3.1) —
`src/modules`, `src/domain`, `src/services`, `src/widgets` (3 widgets),
`src/security`, `src/observability`, `src/health` all present with the
named files, plus a few reasonable additive files not in the spec
(`tool-runtime.ts`, `resource-runtime.ts`, `util/bounded-map.ts`,
`services/fixtures.ts`) — none of which contradict anything spec'd. All 10
error codes (§11.5) match `domain/errors.ts` 1:1. The risk formula, weights,
and classification bands (§5.7, §17.2) match `risk.service.ts` exactly,
including the locked TX-827 → 87/HIGH reference case (§35.6), which is
covered by a passing test. All 6 canonical MCP resource URIs (§6) exist
(plus two reasonable additions, `risk://` and `history://`, not in the
spec's list but not contradicting it). Both prompts (§7) exist with the
right names. All 9 data models (§10.1–10.9) match `domain/models.ts`
field-for-field. `auth.ts`/`authorization.ts` match §11.3/§11.4/§12.1/§12.2
(Bearer token, fail-closed, closed capability set, no `executePayment`).

**Two real gaps found and fixed:**

1. **`.env.example` didn't document `MCP_AUTH_TOKEN`** — the one variable
   that actually gates authentication (`src/security/auth.ts` reads
   `process.env.MCP_AUTH_TOKEN` and fails closed if it's unset). Instead
   it documented `SENTINELPAY_API_KEY`, `PORT`, `TRACING_ENDPOINT`, and
   `ENABLE_METRICS` — none of which are read anywhere in `src/` (checked
   via `grep -rhoE "process\.env\.[A-Z_]+" src`). The README's
   "Environment variables" section already correctly promised
   `.env.example` had `MCP_AUTH_TOKEN` documented; it didn't. Rewrote
   `.env.example` to contain exactly the variables the code reads
   (`MCP_AUTH_TOKEN`, `NODE_ENV`, `LOG_LEVEL`, the three risk weights,
   `RISK_SCORE_CAP`) plus the two spec-listed-but-optional ones
   (`NITROSTACK_API_KEY`, `APPROVAL_THRESHOLD`), each commented with the
   spec section it comes from.

2. **`APPROVAL_THRESHOLD` was documented in the spec (§17.1) and the
   README as a configurable env var but wasn't implemented as one** —
   `policy.service.ts` only ever read the threshold from
   `data/policies.json` (correctly locked to 500000/₹5,00,000 per §5.6,
   §35.5, so the *value* was always right — this was a configurability
   gap, not a correctness bug). Added an `APPROVAL_THRESHOLD` env override
   in `policy.service.ts`, mirroring the existing pattern already used for
   the three risk weights in `risk.service.ts` (env value wins if set and
   numeric; fixture value is the default).

**One dead-code note, not fixed (no live call site, and none should be
fabricated):** `src/security/prompt-safety.ts` (§8.9 prompt-injection
defense: tag/label untrusted document text) is exercised only by its own
test file — nothing in `invoice.tools.ts`/`invoice.service.ts` calls it.
This is because the `Invoice` model (§10.3) has no free-text field in this
MVP's structured-fixture design — there's no actual untrusted-text surface
flowing through the pipeline yet for it to guard. Spec §8.9's example
("if an invoice contains: 'Ignore previous instructions...'") is written
conceptually, and Do-Not-Build / MVP-scope-lock (§28) doesn't call for a
free-text invoice field. Left as-is rather than inventing a text field
just to give this module a call site — flagging it here so a future
session with a real free-text evidence source (e.g. an OCR'd invoice PDF)
wires it in rather than re-discovering it's dormant.

All four test suites (`unit` 27/27, `integration` 6/6, `e2e` 10/10,
`security` 28/28 — 71/71 total), `npm run typecheck`, and `npm run build`
are clean after these changes.

---



This sandbox had network access this time (prior sessions did not), so
everything below was actually executed, not just hand-verified:

```
npm install        # 182 packages, clean
npm run typecheck  # clean, 0 errors
npm run build      # clean, 0 errors
npm test           # was 69/71 before this session's fixes, now 71/71
```

Two real, previously-undetected bugs surfaced once the test suite could
actually run (both in `tests/e2e/investigation-flow.test.ts`, which drives
the system tool-by-tool the way a real MCP client would, as opposed to
`investigation.service.ts`'s own orchestrator):

1. **`calculateRisk` and `evaluatePolicy` never wrote their audit events
   when called as individual tools.** `src/services/audit.service.ts`'s
   `getSummary()` (§12.5) derives `riskScore`, `recommendation`, and
   `approvalStatus` by scanning for `RISK_CALCULATED` / `APPROVAL_PREPARED`
   events. `investigation.service.ts` (the single-call orchestrator) always
   called `auditService.recordRiskCalculated(...)` and
   `recordPolicyEvaluated(...)` itself, so that path's tests passed. But
   `src/modules/risk.tools.ts` and `src/modules/policy.tools.ts` — the
   actual per-tool handlers an MCP agent calls one at a time — never called
   `auditService` at all (only `approval.tools.ts` did). So a tool-by-tool
   investigation produced a `getSummary()` with `riskScore: null`,
   `recommendation: null` even though every individual tool call had
   succeeded and the case had, in fact, been correctly scored HIGH/87
   internally. Fixed by adding `auditService.recordRiskCalculated(...)` and
   `auditService.recordPolicyEvaluated(...)` calls inside
   `calculateRiskHandler` / `evaluatePolicyHandler`, next to their service
   calls, mirroring the existing pattern in `approval.tools.ts`.

2. **`tests/e2e/investigation-flow.test.ts` used CommonJS `require()`
   inside one test** (`const { runTool } = require("../../src/modules/tool-runtime")`)
   in an ESM project (`"type": "module"` in `package.json`), which throws
   `ReferenceError: require is not defined` at runtime — this test never
   actually verified the "unauthorized tool name" behavior it claimed to
   in any prior session, it just crashed. Fixed by importing `runTool` as
   a normal top-level ESM import (it just needed adding to the existing
   `import { ..., type ToolInvocationContext } from "../../src/modules/tool-runtime"`
   line) and deleting the dead `require()` call.

All four test suites (`unit` 27/27, `integration` 6/6, `e2e` 10/10,
`security` 28/28 — 71/71 total) pass individually and together after these
two fixes. `npm run build` and `npm run typecheck` are both clean.

### Not done this session
Did not do a fresh exhaustive re-review of `src/widgets/*` or the
observability layer beyond what the passing test suite already exercises;
did not run `npm start` / exercise the server against a real MCP client;
did not add new audit-trail coverage for `EVIDENCE_RECORDED` in the
tool-by-tool path (only `investigation.service.ts`'s orchestrator records
per-evidence-item audit events today — the tool-by-tool e2e test doesn't
assert on this and no bug was found here, so nothing was changed, but a
future session should decide whether `evaluatePolicyHandler` ought to also
call `auditService.recordEvidence(...)` for each item it receives, for
full architectural symmetry with the orchestrator).

---


This file records exactly what has and hasn't been done, per the instruction
to never overstate completed work. This session picked up after a prior one
(a previous `PROGRESS.md` claimed a full reorg + 40/40 tests passing) by
re-diffing the two original uploads (`sentinelpay-2.zip`, a flat dump of
files, and `sentinelpay-ai.zip`, an already-organized repo) against each
other, file by file, to check the organized repo hadn't silently dropped
anything the flat dump had.

## This session: real regressions found and fixed

Diffing every same-named file between the two uploads surfaced genuine
problems in the organized repo — not stubs or TODOs, but working
protections that existed in the flat dump and were missing from the
organized copy:

1. **Timing side-channel in `src/security/auth.ts`.** The organized repo
   compared the bearer token with plain `!==`, which leaks timing
   information proportional to the matching prefix length. Restored
   `constantTimeEquals()` (Node's `crypto.timingSafeEqual`, length-checked
   first) from the flat dump's `auth.ts`.

2. **Unbounded in-memory growth in four singletons.** `audit.service.ts`,
   `risk.service.ts`, `investigation.service.ts`, and `approval.tools.ts`
   each kept a plain `Map` keyed by case ID with no eviction — a real
   memory leak in any long-running process, invisible in short demos/tests.
   The flat dump had a `BoundedMap` (LRU-eviction wrapper, cap 10,000
   entries) for exactly this reason, in a file (`util/bounded-map.ts`) that
   never made it into the organized repo. Added `src/util/bounded-map.ts`
   and swapped all four `Map`s for it. Verified each call site only used
   `get`/`set` (the subset `BoundedMap` implements) before swapping.

3. **The "Request Envelope Check" pipeline stage was completely
   disconnected.** `src/security/input-validation.ts` (payload-size cap,
   prototype-pollution/dangerous-content check, plain-object check) still
   existed in the organized repo, but `tool-runtime.ts`'s `runTool()` never
   called it, and the `rawInput` parameter had been dropped from
   `runTool()` and from all seven `*.tools.ts` call sites — so the module
   was dead code providing zero actual protection despite the architecture
   spec (§5.1, §12.7, §12.8) requiring it between authorization and schema
   validation. Restored:
   - `runTool()`'s signature and pipeline (`rawInput` param back, calls
     `validateRequestEnvelope()` before `parseInput()`).
   - The `rawInput` argument at all seven call sites: `transaction.tools.ts`,
     `vendor.tools.ts`, `invoice.tools.ts`, `history.tools.ts`,
     `policy.tools.ts`, `risk.tools.ts`, `approval.tools.ts`.

4. **Two integration/e2e test files existed in the flat dump and were never
   copied into the organized repo's empty `tests/integration/` and
   `tests/e2e/` directories:** `pipeline.test.ts` (services wired together
   against real `data/*.json` fixtures) and `investigation-flow.test.ts`
   (drives the real tool handlers end-to-end, the way an MCP client would).
   Verified every imported symbol in both files against the actual current
   exports before adding them — all matched.

5. **Added `tests/security/input-validation.test.ts`** (also present in the
   flat dump, also never copied over) — asserts both that the envelope
   validator's own functions work in isolation, and that the check is
   actually reachable from a real tool call (i.e. that regression #3 above
   doesn't silently reopen).

Every file touched this session was individually syntax-checked with
`node --experimental-strip-types --check` (56 `.ts`/`.tsx` files total, 0
failures) and every changed/added import was cross-referenced by hand
against the actual current export names in the target file.

## Explicitly NOT done this session

- **`npm install`, `npm run typecheck`, `npm test` were not run.** This
  sandbox has no network access, so `npm install` fails outright (403 from
  the registry) — it cannot fetch `@nitrostack/core` or any dependency.
  Everything above was verified by manual syntax-checking and hand
  cross-referencing of imports/exports, not by an actual compile or test
  run. This is a materially weaker guarantee than a real `tsc --noEmit` +
  `npm test` pass — run both yourself after unzipping. Whether the prior
  session's own claimed 40/40 test pass is still accurate after this
  session's five file changes is **unverified** until you run it.
- **No further line-by-line audit** of `src/widgets/*`, the domain layer
  (`schemas.ts`, `models.ts`, `evidence.ts`), or `src/observability/*` was
  done this session — this pass was a targeted diff against the flat-dump
  original, not an exhaustive re-review of everything.
- **`npm run build` / `npm start`** still not exercised.
- No CI/CD workflow, Dockerfile, or deployment manifests — spec §3.1 lists
  none for this MVP, so none were fabricated.
- Widgets still not rendered/tested in a real React harness.

## How to pick this up

```
npm install
npm run typecheck   # verify still clean after this session's edits
npm test            # verify still passing, especially the 3 new test files
```
Then continue with the "not done" list above.
