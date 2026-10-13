"""
Agent 3 — Regression Verifier (real stats pipeline + Redis SSE progress)

Person A imports this at Hour 14 as:
    from graph.agent3_verifier import verify_fix

DO NOT add MCP decorators here — internal logic only.
MCP wrapper: orchestrator/mcp_server.py (Person A, Hour 14).
"""

from __future__ import annotations

import json
import os
import sys
import time
from pathlib import Path

# Ensure orchestrator/ is on sys.path
_orchestrator_dir = Path(__file__).resolve().parent.parent
if str(_orchestrator_dir) not in sys.path:
    sys.path.insert(0, str(_orchestrator_dir))

from dotenv import load_dotenv
load_dotenv(dotenv_path=_orchestrator_dir / ".env")

from db import repo
from stats.dir import compute_dir_from_counts
from stats.fisher_bh import test_combo, correct_pvalues
from stats.aggregate import compute_aggregate_approval_rate
from fixtures.fake_findings import (
    FAKE_AGGREGATE_PRE_PATCH,
    FAKE_AGGREGATE_POST_PATCH,
)



# ---------------------------------------------------------------------------
# Redis pub/sub — lazy, fault-tolerant (Gap #3 emit side)
# Uses the `redis` library (same as requirements.txt already has).
# Person D's widget (consume side, Hour 12.5-16) subscribes to this channel.
# ---------------------------------------------------------------------------

_redis_client = None


def _get_redis():
    """
    Lazily connect to Redis. Returns None if REDIS_URL is unset or
    connection fails — callers MUST handle None gracefully.
    """
    global _redis_client
    if _redis_client is not None:
        return _redis_client

    redis_url = os.environ.get("REDIS_URL", "").strip()
    if not redis_url:
        return None

    try:
        import redis as redis_lib
        _redis_client = redis_lib.Redis.from_url(redis_url, decode_responses=True)
        _redis_client.ping()  # verify connection
        return _redis_client
    except Exception as e:
        print(f"[agent3] WARNING: Redis unavailable ({e}). SSE progress events disabled.")
        return None


def _publish_progress(scan_run_id: str, combo_key: str, status: str,
                      dir_value: float = 0.0, p_value: float = 0.0,
                      adj_p_value: float = 0.0) -> None:
    """
    Publish a per-combo progress event to Redis channel 'agent3:progress'.
    Wrapped in try/except — Redis hiccup during a demo MUST NOT crash
    verify_fix() or block stats computation.

    Channel: exactly "agent3:progress" (Person D's consumer subscribes here).
    Payload: {"type": "combo_result",  # NEW (backward-compatible)
              "scan_run_id": ..., "combo_key": ...,
              "status": "passed"|"failed",
              "dir_value": ..., "p_value": ..., "adj_p_value": ...,
              "ts": <unix timestamp>}
    """
    r = _get_redis()
    if r is None:
        return

    payload = json.dumps({
        "type": "combo_result",          # added so D's widget can distinguish message types
        "scan_run_id": scan_run_id,
        "combo_key": combo_key,
        "status": status,
        "dir_value": dir_value,
        "p_value": p_value,
        "adj_p_value": adj_p_value,
        "ts": time.time(),
    })
    try:
        r.publish("agent3:progress", payload)
    except Exception as e:
        print(f"[agent3] WARNING: Redis publish failed for {combo_key}: {e}")


def _publish_aggregate_summary(scan_run_id: str, agg: dict) -> None:
    """
    Publish ONE aggregate_summary event after the per-combo loop completes.
    Payload: {"type": "aggregate_summary", "scan_run_id": ...,
              "pre_patch_rate": ..., "post_patch_rate": ...,
              "delta": ..., "flagged": bool}
    """
    r = _get_redis()
    if r is None:
        return

    payload = json.dumps({
        "type": "aggregate_summary",
        "scan_run_id": scan_run_id,
        "pre_patch_rate": agg["pre_patch_rate"],
        "post_patch_rate": agg["post_patch_rate"],
        "delta": agg["delta"],
        "flagged": agg["flagged"],
    })
    try:
        r.publish("agent3:progress", payload)
    except Exception as e:
        print(f"[agent3] WARNING: Redis publish failed for aggregate_summary: {e}")


# ---------------------------------------------------------------------------
# Fixture counts for synthetic post-patch outcomes
# (replaced at Hour 9-12 with real target-service call)
#
# FIXTURE RATIONALE: These produce DIR ~0.94, matching the demo narrative
# "DIR 0.58 -> 0.94 after patch" in the build plan.
# 47 out of 50 unprivileged approved vs 50 out of 50 privileged:
#   DIR = (47/50) / (50/50) = 0.94 exactly
# ---------------------------------------------------------------------------
_FIXTURE_UNPRIV_APPROVED = 47
_FIXTURE_UNPRIV_TOTAL = 50
_FIXTURE_PRIV_APPROVED = 50
_FIXTURE_PRIV_TOTAL = 50


def _simulate_post_patch_outcome(combo_key: str) -> dict:
    """
    FIXTURE: Simulate a post-patch outcome for a single combo.
    Returns the contingency table and derived stats.

    TODO(Hour 9-12 or whenever A merges): Replace this entire function with
    a real HTTP call to target-service's evaluate_loan_application tool on
    :3002, re-running only the failing combos with the active policy applied.
    Then feed the real counts into compute_dir() and test_combo() below.
    Check git branch feat/target-agent or main for A's tool availability.
    """
    # Fixture counts — clearly marked, not real re-evaluation
    a = _FIXTURE_UNPRIV_APPROVED    # unpriv approved
    b = _FIXTURE_UNPRIV_TOTAL - a   # unpriv denied
    c = _FIXTURE_PRIV_APPROVED      # priv approved
    d = _FIXTURE_PRIV_TOTAL - c     # priv denied

    # Real stats on fixture counts
    dir_value = compute_dir_from_counts(a, _FIXTURE_UNPRIV_TOTAL, c, _FIXTURE_PRIV_TOTAL)
    odds_ratio, p_value = test_combo(a, b, c, d)


    return {
        "combo_key": combo_key,
        "counts": {"unpriv_approved": a, "unpriv_total": _FIXTURE_UNPRIV_TOTAL,
                   "priv_approved": c, "priv_total": _FIXTURE_PRIV_TOTAL},
        "dir_value": round(dir_value, 4),
        "p_value": p_value,
        "odds_ratio": odds_ratio,
    }


def verify_fix(scan_run_id: str) -> dict:
    """
    Agent 3: targeted re-verify of only the previously-failing combos
    after a policy was applied.

    Side-effect: publishes per-combo progress events to Redis channel
    'agent3:progress' for Person D's live-updating widget. Redis failures
    are caught and logged but never crash the verification pipeline.

    Returns:
        {
            "scan_run_id": str,
            "policy_id": str | None,
            "results": [
                {
                    "combo_key": str,
                    "passed": bool,
                    "dir_value": float,       # real computed (from fixture counts)
                    "p_value": float,         # real Fisher p-value
                    "adjusted_p": float,      # BH-corrected p-value
                    "dir_crossed_threshold": bool,   # DIR >= 0.80
                }
            ]
        }
    """
    # ── Step 1: Get the active policy ──────────────────────────────────
    policy = repo.get_active_policy(scan_run_id)

    if policy is None:
        return {
            "scan_run_id": scan_run_id,
            "policy_id": None,
            "results": [],
            "error": "No active policy found for this scan_run_id.",
        }

    policy_id = policy["id"]

    # ── Step 2: Get findings addressed by this policy ──────────────────
    findings = repo.get_findings_for_policy(policy_id)

    if not findings:
        return {
            "scan_run_id": scan_run_id,
            "policy_id": policy_id,
            "results": [],
            "error": "No findings linked to this policy via mitigation_edges.",
        }

    # ── Step 3: Simulate post-patch outcome + compute real stats ───────
    raw_results = []
    for f in findings:
        combo_key = f.get("combo_key", "unknown")
        result = _simulate_post_patch_outcome(combo_key)
        raw_results.append(result)

    # ── Step 4: BH-FDR correction across all combos in this verify run ─
    raw_p_values = [r["p_value"] for r in raw_results]
    _, adjusted_p_values = correct_pvalues(raw_p_values, alpha=0.05)

    # ── Step 5: Build final results list + emit per-combo progress ──────
    results = []
    for r, adj_p in zip(raw_results, adjusted_p_values):
        dir_crossed = bool(r["dir_value"] >= 0.80)
        adj_p_float = float(adj_p)
        still_significant = bool(adj_p_float < 0.05)
        passed = bool(dir_crossed and not still_significant)

        # Emit per-combo progress IMMEDIATELY after this combo's stats
        # are computed — live streaming, not batched at the end.
        _publish_progress(
            scan_run_id=scan_run_id,
            combo_key=r["combo_key"],
            status="passed" if passed else "failed",
            dir_value=float(r["dir_value"]),
            p_value=float(r["p_value"]),
            adj_p_value=round(adj_p_float, 6),
        )

        results.append({
            "combo_key": str(r["combo_key"]),
            "passed": bool(passed),
            "dir_value": float(r["dir_value"]),
            "p_value": float(r["p_value"]),
            "adjusted_p": round(adj_p_float, 6),
            "dir_crossed_threshold": bool(dir_crossed),
            "counts": r["counts"],
        })

    # ── Step 6: Aggregate decision rate check ─────────────────────────
    # TODO(Hour 9-12 target-service integration): replace fixture aggregate
    # counts with real aggregate approval counts queried from target-service's
    # full applicant pool, once that integration exists.
    agg_check = compute_aggregate_approval_rate(
        pre_patch=FAKE_AGGREGATE_PRE_PATCH,
        post_patch=FAKE_AGGREGATE_POST_PATCH,
    )
    print(f"[agent3] Aggregate check: pre={agg_check['pre_patch_rate']:.4f}"
          f" post={agg_check['post_patch_rate']:.4f}"
          f" delta={agg_check['delta']:.4f}"
          f" flagged={agg_check['flagged']}")

    # ── Step 7: Publish aggregate_summary SSE after the combo loop ─────
    _publish_aggregate_summary(scan_run_id=scan_run_id, agg=agg_check)

    return {
        "scan_run_id": scan_run_id,
        "policy_id": policy_id,
        "results": results,
        # NEW key only — existing keys above are unchanged.
        "aggregate_check": agg_check,
    }
