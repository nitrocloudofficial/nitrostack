# Agent 2 & Agent 3 — Person A Hour 14 Handoff Reference

## 1. Verbatim Function Signatures
```python
synthesize_policy(scan_run_id: str) -> dict
verify_fix(scan_run_id: str) -> dict
```

## 2. Import Paths for `mcp_server.py`
```python
from graph.agent2_synthesizer import synthesize_policy
from graph.agent3_verifier import verify_fix
```

## 3. Function Behavior & Internal Pipeline

### `synthesize_policy(scan_run_id: str) -> dict`
Reads open findings for `scan_run_id` from Postgres (`finding` table), sends them to an LLM at `temperature=0` with a calibrated prompt, and inserts the generated policy into Postgres (`mitigation_policy` and `mitigation_edges` tables). It marks processed findings as resolved and returns the policy summary dict.

### `verify_fix(scan_run_id: str) -> dict`
Fetches the active policy and associated findings for `scan_run_id`, runs post-patch statistical checks (Disparate Impact Ratio and Fisher's exact test with Benjamini-Hochberg FDR correction across combos), and returns per-combo pass/fail results. As a side-effect, it streams live per-combo progress events to Redis channel `agent3:progress`.

## 4. Exact Returned Dict Shapes (Real Empirical Output)

### `synthesize_policy` Return Value
```json
{
  "policy_id": "69c83866-8fa4-4956-a09a-824e03b612f7",
  "redact_fields": [
    "applicant_name",
    "zip_code"
  ],
  "group_adjustments": {},
  "rationale": "Redacting applicant_name, zip_code - flagged in 2 finding(s): applicant_name=Jamal, zip_code=90210. Expected to restore DIR above the 0.80 threshold.",
  "findings_addressed": [
    "00000000-0000-0000-0000-000000000101",
    "00000000-0000-0000-0000-000000000102"
  ]
}
```

### `verify_fix` Return Value
```json
{
  "scan_run_id": "00000000-0000-0000-0000-000000000001",
  "policy_id": "69c83866-8fa4-4956-a09a-824e03b612f7",
  "results": [
    {
      "combo_key": "zip_code=90210",
      "passed": true,
      "dir_value": 0.94,
      "p_value": 0.242424,
      "adjusted_p": 0.242424,
      "dir_crossed_threshold": true,
      "counts": {
        "unpriv_approved": 47,
        "unpriv_total": 50,
        "priv_approved": 50,
        "priv_total": 50
      }
    },
    {
      "combo_key": "applicant_name=Jamal",
      "passed": true,
      "dir_value": 0.94,
      "p_value": 0.242424,
      "adjusted_p": 0.242424,
      "dir_crossed_threshold": true,
      "counts": {
        "unpriv_approved": 47,
        "unpriv_total": 50,
        "priv_approved": 50,
        "priv_total": 50
      }
    }
  ]
}
```

## 5. Architectural Confirmation (Zero MCP Contamination)
`synthesize_policy` and `verify_fix` are **100% plain, framework-agnostic Python functions**. They contain **zero** `@mcp.tool()`, `@mcp.resource()`, `@mcp.prompt()`, or `mcp`/`FastMCP` imports. Person A can wrap them directly in `@mcp.tool()` decorators in `orchestrator/mcp_server.py` with zero adapter code.

## 6. Redis Side-Effect Channel
`verify_fix()` publishes per-combo progress events to Redis channel `agent3:progress` (consumed by Person D's live widget). Format:
```json
{
  "scan_run_id": "00000000-0000-0000-0000-000000000001",
  "combo_key": "zip_code=90210",
  "status": "passed",
  "dir_value": 0.94,
  "p_value": 0.242424,
  "adj_p_value": 0.242424,
  "ts": 1785013698.553584
}
```
If Redis is down, it logs a warning and continues without failing.

## 7. Current Known Limitations
1. **Fixture Data:** Currently using synthetic findings fixture (`fixtures/seed_fake_data.py`) pending Person B's Agent 1 Auditor branch merge.
2. **CI Gate Runner:** `compute_ci_gate()` is verified locally and executed via `ci_gate_runner.py` inside Postgres service container.

---

## 8. Session Update — Aggregate Check & SSE Type Field (Person C, final closeout)

### `verify_fix()` — NEW return key: `"aggregate_check"`

`verify_fix()` now also returns an `"aggregate_check"` key (in addition to the existing `scan_run_id`, `policy_id`, and `results` keys — those are **unchanged**):

```json
{
  "scan_run_id": "...",
  "policy_id": "...",
  "results": [...],
  "aggregate_check": {
    "pre_patch_rate": 0.68,
    "post_patch_rate": 0.67,
    "delta": 0.01,
    "flagged": false,
    "message": "OK: aggregate approval rate is stable. Delta = 0.0100 (1.00 pp), within the 5.0 pp warning threshold. Pre-patch: 0.6800 (340/500), Post-patch: 0.6700 (335/500)."
  }
}
```

Logic lives in `stats/aggregate.py` (`compute_aggregate_approval_rate`). The `flagged=True` threshold of 0.05 is a judgment call, not a regulatory number. Fixture aggregate counts are in `fixtures/fake_findings.py` (`FAKE_AGGREGATE_PRE_PATCH`, `FAKE_AGGREGATE_POST_PATCH`) — see the `TODO(Hour 9-12 target-service integration)` comment in `agent3_verifier.py` for the real-data replacement point.

### Redis SSE messages — NEW `"type"` field

All messages published to `"agent3:progress"` now carry a `"type"` field so Person D's widget can distinguish message kinds without inspecting other fields:

| `"type"` value | When published | Shape |
|---|---|---|
| `"combo_result"` | Once per combo, during the per-combo loop | `{type, scan_run_id, combo_key, status, dir_value, p_value, adj_p_value, ts}` |
| `"aggregate_summary"` | Once per `verify_fix()` call, after the combo loop | `{type, scan_run_id, pre_patch_rate, post_patch_rate, delta, flagged}` |

The `"type"` field is a **backward-compatible addition** — all existing fields in `combo_result` messages are unchanged. Verified in `test_sse_emission.py` (3 messages total: 2 combo_result + 1 aggregate_summary, all assertions pass).

