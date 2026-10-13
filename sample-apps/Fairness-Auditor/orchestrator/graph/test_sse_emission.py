"""
test_sse_emission.py — Verify Redis SSE per-combo progress from verify_fix().

Subscribes to "agent3:progress" channel, calls verify_fix(),
and asserts one message per combo with correct fields according to Gap #3 spec.
"""

import json
import os
import sys
import threading
import time
from pathlib import Path

# Ensure orchestrator/ is on sys.path
_orchestrator_dir = Path(__file__).resolve().parent.parent
if str(_orchestrator_dir) not in sys.path:
    sys.path.insert(0, str(_orchestrator_dir))

from dotenv import load_dotenv
load_dotenv(dotenv_path=_orchestrator_dir / ".env")

import redis as redis_lib

REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
SCAN_RUN_ID = "00000000-0000-0000-0000-000000000001"
EXPECTED_COMBOS = {"zip_code=90210", "applicant_name=Jamal"}


class MockPubSub:
    def __init__(self, broker):
        self.broker = broker
        self.channel = None
        self.queue = []

    def subscribe(self, channel):
        self.channel = channel
        self.broker.subscribers.setdefault(channel, []).append(self)

    def unsubscribe(self):
        if self.channel and self.channel in self.broker.subscribers:
            if self in self.broker.subscribers[self.channel]:
                self.broker.subscribers[self.channel].remove(self)

    def get_message(self, timeout=1.0):
        start = time.time()
        while time.time() - start < timeout:
            if self.queue:
                return self.queue.pop(0)
            time.sleep(0.01)
        return None

    def close(self):
        self.unsubscribe()


class MockRedisBroker:
    def __init__(self):
        self.subscribers = {}

    def ping(self):
        return True

    def publish(self, channel, message):
        subs = self.subscribers.get(channel, [])
        for sub in subs:
            sub.queue.append({"type": "message", "channel": channel, "data": message})
        return len(subs)

    def pubsub(self):
        return MockPubSub(self)

    def close(self):
        pass


def main():
    print("=" * 60)
    print("  TEST: Redis SSE per-combo progress from verify_fix()")
    print("=" * 60)

    # Check if real Redis is available, else mock for local Windows environment
    use_mock = False
    try:
        r = redis_lib.Redis.from_url(REDIS_URL, decode_responses=True)
        r.ping()
        print(f"[OK] Connected to live Redis at {REDIS_URL}")
        r.close()
    except Exception as e:
        print(f"[NOTE] Live Redis unavailable ({e}). Using in-memory Redis broker for test.")
        use_mock = True

    mock_broker = MockRedisBroker() if use_mock else None

    # Patch redis in agent3_verifier if using mock
    import graph.agent3_verifier as agent3_mod
    if use_mock:
        agent3_mod._redis_client = mock_broker
        orig_from_url = redis_lib.Redis.from_url
        redis_lib.Redis.from_url = lambda *a, **kw: mock_broker

    # 1. Seed fixture data
    from fixtures.seed_fake_data import seed
    seed()

    from db import repo
    from fixtures.fake_findings import FAKE_FINDINGS
    for f in FAKE_FINDINGS:
        repo.update_finding_status(f["id"], "open")

    from graph.agent2_synthesizer import synthesize_policy
    synth_result = synthesize_policy(SCAN_RUN_ID)
    print(f"[setup] Synthesized policy: {synth_result.get('policy_id')}")

    # 2. Start subscriber
    received = []
    ready_event = threading.Event()
    stop_event = threading.Event()

    def subscriber_thread():
        if use_mock:
            ps = mock_broker.pubsub()
        else:
            r_sub = redis_lib.Redis.from_url(REDIS_URL, decode_responses=True)
            ps = r_sub.pubsub()
        
        ps.subscribe("agent3:progress")
        ready_event.set()

        while not stop_event.is_set():
            msg = ps.get_message(timeout=0.5)
            if msg and msg.get("type") == "message":
                data = json.loads(msg["data"])
                received.append(data)

        ps.close()

    t = threading.Thread(target=subscriber_thread, daemon=True)
    t.start()
    ready_event.wait(timeout=5.0)
    print("[OK] Subscriber listening on channel 'agent3:progress'")
    time.sleep(0.2)

    # 3. Call verify_fix()
    print("[run] Calling verify_fix()...")
    result = agent3_mod.verify_fix(SCAN_RUN_ID)
    print(f"[OK] verify_fix() complete. Results count: {len(result.get('results', []))}")

    # 4. Wait for messages
    time.sleep(0.5)
    stop_event.set()
    t.join(timeout=2.0)

    # 5. Output received messages
    print()
    print("-" * 60)
    print(f"  RECEIVED {len(received)} SSE PROGRESS MESSAGE(S)")
    print("-" * 60)
    for i, msg in enumerate(received):
        print(f"Message {i+1}:\n{json.dumps(msg, indent=2)}")
    print("-" * 60)

    # 6. Assertions
    EXPECTED_COMBO_COUNT = len(EXPECTED_COMBOS)   # 2 combo_result messages
    EXPECTED_TOTAL_MSGS  = EXPECTED_COMBO_COUNT + 1  # + 1 aggregate_summary

    assert len(received) == EXPECTED_TOTAL_MSGS, (
        f"Expected {EXPECTED_TOTAL_MSGS} messages (2 combo_result + 1 aggregate_summary), "
        f"got {len(received)}"
    )
    print(f"[PASS] Received exactly {EXPECTED_TOTAL_MSGS} SSE messages")

    # Split messages by type
    combo_msgs     = [m for m in received if m.get("type") == "combo_result"]
    agg_msgs       = [m for m in received if m.get("type") == "aggregate_summary"]
    unknown_msgs   = [m for m in received if m.get("type") not in ("combo_result", "aggregate_summary")]

    assert len(combo_msgs)   == 2, f"Expected 2 combo_result messages, got {len(combo_msgs)}"
    assert len(agg_msgs)     == 1, f"Expected 1 aggregate_summary message, got {len(agg_msgs)}"
    assert len(unknown_msgs) == 0, f"Unexpected message types: {unknown_msgs}"
    print(f"[PASS] 2 combo_result + 1 aggregate_summary — message types correct")

    # Combo_result assertions (same fields as before, plus 'type')
    received_combos = {m["combo_key"] for m in combo_msgs}
    assert received_combos == EXPECTED_COMBOS, (
        f"Combo keys mismatch: {received_combos} vs {EXPECTED_COMBOS}"
    )
    print(f"[PASS] combo_result combo_keys: {received_combos}")

    for msg in combo_msgs:
        assert msg["type"]        == "combo_result"
        assert msg["scan_run_id"] == SCAN_RUN_ID
        assert msg["status"]      in ("passed", "failed")
        assert "dir_value"   in msg
        assert "p_value"     in msg
        assert "adj_p_value" in msg
        assert "ts"          in msg
    print("[PASS] All combo_result messages have correct fields")

    # Aggregate_summary assertions
    agg = agg_msgs[0]
    assert agg["type"]           == "aggregate_summary"
    assert agg["scan_run_id"]    == SCAN_RUN_ID
    assert "pre_patch_rate"       in agg
    assert "post_patch_rate"      in agg
    assert "delta"                in agg
    assert "flagged"              in agg
    assert isinstance(agg["flagged"], bool)
    print(f"[PASS] aggregate_summary: pre={agg['pre_patch_rate']} "
          f"post={agg['post_patch_rate']} delta={agg['delta']} flagged={agg['flagged']}")

    print("\n[SUCCESS] TASK 1 — All SSE progress emission assertions PASSED "
          "(3 messages: 2 combo_result + 1 aggregate_summary)!")


if __name__ == "__main__":
    main()
