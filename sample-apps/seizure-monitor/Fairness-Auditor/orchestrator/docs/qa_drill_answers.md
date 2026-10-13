# AFO Demo — Primary Narrator Q&A Drill Answers
**Branch:** `feat/agent2-3-policy` | **Author:** Person C | **Session:** Hour 19-24

> Numbers marked `[VERIFIED]` were observed in live test output this session.
> Items marked `[TBD — confirm before demo]` require post-integration re-check.

---

## Q1: "Why Track A (bias) only — why cut security/access-control and policy/compliance drift tracks?"

The hackathon time-box is 24 hours. Building three full detection-to-remediation pipelines (bias auditing, security, policy drift) would have produced three shallow, untested demos; building one deeply would produce a demo where every step — scan, policy synthesis, statistical verification, CI gate — is actually wired end to end and can survive judge questions about the implementation. Track A (bias) was chosen because the bias detection problem has the richest multi-agent decomposition: Agent 1 scans, Agent 2 synthesizes remediation via an LLM, Agent 3 re-verifies with real statistics, and a CI gate enforces the result automatically. Security and policy-drift tracks are explicitly called out in the build plan as Phase 2 scope, not cut permanently. The architectural pattern (orchestrator → MCP tools → DB persistence → CI gate) would apply identically to those tracks.

---

## Q2: "How does this compare to Fairlearn or AIB360?"

Fairlearn and AI Fairness 360 are reusable ML libraries: you import them, call their metrics functions, and get numbers back — but they don't make autonomous decisions, write policies to a database, enforce a CI gate on a pull request, or emit real-time progress events. AFO is an agentic loop: Agent 1 sweeps a live target service's decision outputs across a full proxy-field combination lattice, Agent 2 uses an LLM to synthesize a structured remediation policy (not just a metric), and Agent 3 statistically re-verifies after the patch — all without a human in the loop. The statistical primitives we use (Disparate Impact Ratio, Fisher's exact test, BH-FDR correction) overlap with what those libraries offer, but the value-add is the autonomous decision loop and persistent audit trail, not the individual metric formulas. We deliberately used `scipy` and `statsmodels` directly rather than adding Fairlearn as a dependency — fewer dependencies in the CI runner, more control over what each function does.

---

## Q3: "Why Fisher's exact test instead of chi-square?"

Fisher's exact test is exact — it computes the probability directly from the hypergeometric distribution without any large-sample approximation. Chi-square's p-value is only asymptotically valid and requires all expected cell counts to be ≥5; in a proxy-field combination sweep, many subcombos will have small counts (low-frequency zip codes, rare name patterns) where the chi-square approximation breaks down and produces unreliable p-values. Fisher's exact test is always valid regardless of cell size, making it the right default when we don't control the group sizes. The test is implemented in `stats/fisher_bh.py` using `scipy.stats.fisher_exact` with a two-sided alternative `[VERIFIED]`.

---

## Q4: "Why Benjamini-Hochberg FDR correction instead of Bonferroni?"

Bonferroni controls the Family-Wise Error Rate — the probability that ANY test in the family produces a false positive. For a large combination lattice (zip code × applicant name × age band × ...), Bonferroni divides alpha by the number of tests, making it extremely conservative: real bias signals in low-frequency subcombos get masked because the threshold becomes too strict. Benjamini-Hochberg (BH) controls the False Discovery Rate — the expected proportion of false positives among all rejected tests — which is the right tradeoff for exploratory bias scanning where a few false discoveries are acceptable but missing real bias signals is not. Implemented via `statsmodels.stats.multitest.multipletests(method="fdr_bh")` in `stats/fisher_bh.py` `[VERIFIED]`. The BH-adjusted p-value observed in our fixture run was 0.242424, well above α=0.05, confirming the post-patch combo is no longer statistically significant `[VERIFIED]`.

---

## Q5: "Is input-only patching (redacting fields) actually sufficient, or could the model still be biased through proxy correlations you didn't redact?"

Redacting a field removes the direct signal but does not automatically eliminate correlation-based proxy discrimination — if `zip_code` correlates strongly with `census_tract_income_band` and both are in the model's input, redacting `zip_code` alone may not suffice. Our system flags this limitation explicitly: the rationale the LLM generates uses calibrated language like "expected to reduce proxy-based disparate impact" and never claims "0% bias" or "bias-free" `[VERIFIED — this language rule is enforced in the system prompt and audited across the whole repo]`. The post-patch DIR of 0.94 `[VERIFIED]` demonstrates the mitigation worked on the fixture data, but a production deployment would require repeated sweeps across the full combination lattice — Agent 1's scan is designed to be re-run after every patch precisely to catch residual proxy paths. Group_adjustments in the policy schema is reserved for threshold-correction logic as a Phase 2 extension.

---

## Q6: "How do you check the patch didn't just trade one bias for another — do you check the aggregate decision rate, not just the flagged combo's DIR?"

As of this session, Agent 3's `verify_fix()` now performs **both** checks:

1. **Per-combo DIR + Fisher/BH check** (pre-existing): re-verifies each originally-flagged combo. Post-patch DIR=0.94 (above 0.80 threshold), BH-adjusted p=0.242 (not significant at alpha=0.05) — both combos pass `[VERIFIED — smoke_test.py, test_aggregate_check.py]`.

2. **Aggregate approval-rate delta check** (NEW — `stats/aggregate.py`): computes overall approval rate before and after the patch across all applicants and flags a WARNING if the absolute delta exceeds 5 percentage points.

**Live test output (`test_aggregate_check.py`, this session):**
- Pre-patch rate: `0.6800` (340/500 applicants approved — 68.00%)
- Post-patch rate: `0.6700` (335/500 applicants approved — 67.00%)
- Delta: `0.0100` (1.00 percentage point)
- Threshold: `0.05` (5.00 percentage points — judgment call, not a regulatory number)
- `flagged = False` — delta of 1.00 pp is comfortably within the 5 pp warning threshold; aggregate calibration is stable.

The result is returned under `result["aggregate_check"]` in `verify_fix()`'s dict and also published as a `"type": "aggregate_summary"` Redis SSE message `[VERIFIED — test_sse_emission.py, this session]`.

**Remaining caveat:** The aggregate baseline (`approved=340, total=500` pre-patch; `approved=335, total=500` post-patch) is still **fixture data** from `fixtures/fake_findings.py`, not real counts from target-service's applicant pool. A comment `# TODO(Hour 9-12 target-service integration)` marks the exact line in `agent3_verifier.py` where real counts must be substituted after integration. The 5 pp threshold is also a judgment call documented as such in `stats/aggregate.py`, not derived from a regulatory standard.

---

## Q7: "Why plain HTTP for the CI gate instead of MCP, given the whole hackathon theme is MCP?"

The CI gate is called by a GitHub Actions runner inside an ephemeral Ubuntu container that has Python and `curl` but no MCP client library. MCP adds a transport negotiation handshake and requires a compliant client — a GitHub Actions step calling `POST /ci-gate/{scan_run_id}` over plain HTTP is dependency-light, reliable, and trivially debuggable if it fails. The architectural principle is: the CI gate's HTTP endpoint (`orchestrator/api.py`) is the runner-facing interface; the same underlying `compute_ci_gate()` function is **also** exposed as an MCP tool by Person A's `mcp_server.py` for human-facing interactions `[VERIFIED — gate.py docstring, api.py docstring both document this dual-exposure pattern]`. Using two exposures for the same function (HTTP for automation, MCP for humans) is not a contradiction — it's the correct layered architecture.

---

## Q8: "Why two separate MCP servers (orchestrator + target-service) instead of one?"

The orchestrator and target-service are written in different languages (Python and TypeScript/Nitro) and have fundamentally different deployment lifecycles. The target-service is the system under audit — it processes loan applications; the orchestrator is the auditing system that scans and patches it. Combining them into one MCP server would couple the system under test with its auditor, which is architecturally wrong and would make it impossible to audit a target service that you don't control or can't modify. Two separate MCP servers mirror a real-world deployment pattern where the auditing tool is a sidecar or external service, not co-located with the thing it audits. Each server exposes the tools that belong to its domain: target-service exposes `evaluate_loan_application`; orchestrator exposes `run_bias_scan`, `synthesize_policy`, `verify_fix`, `run_ci_gate`.

---

## Q9: "What MCP primitives do you use beyond Tools?"

By Hour 24, what is confirmed working end-to-end is **Tools** — `synthesize_policy`, `verify_fix`, and `compute_ci_gate` are fully implemented as plain Python functions ready for `@mcp.tool()` wrapping by Person A. Two stretch primitives are staged in `orchestrator/graph/stretch_mcp_tools.py` and committed to `feat/agent2-3-policy` but NOT yet confirmed running against a live MCP client: **Sampling** (`synthesize_patch_via_sampling`) which delegates the policy draft to the connected client's model via `ctx.session.create_message`, and **Elicitation** (`synthesize_and_apply_patch_with_approval`) which requires human operator approval via `ctx.elicit()` before writing a policy to Postgres. `[TBD — confirm Sampling/Elicitation actually work after A integrates into mcp_server.py]`. Resources and Prompts are not yet implemented as dedicated MCP primitives in this system.

---

## Q10: "What happens if the demo client doesn't support Sampling or Elicitation?"

Both stretch functions have explicit fallback paths: `synthesize_patch_via_sampling` catches any exception from `ctx.session.create_message` and falls back to calling `synthesize_policy()` directly via the Groq API — the output is identical, only the source changes `[VERIFIED — test_stretch_fallback.py fallback scenario]`. `synthesize_and_apply_patch_with_approval` uses `ctx.elicit()` which is also wrapped in a try/except; if elicitation is unsupported, the function returns a clear status dict without writing to Postgres. The fallback behavior is tested in `test_stretch_fallback.py` — the sampling fallback path, the elicitation-declined path, and the elicitation-approved path all pass `[VERIFIED]`. The demo can run entirely on the Tools path and skip Sampling/Elicitation if the client doesn't support them.

---

## Q11: "Walk us through what happens live, step by step, when you find a biased combo"

**[Live narration script — ~40 seconds]**

"Okay — so Agent 1 has just finished sweeping the loan model's outputs across every proxy-field combination. It's flagged `zip_code=90210` as a bias finding: the unprivileged group is getting approved at only 58% the rate of the privileged group — that's a DIR of 0.58, below the EEOC four-fifths threshold, and the Fisher exact test puts the p-value near zero, statistically significant after BH correction. That finding is now sitting in Postgres. Agent 2 picks it up, sends it to our Groq LLM — llama-3.3-70b-versatile at temperature zero — and gets back a structured JSON policy: redact `zip_code`, set neutral value to REDACTED. That policy is written to the database in real time. Now Agent 3 re-verifies: it re-runs the statistical checks on the patched outputs, and we see DIR jump to 0.94 — above the four-fifths threshold — and the adjusted p-value is now 0.242, no longer statistically significant. The CI gate reads those numbers, confirms all combos passed, writes the result, and the pull request would now be green. All of this happened without a human in the loop — that's the full agentic loop, end to end." `[VERIFIED — all numbers from live test_sse_emission.py and test_determinism.py outputs]`

---

## Q12: "Is your bias detection legally certifying compliance?"

No — and we're careful not to claim that it is. The EEOC four-fifths rule (29 CFR §1607.4(D)) is an industry heuristic: if the unprivileged group's selection rate is less than 80% of the privileged group's rate, it's a flag for potential disparate impact, not a legal finding. It's a signal for human review, not a certification. Our system produces DIR values and statistical significance results, and the LLM's rationale uses language like "expected to restore DIR above the 0.80 threshold" and "no longer statistically distinguishable from sampling noise at alpha=0.05" — never "bias-free," "fully compliant," or "guaranteed fair" `[VERIFIED — audited across entire repo, zero banned phrases found]`. A real compliance determination requires a legal review by qualified professionals; AFO surfaces the quantitative signal to make that review faster and more grounded.

---

## Q13: "What's next / how would this scale beyond the demo?"

Three immediate scaling directions: first, Agent 1's combination sweep currently runs on fixture data — in production it would run against a live target service's real decision outputs, requiring the sweep to be parallelized (LangGraph supports parallel node execution) and the DB schema to handle millions of finding rows. Second, `group_adjustments` in the policy schema is currently always `{}` — the Phase 2 plan adds threshold-correction adjustments beyond just field redaction, which requires Agent 2's LLM prompt and Agent 3's verification logic to evolve together. Third, the current architecture audits one target service; the same orchestrator could be pointed at multiple target services simultaneously by parameterizing the scan configuration, and each service's policy history would live in separate schema partitions. The CI gate pattern also ports directly to security scanning (Track B) and policy drift detection (Track C) — same agent structure, different detection algorithms.

---

## Q14: "Why Groq/Llama instead of a bigger frontier model?"

Three reasons, all confirmed in this session. Speed: Groq's LPU inference gives sub-second response times even on llama-3.3-70b-versatile — critical for a live demo where the judge is watching the agentic loop complete in real time. Cost: zero token cost during the hackathon build; Groq's free tier handled all 15+ LLM calls across the session without hitting rate limits. Determinism: at `temperature=0` with `response_format={"type": "json_object"}`, three consecutive calls to `synthesize_policy()` via the official Groq SDK returned byte-identical JSON output `[VERIFIED — test_determinism.py, 3 consecutive runs, PASS]`. That determinism is what a live demo actually needs — if the judge asks "run it again," the output should be the same. GPT-4 or Claude would also work technically, but Groq's speed and confirmed determinism made it the right pragmatic choice for a 24-hour hackathon.
