"""
Model Card + clinical validation reporting -- Phase 1, item 5
(Strategic_Startup_Roadmap.pdf: "Publish a model card and a written
clinical validation protocol; wire results into MLflow so every run is
reproducible").

Aggregates every prior Phase 1 artifact into one Markdown Model Card
and logs the whole run to MLflow for reproducibility:
  - the locked split + its audit report (item 1, dataset_split.py)
  - bootstrapped clinical metrics (item 2, metrics.py) -- these live
    nested inside item 4's subgroup report under "overall", not as a
    separate file; there is nothing else to read them from
  - the fitted calibration temperature (item 3, calibration.py)
  - the subgroup/bias analysis (item 4, stratified.py)

*** Every Model Card this module can currently produce is built from
synthetic data (data/synthetic_rsna_generator.py) -- there is no real
labeled chest X-ray dataset in this environment yet. The generated
document is watermarked accordingly, in the document itself, not just
in a code comment, and must never be read as a real clinical
validation result. ***
"""
from __future__ import annotations

import logging
from pathlib import Path

from medagent.evaluation.calibration import DEFAULT_TEMPERATURE_PATH
from medagent.evaluation.mlflow_tracking import MLflowTracker
from medagent.evaluation.stratified import DEFAULT_OUTPUT_PATH as DEFAULT_SUBGROUP_ANALYSIS_PATH

logger = logging.getLogger("medagent.evaluation.model_card")

SYNTHETIC_WATERMARK = "SYNTHETIC — NOT CLINICAL EVIDENCE"
DEFAULT_MODEL_CARD_PATH = "evaluation_results/Model_Card.md"


def _fmt_metric(entry: dict) -> str:
    """Formats one calculate_clinical_metrics_with_ci() metric entry as
    'estimate (95% CI: lower-upper)', handling NaN (e.g. a single-class
    subgroup, or a metric that never got a usable bootstrap resample)
    without crashing on the float format spec."""
    estimate = entry.get("estimate", float("nan"))
    lower = entry.get("ci_lower", float("nan"))
    upper = entry.get("ci_upper", float("nan"))
    if estimate != estimate:  # NaN
        return "n/a"
    if lower != lower or upper != upper:  # NaN
        return f"{estimate:.3f} (CI: n/a -- too few examples to bootstrap)"
    return f"{estimate:.3f} (95% CI: {lower:.3f}–{upper:.3f})"


def _render_demographic_tables(distribution_pct: dict) -> list[str]:
    lines = []
    for axis_name, per_split in distribution_pct.items():
        lines.append(f"**{axis_name}**")
        lines.append("")
        all_labels = sorted({label for dist in per_split.values() for label in dist})
        lines.append(f"| {axis_name} | train | val | test |")
        lines.append("|---|---|---|---|")
        for label in all_labels:
            row = [label] + [f"{per_split[split].get(label, 0.0)}%" for split in ("train", "val", "test")]
            lines.append("| " + " | ".join(row) + " |")
        lines.append("")
    return lines


def generate_model_card(
    subgroup_report: dict,
    split_report: dict,
    temperature: float,
    target_recall: float | None = None,
    output_path: str | Path = DEFAULT_MODEL_CARD_PATH,
    synthetic: bool = True,
) -> str:
    """
    Renders a Model Card Markdown document from already-computed Phase 1
    artifacts -- `subgroup_report` (evaluation/stratified.py's
    evaluate_subgroups() output, which nests item 2's overall clinical
    metrics), `split_report` (dataset_split.py's generate_split_report()
    output), and `temperature` (evaluation/calibration.py's
    TemperatureScaler.temperature) -- and writes it to `output_path`.
    Returns the rendered text.

    `synthetic` controls the NOT-CLINICAL-EVIDENCE watermark and
    **defaults to True on purpose**. A caller evaluating real data must
    say so explicitly, ideally by passing
    dataset_split.is_synthetic_dataset(rsna_dir). The asymmetry is
    deliberate: a real Model Card wrongly carrying a synthetic warning
    is a correctable annoyance, whereas a synthetic one silently
    presenting itself as clinical evidence is the worst failure this
    document can have -- so the dangerous direction is the one that
    requires an explicit act.
    """
    config = subgroup_report["config"]
    overall = subgroup_report["overall"]

    lines: list[str] = []
    if synthetic:
        lines.append(f"# \U0001F6A8 {SYNTHETIC_WATERMARK} \U0001F6A8")
        lines.append("")
        lines.append(
            "> **Every number in this document was computed against "
            "`data/synthetic_rsna_generator.py`'s randomly generated output, not real chest X-rays or real "
            "patients.** No metric below reflects real clinical performance. This document exists to prove "
            "the Model Card *generator* is correct and produces the right shape of report -- see "
            "Strategic_Startup_Roadmap.pdf, Phase 1 -- not to make a clinical claim. Replace the inputs with "
            "a real locked split, real model predictions, and a real fitted temperature before this document "
            "means anything."
        )
    else:
        lines.append("# Model Card — Chest Radiograph Decision Support")
        lines.append("")
        lines.append(
            "> Computed against the **real RSNA Pneumonia Detection Challenge** dataset, via the locked "
            "70/15/15 patient-level split in `data/splits/split.lock.json`. These are measured results on a "
            "held-out test set that was never trained or tuned on. They remain a *research* evaluation on a "
            "single public competition cohort -- not a prospective clinical validation, and not evidence of "
            "performance on any other population, scanner, or care setting. The intended-use restrictions in "
            "`docs/regulatory/intended_use.md` continue to apply."
        )
    lines.append("")
    lines.append("---")
    lines.append("")

    # --- Intended Use ----------------------------------------------------
    lines.append("## Intended Use")
    lines.append("")
    lines.append(
        "This model is a **clinician decision-support second reader** for frontal chest radiographs, "
        "surfacing a probability-ranked finding (Normal / Lung Opacity / Other Abnormality), a "
        "localizing bounding box, and a Grad-CAM heatmap for a radiologist's review. It is **not** "
        "intended for autonomous diagnosis: every case must pass the mandatory human-in-the-loop review "
        "gate (`agents/orchestrator.py`'s `human_review` node) before any finding is finalized in a "
        "patient record."
    )
    lines.append("")
    lines.append(
        "**Out of scope:** lateral or non-frontal views, non-CXR modalities, and any age/sex/view-position "
        "subgroup flagged below as underrepresented (`low_n`) or in violation of a safety/fairness "
        "threshold -- those subgroups require additional validation data before this model supports a "
        "clinical claim for them."
    )
    lines.append("")

    # --- Demographic Split Parity -----------------------------------------
    lines.append("## Demographic Split Parity")
    lines.append("")
    counts = split_report["counts"]
    lines.append(
        f"Locked test split: **{counts['train']} train / {counts['val']} val / {counts['test']} test** "
        f"patients (seed={split_report['seed']}, created {split_report['created_at']})."
    )
    lines.append("")
    leak = split_report["leakage_check"]
    lines.append(f"**Patient-level leakage check: {leak['status']}** ({leak['overlapping_patient_ids']} overlapping patient_id(s)).")
    lines.append("")
    lines.extend(_render_demographic_tables(split_report["distribution_pct"]))

    # --- Clinical Metrics ---------------------------------------------------
    lines.append(f"## Clinical Metrics (locked test set, n={overall.get('n', '?')})")
    lines.append("")
    threshold = config["threshold"]
    if target_recall is not None:
        lines.append(
            f"**Operating threshold: {threshold:.4f}** — selected via `find_high_recall_threshold()` "
            f"targeting {target_recall:.0%} sensitivity on the validation split, not the naive 0.5 default "
            "(Strategic_Startup_Roadmap.pdf, Phase 1, item 2: prioritize recall over raw accuracy)."
        )
    else:
        lines.append(f"**Operating threshold: {threshold:.4f}**")
    lines.append("")
    lines.append(f"- AUROC: {_fmt_metric(overall['auroc'])}")
    lines.append(f"- Sensitivity: {_fmt_metric(overall['sensitivity'])}")
    lines.append(f"- Specificity: {_fmt_metric(overall['specificity'])}")
    lines.append(f"- PPV: {_fmt_metric(overall['ppv'])}")
    lines.append(f"- NPV: {_fmt_metric(overall['npv'])}")
    lines.append(
        f"- Bootstrap: {overall.get('n_bootstraps_used', '?')}/{overall.get('n_bootstraps_requested', '?')} resamples used"
    )
    lines.append("")

    # --- Calibration Status --------------------------------------------------
    lines.append("## Calibration Status")
    lines.append("")
    if temperature == 1.0:
        lines.append("**T = 1.0 — no calibration has been fit.** Confidence values are raw, uncalibrated model output.")
    else:
        lines.append(
            f"**Fitted temperature: T = {temperature:.4f}** (via `evaluation/calibration.py`'s "
            "`TemperatureScaler`, L-BFGS minimizing NLL on held-out validation logits — Guo et al. 2017)."
        )
    lines.append("")

    # --- Fairness / Bias Summary ----------------------------------------------
    lines.append("## Fairness / Bias Summary")
    lines.append("")
    safety_flags = subgroup_report.get("safety_flags", [])
    fairness_flags = subgroup_report.get("fairness_flags", [])

    if not safety_flags and not fairness_flags:
        lines.append(
            "No safety or fairness flags triggered at the configured thresholds "
            f"(sensitivity floor={config['sensitivity_floor']}, fairness gap threshold={config['fairness_gap_threshold']})."
        )
    else:
        if safety_flags:
            lines.append(f"### ⚠️ {len(safety_flags)} SAFETY FLAG(S) — sensitivity below the patient-safety floor")
            lines.append("")
            for flag in safety_flags:
                lines.append(f"- **{flag['axis']}={flag['group']}**: {flag['reason']}")
            lines.append("")
        if fairness_flags:
            lines.append(f"### ⚠️ {len(fairness_flags)} FAIRNESS FLAG(S) — performance gap exceeds threshold")
            lines.append("")
            for flag in fairness_flags:
                lines.append(f"- **{flag['axis']} / {flag['metric']}**: {flag['reason']}")
            lines.append("")
        lines.append(
            "**Any flag above is a blocking finding, not a footnote.** Deployment to a flagged subgroup "
            "requires either additional targeted validation data or an explicit, documented exclusion "
            "from intended use."
        )
    lines.append("")

    lines.append("---")
    if synthetic:
        lines.append(f"**{SYNTHETIC_WATERMARK}** — see the notice at the top of this document.")
    else:
        lines.append(
            "Research evaluation on the real RSNA challenge cohort — see the notice at the top of "
            "this document for what it does and does not establish."
        )
    lines.append("")

    text = "\n".join(lines)

    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(text)
    logger.info("Wrote Model Card to %s", output_path)
    return text


def log_phase1_run_to_mlflow(
    subgroup_report: dict,
    model_card_path: str | Path,
    manifest_paths: dict[str, str],
    temperature_path: str | Path = DEFAULT_TEMPERATURE_PATH,
    subgroup_analysis_path: str | Path = DEFAULT_SUBGROUP_ANALYSIS_PATH,
    experiment_name: str = "medagent-phase1-validation",
    run_name: str = "phase1-validation-run",
) -> str:
    """
    Logs one full Phase 1 validation run to MLflow: config as params,
    overall + worst-subgroup-gap numbers as metrics, and every artifact
    file (Model Card, temperature, split manifests, subgroup analysis)
    as run artifacts -- so any single reported number can be traced back
    to the exact split/predictions/calibration that produced it.

    Returns the MLflow run_id.
    """
    config = subgroup_report["config"]
    overall = subgroup_report["overall"]

    params = {
        "threshold": config["threshold"],
        "n_bootstraps": config["n_bootstraps"],
        "sensitivity_floor": config["sensitivity_floor"],
        "fairness_gap_threshold": config["fairness_gap_threshold"],
        "min_group_size": config["min_group_size"],
        "seed": config["seed"],
        "test_set_size": overall.get("n"),
    }

    metrics: dict[str, float] = {}
    for metric_name in ("auroc", "sensitivity", "specificity", "ppv", "npv"):
        entry = overall[metric_name]
        for key in ("estimate", "ci_lower", "ci_upper"):
            value = entry.get(key, float("nan"))
            if value == value:  # skip NaN -- MLflow rejects non-finite metric values
                metrics[f"overall_{metric_name}_{key}"] = value

    for axis_key, gaps in subgroup_report["max_gap"].items():
        for metric_name, gap in gaps.items():
            metrics[f"max_gap_{axis_key}_{metric_name}"] = gap

    metrics["num_safety_flags"] = float(len(subgroup_report.get("safety_flags", [])))
    metrics["num_fairness_flags"] = float(len(subgroup_report.get("fairness_flags", [])))

    with MLflowTracker(experiment_name=experiment_name, run_name=run_name, params=params) as run:
        run.log_metrics(metrics)
        run.log_artifact(str(model_card_path))
        if Path(temperature_path).is_file():
            run.log_artifact(str(temperature_path))
        if Path(subgroup_analysis_path).is_file():
            run.log_artifact(str(subgroup_analysis_path))
        for path in manifest_paths.values():
            if Path(path).is_file():
                run.log_artifact(str(path))
        run_id = run.run_id

    logger.info("Logged Phase 1 validation run %s to MLflow experiment %r", run_id, experiment_name)
    return run_id


if __name__ == "__main__":
    # *** Full Phase 1 end-to-end verification, against synthetic data only. ***
    # Ties together every prior item: verifies the locked split (item 1),
    # selects a high-recall operating threshold and computes bootstrapped
    # clinical metrics (item 2), fits and saves a calibration temperature
    # (item 3), runs subgroup/bias analysis with that threshold (item 4),
    # then generates the Model Card and logs everything to MLflow (item 5).
    import sys

    import numpy as np
    import torch

    from medagent.evaluation.calibration import TemperatureScaler
    from medagent.evaluation.dataset_split import generate_split_report, load_manifest, verify_lock
    from medagent.evaluation.metrics import find_high_recall_threshold
    from medagent.evaluation.stratified import evaluate_subgroups, save_subgroup_analysis

    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")

    split_dir = sys.argv[1] if len(sys.argv) > 1 else "data/splits"
    locked = verify_lock(split_dir)
    split_report = generate_split_report(locked)

    val_cases = load_manifest(locked["val_manifest_path"])
    test_cases = load_manifest(locked["test_manifest_path"])
    print(f"Loaded {len(val_cases)} val / {len(test_cases)} test case(s) from the locked split.")

    # *** Dummy predictions -- not a real model's output. *** Reasonably
    # good overall (correlated with the true target); degrade
    # PatientSex="F" specifically to keep this run's bias story
    # consistent with item 4's verification.
    def _dummy_predictions(cases, seed):
        rng = np.random.default_rng(seed)
        probs = {}
        for case in cases:
            base = 0.75 if case["target"] == 1 else 0.25
            probs[case["patient_id"]] = float(np.clip(rng.normal(base, 0.15), 0.01, 0.99))
        for case in cases:
            if case["sex"] == "F":
                probs[case["patient_id"]] = float(np.clip(rng.normal(0.15, 0.1), 0.01, 0.99))
        return probs

    val_probs = _dummy_predictions(val_cases, seed=3)
    test_probs = _dummy_predictions(test_cases, seed=7)

    # --- Item 2: select a high-recall operating threshold on the
    # VALIDATION set (never the test set -- that would be tuning on the
    # data we're about to report performance against).
    val_y_true = np.array([c["target"] for c in val_cases])
    val_y_prob = np.array([val_probs[c["patient_id"]] for c in val_cases])
    target_recall = 0.95
    threshold_result = find_high_recall_threshold(val_y_true, val_y_prob, target_recall=target_recall)
    threshold = threshold_result["threshold"]
    print(f"Selected high-recall threshold={threshold:.4f} (target_recall={target_recall}, "
          f"achieved on val={threshold_result['achieved_recall']:.4f})")

    # --- Item 3: fit + save a calibration temperature on the validation
    # set's (dummy) logits -- inverse-sigmoid the dummy probabilities
    # back into logits, since these are synthetic values, not a real
    # model's raw output.
    val_logits = torch.logit(torch.tensor(val_y_prob, dtype=torch.float32).clamp(1e-4, 1 - 1e-4))
    scaler = TemperatureScaler()
    scaler.fit(val_logits, torch.tensor(val_y_true, dtype=torch.float32))
    scaler.save()
    print(f"Fitted and saved temperature T={scaler.temperature:.4f}")

    # --- Item 4: subgroup/bias analysis on the TEST set, at the
    # validation-selected threshold.
    subgroup_report = evaluate_subgroups(
        test_cases, test_probs, threshold=threshold, n_bootstraps=500,
        sensitivity_floor=0.90, fairness_gap_threshold=0.05, seed=42,
    )
    save_subgroup_analysis(subgroup_report)

    # --- Item 5: Model Card + MLflow.
    model_card_text = generate_model_card(
        subgroup_report, split_report, temperature=scaler.temperature, target_recall=target_recall,
    )
    print(model_card_text)

    run_id = log_phase1_run_to_mlflow(
        subgroup_report,
        model_card_path="evaluation_results/Model_Card.md",
        manifest_paths={
            "train": locked["train_manifest_path"],
            "val": locked["val_manifest_path"],
            "test": locked["test_manifest_path"],
        },
    )
    print(f"MLflow run_id: {run_id}")
