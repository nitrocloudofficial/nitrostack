"""
AFO E2E test using a scan_run_id with KNOWN findings to exercise the full
Agent 2 -> Agent 3 -> CI Gate pipeline.
Inserts a flagged finding directly via DB pool,
then runs synthesize_policy -> verify_fix -> ci_gate.
"""
import sys
import os
import time
import uuid

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'orchestrator'))
os.chdir(os.path.join(os.path.dirname(__file__), '..', 'orchestrator'))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), '..', 'orchestrator', '.env'))

from db import repo
from graph.agent2_synthesizer import synthesize_policy
from graph.agent3_verifier import verify_fix
from gate import compute_ci_gate


def seed_scan_run_and_finding() -> str:
    scan_run_id = str(uuid.uuid4())
    conn = repo._get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO scan_run (id, target_name, status) VALUES (%s, %s, %s)",
                (scan_run_id, "loan-decision-agent", "completed")
            )
            cur.execute(
                """
                INSERT INTO finding (
                    id, scan_run_id, track, combo_key, dir_value, p_value, fdr_adjusted_p, status
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    str(uuid.uuid4()), scan_run_id, "bias", "zip_code", 0.33, 0.004, 0.008, "open"
                )
            )
            conn.commit()
    finally:
        repo._put_conn(conn)
    return scan_run_id


def run_e2e_with_seeded_finding():
    print("=" * 60)
    print("  E2E WITH SEEDED FINDING (proves full pipeline)")
    print("=" * 60)

    loop_start = time.time()

    scan_run_id = seed_scan_run_and_finding()
    print(f"Created scan_run_id: {scan_run_id}")
    print(f"Seeded 1 finding: zip_code dir=0.33 p=0.004 status=open")

    # Step 1: Synthesize patch (calls Groq LLM)
    patch_start = time.time()
    patch = synthesize_policy(scan_run_id)
    patch_elapsed = time.time() - patch_start
    print(f"\nPATCH ({patch_elapsed:.2f}s):")
    print(f"  policy_id: {patch.get('policy_id')}")
    print(f"  redact_fields: {patch.get('redact_fields')}")
    print(f"  rationale: {patch.get('rationale')}")
    print(f"  findings_addressed: {patch.get('findings_addressed')}")

    # Step 2: Verify fix
    verify_start = time.time()
    verify = verify_fix(scan_run_id)
    verify_elapsed = time.time() - verify_start
    print(f"\nVERIFY ({verify_elapsed:.2f}s):")
    for r in verify.get("results", []):
        print(f"  {r['combo_key']}: passed={r['passed']} dir={r['dir_value']}")
    print(f"  aggregate: {verify.get('aggregate_check', {}).get('message', 'N/A')}")
    assert verify_elapsed < 45, f"Agent 3 exceeded 45s: {verify_elapsed:.2f}s"

    # Step 3: CI Gate
    gate_start = time.time()
    gate = compute_ci_gate(scan_run_id)
    gate_elapsed = time.time() - gate_start
    print(f"\nCI GATE ({gate_elapsed:.2f}s): passed={gate.get('passed')}")

    total = time.time() - loop_start
    print(f"\nTOTAL LOOP TIME: {total:.2f}s")
    print(f"TIMING: {'PASS' if total < 90 else 'FAIL'} ({'under' if total < 90 else 'over'} 90s)")
    return scan_run_id, total


if __name__ == "__main__":
    scan_run_id, elapsed = run_e2e_with_seeded_finding()
    print(f"\n[RESULT] Full pipeline completed for scan_run_id={scan_run_id} in {elapsed:.2f}s")
