"""
CI Gate Runner Script for GitHub Actions and Standalone Integration Testing.
"""

import json
import os
import sys
from pathlib import Path

_orchestrator_dir = Path(__file__).resolve().parent
if str(_orchestrator_dir) not in sys.path:
    sys.path.insert(0, str(_orchestrator_dir))

import psycopg2
from db import repo
from fixtures.seed_fake_data import seed
from graph.agent2_synthesizer import synthesize_policy
from gate import compute_ci_gate

def run_ci_gate_step():
    db_url = os.environ.get("DATABASE_URL", "postgresql://postgres:afo@127.0.0.1:5432/afo")
    scan_run_id = os.environ.get("SCAN_RUN_ID", "00000000-0000-0000-0000-000000000001")
    gate_mode = os.environ.get("GATE_MODE", "pass")

    print(f"[ci-gate-runner] Connecting to DB: {db_url}")
    conn = psycopg2.connect(db_url)
    with conn.cursor() as cur:
        schema_path = _orchestrator_dir / "db" / "schema.sql"
        print(f"[ci-gate-runner] Applying schema from: {schema_path}")
        with open(schema_path, "r", encoding="utf-8") as f:
            cur.execute(f.read())
    conn.commit()
    conn.close()
    print("[ci-gate-runner] DB schema applied successfully.")

    # 1. Seed fixture data
    seed()
    
    # Ensure findings are 'open'
    from fixtures.fake_findings import FAKE_FINDINGS
    for f in FAKE_FINDINGS:
        repo.update_finding_status(f["id"], "open")

    # 2. Synthesize policy (creates policy + mitigation_edges)
    policy_res = synthesize_policy(scan_run_id)
    print(f"[ci-gate-runner] Synthesized policy ID: {policy_res.get('policy_id')}")

    # 3. Handle gate_mode=fail override
    if gate_mode == "fail":
        print("[ci-gate-runner] GATE_MODE=fail: Overriding fixture for failing test...")
        from graph import agent3_verifier as v
        from stats.dir import compute_dir_from_counts
        from stats.fisher_bh import test_combo

        def failing_fixture(combo_key):
            a, b, c, d = 27, 23, 50, 0
            dir_val = compute_dir_from_counts(a, 50, c, 50)
            odds_ratio, p_value = test_combo(a, b, c, max(d, 1))

            return {
                "combo_key": combo_key,
                "counts": {"unpriv_approved": a, "unpriv_total": 50, "priv_approved": c, "priv_total": 50},
                "dir_value": round(dir_val, 4),
                "p_value": p_value,
                "odds_ratio": odds_ratio,
            }
        v._simulate_post_patch_outcome = failing_fixture

    # 4. Compute CI Gate
    print(f"[ci-gate-runner] Running compute_ci_gate({scan_run_id})...")
    result = compute_ci_gate(scan_run_id)
    result_json = json.dumps(result)
    print(f"[ci-gate-runner] Result: {result_json}")

    gh_out = os.environ.get("GITHUB_OUTPUT")
    if gh_out:
        with open(gh_out, "a", encoding="utf-8") as f:
            f.write(f"passed={'true' if result['passed'] else 'false'}\n")
            f.write(f"result_json<<GATE_RESULT_EOF\n{result_json}\nGATE_RESULT_EOF\n")

    return result

if __name__ == "__main__":
    run_ci_gate_step()
