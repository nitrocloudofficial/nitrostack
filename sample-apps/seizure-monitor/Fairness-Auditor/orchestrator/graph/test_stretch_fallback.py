"""
test_stretch_fallback.py — Tests the FALLBACK PATHS of stretch_mcp_tools.py.

These tests do NOT require a live MCP client. All ctx methods are mocked.
Three scenarios tested:
  1. Sampling fails -> falls back to synthesize_policy() (Groq)
  2. Elicitation declined -> returns {"status": "declined_by_operator"}, NO DB write
  3. Elicitation approved -> returns {"status": "applied", "policy": {...}}, DB row created

IMPORTANT: These tests only cover the offline fallback paths. The actual
Sampling and Elicitation behavior (live ctx.session.create_message / ctx.elicit)
requires a real MCP client and MUST be re-verified by Person A after integrating
stretch_mcp_tools.py into mcp_server.py.
"""

import asyncio
import json
import sys
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock

# Ensure orchestrator/ is on sys.path
_orchestrator_dir = Path(__file__).resolve().parent.parent
if str(_orchestrator_dir) not in sys.path:
    sys.path.insert(0, str(_orchestrator_dir))

from dotenv import load_dotenv
load_dotenv(dotenv_path=_orchestrator_dir / ".env")

SCAN_RUN_ID = "00000000-0000-0000-0000-000000000001"


def _make_mock_ctx(*, sampling_raises=False, elicit_returns=None):
    """Build a mock Context object with configurable behavior."""
    ctx = MagicMock()
    ctx.session = MagicMock()

    if sampling_raises:
        ctx.session.create_message = AsyncMock(
            side_effect=Exception("Client does not support sampling")
        )
    else:
        ctx.session.create_message = AsyncMock(return_value={"content": "mock client response"})

    if elicit_returns is not None:
        ctx.elicit = AsyncMock(return_value=elicit_returns)
    else:
        ctx.elicit = AsyncMock(return_value=True)

    return ctx


def _seed_and_reset():
    """Idempotently seed fixtures and reset findings to open."""
    from fixtures.seed_fake_data import seed
    from db import repo
    from fixtures.fake_findings import FAKE_FINDINGS

    seed()
    for f in FAKE_FINDINGS:
        repo.update_finding_status(f["id"], "open")


def _print_scenario(n: int, title: str):
    print()
    print(f"{'=' * 60}")
    print(f"  SCENARIO {n}: {title}")
    print(f"{'=' * 60}")


async def test_scenario_1_sampling_fallback():
    """
    SCENARIO 1: ctx.session.create_message raises an exception.
    Expected: synthesize_patch_via_sampling() falls back to synthesize_policy()
              and returns a valid policy dict with source="groq_fallback".
    """
    _print_scenario(1, "Sampling fails -- fallback to synthesize_policy()")
    _seed_and_reset()

    from graph.stretch_mcp_tools import synthesize_patch_via_sampling

    ctx = _make_mock_ctx(sampling_raises=True)
    result = await synthesize_patch_via_sampling(SCAN_RUN_ID, ctx)

    print(f"Result:\n{json.dumps(result, indent=2, default=str)}")

    # Assertions
    assert result.get("source") == "groq_fallback", \
        f"Expected source='groq_fallback', got source={result.get('source')!r}"
    assert "redact_fields" in result, "Missing 'redact_fields' in fallback result"
    assert isinstance(result.get("redact_fields"), list), "'redact_fields' must be a list"
    assert "rationale" in result, "Missing 'rationale' in fallback result"
    assert result.get("policy_id") is not None, "Expected policy_id to be set from DB write"

    ctx.session.create_message.assert_called_once()
    print("PASS — Sampling fallback returns valid synthesize_policy() output with source='groq_fallback'")
    return result


async def test_scenario_2_elicitation_declined():
    """
    SCENARIO 2: ctx.elicit returns False (operator declines).
    Expected: returns {"status": "declined_by_operator"}, NO new policy row written.
    """
    _print_scenario(2, "Elicitation declined -- no DB write")
    _seed_and_reset()

    from db import repo
    from graph.stretch_mcp_tools import synthesize_and_apply_patch_with_approval

    # Count policies before
    policies_before = repo.get_policy_history(SCAN_RUN_ID)
    n_before = len(policies_before)
    print(f"[pre-check] Policies in DB before: {n_before}")

    ctx = _make_mock_ctx(elicit_returns=False)
    result = await synthesize_and_apply_patch_with_approval(SCAN_RUN_ID, ctx)

    print(f"Result: {json.dumps(result, indent=2, default=str)}")

    # Assertions
    assert result == {"status": "declined_by_operator"}, \
        f"Expected declined_by_operator, got: {result}"

    policies_after = repo.get_policy_history(SCAN_RUN_ID)
    n_after = len(policies_after)
    print(f"[post-check] Policies in DB after: {n_after}")
    assert n_after == n_before, \
        f"DB write occurred despite operator declining! Before={n_before}, After={n_after}"

    ctx.elicit.assert_called_once()
    print("PASS — Elicitation declined: returned 'declined_by_operator', no DB write confirmed")
    return result


async def test_scenario_3_elicitation_approved():
    """
    SCENARIO 3: ctx.elicit returns True (operator approves).
    Expected: returns {"status": "applied", "policy": {...}}, policy IS written to DB.
    """
    _print_scenario(3, "Elicitation approved -- policy applied + DB write")
    _seed_and_reset()

    from db import repo
    from graph.stretch_mcp_tools import synthesize_and_apply_patch_with_approval

    policies_before = repo.get_policy_history(SCAN_RUN_ID)
    n_before = len(policies_before)
    print(f"[pre-check] Policies in DB before: {n_before}")

    ctx = _make_mock_ctx(elicit_returns=True)
    result = await synthesize_and_apply_patch_with_approval(SCAN_RUN_ID, ctx)

    print(f"Result:\n{json.dumps(result, indent=2, default=str)}")

    # Assertions
    assert result.get("status") == "applied", \
        f"Expected status='applied', got: {result.get('status')!r}"
    assert "policy" in result, "Missing 'policy' key in applied result"
    assert result["policy"].get("id") is not None, "Policy row must have an id"

    policies_after = repo.get_policy_history(SCAN_RUN_ID)
    n_after = len(policies_after)
    print(f"[post-check] Policies in DB after: {n_after}")
    assert n_after == n_before + 1, \
        f"Expected 1 new DB row. Before={n_before}, After={n_after}"

    ctx.elicit.assert_called_once()
    print("PASS — Elicitation approved: policy applied and new DB row confirmed")
    return result


async def main():
    print("=" * 60)
    print("  test_stretch_fallback.py — Stretch MCP Fallback Path Tests")
    print("  NOTE: These tests use mocked ctx — no live MCP client needed")
    print("=" * 60)

    results = {}
    failed = []

    try:
        results["scenario_1"] = await test_scenario_1_sampling_fallback()
    except Exception as e:
        print(f"SCENARIO 1 FAILED: {e}")
        failed.append("Scenario 1 — Sampling fallback")

    try:
        results["scenario_2"] = await test_scenario_2_elicitation_declined()
    except Exception as e:
        print(f"SCENARIO 2 FAILED: {e}")
        failed.append("Scenario 2 — Elicitation declined")

    try:
        results["scenario_3"] = await test_scenario_3_elicitation_approved()
    except Exception as e:
        print(f"SCENARIO 3 FAILED: {e}")
        failed.append("Scenario 3 — Elicitation approved")

    print()
    print("=" * 60)
    print("  FINAL SUMMARY")
    print("=" * 60)
    if failed:
        print(f"FAILED scenarios: {failed}")
        sys.exit(1)
    else:
        print("ALL 3 FALLBACK SCENARIOS PASSED")
        print()
        print("EXPLICIT FLAG: This test covers OFFLINE FALLBACK PATHS ONLY.")
        print("The live Sampling (ctx.session.create_message) and Elicitation")
        print("(ctx.elicit) behaviors MUST be re-tested by Person A after")
        print("integrating stretch_mcp_tools.py into orchestrator/mcp_server.py.")


if __name__ == "__main__":
    asyncio.run(main())
