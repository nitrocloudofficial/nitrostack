"""Unit tests for orchestrator/stats/dir.py.

Covers:
  - Basic DIR computation at key boundary values
  - Edge cases (zero rates, equal rates, below-threshold rate)
  - approval_rate with empty and non-empty inputs
"""
import pytest
from orchestrator.stats.dir import compute_dir, approval_rate


# ── approval_rate ─────────────────────────────────────────────────────────────

class TestApprovalRate:
    def test_empty_list_returns_zero(self):
        assert approval_rate([]) == 0.0

    def test_all_approved(self):
        assert approval_rate([True, True, True]) == 1.0

    def test_all_denied(self):
        assert approval_rate([False, False]) == 0.0

    def test_mixed(self):
        assert approval_rate([True, False, True, False]) == pytest.approx(0.5)

    def test_single_true(self):
        assert approval_rate([True]) == 1.0

    def test_single_false(self):
        assert approval_rate([False]) == 0.0


# ── compute_dir ───────────────────────────────────────────────────────────────

class TestComputeDir:
    def test_equal_rates_is_one(self):
        assert compute_dir(0.5, 0.5) == pytest.approx(1.0)

    def test_below_threshold(self):
        """0.3 / 0.6 = 0.5, which is below the 0.80 threshold."""
        assert compute_dir(0.3, 0.6) == pytest.approx(0.5)

    def test_at_threshold(self):
        """Exactly 0.80 — should not be flagged (>=, not >)."""
        assert compute_dir(0.8, 1.0) == pytest.approx(0.8)

    def test_above_threshold(self):
        assert compute_dir(0.9, 1.0) == pytest.approx(0.9)

    def test_zero_privileged_nonzero_unprivileged_returns_inf(self):
        result = compute_dir(unprivileged_approval_rate=0.5, privileged_approval_rate=0.0)
        assert result == float("inf")

    def test_both_zero_returns_one(self):
        """Both groups zero approvals — treat as equal, no bias signal."""
        assert compute_dir(0.0, 0.0) == pytest.approx(1.0)

    def test_unprivileged_zero_privileged_nonzero(self):
        """Unprivileged gets nothing, privileged gets everything — extreme adverse impact."""
        assert compute_dir(0.0, 1.0) == pytest.approx(0.0)

    def test_dir_symmetry_does_not_hold(self):
        """DIR is NOT symmetric — confirms directionality matters."""
        dir_ab = compute_dir(0.3, 0.9)
        dir_ba = compute_dir(0.9, 0.3)
        assert dir_ab != dir_ba
