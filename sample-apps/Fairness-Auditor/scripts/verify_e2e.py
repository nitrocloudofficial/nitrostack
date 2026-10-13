"""
AFO Full End-to-End Integration Test
Runs: audit -> patch -> verify -> ci_gate
Reports timing for each step.
"""
import sys
import os
import time

# Ensure orchestrator is on path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'orchestrator'))
os.chdir(os.path.join(os.path.dirname(__file__), '..', 'orchestrator'))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), '..', 'orchestrator', '.env'))

from track_a.agent1_auditor import build_graph as build_audit_graph
from graph.agent2_synthesizer import synthesize_policy
from graph.agent3_verifier import verify_fix
from gate import compute_ci_gate


def run_e2e(run_number: int):
    print(f"\n{'='*60}")
    print(f"  E2E RUN #{run_number}")
    print(f"{'='*60}")
    
    loop_start = time.time()
    
    # Step 1: Bias Audit
    audit_start = time.time()
    graph = build_audit_graph()
    result = graph.invoke({"target_name": "loan-decision-agent"})
    audit = {"scan_run_id": result["scan_run_id"], "findings": result["findings"]}
    audit_elapsed = time.time() - audit_start
    print(f"AUDIT ({audit_elapsed:.2f}s): scan_run_id={audit['scan_run_id']}, findings_count={len(audit['findings'])}")
    
    assert "scan_run_id" in audit, "run_bias_audit did not return a scan_run_id"
    
    if not audit["findings"]:
        print("NOTE: zero findings on this run. Low power with small fixture set.")
    else:
        scan_run_id = audit["scan_run_id"]
        for f in audit["findings"]:
            print(f"  Finding: {f.get('combo_key')} dir={f.get('dir_value')} status={f.get('status')}")
        
        # Step 2: Synthesize patch
        patch_start = time.time()
        patch = synthesize_policy(scan_run_id)
        patch_elapsed = time.time() - patch_start
        print(f"PATCH ({patch_elapsed:.2f}s): policy_id={patch.get('policy_id')}, redact={patch.get('redact_fields')}")
        
        # Step 3: Verify
        verify_start = time.time()
        verify = verify_fix(scan_run_id)
        verify_elapsed = time.time() - verify_start
        print(f"VERIFY ({verify_elapsed:.2f}s): combos={len(verify.get('results', []))}")
        for r in verify.get("results", []):
            print(f"  {r['combo_key']}: passed={r['passed']} dir={r['dir_value']}")
        assert verify_elapsed < 45, f"Agent 3 exceeded 45s budget: {verify_elapsed:.2f}s"
        
        # Step 4: CI Gate
        gate_start = time.time()
        gate = compute_ci_gate(scan_run_id)
        gate_elapsed = time.time() - gate_start
        print(f"CI GATE ({gate_elapsed:.2f}s): passed={gate.get('passed')}")
    
    total = time.time() - loop_start
    print(f"TOTAL LOOP TIME: {total:.2f}s")
    if total < 90:
        print(f"  TIMING: PASS (under 90s)")
    else:
        print(f"  TIMING: FAIL (exceeded 90s budget)")
    
    return total


if __name__ == "__main__":
    times = []
    for i in range(1, 4):
        t = run_e2e(i)
        times.append(t)
    
    print(f"\n{'='*60}")
    print(f"  SUMMARY: 3 runs = {[f'{t:.2f}s' for t in times]}")
    print(f"  All under 90s: {all(t < 90 for t in times)}")
    print(f"{'='*60}")
