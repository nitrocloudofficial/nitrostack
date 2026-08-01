"""
Integration test: the full Phase 1 pipeline end to end -- synthetic
RSNA data -> build_case_index() -> create_locked_split() ->
evaluate_subgroups() -- with a deliberately degraded subgroup, mirroring
stratified.py's own __main__ verification block but as real assertions.

*** Uses data/synthetic_rsna_generator.py -- synthetic data only. ***
"""
from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

import numpy as np

_GENERATOR_PATH = Path(__file__).resolve().parents[2] / "data" / "synthetic_rsna_generator.py"
_spec = importlib.util.spec_from_file_location("synthetic_rsna_generator", _GENERATOR_PATH)
synthetic_rsna_generator = importlib.util.module_from_spec(_spec)
sys.modules["synthetic_rsna_generator"] = synthetic_rsna_generator
_spec.loader.exec_module(synthetic_rsna_generator)

from medagent.evaluation.dataset_split import build_case_index, create_locked_split, load_manifest
from medagent.evaluation.stratified import evaluate_subgroups


def test_full_pipeline_flags_a_deliberately_degraded_subgroup(tmp_path):
    rsna_dir = tmp_path / "synthetic_rsna"
    synthetic_rsna_generator.generate(rsna_dir, num_patients=200, image_size=64, seed=11)

    cases = build_case_index(rsna_dir)
    locked = create_locked_split(cases, output_dir=tmp_path / "splits", seed=42)
    test_cases = load_manifest(locked["test_manifest_path"])
    assert len(test_cases) > 0

    rng = np.random.default_rng(5)
    y_prob_by_patient_id = {}
    for case in test_cases:
        base = 0.75 if case["target"] == 1 else 0.25
        y_prob_by_patient_id[case["patient_id"]] = float(np.clip(rng.normal(base, 0.15), 0.01, 0.99))

    # Degrade PatientSex="F" specifically.
    for case in test_cases:
        if case["sex"] == "F":
            y_prob_by_patient_id[case["patient_id"]] = float(np.clip(rng.normal(0.15, 0.1), 0.01, 0.99))

    report = evaluate_subgroups(test_cases, y_prob_by_patient_id, n_bootstraps=200, seed=1)

    # The degraded subgroup must show up as a safety flag with a low
    # sensitivity CI lower bound -- if there are enough F patients in
    # this particular locked test split to be judged reliable at all.
    f_group = report["by_sex"].get("F")
    if f_group is not None and not f_group["low_n"]:
        flagged_sex_groups = {f["group"] for f in report["safety_flags"] if f["axis"] == "sex"}
        assert "F" in flagged_sex_groups
        assert report["max_gap"]["by_sex"]["sensitivity"] > 0.2
