import json
import psycopg2
from mcp.server.fastmcp import FastMCP

from track_a.agent1_auditor import build_graph as build_audit_graph
from graph.agent2_synthesizer import synthesize_policy
from graph.agent3_verifier import verify_fix
from db.repo import get_findings, get_active_policy, get_policy_history, DATABASE_URL
from gate import compute_ci_gate

mcp = FastMCP("afo-orchestrator")


@mcp.tool()
def run_bias_audit(
    target_name: str = "loan-decision-agent",
    applications: list[dict] | None = None,
    budget_remaining: int = 20,
) -> dict:
    graph = build_audit_graph()
    result = graph.invoke({
        "target_name": target_name,
        "applications": applications,
        "budget_remaining": budget_remaining
    })
    return {"scan_run_id": result["scan_run_id"], "findings": result["findings"]}


@mcp.tool()
def reset_active_policy() -> dict:
    """Deactivates the currently active mitigation_policy, if any — lets
    the console demonstrate a fresh 'before' state on demand."""
    conn = psycopg2.connect(DATABASE_URL)
    try:
        with conn, conn.cursor() as cur:
            cur.execute("UPDATE mitigation_policy SET is_active = false WHERE is_active = true")
    finally:
        conn.close()
    return {"status": "reset"}


@mcp.tool()
def synthesize_and_apply_patch(scan_run_id: str) -> dict:
    return synthesize_policy(scan_run_id)


@mcp.tool()
def verify_patch(scan_run_id: str) -> dict:
    return verify_fix(scan_run_id)


@mcp.tool()
def run_ci_gate(scan_run_id: str) -> dict:
    return compute_ci_gate(scan_run_id)


@mcp.resource("findings://scan/{scan_run_id}")
def findings_resource(scan_run_id: str) -> str:
    return json.dumps(get_findings(scan_run_id))


@mcp.resource("policy://active")
def active_policy_resource() -> str:
    return json.dumps(get_active_policy())


@mcp.resource("policy://history")
def policy_history_resource() -> str:
    return json.dumps(get_policy_history())


@mcp.prompt()
def explain_finding(scan_run_id: str, combo_key: str) -> str:
    return (
        f"Explain, in plain English for a non-technical judge, why the "
        f"combo `{combo_key}` in scan `{scan_run_id}` was flagged as "
        f"biased, referencing the Disparate Impact Ratio and the "
        f"Benjamini-Hochberg-adjusted p-value on record for it."
    )


if __name__ == "__main__":
    mcp.run(transport="sse")