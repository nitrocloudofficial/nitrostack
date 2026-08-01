"""Unit tests for evaluation/stratified.py -- subgroup & bias analysis
(Phase 1, item 4)."""
from __future__ import annotations

import numpy as np
import pytest

from medagent.evaluation.dataset_split import Case
from medagent.evaluation.stratified import evaluate_subgroups, load_subgroup_analysis, save_subgroup_analysis


def _make_case(patient_id: str, target: int, sex: str, view_position: str, age: int) -> Case:
    return {
        "patient_id": patient_id,
        "image_path": f"/fake/{patient_id}.dcm",
        "rsna_class": "Lung Opacity" if target == 1 else "Normal",
        "target": target,
        "age": age,
        "sex": sex,
        "view_position": view_position,
        "boxes": [],
    }


def _balanced_cases(n_per_group: int = 15, seed: int = 0) -> list[Case]:
    """An evenly sex-split case set with target, view_position, and age
    all assigned independently of each other (and of sex) -- deliberately
    NOT derived from a shared counter/parity trick, which would silently
    confound one demographic axis with the target label and produce a
    degenerate (all-one-class) subgroup with no real bias involved."""
    rng = np.random.default_rng(seed)
    cases = []
    i = 0
    for sex in ("M", "F"):
        for _ in range(n_per_group):
            target = int(rng.integers(0, 2))
            view = str(rng.choice(["PA", "AP"]))
            age = int(rng.integers(20, 80))
            cases.append(_make_case(f"p{i}", target, sex, view, age))
            i += 1
    return cases


def _good_predictions(cases: list[Case], seed: int = 0) -> dict[str, float]:
    rng = np.random.default_rng(seed)
    return {
        c["patient_id"]: float(np.clip(rng.normal(0.8 if c["target"] == 1 else 0.2, 0.1), 0.01, 0.99))
        for c in cases
    }


def test_evaluate_subgroups_no_bias_produces_no_flags():
    cases = _balanced_cases()
    y_prob = _good_predictions(cases)
    report = evaluate_subgroups(cases, y_prob, n_bootstraps=200, seed=1)
    assert report["safety_flags"] == []
    assert report["fairness_flags"] == []


def test_evaluate_subgroups_flags_degraded_subgroup():
    cases = _balanced_cases()
    y_prob = _good_predictions(cases)

    # Degrade F patients specifically: predict "negative" regardless of truth.
    rng = np.random.default_rng(99)
    for c in cases:
        if c["sex"] == "F":
            y_prob[c["patient_id"]] = float(np.clip(rng.normal(0.1, 0.05), 0.01, 0.99))

    report = evaluate_subgroups(cases, y_prob, n_bootstraps=300, seed=1)

    flagged = {(f["axis"], f["group"]) for f in report["safety_flags"]}
    assert ("sex", "F") in flagged
    assert ("sex", "M") not in flagged

    sex_gap = report["max_gap"]["by_sex"]["sensitivity"]
    assert sex_gap > 0.5  # a large, deliberately induced gap

    fairness_axes = {f["axis"] for f in report["fairness_flags"]}
    assert "sex" in fairness_axes

    sex_flag = next(f for f in report["fairness_flags"] if f["axis"] == "sex" and f["metric"] == "sensitivity")
    assert sex_flag["worst_group"] == "F"
    assert sex_flag["best_group"] == "M"


def test_evaluate_subgroups_rejects_missing_predictions():
    cases = _balanced_cases(n_per_group=2)
    y_prob = {c["patient_id"]: 0.5 for c in cases[:-1]}  # missing the last one
    with pytest.raises(ValueError, match="no entry in y_prob_by_patient_id"):
        evaluate_subgroups(cases, y_prob, n_bootstraps=50)


def test_evaluate_subgroups_rejects_empty_case_list():
    with pytest.raises(ValueError, match="empty test_cases"):
        evaluate_subgroups([], {})


def test_evaluate_subgroups_small_subgroup_marked_low_n_and_excluded_from_flags():
    cases = _balanced_cases(n_per_group=15)
    # A single, badly-performing "O" patient -- too few to trust as its own subgroup.
    cases.append(_make_case("rare-1", 1, "O", "PA", 70))
    y_prob = _good_predictions(cases)
    y_prob["rare-1"] = 0.01  # a single wrong, low-confidence prediction

    report = evaluate_subgroups(cases, y_prob, n_bootstraps=200, seed=1)

    assert report["by_sex"]["O"]["low_n"] is True
    assert report["by_sex"]["M"]["low_n"] is False
    assert report["by_sex"]["F"]["low_n"] is False

    flagged_sex_groups = {f["group"] for f in report["safety_flags"] if f["axis"] == "sex"}
    assert "O" not in flagged_sex_groups


def test_save_and_load_subgroup_analysis_round_trip(tmp_path):
    cases = _balanced_cases(n_per_group=12)
    y_prob = _good_predictions(cases)
    report = evaluate_subgroups(cases, y_prob, n_bootstraps=100, seed=1)

    path = tmp_path / "subgroup_analysis.json"
    save_subgroup_analysis(report, path)
    loaded = load_subgroup_analysis(path)

    assert loaded["overall"]["n"] == report["overall"]["n"]
    assert loaded["safety_flags"] == report["safety_flags"]
    assert loaded["max_gap"] == report["max_gap"]
