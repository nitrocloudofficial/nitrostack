"""
Unit tests for evaluation/model_card.py -- Model Card generation and
MLflow logging (Phase 1, item 5).
"""
from __future__ import annotations

import mlflow
import pytest
from mlflow.tracking import MlflowClient

from medagent.evaluation.model_card import SYNTHETIC_WATERMARK, generate_model_card, log_phase1_run_to_mlflow


def _make_subgroup_report(with_flags: bool) -> dict:
    overall = {
        "auroc": {"estimate": 0.85, "ci_lower": 0.72, "ci_upper": 0.93},
        "sensitivity": {"estimate": 0.90, "ci_lower": 0.80, "ci_upper": 0.97},
        "specificity": {"estimate": 0.75, "ci_lower": 0.65, "ci_upper": 0.85},
        "ppv": {"estimate": 0.70, "ci_lower": 0.60, "ci_upper": 0.80},
        "npv": {"estimate": 0.92, "ci_lower": 0.85, "ci_upper": 0.97},
        "n": 100,
        "n_bootstraps_requested": 500,
        "n_bootstraps_used": 498,
    }
    report = {
        "overall": overall,
        "by_sex": {"M": {**overall}, "F": {**overall}},
        "by_view_position": {"PA": {**overall}, "AP": {**overall}},
        "by_age_band": {"40-64": {**overall}},
        "max_gap": {"by_sex": {"sensitivity": 0.02}, "by_view_position": {"sensitivity": 0.01}, "by_age_band": {}},
        "safety_flags": [],
        "fairness_flags": [],
        "config": {
            "threshold": 0.42, "n_bootstraps": 500, "sensitivity_floor": 0.90,
            "fairness_gap_threshold": 0.05, "min_group_size": 10, "seed": 42,
        },
    }
    if with_flags:
        report["safety_flags"] = [
            {"axis": "sex", "group": "F", "metric": "sensitivity", "estimate": 0.5, "ci_lower": 0.3,
             "threshold": 0.9, "reason": "sex=F: sensitivity 95% CI lower bound (0.300) is below the safety floor (0.900)"}
        ]
        report["fairness_flags"] = [
            {"axis": "sex", "metric": "sensitivity", "gap": 0.4, "threshold": 0.05,
             "best_group": "M", "best_value": 0.9, "worst_group": "F", "worst_value": 0.5,
             "reason": "sensitivity gap (0.400) between sex=M (best, 0.900) and sex=F (worst, 0.500) exceeds the fairness threshold (0.050)"}
        ]
        report["max_gap"]["by_sex"]["sensitivity"] = 0.4
    return report


def _make_split_report() -> dict:
    return {
        "created_at": "2026-07-30T00:00:00+00:00",
        "seed": 42,
        "counts": {"train": 210, "val": 45, "test": 45},
        "leakage_check": {"overlapping_patient_ids": 0, "status": "PASSED"},
        "distribution_pct": {
            "rsna_class": {"train": {"Normal": 42.0}, "val": {"Normal": 44.0}, "test": {"Normal": 44.0}},
            "sex": {"train": {"M": 43.0, "F": 52.0}, "val": {"M": 42.0, "F": 56.0}, "test": {"M": 47.0, "F": 51.0}},
        },
    }


def test_generate_model_card_has_watermark_and_all_required_sections(tmp_path):
    report = _make_subgroup_report(with_flags=False)
    split_report = _make_split_report()

    output_path = tmp_path / "Model_Card.md"
    text = generate_model_card(report, split_report, temperature=1.3, target_recall=0.95, output_path=output_path)

    assert output_path.is_file()
    assert output_path.read_text() == text

    assert text.count(SYNTHETIC_WATERMARK) >= 2  # top AND bottom, not just a passing mention
    for heading in ("## Intended Use", "## Demographic Split Parity", "## Clinical Metrics",
                    "## Calibration Status", "## Fairness / Bias Summary"):
        assert heading in text, f"missing required section: {heading}"

    assert "0.4200" in text  # the threshold
    assert "95%" in text  # target_recall
    assert "T = 1.3000" in text


def test_generate_model_card_no_flags_shows_clean_message(tmp_path):
    report = _make_subgroup_report(with_flags=False)
    split_report = _make_split_report()
    text = generate_model_card(report, split_report, temperature=1.0, output_path=tmp_path / "card.md")
    assert "No safety or fairness flags triggered" in text
    assert "SAFETY FLAG" not in text


def test_generate_model_card_surfaces_flags_prominently(tmp_path):
    report = _make_subgroup_report(with_flags=True)
    split_report = _make_split_report()
    text = generate_model_card(report, split_report, temperature=1.0, output_path=tmp_path / "card.md")

    assert "1 SAFETY FLAG" in text
    assert "1 FAIRNESS FLAG" in text
    assert "sex=F" in text
    assert "blocking finding" in text


def test_generate_model_card_untemperated_shows_no_calibration_message(tmp_path):
    report = _make_subgroup_report(with_flags=False)
    split_report = _make_split_report()
    text = generate_model_card(report, split_report, temperature=1.0, output_path=tmp_path / "card.md")
    assert "no calibration has been fit" in text


@pytest.fixture
def isolated_mlflow(tmp_path, monkeypatch):
    """Redirects MLflow's tracking URI to a throwaway location for this
    test only, so logging a Phase 1 run during tests never writes to the
    real project's mlruns/ store."""
    tracking_uri = f"sqlite:///{tmp_path}/mlflow_test.db"
    mlflow.set_tracking_uri(tracking_uri)
    yield tracking_uri


def test_log_phase1_run_to_mlflow_captures_params_metrics_and_artifacts(tmp_path, isolated_mlflow):
    report = _make_subgroup_report(with_flags=True)
    split_report = _make_split_report()

    model_card_path = tmp_path / "Model_Card.md"
    generate_model_card(report, split_report, temperature=1.2, output_path=model_card_path)

    manifest_path = tmp_path / "test_manifest.json"
    manifest_path.write_text("[]")

    run_id = log_phase1_run_to_mlflow(
        report,
        model_card_path=model_card_path,
        manifest_paths={"test": str(manifest_path)},
        temperature_path=tmp_path / "does_not_exist_temperature.json",  # missing on purpose -- must not crash
        subgroup_analysis_path=tmp_path / "does_not_exist_subgroup.json",  # ditto
        experiment_name="test-phase1-experiment",
        run_name="test-run",
    )

    client = MlflowClient()
    run = client.get_run(run_id)

    assert run.data.params["threshold"] == "0.42"
    assert run.data.params["seed"] == "42"
    assert float(run.data.metrics["overall_auroc_estimate"]) == pytest.approx(0.85)
    assert float(run.data.metrics["num_safety_flags"]) == 1.0
    assert float(run.data.metrics["num_fairness_flags"]) == 1.0

    artifact_names = {a.path for a in client.list_artifacts(run_id)}
    assert "Model_Card.md" in artifact_names
    assert "test_manifest.json" in artifact_names
    # Missing files were skipped gracefully, not force-logged or crashed on.
    assert "does_not_exist_temperature.json" not in artifact_names
