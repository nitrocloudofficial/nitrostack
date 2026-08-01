"""
Subgroup & bias analysis -- Phase 1, item 4
(Strategic_Startup_Roadmap.pdf: "Add subgroup / bias analysis and
document known failure modes").

Consumes the LOCKED test manifest from evaluation/dataset_split.py --
never train/tune-time cases, only ever the frozen test split -- and
evaluates evaluation/metrics.py's calculate_clinical_metrics_with_ci()
overall and per demographic subgroup (sex / view position / age band),
then flags:

  - any subgroup whose sensitivity 95% CI LOWER BOUND falls below a
    patient-safety floor (default 0.90). This is a regulator's or a
    hospital safety committee's first question, not a statistical
    curiosity -- a point estimate alone can look fine while the CI
    reveals the true sensitivity could plausibly be much worse.
  - any axis whose worst-to-best gap for ANY metric exceeds a fairness
    threshold (default 0.05).

Groups with fewer than MIN_GROUP_SIZE cases are still reported (never
silently hidden) but excluded from gap/flag calculations -- too few to
distinguish a real disparity from noise, and a tiny group swinging
wildly on one bootstrap resample would otherwise dominate the flags.
"""
from __future__ import annotations

import json
import logging
from pathlib import Path

import numpy as np

from medagent.evaluation.dataset_split import Case, load_manifest
from medagent.evaluation.demographics import age_band
from medagent.evaluation.metrics import calculate_clinical_metrics_with_ci

logger = logging.getLogger("medagent.evaluation.stratified")

MIN_GROUP_SIZE = 10
DEFAULT_SENSITIVITY_FLOOR = 0.90
DEFAULT_FAIRNESS_GAP_THRESHOLD = 0.05
DEFAULT_OUTPUT_PATH = "evaluation_results/subgroup_analysis.json"

_AXES = {
    "sex": lambda case: case["sex"],
    "view_position": lambda case: case["view_position"],
    "age_band": lambda case: age_band(case["age"]),
}
_METRIC_NAMES = ("auroc", "sensitivity", "specificity", "ppv", "npv")


def _metrics_for_cases(
    cases: list[Case],
    y_prob_by_patient_id: dict[str, float],
    threshold: float,
    n_bootstraps: int,
    seed: int,
) -> dict:
    y_true = np.array([c["target"] for c in cases])
    y_prob = np.array([y_prob_by_patient_id[c["patient_id"]] for c in cases])
    result = calculate_clinical_metrics_with_ci(y_true, y_prob, threshold=threshold, n_bootstraps=n_bootstraps, seed=seed)
    result["n"] = len(cases)
    return result


def evaluate_subgroups(
    test_cases: list[Case],
    y_prob_by_patient_id: dict[str, float],
    threshold: float = 0.5,
    n_bootstraps: int = 1000,
    sensitivity_floor: float = DEFAULT_SENSITIVITY_FLOOR,
    fairness_gap_threshold: float = DEFAULT_FAIRNESS_GAP_THRESHOLD,
    seed: int = 42,
) -> dict:
    """
    Evaluates `test_cases` (a locked test-split manifest, see
    dataset_split.load_manifest()) against `y_prob_by_patient_id` --
    predicted P(target=1) keyed by patient_id, from wherever the caller
    got them (a real model run, or dummy predictions for a mechanical
    verification pass) -- overall and per demographic subgroup.

    Returns a report shaped:
        {
          "overall": {...calculate_clinical_metrics_with_ci() output..., "n": int},
          "by_sex": {"M": {...}, "F": {...}, "O": {...}},
          "by_view_position": {"PA": {...}, "AP": {...}},
          "by_age_band": {"0-17": {...}, ...},
          "max_gap": {"by_sex": {"sensitivity": 0.15, ...}, "by_view_position": {...}, "by_age_band": {...}},
          "safety_flags": [{"axis", "group", "metric", "estimate", "ci_lower", "threshold", "reason"}, ...],
          "fairness_flags": [{"axis", "metric", "gap", "threshold", "best_group", "worst_group", "reason"}, ...],
          "config": {...the parameters this run used...},
        }
    """
    if not test_cases:
        raise ValueError("evaluate_subgroups() called with an empty test_cases list")

    missing = [c["patient_id"] for c in test_cases if c["patient_id"] not in y_prob_by_patient_id]
    if missing:
        raise ValueError(
            f"{len(missing)} test case(s) have no entry in y_prob_by_patient_id, e.g. {missing[:3]}"
        )

    report: dict = {
        "overall": _metrics_for_cases(test_cases, y_prob_by_patient_id, threshold, n_bootstraps, seed),
        "by_sex": {},
        "by_view_position": {},
        "by_age_band": {},
        "max_gap": {"by_sex": {}, "by_view_position": {}, "by_age_band": {}},
        "safety_flags": [],
        "fairness_flags": [],
        "config": {
            "threshold": threshold,
            "n_bootstraps": n_bootstraps,
            "sensitivity_floor": sensitivity_floor,
            "fairness_gap_threshold": fairness_gap_threshold,
            "min_group_size": MIN_GROUP_SIZE,
            "seed": seed,
        },
    }

    for axis_name, axis_fn in _AXES.items():
        report_key = f"by_{axis_name}"
        groups: dict[str, list[Case]] = {}
        for case in test_cases:
            groups.setdefault(axis_fn(case), []).append(case)

        # metric_name -> [(group_label, point_estimate), ...] for groups
        # large enough (and non-degenerate) to trust for gap/flag purposes.
        reliable_values: dict[str, list[tuple[str, float]]] = {}

        for group_label, group_cases in sorted(groups.items()):
            metrics = _metrics_for_cases(group_cases, y_prob_by_patient_id, threshold, n_bootstraps, seed)
            is_reliable = len(group_cases) >= MIN_GROUP_SIZE
            metrics["low_n"] = not is_reliable
            report[report_key][group_label] = metrics

            if not is_reliable:
                logger.warning(
                    "%s=%r has only %d case(s) -- reported but excluded from max_gap/flags "
                    "(too few to distinguish a real disparity from noise).",
                    axis_name, group_label, len(group_cases),
                )
                continue

            sens_entry = metrics["sensitivity"]
            if not np.isnan(sens_entry["ci_lower"]) and sens_entry["ci_lower"] < sensitivity_floor:
                report["safety_flags"].append(
                    {
                        "axis": axis_name,
                        "group": group_label,
                        "metric": "sensitivity",
                        "estimate": sens_entry["estimate"],
                        "ci_lower": sens_entry["ci_lower"],
                        "threshold": sensitivity_floor,
                        "reason": (
                            f"{axis_name}={group_label}: sensitivity 95% CI lower bound "
                            f"({sens_entry['ci_lower']:.3f}) is below the safety floor ({sensitivity_floor:.3f})"
                        ),
                    }
                )

            for metric_name in _METRIC_NAMES:
                estimate = metrics[metric_name]["estimate"]
                if np.isnan(estimate):
                    continue
                reliable_values.setdefault(metric_name, []).append((group_label, estimate))

        for metric_name, group_values in reliable_values.items():
            if len(group_values) < 2:
                continue  # a gap needs at least two groups to compare
            best_group, best_value = max(group_values, key=lambda gv: gv[1])
            worst_group, worst_value = min(group_values, key=lambda gv: gv[1])
            gap = best_value - worst_value
            report["max_gap"][report_key][metric_name] = gap

            if gap > fairness_gap_threshold:
                report["fairness_flags"].append(
                    {
                        "axis": axis_name,
                        "metric": metric_name,
                        "gap": gap,
                        "threshold": fairness_gap_threshold,
                        "best_group": best_group,
                        "best_value": best_value,
                        "worst_group": worst_group,
                        "worst_value": worst_value,
                        "reason": (
                            f"{metric_name} gap ({gap:.3f}) between {axis_name}={best_group} "
                            f"(best, {best_value:.3f}) and {axis_name}={worst_group} "
                            f"(worst, {worst_value:.3f}) exceeds the fairness threshold ({fairness_gap_threshold:.3f})"
                        ),
                    }
                )

    return report


def save_subgroup_analysis(report: dict, path: str | Path = DEFAULT_OUTPUT_PATH) -> None:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(report, indent=2))
    logger.info(
        "Saved subgroup analysis to %s (%d safety flag(s), %d fairness flag(s))",
        path, len(report["safety_flags"]), len(report["fairness_flags"]),
    )


def load_subgroup_analysis(path: str | Path = DEFAULT_OUTPUT_PATH) -> dict:
    return json.loads(Path(path).read_text())


if __name__ == "__main__":
    import sys

    from medagent.evaluation.dataset_split import verify_lock

    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")

    split_dir = sys.argv[1] if len(sys.argv) > 1 else "data/splits"
    locked = verify_lock(split_dir)
    test_cases = load_manifest(locked["test_manifest_path"])
    print(f"Loaded {len(test_cases)} locked test case(s) from {locked['test_manifest_path']}")

    # *** Dummy predictions -- not a real model's output. *** Reasonably
    # good overall (correlated with the true target), for demonstrating
    # the analysis pipeline mechanics, not clinical performance.
    rng = np.random.default_rng(7)
    y_prob_by_patient_id: dict[str, float] = {}
    for case in test_cases:
        base = 0.75 if case["target"] == 1 else 0.25
        y_prob_by_patient_id[case["patient_id"]] = float(np.clip(rng.normal(base, 0.15), 0.01, 0.99))

    # *** Artificially degrade PatientSex="F" predictions to simulate a
    # biased model, deliberately, for verification purposes. *** Predicts
    # "negative" almost regardless of the true target for F patients.
    for case in test_cases:
        if case["sex"] == "F":
            y_prob_by_patient_id[case["patient_id"]] = float(np.clip(rng.normal(0.2, 0.1), 0.01, 0.99))

    report = evaluate_subgroups(test_cases, y_prob_by_patient_id, n_bootstraps=300, seed=42)
    save_subgroup_analysis(report)

    print(json.dumps(
        {"safety_flags": report["safety_flags"], "fairness_flags": report["fairness_flags"], "max_gap": report["max_gap"]},
        indent=2,
    ))
