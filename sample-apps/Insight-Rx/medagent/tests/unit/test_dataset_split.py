"""Unit tests for evaluation/dataset_split.py -- the locked, stratified
train/val/test split protocol (Phase 1, item 1)."""
from __future__ import annotations

import json

import pytest

from medagent.evaluation.dataset_split import (
    Case,
    create_locked_split,
    generate_split_report,
    load_manifest,
    verify_lock,
)


def _make_cases(n: int) -> list[Case]:
    """n synthetic cases with a realistic mix of classes/demographics,
    deterministic so this test never flakes."""
    classes = ["Normal", "Lung Opacity", "No Lung Opacity / Not Normal"]
    sexes = ["M", "F", "F", "M", "O"]  # "O" deliberately rare
    views = ["PA", "AP"]
    cases: list[Case] = []
    for i in range(n):
        rsna_class = classes[i % len(classes)]
        cases.append(
            {
                "patient_id": f"patient-{i:04d}",
                "image_path": f"/fake/patient-{i:04d}.dcm",
                "rsna_class": rsna_class,
                "target": 1 if rsna_class == "Lung Opacity" else 0,
                "age": 5 + (i * 7) % 90,
                "sex": sexes[i % len(sexes)],
                "view_position": views[i % len(views)],
                "boxes": [{"x": 10.0, "y": 10.0, "width": 20.0, "height": 20.0}] if rsna_class == "Lung Opacity" else [],
            }
        )
    return cases


def test_create_locked_split_has_zero_patient_overlap(tmp_path):
    cases = _make_cases(200)
    locked = create_locked_split(cases, output_dir=tmp_path, seed=42)

    train_ids = {c["patient_id"] for c in load_manifest(locked["train_manifest_path"])}
    val_ids = {c["patient_id"] for c in load_manifest(locked["val_manifest_path"])}
    test_ids = {c["patient_id"] for c in load_manifest(locked["test_manifest_path"])}

    assert not (train_ids & val_ids)
    assert not (train_ids & test_ids)
    assert not (val_ids & test_ids)
    assert train_ids | val_ids | test_ids == {c["patient_id"] for c in cases}


def test_create_locked_split_is_deterministic_given_the_same_seed(tmp_path):
    cases = _make_cases(150)
    locked_a = create_locked_split(cases, output_dir=tmp_path / "a", seed=42)
    locked_b = create_locked_split(cases, output_dir=tmp_path / "b", seed=42)
    assert locked_a["test_hash"] == locked_b["test_hash"]
    assert locked_a["train_hash"] == locked_b["train_hash"]


def test_locked_split_refuses_to_resplit_without_force(tmp_path):
    cases = _make_cases(100)
    first = create_locked_split(cases, output_dir=tmp_path, seed=1)
    # Different seed, same output_dir, no force -- must return the FIRST
    # lock unchanged, not silently re-split on top of it.
    second = create_locked_split(cases, output_dir=tmp_path, seed=999)
    assert second == first
    assert second["seed"] == 1


def test_locked_split_force_actually_resplits(tmp_path):
    cases = _make_cases(100)
    first = create_locked_split(cases, output_dir=tmp_path, seed=1)
    second = create_locked_split(cases, output_dir=tmp_path, seed=999, force=True)
    assert second["seed"] == 999
    assert second is not first


def test_verify_lock_detects_manifest_tampering(tmp_path):
    cases = _make_cases(100)
    locked = create_locked_split(cases, output_dir=tmp_path, seed=42)

    test_manifest_path = locked["test_manifest_path"]
    tampered = json.loads(open(test_manifest_path).read())
    tampered.pop()
    with open(test_manifest_path, "w") as f:
        json.dump(tampered, f)

    with pytest.raises(RuntimeError, match="does not match its locked hash"):
        verify_lock(tmp_path)


def test_create_locked_split_rejects_duplicate_patient_ids(tmp_path):
    cases = _make_cases(10)
    cases.append(cases[0])  # duplicate patient_id
    with pytest.raises(ValueError, match="duplicate patient_id"):
        create_locked_split(cases, output_dir=tmp_path, seed=42)


def test_generate_split_report_shows_balanced_distribution_and_no_leakage(tmp_path):
    cases = _make_cases(300)
    locked = create_locked_split(cases, output_dir=tmp_path, seed=42)
    report = generate_split_report(locked)

    assert report["leakage_check"]["status"] == "PASSED"
    assert report["leakage_check"]["overlapping_patient_ids"] == 0
    assert sum(report["counts"].values()) == 300

    # Balance check, not an exact-match check -- stratification targets
    # proportional representation, not identical percentages.
    class_dist = report["distribution_pct"]["rsna_class"]
    for label, train_pct in class_dist["train"].items():
        test_pct = class_dist["test"].get(label, 0.0)
        assert abs(train_pct - test_pct) < 15.0, f"{label}: train={train_pct}% test={test_pct}% -- too skewed"


def test_rare_subgroup_does_not_crash_the_split(tmp_path):
    """A single PatientSex="O" patient with an otherwise-unique demographic
    combination must not crash sklearn's stratified split -- it should be
    silently (but loggably) collapsed to class-only stratification."""
    cases = _make_cases(50)
    cases[0] = {**cases[0], "sex": "O", "age": 90, "view_position": "AP"}
    locked = create_locked_split(cases, output_dir=tmp_path, seed=42)  # must not raise

    all_ids = set()
    for key in ("train_manifest_path", "val_manifest_path", "test_manifest_path"):
        all_ids |= {c["patient_id"] for c in load_manifest(locked[key])}
    assert cases[0]["patient_id"] in all_ids
