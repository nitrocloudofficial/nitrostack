"""End-to-end determinism test — REQUIRES live Postgres.

Verifies that two graph invocations with identical inputs produce identical
statistical output (DIR values, p-values).  scan_run_id intentionally
differs per run (new row each time — that's correct behaviour).

Prerequisites:
  - DATABASE_URL in orchestrator/.env points to a running Postgres instance
    with the schema from orchestrator/db/schema.sql applied.
  - Run this test after running `docker compose up -d` and applying the schema.

This test is the PR-blocking determinism gate described in the checklist.
Run it manually 3× and diff the output before opening your Hour-6 PR.
"""
import pytest
from orchestrator.track_a.agent1_auditor import build_graph


# ── Helpers ───────────────────────────────────────────────────────────────────

def _sorted_findings_tuples(findings: list[dict]) -> list[tuple]:
    """Return findings as sorted tuples for stable comparison."""
    return sorted(
        (f["combo_key"], round(f["dir_value"], 10), round(f["p_value"], 10))
        for f in findings
    )


# ── Tests ─────────────────────────────────────────────────────────────────────

class TestDeterminism:
    """Full integration tests that need a live Postgres instance."""

    def test_scan_is_deterministic_across_runs(self):
        """Fixed seed → identical DIR and p-values across repeated invocations.

        scan_run_id will differ (new Postgres UUID each time) — that's
        expected and correct.  We compare statistical output only.
        """
        graph = build_graph()
        run_1 = graph.invoke(
            {"target_name": "loan-decision-agent", "budget_remaining": 5}
        )
        run_2 = graph.invoke(
            {"target_name": "loan-decision-agent", "budget_remaining": 5}
        )

        # scan_run_id MUST differ — each run creates its own row
        assert run_1["scan_run_id"] != run_2["scan_run_id"], (
            "scan_run_id should differ across runs — each run creates a new scan_run row"
        )

        # Statistical output MUST be identical
        dir_values_1 = sorted(f["dir_value"] for f in run_1["findings"])
        dir_values_2 = sorted(f["dir_value"] for f in run_2["findings"])
        assert dir_values_1 == dir_values_2, (
            f"DIR values diverged:\n  run 1: {dir_values_1}\n  run 2: {dir_values_2}"
        )

    def test_three_runs_produce_identical_findings_shape(self):
        """Triple-run determinism check — required by the PR checklist.

        Run this test and attach its output to the PR description as proof.
        """
        graph = build_graph()
        runs = [
            graph.invoke({"target_name": "loan-decision-agent", "budget_remaining": 5})
            for _ in range(3)
        ]

        findings_shapes = [_sorted_findings_tuples(r["findings"]) for r in runs]

        assert findings_shapes[0] == findings_shapes[1], (
            f"Run 0 vs Run 1 mismatch:\n  {findings_shapes[0]}\n  {findings_shapes[1]}"
        )
        assert findings_shapes[0] == findings_shapes[2], (
            f"Run 0 vs Run 2 mismatch:\n  {findings_shapes[0]}\n  {findings_shapes[2]}"
        )

    def test_scan_run_id_is_valid_uuid_string(self):
        """scan_run_id returned by the graph should be a valid UUID string."""
        import uuid

        graph = build_graph()
        result = graph.invoke(
            {"target_name": "loan-decision-agent", "budget_remaining": 2}
        )
        # This raises ValueError if not a valid UUID
        parsed = uuid.UUID(result["scan_run_id"])
        assert str(parsed) == result["scan_run_id"]

    def test_findings_have_required_keys(self):
        """Every finding entry must carry the four required fields for A's contract."""
        graph = build_graph()
        result = graph.invoke(
            {"target_name": "loan-decision-agent", "budget_remaining": 5}
        )
        required_keys = {"combo_key", "dir_value", "p_value", "fdr_adjusted_p"}
        for finding in result["findings"]:
            assert required_keys.issubset(finding.keys()), (
                f"Finding missing keys: {required_keys - finding.keys()}\n  {finding}"
            )

    def test_finding_dir_values_all_below_threshold(self):
        """All persisted findings must have DIR < 0.80 — the four-fifths rule."""
        from orchestrator.track_a.agent1_auditor import DIR_THRESHOLD

        graph = build_graph()
        result = graph.invoke(
            {"target_name": "loan-decision-agent", "budget_remaining": 10}
        )
        for finding in result["findings"]:
            assert finding["dir_value"] < DIR_THRESHOLD, (
                f"Finding with DIR >= {DIR_THRESHOLD} should not be flagged: {finding}"
            )

    def test_finding_fdr_adjusted_p_geq_raw_p(self):
        """BH adjustment should never deflate p-values."""
        graph = build_graph()
        result = graph.invoke(
            {"target_name": "loan-decision-agent", "budget_remaining": 10}
        )
        for finding in result["findings"]:
            assert finding["fdr_adjusted_p"] >= finding["p_value"] - 1e-12, (
                f"fdr_adjusted_p < p_value in finding: {finding}"
            )
