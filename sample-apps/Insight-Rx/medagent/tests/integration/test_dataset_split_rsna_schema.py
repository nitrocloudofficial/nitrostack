"""
Integration test: dataset_split.py against a real (synthetic)
RSNA-shaped directory -- exercises the DICOM metadata extraction path
build_case_index() depends on, not just the split logic in isolation
(see tests/unit/test_dataset_split.py for that).

*** Uses data/synthetic_rsna_generator.py -- synthetic data only. ***
"""
from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

# data/synthetic_rsna_generator.py deliberately lives outside src/medagent
# (see Strategic_Startup_Roadmap.pdf Phase 1.0) -- load it directly by
# file path rather than treating data/ as an importable package.
_GENERATOR_PATH = Path(__file__).resolve().parents[2] / "data" / "synthetic_rsna_generator.py"
_spec = importlib.util.spec_from_file_location("synthetic_rsna_generator", _GENERATOR_PATH)
synthetic_rsna_generator = importlib.util.module_from_spec(_spec)
sys.modules["synthetic_rsna_generator"] = synthetic_rsna_generator
_spec.loader.exec_module(synthetic_rsna_generator)

from medagent.evaluation.dataset_split import build_case_index, create_locked_split, generate_split_report


def test_build_case_index_and_locked_split_against_synthetic_rsna_data(tmp_path):
    rsna_dir = tmp_path / "synthetic_rsna"
    synthetic_rsna_generator.generate(rsna_dir, num_patients=80, image_size=64, seed=7)

    cases = build_case_index(rsna_dir)
    assert len(cases) == 80

    for case in cases:
        assert case["rsna_class"] in ("Normal", "Lung Opacity", "No Lung Opacity / Not Normal")
        assert case["sex"] in ("M", "F", "O")
        assert case["view_position"] in ("PA", "AP")
        assert isinstance(case["age"], int) and 0 <= case["age"] <= 120
        if case["rsna_class"] == "Lung Opacity":
            assert len(case["boxes"]) >= 1
        else:
            assert case["boxes"] == []

    locked = create_locked_split(cases, output_dir=tmp_path / "splits", seed=42)
    report = generate_split_report(locked)

    assert report["leakage_check"]["status"] == "PASSED"
    assert sum(report["counts"].values()) == 80
