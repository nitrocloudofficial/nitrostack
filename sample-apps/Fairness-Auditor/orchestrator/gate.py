"""
orchestrator/gate.py — CI gate pass/fail logic (Gap #5, #11).

DELIBERATELY plain Python, NOT MCP. The GitHub Action calls this over
plain HTTP (via orchestrator/api.py) because CI environments want a
dependency-light, reliable call, not MCP client machinery.

The same underlying logic is ALSO exposed as the run_ci_gate MCP tool —
but that's Person A's job on feat/mcp-server-wrapper, wrapping
compute_ci_gate() UNMODIFIED. Do not add MCP imports here.
"""

from __future__ import annotations

import sys
from pathlib import Path

_orchestrator_dir = Path(__file__).resolve().parent
if str(_orchestrator_dir) not in sys.path:
    sys.path.insert(0, str(_orchestrator_dir))

from dotenv import load_dotenv
load_dotenv(dotenv_path=_orchestrator_dir / ".env")

from db import repo
from graph.agent3_verifier import verify_fix


def compute_ci_gate(scan_run_id: str) -> dict:
    """
    CI gate pass/fail decision.

    Logic:
    - Run verify_fix(scan_run_id) to get per-combo re-verification results.
    - Gate PASSES if EVERY combo has:
        1. DIR >= 0.80 (crossed the four-fifths threshold), AND
        2. BH-adjusted p-value >= 0.05 (no longer statistically significant —
           i.e. bias is no longer distinguishable from sampling noise)
    - Gate FAILS if ANY combo is still below threshold or still significant.
    - Writes the result to ci_gate_result table via db.repo.insert_ci_gate_result().

    Returns:
        {
            "passed": bool,
            "summary": {
                "scan_run_id": str,
                "policy_id": str | None,
                "total_combos": int,
                "passed_combos": int,
                "failed_combos": int,
                "combos": [
                    {
                        "combo_key": str,
                        "passed": bool,
                        "dir_value": float,
                        "adjusted_p": float,
                        "dir_crossed_threshold": bool,
                        "still_significant": bool,
                    }
                ]
            }
        }
    """
    # Run Agent 3's verify_fix to get per-combo results
    verify_result = verify_fix(scan_run_id)

    if verify_result.get("error"):
        # No policy or no findings — gate fails by default
        summary = {
            "scan_run_id": scan_run_id,
            "policy_id": verify_result.get("policy_id"),
            "total_combos": 0,
            "passed_combos": 0,
            "failed_combos": 0,
            "combos": [],
            "error": verify_result["error"],
        }
        repo.insert_ci_gate_result(scan_run_id, False, summary)
        return {"passed": False, "summary": summary}

    # Build per-combo breakdown
    combos_detail = []
    all_passed = True

    for r in verify_result.get("results", []):
        dir_crossed = bool(r.get("dir_crossed_threshold", False))
        adj_p_val = float(r.get("adjusted_p", 0.0))
        still_sig = bool(adj_p_val < 0.05)
        combo_passed = bool(dir_crossed and not still_sig)

        if not combo_passed:
            all_passed = False

        combos_detail.append({
            "combo_key": str(r["combo_key"]),
            "passed": bool(combo_passed),
            "dir_value": float(r["dir_value"]),
            "adjusted_p": float(adj_p_val),
            "dir_crossed_threshold": bool(dir_crossed),
            "still_significant": bool(still_sig),
        })

    passed_count = int(sum(1 for c in combos_detail if c["passed"]))
    failed_count = int(len(combos_detail) - passed_count)

    summary = {
        "scan_run_id": str(scan_run_id),
        "policy_id": str(verify_result.get("policy_id")),
        "total_combos": len(combos_detail),
        "passed_combos": passed_count,
        "failed_combos": failed_count,
        "combos": combos_detail,
    }

    # Persist to ci_gate_result table
    repo.insert_ci_gate_result(scan_run_id, all_passed, summary)

    return {"passed": all_passed, "summary": summary}
