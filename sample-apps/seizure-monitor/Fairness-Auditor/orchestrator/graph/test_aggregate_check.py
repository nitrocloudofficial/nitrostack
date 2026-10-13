"""
test_aggregate_check.py — Verify aggregate decision rate check in verify_fix().

BY-HAND EXPECTED VALUES (computed before writing code, not inferred from output):
  pre_patch_rate  = 340 / 500 = 0.6800   (68.00%)
  post_patch_rate = 335 / 500 = 0.6700   (67.00%)
  delta           = |0.6700 - 0.6800| = 0.0100   (1.00 percentage points)
  threshold       = 0.05                          (5.00 percentage points)
  flagged         = False  (0.0100 < 0.0500 → NOT above threshold)

The test asserts flagged==False.  If this assertion fails, the math or the
fixture constants are wrong — not the test.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

# Ensure orchestrator/ is on sys.path
_orchestrator_dir = Path(__file__).resolve().parent.parent
if str(_orchestrator_dir) not in sys.path:
    sys.path.insert(0, str(_orchestrator_dir))

from dotenv import load_dotenv
load_dotenv(dotenv_path=_orchestrator_dir / ".env")

import graph.agent3_verifier as agent3_mod


def _setup_mock_redis() -> object:
    """
    Use an in-memory mock broker if real Redis is unavailable.
    Returns the broker used (real or mock), for the caller to inspect.
    """
    import redis as redis_lib

    class _MockPubSub:
        def subscribe(self, ch): pass
        def get_message(self, **_): return None
        def close(self): pass

    class _MockBroker:
        def ping(self): return True
        def publish(self, ch, msg): pass
        def pubsub(self): return _MockPubSub()
        def close(self): pass

    try:
        import os
        url = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
        r = redis_lib.Redis.from_url(url, decode_responses=True)
        r.ping()
        print("[OK] Connected to live Redis")
        r.close()
        return None  # use real Redis via agent3_mod's own _get_redis()
    except Exception as e:
        print(f"[NOTE] Redis unavailable ({e}). Using in-memory mock.")
        broker = _MockBroker()
        agent3_mod._redis_client = broker
        return broker


def main():
    print("=" * 64)
    print("  TEST: aggregate_check key in verify_fix() return dict")
    print("=" * 64)

    # ── Pre-computation sanity check (printed for record) ────────────────
    EXPECTED_PRE_RATE  = round(340 / 500, 6)   # 0.68
    EXPECTED_POST_RATE = round(335 / 500, 6)   # 0.67
    EXPECTED_DELTA     = round(abs(EXPECTED_POST_RATE - EXPECTED_PRE_RATE), 6)  # 0.01
    EXPECTED_FLAGGED   = EXPECTED_DELTA > 0.05  # False — 0.01 < 0.05

    print(f"\n[by-hand] pre_patch_rate  = {EXPECTED_PRE_RATE}  (340/500)")
    print(f"[by-hand] post_patch_rate = {EXPECTED_POST_RATE}  (335/500)")
    print(f"[by-hand] delta           = {EXPECTED_DELTA}  ({EXPECTED_DELTA*100:.2f} pp)")
    print(f"[by-hand] threshold       = 0.05 (5.00 pp)")
    print(f"[by-hand] flagged         = {EXPECTED_FLAGGED}  (delta < threshold)")
    print()

    # ── Mock Redis if needed ─────────────────────────────────────────────
    _setup_mock_redis()

    # ── Seed fixture data ────────────────────────────────────────────────
    from fixtures.seed_fake_data import seed
    seed()

    from db import repo
    from fixtures.fake_findings import FAKE_FINDINGS, FAKE_SCAN_RUN_ID
    for f in FAKE_FINDINGS:
        repo.update_finding_status(f["id"], "open")
    print("[setup] Findings reset to 'open'")

    from graph.agent2_synthesizer import synthesize_policy
    synth = synthesize_policy(FAKE_SCAN_RUN_ID)
    print(f"[setup] Policy synthesized: {synth.get('policy_id')}")

    # ── Call verify_fix() ────────────────────────────────────────────────
    print("\n[run] Calling verify_fix()...")
    result = agent3_mod.verify_fix(FAKE_SCAN_RUN_ID)

    # ── Pretty-print full return dict ────────────────────────────────────
    print("\n[result] verify_fix() returned:")
    print(json.dumps(result, indent=2))

    # ── Assertions ───────────────────────────────────────────────────────
    print("\n" + "-" * 64)
    print("  ASSERTIONS")
    print("-" * 64)

    # 1. aggregate_check key exists
    assert "aggregate_check" in result, \
        "FAIL: 'aggregate_check' key missing from verify_fix() return dict"
    print("[PASS] 'aggregate_check' key present in return dict")

    agg = result["aggregate_check"]

    # 2. All expected sub-fields present
    for field in ("pre_patch_rate", "post_patch_rate", "delta", "flagged", "message"):
        assert field in agg, f"FAIL: sub-field '{field}' missing from aggregate_check"
        print(f"[PASS] sub-field '{field}' present: {agg[field]!r}")

    # 3. Existing keys untouched
    for key in ("scan_run_id", "policy_id", "results"):
        assert key in result, f"FAIL: existing key '{key}' was removed or renamed"
    print("[PASS] All existing return-dict keys untouched")

    # 4. Numeric values match by-hand expectation (within floating-point tolerance)
    assert abs(agg["pre_patch_rate"]  - EXPECTED_PRE_RATE)  < 1e-9, \
        f"FAIL: pre_patch_rate {agg['pre_patch_rate']} != expected {EXPECTED_PRE_RATE}"
    print(f"[PASS] pre_patch_rate  = {agg['pre_patch_rate']}  (expected {EXPECTED_PRE_RATE})")

    assert abs(agg["post_patch_rate"] - EXPECTED_POST_RATE) < 1e-9, \
        f"FAIL: post_patch_rate {agg['post_patch_rate']} != expected {EXPECTED_POST_RATE}"
    print(f"[PASS] post_patch_rate = {agg['post_patch_rate']}  (expected {EXPECTED_POST_RATE})")

    assert abs(agg["delta"] - EXPECTED_DELTA) < 1e-9, \
        f"FAIL: delta {agg['delta']} != expected {EXPECTED_DELTA}"
    print(f"[PASS] delta           = {agg['delta']}  (expected {EXPECTED_DELTA})")

    # 5. flagged must be False — delta 0.010 < threshold 0.050
    assert agg["flagged"] == EXPECTED_FLAGGED, \
        (f"FAIL: flagged={agg['flagged']} but expected {EXPECTED_FLAGGED}.  "
         f"delta={agg['delta']}, threshold=0.05")
    print(f"[PASS] flagged         = {agg['flagged']}  "
          f"(delta {agg['delta']*100:.2f} pp < threshold 5.00 pp -> not flagged)")

    print()
    print("=" * 64)
    print("  [SUCCESS] All aggregate_check assertions PASSED!")
    print("=" * 64)


if __name__ == "__main__":
    main()
