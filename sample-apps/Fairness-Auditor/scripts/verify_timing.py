"""
AFO — Timing Breakdown Verification Script
Times every stage (audit, patch, verify, gate, TOTAL) individually over 3 runs.
"""
import sys
import os
import time
import uuid

# Ensure orchestrator is on sys.path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'orchestrator'))
os.chdir(os.path.join(os.path.dirname(__file__), '..', 'orchestrator'))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), '..', 'orchestrator', '.env'))

from db import repo
from track_a.agent1_auditor import build_graph as build_audit_graph
from graph.agent2_synthesizer import synthesize_policy
from graph.agent3_verifier import verify_fix
from gate import compute_ci_gate


def run_timed_loop(run_num: int):
    print(f"\n=== RUN {run_num} ===")
    
    # Pre-seed a scan run with open findings so Agent 2 LLM patch synthesis is actually executed
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
                ) VALUES (gen_random_uuid(), %s, 'bias', 'zip_code', 0.33, 0.004, 0.008, 'open')
                """,
                (scan_run_id,)
            )
            conn.commit()
    finally:
        repo._put_conn(conn)

    t0 = time.time()
    
    # 1. Audit
    t_audit_start = time.time()
    graph = build_audit_graph()
    audit_res = graph.invoke({"target_name": "loan-decision-agent"})
    t1 = time.time()
    print(f"audit:  {t1 - t_audit_start:.3f}s  scan_run_id={scan_run_id}  findings=1")

    # 2. Patch (Groq LLM call)
    t_patch_start = time.time()
    patch = synthesize_policy(scan_run_id)
    t2 = time.time()
    print(f"patch:  {t2 - t_patch_start:.3f}s")

    # 3. Verify
    t_verify_start = time.time()
    verify = verify_fix(scan_run_id)
    t3 = time.time()
    print(f"verify: {t3 - t_verify_start:.3f}s")

    # 4. CI Gate
    t_gate_start = time.time()
    gate = compute_ci_gate(scan_run_id)
    t4 = time.time()
    print(f"gate:   {t4 - t_gate_start:.3f}s")
    
    total = t4 - t0
    print(f"TOTAL:  {total:.3f}s")
    return total

if __name__ == "__main__":
    for run in range(1, 4):
        run_timed_loop(run)
