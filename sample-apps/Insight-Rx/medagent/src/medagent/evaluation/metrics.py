from __future__ import annotations

import logging

import numpy as np
from sklearn.metrics import accuracy_score, confusion_matrix, f1_score, precision_score, recall_score, roc_auc_score, roc_curve

logger = logging.getLogger("medagent.evaluation.metrics")


def calculate_classification_metrics(y_true: np.ndarray, y_pred: np.ndarray) -> dict[str, float]:
    """Computes Accuracy, Precision, Recall, and F1-score for classification predictions.

    Recall is weighted as the primary metric of clinical interest, since this
    application prioritizes minimizing false negatives over precision.
    """
    return {
        "accuracy": float(accuracy_score(y_true, y_pred)),
        "precision": float(precision_score(y_true, y_pred, average="macro", zero_division=0)),
        "recall": float(recall_score(y_true, y_pred, average="macro", zero_division=0)),
        "f1_score": float(f1_score(y_true, y_pred, average="macro", zero_division=0)),
    }


def calculate_ece(y_true: np.ndarray, y_prob: np.ndarray, num_bins: int = 10) -> float:
    """
    Compute the Expected Calibration Error (ECE) for binary probabilistic predictions.

    Partitions [0, 1] into `num_bins` equal-width bins, and computes the
    weighted average of the absolute gap between each bin's average predicted
    probability (confidence) and its average true label rate (accuracy):

        ECE = sum_m (|B_m| / n) * |acc(B_m) - conf(B_m)|

    Empty bins are excluded from the sum entirely (not treated as a 0
    contribution or a NaN) -- a bin nothing landed in has no accuracy or
    confidence to compare, so it should be invisible to the metric, not
    silently penalize or inflate it.

    Args:
        y_true: Binary ground truth labels, shape (n,), values in {0, 1}.
        y_prob: Predicted probabilities, shape (n,), values in [0, 1].
        num_bins: Number of equal-width bins to partition [0, 1] into.

    Returns:
        Scalar ECE value in [0, 1]; lower is better calibrated.
    """
    y_true = np.asarray(y_true, dtype=np.float64)
    y_prob = np.clip(np.asarray(y_prob, dtype=np.float64), 0.0, 1.0)
    n = y_true.shape[0]

    bin_indices = np.minimum((y_prob * num_bins).astype(np.int64), num_bins - 1)

    bin_counts = np.bincount(bin_indices, minlength=num_bins)
    bin_conf_sum = np.bincount(bin_indices, weights=y_prob, minlength=num_bins)
    bin_acc_sum = np.bincount(bin_indices, weights=y_true, minlength=num_bins)

    nonempty = bin_counts > 0
    avg_confidence = bin_conf_sum[nonempty] / bin_counts[nonempty]
    avg_accuracy = bin_acc_sum[nonempty] / bin_counts[nonempty]
    bin_weights = bin_counts[nonempty] / n

    return float(np.sum(bin_weights * np.abs(avg_accuracy - avg_confidence)))


def calculate_iou(boxA: np.ndarray, boxB: np.ndarray) -> float:
    """Computes Intersection over Union (IoU) for two bounding boxes in [x, y, w, h] format."""
    boxA = np.asarray(boxA, dtype=np.float64)
    boxB = np.asarray(boxB, dtype=np.float64)

    ax1, ay1 = boxA[0], boxA[1]
    ax2, ay2 = boxA[0] + boxA[2], boxA[1] + boxA[3]
    bx1, by1 = boxB[0], boxB[1]
    bx2, by2 = boxB[0] + boxB[2], boxB[1] + boxB[3]

    inter_x1 = max(ax1, bx1)
    inter_y1 = max(ay1, by1)
    inter_x2 = min(ax2, bx2)
    inter_y2 = min(ay2, by2)

    inter_w = max(0.0, inter_x2 - inter_x1)
    inter_h = max(0.0, inter_y2 - inter_y1)
    intersection = inter_w * inter_h

    area_a = max(0.0, boxA[2]) * max(0.0, boxA[3])
    area_b = max(0.0, boxB[2]) * max(0.0, boxB[3])
    union = area_a + area_b - intersection

    if union <= 0.0:
        return 0.0

    return float(intersection / union)


# ─────────────────────────────────────────────────────────────────────
# Regulatory-grade clinical metrics -- Phase 1, item 2
# (Strategic_Startup_Roadmap.pdf: "Report sensitivity/specificity + AUROC
# with 95% CIs at a fixed high-recall operating threshold")
#
# These operate on binary y_true / continuous y_prob, unlike
# calculate_classification_metrics() above (which takes hard multi-class
# y_pred and macro-averages) -- a deliberately separate set of functions
# rather than a change to that one, since vision/train.py and
# evaluation/stratified.py already depend on its existing signature.
# ─────────────────────────────────────────────────────────────────────

def calculate_clinical_metrics(y_true: np.ndarray, y_prob: np.ndarray, threshold: float = 0.5) -> dict[str, float]:
    """
    Computes the standard binary screening-test metric set at a single
    operating threshold: AUROC (threshold-independent -- computed once,
    reported alongside the threshold-dependent metrics for context, not
    recomputed per-threshold), sensitivity, specificity, PPV, and NPV
    (all evaluated at `threshold`).

    Sensitivity/specificity/PPV/NPV are undefined (return 0.0, not NaN)
    when their denominator is zero (e.g. no actual negatives in this
    sample) -- returning 0.0 rather than raising keeps this callable
    inside a bootstrap loop (see calculate_clinical_metrics_with_ci)
    without special-casing every resample.
    """
    y_true = np.asarray(y_true)
    y_prob = np.asarray(y_prob)
    y_pred = (y_prob >= threshold).astype(int)

    tn, fp, fn, tp = confusion_matrix(y_true, y_pred, labels=[0, 1]).ravel()

    sensitivity = float(tp / (tp + fn)) if (tp + fn) > 0 else 0.0
    specificity = float(tn / (tn + fp)) if (tn + fp) > 0 else 0.0
    ppv = float(tp / (tp + fp)) if (tp + fp) > 0 else 0.0
    npv = float(tn / (tn + fn)) if (tn + fn) > 0 else 0.0
    auroc = float(roc_auc_score(y_true, y_prob)) if len(np.unique(y_true)) > 1 else float("nan")

    return {
        "auroc": auroc,
        "sensitivity": sensitivity,
        "specificity": specificity,
        "ppv": ppv,
        "npv": npv,
        "threshold": float(threshold),
    }


def calculate_clinical_metrics_with_ci(
    y_true: np.ndarray,
    y_prob: np.ndarray,
    threshold: float = 0.5,
    n_bootstraps: int = 1000,
    confidence_level: float = 0.95,
    seed: int = 42,
) -> dict[str, dict[str, float]]:
    """
    calculate_clinical_metrics(), with a 95%-by-default empirical
    bootstrap confidence interval on every metric -- point estimates
    alone are not acceptable for a clinical validation claim (see
    Strategic_Startup_Roadmap.pdf, Phase 1).

    Resamples (y_true, y_prob) pairs with replacement `n_bootstraps`
    times; a resample where only one class happens to appear is skipped
    (AUROC and several of these metrics are undefined for a single-class
    sample) rather than counted as a degenerate 0/NaN, so a handful of
    unlucky resamples can't quietly bias the interval -- `n_bootstraps_used`
    in the result reports how many resamples actually contributed.

    Assumes each row of (y_true, y_prob) is already one patient (true if
    this is run against a manifest built by evaluation/dataset_split.py,
    which enforces one row per patientId) -- resampling rows is therefore
    patient-level resampling, not resampling within a patient's multiple
    findings.
    """
    y_true = np.asarray(y_true)
    y_prob = np.asarray(y_prob)
    n = len(y_true)
    if n == 0:
        raise ValueError("calculate_clinical_metrics_with_ci() called with an empty y_true/y_prob")

    point_estimate = calculate_clinical_metrics(y_true, y_prob, threshold)

    metric_names = ("auroc", "sensitivity", "specificity", "ppv", "npv")
    bootstrap_values: dict[str, list[float]] = {name: [] for name in metric_names}

    rng = np.random.default_rng(seed)
    skipped = 0
    for _ in range(n_bootstraps):
        indices = rng.integers(0, n, size=n)
        yt, yp = y_true[indices], y_prob[indices]
        if len(np.unique(yt)) < 2:
            skipped += 1
            continue
        resample_metrics = calculate_clinical_metrics(yt, yp, threshold)
        for name in metric_names:
            bootstrap_values[name].append(resample_metrics[name])

    if skipped:
        logger.warning(
            "%d/%d bootstrap resamples had only one class present and were skipped "
            "(too few samples of the minority class for this sample size).",
            skipped, n_bootstraps,
        )

    alpha = (1.0 - confidence_level) / 2.0
    result: dict[str, dict[str, float]] = {
        "threshold": threshold,
        "n_bootstraps_requested": n_bootstraps,
        "n_bootstraps_used": n_bootstraps - skipped,
    }
    for name in metric_names:
        values = bootstrap_values[name]
        if not values:
            result[name] = {"estimate": point_estimate[name], "ci_lower": float("nan"), "ci_upper": float("nan")}
            continue
        result[name] = {
            "estimate": point_estimate[name],
            "ci_lower": float(np.percentile(values, 100 * alpha)),
            "ci_upper": float(np.percentile(values, 100 * (1.0 - alpha))),
        }
    return result


def find_high_recall_threshold(y_true: np.ndarray, y_prob: np.ndarray, target_recall: float = 0.95) -> dict[str, float]:
    """
    Scans the ROC curve for the highest (most specific) probability
    threshold that still achieves at least `target_recall` sensitivity.

    The default 0.5 cutoff optimizes for balanced accuracy; a screening/
    triage tool should not start there. Missing a positive case (a false
    negative) is far costlier than a false alarm here, so the operating
    point is chosen by first fixing the sensitivity floor patient safety
    requires, then maximizing specificity subject to that floor --
    exactly backwards from tuning a threshold for overall accuracy.

    Raises ValueError if target_recall is not fit for use (outside (0, 1])
    or y_true has only one class (ROC/threshold selection is undefined
    without both classes present).
    """
    if not (0.0 < target_recall <= 1.0):
        raise ValueError(f"target_recall must be in (0, 1], got {target_recall}")

    y_true = np.asarray(y_true)
    y_prob = np.asarray(y_prob)
    if len(np.unique(y_true)) < 2:
        raise ValueError("find_high_recall_threshold() requires both classes present in y_true")

    fpr, tpr, thresholds = roc_curve(y_true, y_prob)

    candidate_indices = [i for i, recall in enumerate(tpr) if recall >= target_recall]
    if not candidate_indices:
        best_index = int(np.argmax(tpr))
        logger.warning(
            "No threshold on this data achieves target_recall=%.3f; falling back to the best "
            "achievable recall=%.3f at threshold=%.4f.",
            target_recall, tpr[best_index], thresholds[best_index],
        )
    else:
        # Among thresholds meeting the recall floor, the LARGEST threshold
        # is the most conservative -- it maximizes specificity subject to
        # the sensitivity constraint, rather than just clearing the bar.
        best_index = max(candidate_indices, key=lambda i: thresholds[i])

    return {
        "threshold": float(thresholds[best_index]),
        "target_recall": float(target_recall),
        "achieved_recall": float(tpr[best_index]),
        "achieved_specificity": float(1.0 - fpr[best_index]),
    }

    return float(intersection / union)