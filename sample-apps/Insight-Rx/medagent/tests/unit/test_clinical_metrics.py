"""
Unit tests for the regulatory-grade clinical metrics in evaluation/metrics.py
(Phase 1, item 2): calculate_clinical_metrics, calculate_clinical_metrics_with_ci,
find_high_recall_threshold.
"""
from __future__ import annotations

import numpy as np
import pytest

from medagent.evaluation.metrics import (
    calculate_clinical_metrics,
    calculate_clinical_metrics_with_ci,
    find_high_recall_threshold,
)


# 5 true negatives, 5 true positives; at threshold=0.5 this produces
# exactly 4 TN, 1 FP, 1 FN, 4 TP -- every ratio below is hand-computable.
_Y_TRUE = np.array([0, 0, 0, 0, 0, 1, 1, 1, 1, 1])
_Y_PROB = np.array([0.1, 0.2, 0.3, 0.6, 0.4, 0.9, 0.8, 0.7, 0.3, 0.6])


def test_calculate_clinical_metrics_matches_hand_computed_confusion_matrix():
    result = calculate_clinical_metrics(_Y_TRUE, _Y_PROB, threshold=0.5)

    assert result["sensitivity"] == pytest.approx(4 / 5)
    assert result["specificity"] == pytest.approx(4 / 5)
    assert result["ppv"] == pytest.approx(4 / 5)
    assert result["npv"] == pytest.approx(4 / 5)
    assert 0.0 <= result["auroc"] <= 1.0


def test_calculate_clinical_metrics_perfect_separation_gives_auroc_one():
    y_true = np.array([0, 0, 0, 0, 1, 1, 1, 1])
    y_prob = np.array([0.05, 0.1, 0.15, 0.2, 0.8, 0.85, 0.9, 0.95])
    result = calculate_clinical_metrics(y_true, y_prob, threshold=0.5)
    assert result["auroc"] == 1.0
    assert result["sensitivity"] == 1.0
    assert result["specificity"] == 1.0


def test_calculate_clinical_metrics_higher_threshold_never_increases_sensitivity():
    """Raising the operating threshold can only reclassify positives as
    negatives, never the reverse -- sensitivity is monotonically
    non-increasing in the threshold."""
    low = calculate_clinical_metrics(_Y_TRUE, _Y_PROB, threshold=0.3)
    high = calculate_clinical_metrics(_Y_TRUE, _Y_PROB, threshold=0.7)
    assert low["sensitivity"] >= high["sensitivity"]


def test_calculate_clinical_metrics_handles_zero_denominators_without_erroring():
    # No actual negatives at all -- specificity/PPV's denominators (TN+FP,
    # TP+FP) can be zero depending on predictions; must return 0.0, not raise.
    y_true = np.array([1, 1, 1, 1])
    y_prob = np.array([0.9, 0.8, 0.7, 0.6])
    result = calculate_clinical_metrics(y_true, y_prob, threshold=0.5)
    assert result["specificity"] == 0.0  # no negatives to be correct about
    assert result["sensitivity"] == 1.0
    assert np.isnan(result["auroc"])  # AUROC is undefined with only one class present


def test_calculate_clinical_metrics_with_ci_bounds_bracket_the_estimate():
    rng = np.random.default_rng(0)
    n = 300
    y_true = rng.integers(0, 2, size=n)
    y_prob = np.clip(y_true * 0.5 + rng.normal(0.3, 0.25, size=n), 0, 1)

    result = calculate_clinical_metrics_with_ci(y_true, y_prob, threshold=0.5, n_bootstraps=500, seed=1)

    assert result["n_bootstraps_used"] > 0
    for metric_name in ("auroc", "sensitivity", "specificity", "ppv", "npv"):
        entry = result[metric_name]
        assert entry["ci_lower"] <= entry["estimate"] <= entry["ci_upper"], (
            f"{metric_name}: CI [{entry['ci_lower']}, {entry['ci_upper']}] does not bracket "
            f"estimate {entry['estimate']}"
        )


def test_calculate_clinical_metrics_with_ci_is_deterministic_given_the_same_seed():
    rng = np.random.default_rng(0)
    y_true = rng.integers(0, 2, size=200)
    y_prob = np.clip(y_true * 0.4 + rng.normal(0.3, 0.25, size=200), 0, 1)

    result_a = calculate_clinical_metrics_with_ci(y_true, y_prob, n_bootstraps=200, seed=42)
    result_b = calculate_clinical_metrics_with_ci(y_true, y_prob, n_bootstraps=200, seed=42)
    assert result_a["auroc"]["ci_lower"] == result_b["auroc"]["ci_lower"]
    assert result_a["auroc"]["ci_upper"] == result_b["auroc"]["ci_upper"]


def test_find_high_recall_threshold_achieves_the_target():
    rng = np.random.default_rng(3)
    y_true = rng.integers(0, 2, size=400)
    y_prob = np.clip(y_true * 0.5 + rng.normal(0.3, 0.25, size=400), 0, 1)

    result = find_high_recall_threshold(y_true, y_prob, target_recall=0.95)

    assert result["achieved_recall"] >= 0.95 - 1e-9
    assert result["threshold"] < 0.5, "expected the high-recall threshold to be lower than the naive 0.5 default"


def test_find_high_recall_threshold_picks_the_most_conservative_qualifying_threshold():
    """Among all thresholds that clear the recall floor, the function
    should pick the LARGEST one (maximizing specificity), not just any
    threshold that happens to qualify."""
    y_true = np.array([0, 0, 0, 0, 1, 1, 1, 1])
    y_prob = np.array([0.1, 0.3, 0.5, 0.6, 0.55, 0.7, 0.8, 0.9])
    # At target_recall=0.75, thresholds <= 0.7 all achieve recall >= 3/4;
    # the function should return the highest such threshold (0.7), not 0.1.
    result = find_high_recall_threshold(y_true, y_prob, target_recall=0.75)
    assert result["achieved_recall"] >= 0.75
    assert result["threshold"] == pytest.approx(0.7)


def test_find_high_recall_threshold_rejects_single_class_input():
    with pytest.raises(ValueError, match="requires both classes"):
        find_high_recall_threshold(np.array([1, 1, 1, 1]), np.array([0.5, 0.6, 0.7, 0.8]))


@pytest.mark.parametrize("bad_target", [0.0, -0.1, 1.5])
def test_find_high_recall_threshold_rejects_invalid_target_recall(bad_target):
    with pytest.raises(ValueError, match="target_recall must be in"):
        find_high_recall_threshold(np.array([0, 1, 0, 1]), np.array([0.2, 0.8, 0.3, 0.7]), target_recall=bad_target)


def test_find_high_recall_threshold_at_target_recall_one_classifies_everything_positive():
    """target_recall=1.0 is always reachable (trivially, by setting the
    threshold below every predicted probability) -- but only by
    classifying everything positive, which necessarily drives
    specificity to 0. This is the correct, if degenerate, answer: the
    function must not raise or silently cap recall below 1.0 just
    because the data is noisy/overlapping."""
    y_true = np.array([0, 1, 0, 1, 0, 1])
    y_prob = np.array([0.4, 0.3, 0.5, 0.6, 0.6, 0.2])  # overlapping/noisy on purpose
    result = find_high_recall_threshold(y_true, y_prob, target_recall=1.0)
    assert result["achieved_recall"] == 1.0
    assert result["achieved_specificity"] == 0.0
