"""Unit tests for orchestrator/stats/fisher_bh.py.

Covers:
  - fisher_test returns valid (odds_ratio, p_value) pairs
  - correct_pvalues BH-adjustment invariants (adjusted >= raw)
  - Empty-input edge case
  - Ordering stability (adjusted array length matches input)
"""
import pytest
from orchestrator.stats.fisher_bh import correct_pvalues, fisher_test


# ── fisher_test ───────────────────────────────────────────────────────────────

class TestFisherTest:
    def test_returns_p_between_zero_and_one(self):
        _, p = fisher_test(40, 10, 20, 30)
        assert 0.0 <= p <= 1.0

    def test_balanced_table_has_odds_ratio_near_one(self):
        """Symmetric table → OR close to 1.0."""
        or_, _ = fisher_test(25, 25, 25, 25)
        assert or_ == pytest.approx(1.0)

    def test_extreme_imbalance_gives_small_p(self):
        """Strong signal — should be highly significant."""
        _, p = fisher_test(50, 0, 0, 50)
        assert p < 0.001

    def test_equal_proportions_gives_large_p(self):
        """No signal — p should not be significant."""
        _, p = fisher_test(10, 10, 10, 10)
        assert p > 0.05

    def test_returns_floats(self):
        or_, p = fisher_test(30, 10, 20, 20)
        assert isinstance(or_, float)
        assert isinstance(p, float)


# ── correct_pvalues ───────────────────────────────────────────────────────────

class TestCorrectPvalues:
    def test_empty_input_returns_empty_tuples(self):
        assert correct_pvalues([]) == ([], [])

    def test_output_length_matches_input(self):
        raw_p = [0.001, 0.01, 0.03, 0.04, 0.20, 0.50]
        reject, adjusted = correct_pvalues(raw_p, alpha=0.05)
        assert len(reject) == len(raw_p)
        assert len(adjusted) == len(raw_p)

    def test_bh_adjusted_always_geq_raw(self):
        """BH adjustment can only inflate p-values — never deflate."""
        raw_p = [0.001, 0.01, 0.03, 0.04, 0.20, 0.50]
        reject, adjusted = correct_pvalues(raw_p, alpha=0.05)
        for adj, raw in zip(adjusted, raw_p):
            assert adj >= raw - 1e-12, f"adjusted {adj} < raw {raw}"

    def test_very_small_p_values_are_rejected(self):
        """Extremely significant results should survive BH correction."""
        raw_p = [1e-8, 1e-7, 1e-6]
        reject, _ = correct_pvalues(raw_p, alpha=0.05)
        assert all(reject)

    def test_all_large_p_values_not_rejected(self):
        """Non-significant p-values should not be flagged."""
        raw_p = [0.8, 0.9, 0.95, 0.99]
        reject, _ = correct_pvalues(raw_p, alpha=0.05)
        assert not any(reject)

    def test_reject_is_list_of_bool(self):
        import numpy as np
        raw_p = [0.001, 0.5]
        reject, adjusted = correct_pvalues(raw_p)
        # multipletests returns numpy.bool_ elements; accept both bool and np.bool_
        assert all(isinstance(r, (bool, np.bool_)) for r in reject)

    def test_alpha_controls_rejection_threshold(self):
        """At alpha=0.001, fewer combos should be rejected than at alpha=0.1."""
        raw_p = [0.01, 0.02, 0.04, 0.06, 0.08]
        reject_strict, _ = correct_pvalues(raw_p, alpha=0.001)
        reject_loose, _ = correct_pvalues(raw_p, alpha=0.10)
        assert sum(reject_strict) <= sum(reject_loose)

    def test_single_pvalue(self):
        """Single p-value edge case — adjusted == raw for BH with one test."""
        raw_p = [0.03]
        reject, adjusted = correct_pvalues(raw_p, alpha=0.05)
        assert len(reject) == 1
        assert len(adjusted) == 1
        assert adjusted[0] >= raw_p[0]
