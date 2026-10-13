"""Agent 1 — Adaptive Bias Auditor.

LangGraph state graph that orchestrates the full perturbation sweep,
DIR + Fisher's computation, BH-FDR correction, and Postgres persistence.

Input/output contract (locked for Person A's Hour-14 MCP wrapper):
  Input:  { "target_name": str, "budget_remaining": int }
  Output: { "scan_run_id": str, "findings": list[dict] }
            findings entry: { combo_key, dir_value, p_value, fdr_adjusted_p }

Key design decisions (v2 — corrections from draft 1):
  1. scan_run row is created inside init_sweep() so every finding row has
     a valid FK.  Do NOT generate a UUID in Python and skip the DB insert.
  2. finding rows are ONLY written for combos where DIR < 0.80 AND
     BH-adjusted p-value is significant.  Untested / non-flagged combos
     produce no row.  status is always 'open' on write.
  3. Graph input is { target_name, budget_remaining } only — no caller-supplied
     applications list or scan_run_id.  The graph owns those internally.
"""
import os
import sys
from typing import TypedDict

# NotRequired was added to typing in Python 3.11; use typing_extensions on 3.10
if sys.version_info >= (3, 11):
    from typing import NotRequired
else:
    from typing_extensions import NotRequired

from dotenv import load_dotenv
from langgraph.graph import StateGraph, START, END

from .field_classifier import load_proxy_fields
from .bandit_scheduler import UCB1Scheduler
from .db_writer import create_scan_run, complete_scan_run, write_findings
from .seed_applications import SAMPLE_APPLICATIONS

# ── Call-target import ────────────────────────────────────────────────────────
# Pre-Hour-3: use deterministic mock that mirrors A's response shape.
# Hour-3 swap: replace this with:
#   from .target_client import call_target
from .mock_target import mock_evaluate_loan_application as call_target  # noqa: F401
# ─────────────────────────────────────────────────────────────────────────────

from stats.permutation_generator import generate_combos, combo_key, apply_combo
from stats.dir import compute_dir, approval_rate
from stats.fisher_bh import fisher_test, correct_pvalues

load_dotenv()

DIR_THRESHOLD: float = 0.80  # four-fifths rule — used consistently across the whole build
DEFAULT_BUDGET: int = 20


# ── State ─────────────────────────────────────────────────────────────────────

class AuditState(TypedDict):
    """Typed state dict threaded through the LangGraph nodes."""

    # Input (required)
    target_name: str

    # Input (optional — defaults to DEFAULT_BUDGET)
    budget_remaining: NotRequired[int]

    # Internal — populated by init_sweep
    scan_run_id: NotRequired[str]
    applications: NotRequired[list[dict]]
    combos: NotRequired[list[tuple]]
    scheduler: NotRequired[UCB1Scheduler]
    raw_results: NotRequired[list[dict]]

    # Output — populated by apply_bhfdr
    findings: NotRequired[list[dict]]


# ── Nodes ─────────────────────────────────────────────────────────────────────

def init_sweep(state: AuditState) -> dict:
    """Create the scan_run row, load applications, build the bandit.

    This is the ONLY place scan_run_id is created.  The UUID is Postgres-
    generated (via RETURNING id) — no Python uuid.uuid4() here.

    Fixes Draft-1 FK bug: scan_run row exists before any finding INSERT.
    """
    target_name: str = state.get("target_name", "loan-decision-agent")
    scan_run_id: str = create_scan_run(target_name)

    proxy_data = load_proxy_fields(target_name=target_name)
    proxy_fields: list[str] = proxy_data["proxy_fields"]
    combos = generate_combos(proxy_fields)
    scheduler = UCB1Scheduler(
        [combo_key(c) for c in combos],
        c=float(os.getenv("UCB1_EXPLORATION_C", "2.0")),
    )

    applications = state.get("applications") or SAMPLE_APPLICATIONS

    return {
        "scan_run_id": scan_run_id,
        "applications": applications,
        "combos": combos,
        "scheduler": scheduler,
        "raw_results": [],
        "budget_remaining": state.get("budget_remaining", DEFAULT_BUDGET),
    }


def run_one_combo(state: AuditState) -> dict:
    """Pull one combo arm via UCB1, run baseline + perturbed evaluations,
    compute DIR and Fisher's p-value, update the bandit reward.

    Returns only the keys that change so LangGraph merges them into state
    rather than replacing the whole dict.
    """
    scheduler: UCB1Scheduler = state["scheduler"]
    key: str = scheduler.select()
    combo = next(c for c in state["combos"] if combo_key(c) == key)

    proxy_data = load_proxy_fields()
    neutral_value: str = proxy_data["neutral_value"]

    privileged: list[bool] = []
    unprivileged: list[bool] = []

    for app in state["applications"]:
        baseline_result = call_target(app)
        perturbed_result = call_target(apply_combo(app, combo, neutral_value))
        privileged.append(bool(baseline_result["approved"]))
        unprivileged.append(bool(perturbed_result["approved"]))

    dir_value = compute_dir(approval_rate(unprivileged), approval_rate(privileged))

    p_appr = sum(privileged)
    p_den = len(privileged) - p_appr
    u_appr = sum(unprivileged)
    u_den = len(unprivileged) - u_appr
    _, p_value = fisher_test(p_appr, p_den, u_appr, u_den)

    # Reward signal: higher drift → higher reward → UCB1 explores it more
    reward = abs(1.0 - dir_value) if dir_value != float("inf") else 1.0
    scheduler.update(key, reward)

    result = {
        "combo_key": key,
        "dir_value": dir_value,
        "p_value": p_value,
    }

    return {
        "raw_results": state["raw_results"] + [result],
        "budget_remaining": state["budget_remaining"] - 1,
    }


def should_continue(state: AuditState) -> str:
    """Routing function: keep sweeping while budget > 0, then apply BH-FDR."""
    return "run_one_combo" if state["budget_remaining"] > 0 else "apply_bhfdr"


def apply_bhfdr(state: AuditState) -> dict:
    """Gap #1 gate — PR-blocking requirement.

    Applies BH-FDR correction across ALL raw p-values collected during the
    sweep, then filters for combos that satisfy BOTH conditions:
      1. DIR < DIR_THRESHOLD (0.80)
      2. BH-adjusted p-value is significant (reject == True)

    A combo that fails either condition does NOT become a finding row.
    The evidence table (raw_p vs adjusted_p) is produced by
    scripts/log_bhfdr_evidence.py from raw_results — attach the CSV to the PR.
    """
    raw_results: list[dict] = state["raw_results"]
    raw_p = [r["p_value"] for r in raw_results]

    fdr_alpha = float(os.getenv("BH_FDR_ALPHA", "0.05"))
    reject, adjusted = correct_pvalues(raw_p, alpha=fdr_alpha)

    findings: list[dict] = []
    for r, is_sig, adj_p in zip(raw_results, reject, adjusted):
        if is_sig and r["dir_value"] < DIR_THRESHOLD:
            findings.append(
                {
                    "combo_key": r["combo_key"],
                    "dir_value": r["dir_value"],
                    "p_value": r["p_value"],
                    "fdr_adjusted_p": adj_p,
                }
            )

    return {"findings": findings}


def persist(state: AuditState) -> dict:
    """Write flagged findings to Postgres and stamp the scan_run as completed."""
    write_findings(state["scan_run_id"], state["findings"])
    complete_scan_run(state["scan_run_id"])
    return {}


# ── Graph builder ─────────────────────────────────────────────────────────────

def build_graph():
    """Compile and return the Agent 1 LangGraph.

    Contract (locked for A's Hour-14 MCP wrapper):
      graph.invoke({"target_name": "...", "budget_remaining": 20})
      → {
          "scan_run_id": "<uuid>",
          "findings": [
              {
                  "combo_key": "applicant_name+zip_code",
                  "dir_value": 0.333,
                  "p_value": 0.0123,
                  "fdr_adjusted_p": 0.0246,
              },
              ...
          ]
        }

    Keep this input/output shape stable after Hour 14 — changing it
    breaks A's mcp_server.py branch, not just yours.
    """
    graph: StateGraph = StateGraph(AuditState)

    graph.add_node("init_sweep", init_sweep)
    graph.add_node("run_one_combo", run_one_combo)
    graph.add_node("apply_bhfdr", apply_bhfdr)
    graph.add_node("persist", persist)

    graph.add_edge(START, "init_sweep")
    graph.add_edge("init_sweep", "run_one_combo")
    graph.add_conditional_edges(
        "run_one_combo",
        should_continue,
        {
            "run_one_combo": "run_one_combo",
            "apply_bhfdr": "apply_bhfdr",
        },
    )
    graph.add_edge("apply_bhfdr", "persist")
    graph.add_edge("persist", END)

    return graph.compile()


# ── CLI entry point ───────────────────────────────────────────────────────────

if __name__ == "__main__":
    import json

    app_graph = build_graph()
    result = app_graph.invoke(
        {"target_name": "loan-decision-agent", "budget_remaining": DEFAULT_BUDGET}
    )

    print(f"\nscan_run_id: {result['scan_run_id']}")
    print(f"findings ({len(result['findings'])} total):")
    for finding in result["findings"]:
        print(f"  {json.dumps(finding, indent=2)}")

    if not result["findings"]:
        print(
            "  (none — zero is a valid result if no combo crosses both the DIR "
            "threshold AND the BH-significance gate on this mock run)"
        )
