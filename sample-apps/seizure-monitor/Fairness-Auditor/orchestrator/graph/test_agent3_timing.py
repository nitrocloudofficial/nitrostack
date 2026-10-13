"""
test_agent3_timing.py — Verify Agent 3 verify_fix() orchestration overhead
stays under 45 seconds for 3 consecutive runs against the synthetic fixture.

SCOPE CAVEAT
------------
This test measures ORCHESTRATION overhead only (DB reads, stats computation,
Redis publish) against a small synthetic fixture.  It does NOT yet measure
real-world timing once target-service network calls replace the fixture —
that must be re-verified after target-service integration (Hour 9-12+ TODO
already marked in agent3_verifier.py).

Seed time (Postgres INSERT / ON CONFLICT) is measured separately from
verify_fix() time so the reported number measures only what the checklist
item asks about: the orchestration path itself.
"""

from __future__ import annotations

import sys
import time
from pathlib import Path

# Ensure orchestrator/ is on sys.path
_orchestrator_dir = Path(__file__).resolve().parent.parent
if str(_orchestrator_dir) not in sys.path:
    sys.path.insert(0, str(_orchestrator_dir))

from dotenv import load_dotenv
load_dotenv(dotenv_path=_orchestrator_dir / ".env")

from fixtures.fake_findings import FAKE_SCAN_RUN_ID, FAKE_FINDINGS

THRESHOLD_SECONDS = 45.0
N_RUNS = 3


def _reset_findings_to_open() -> None:
    """Reset all fake findings back to 'open' so the next verify_fix() run
    can find them via the policy.  Without this, the second and third runs
    would find findings already in a resolved/closed state and may behave
    differently from the first run."""
    from db import repo
    for f in FAKE_FINDINGS:
        repo.update_finding_status(f["id"], "open")


def _reseed() -> float:
    """
    Re-seed the fixture (idempotent Postgres INSERTs via ON CONFLICT DO NOTHING)
    and reset all findings to 'open'.

    Returns:
        seed_elapsed: seconds taken by this seeding step.
    """
    t0 = time.perf_counter()
    from fixtures.seed_fake_data import seed
    seed()
    _reset_findings_to_open()
    return time.perf_counter() - t0


def _ensure_policy(run_index: int) -> None:
    """
    Synthesize a fresh policy for FAKE_SCAN_RUN_ID.
    verify_fix() requires an active policy + mitigation_edges to exist.
    This is infrastructure setup, not measured in the verify_fix() timing.
    """
    from graph.agent2_synthesizer import synthesize_policy
    p = synthesize_policy(FAKE_SCAN_RUN_ID)
    print(f"  [setup run {run_index}] policy_id={p.get('policy_id')}")


def _setup_mock_redis() -> None:
    """Attach an in-memory Redis mock if real Redis is unavailable."""
    import os, redis as redis_lib
    import graph.agent3_verifier as agent3_mod

    class _MockBroker:
        def ping(self): return True
        def publish(self, ch, msg): pass
        def pubsub(self): return self
        def subscribe(self, ch): pass
        def get_message(self, **_): return None
        def close(self): pass

    try:
        url = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
        r = redis_lib.Redis.from_url(url, decode_responses=True)
        r.ping()
        r.close()
        print("[OK] Using live Redis for timing test")
    except Exception as e:
        print(f"[NOTE] Redis unavailable ({e}). Using in-memory mock.")
        agent3_mod._redis_client = _MockBroker()


def main():
    print("=" * 64)
    print("  TEST: Agent 3 verify_fix() timing — 3 runs, must each be < 45s")
    print("  (orchestration overhead only; seed time reported separately)")
    print("=" * 64)
    print()

    _setup_mock_redis()

    import graph.agent3_verifier as agent3_mod

    elapsed_times = []
    seed_times = []

    for i in range(1, N_RUNS + 1):
        print(f"--- Run {i} " + "-" * 56)

        # Seed (timed separately, not counted against the 45s requirement)
        t_seed_start = time.perf_counter()
        seed_elapsed = _reseed()
        seed_times.append(seed_elapsed)
        print(f"  [seed time]   {seed_elapsed:.4f}s  "
              f"(Postgres INSERT + finding status reset — NOT counted against 45s)")

        # Synthesize a fresh policy (infrastructure, not timed)
        _ensure_policy(i)

        # ── The actual measurement ────────────────────────────────────────
        t0 = time.perf_counter()
        result = agent3_mod.verify_fix(FAKE_SCAN_RUN_ID)
        elapsed = time.perf_counter() - t0
        # ─────────────────────────────────────────────────────────────────

        elapsed_times.append(elapsed)
        combos_verified = len(result.get("results", []))
        agg = result.get("aggregate_check", {})
        print(f"  verify_fix()  {elapsed:.4f}s  "
              f"({combos_verified} combos verified, "
              f"agg_delta={agg.get('delta', 'N/A')} flagged={agg.get('flagged', 'N/A')})")
        print(f"  Run {i}: {elapsed:.2f}s")
        print()

    # ── Summary ───────────────────────────────────────────────────────────
    print("=" * 64)
    print("  TIMING SUMMARY")
    print("=" * 64)
    for i, (vt, st) in enumerate(zip(elapsed_times, seed_times), 1):
        label = "PASS" if vt < THRESHOLD_SECONDS else "FAIL"
        print(f"  Run {i}: {vt:.4f}s  (seed: {st:.4f}s)  [{label} — threshold {THRESHOLD_SECONDS}s]")

    avg_elapsed = sum(elapsed_times) / len(elapsed_times)
    all_pass = all(t < THRESHOLD_SECONDS for t in elapsed_times)

    print()
    print(f"  Average verify_fix() time: {avg_elapsed:.4f}s")
    print(f"  All {N_RUNS} runs under {THRESHOLD_SECONDS}s: {'YES' if all_pass else 'NO'}")
    print()

    # ── Final assertion ───────────────────────────────────────────────────
    for i, t in enumerate(elapsed_times, 1):
        assert t < THRESHOLD_SECONDS, (
            f"FAIL: Run {i} took {t:.4f}s — exceeds {THRESHOLD_SECONDS}s threshold.  "
            "This is a pure orchestration timing failure (no target-service calls in fixture path)."
        )

    if all_pass:
        print(f"  RESULT: PASS — all {N_RUNS} runs completed under {THRESHOLD_SECONDS}s "
              f"(avg {avg_elapsed:.4f}s)")
    else:
        print(f"  RESULT: FAIL — one or more runs exceeded {THRESHOLD_SECONDS}s")

    print("=" * 64)


if __name__ == "__main__":
    main()
