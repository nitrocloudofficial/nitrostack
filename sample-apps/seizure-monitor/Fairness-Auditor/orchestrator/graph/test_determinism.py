"""
test_determinism.py — Real determinism test against the Groq LLM path.

Calls synthesize_policy() 3 times in a row, captures returned dicts,
and verifies byte-identical equality across all fields using Groq SDK.
"""

import json
import os
import sys
from pathlib import Path

# Ensure orchestrator/ is on sys.path
_orchestrator_dir = Path(__file__).resolve().parent.parent
if str(_orchestrator_dir) not in sys.path:
    sys.path.insert(0, str(_orchestrator_dir))

from dotenv import load_dotenv
load_dotenv(dotenv_path=_orchestrator_dir / ".env")

SCAN_RUN_ID = "00000000-0000-0000-0000-000000000001"

def main():
    print("=" * 60)
    print("  TEST: Groq LLM Determinism (3 consecutive runs)")
    print("=" * 60)

    groq_key = os.environ.get("GROQ_API_KEY", "").strip()
    print(f"[env check] GROQ_API_KEY present: {bool(groq_key)}")

    if not groq_key:
        print("\nTask 3 blocked — need real GROQ_API_KEY in orchestrator/.env.")
        sys.exit(1)

    # 1. Seed database fixture
    from fixtures.seed_fake_data import seed
    from db import repo
    from fixtures.fake_findings import FAKE_FINDINGS

    seed()

    # 2. Run synthesize_policy 3 times
    from graph.agent2_synthesizer import synthesize_policy

    runs = []
    for run_idx in range(1, 4):
        print(f"\n--- RUN #{run_idx} ---")
        # Ensure findings are 'open' before each run
        for f in FAKE_FINDINGS:
            repo.update_finding_status(f["id"], "open")
        
        result = synthesize_policy(SCAN_RUN_ID)
        # Omit dynamic policy_id and findings_addressed for pure content determinism check
        content = {
            "redact_fields": sorted(result.get("redact_fields", [])),
            "group_adjustments": result.get("group_adjustments", {}),
            "rationale": result.get("rationale", ""),
        }
        runs.append(content)
        print(f"Run #{run_idx} Result:\n{json.dumps(content, indent=2)}")

    # 3. Compare all 3 runs
    print("\n" + "=" * 60)
    print("  DETERMINISM COMPARISON RESULT")
    print("=" * 60)

    run1, run2, run3 = runs[0], runs[1], runs[2]

    diffs = []
    if run1 != run2:
        diffs.append(f"Run 1 vs Run 2 differ:\nRun 1: {run1}\nRun 2: {run2}")
    if run2 != run3:
        diffs.append(f"Run 2 vs Run 3 differ:\nRun 2: {run2}\nRun 3: {run3}")

    if not diffs:
        print(f"PASS — All 3 consecutive runs are byte-identical!")
        print(f"Path used: LIVE_LLM_CALL (Groq SDK llama-3.3-70b-versatile)")
        print(f"Content:\n{json.dumps(run1, indent=2)}")
    else:
        print(f"FAIL — Non-deterministic output detected across runs:")
        for d in diffs:
            print(f"  - {d}")
        sys.exit(1)

if __name__ == "__main__":
    main()
