"""Gap #1 evidence artifact generator.

Produces a CSV showing raw p-value vs. BH-adjusted p-value for every combo
tested during a sweep.  This CSV is required by the PR checklist and must
be attached to the PR description.

Usage (from repo root):
    cd orchestrator
    python -m scripts.log_bhfdr_evidence

Or via the debug flag on agent1_auditor.__main__ (see inline comment below).

The script reads raw_results from EVERY combo tested (not just flagged ones)
— that's the whole point: demonstrate the correction was applied globally.
"""
import csv
import json
import os
import sys
from pathlib import Path

# Allow running from orchestrator/ or repo root
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from orchestrator.stats.fisher_bh import correct_pvalues


def log_bhfdr_table(
    raw_results: list[dict],
    out_path: str = "artifacts/bhfdr_pvalue_table.csv",
) -> None:
    """Write raw-p vs BH-adjusted-p comparison table to CSV.

    Args:
        raw_results: List of dicts from apply_bhfdr's input (NOT output).
                     Each dict must have: combo_key (str), p_value (float).
                     Pass ALL combos tested — flagged and unflagged alike.
        out_path:    Output CSV path.  Defaults to artifacts/bhfdr_pvalue_table.csv.
    """
    raw_p = [r["p_value"] for r in raw_results]
    reject, adjusted = correct_pvalues(raw_p)

    os.makedirs(os.path.dirname(out_path) if os.path.dirname(out_path) else ".", exist_ok=True)
    with open(out_path, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(
            ["combo_key", "raw_p_value", "bh_adjusted_p_value", "flagged_significant"]
        )
        for r, adj, is_sig in zip(raw_results, adjusted, reject):
            writer.writerow([r["combo_key"], r["p_value"], adj, is_sig])

    print(f"Wrote {out_path} — attach this to the PR description as Gap #1 evidence.")
    print(f"Rows: {len(raw_results)} | Significant after BH: {sum(reject)}")


def _run_sweep_and_dump(budget: int = 20) -> list[dict]:
    """Run a full sweep and return raw_results before BH filtering.

    This is the helper used when running this script standalone.
    It patches apply_bhfdr to capture raw_results before they're filtered.
    """
    import orchestrator.track_a.agent1_auditor as _agent_mod

    captured_raw_results: list[dict] = []
    _original_apply_bhfdr = _agent_mod.apply_bhfdr

    def _patched_apply_bhfdr(state):
        captured_raw_results.extend(state["raw_results"])
        return _original_apply_bhfdr(state)

    _agent_mod.apply_bhfdr = _patched_apply_bhfdr

    try:
        graph = _agent_mod.build_graph()
        result = graph.invoke(
            {"target_name": "loan-decision-agent", "budget_remaining": budget}
        )
        print(f"\nscan_run_id: {result['scan_run_id']}")
        print(f"findings flagged: {len(result['findings'])}")
    finally:
        _agent_mod.apply_bhfdr = _original_apply_bhfdr

    return captured_raw_results


if __name__ == "__main__":
    budget = int(sys.argv[1]) if len(sys.argv) > 1 else 20
    print(f"Running sweep (budget={budget}) to generate BH-FDR evidence table...")
    raw_results = _run_sweep_and_dump(budget=budget)

    if raw_results:
        log_bhfdr_table(raw_results)
    else:
        print("No raw_results captured — check that DATABASE_URL is set and Postgres is running.")
        sys.exit(1)
