"""Unit tests for evaluation/metrics.py."""
from __future__ import annotations

import numpy as np

from medagent.evaluation.metrics import calculate_classification_metrics, calculate_iou


def test_calculate_classification_metrics_perfect_predictions():
    y_true = np.array([0, 1, 2, 0, 1, 2])
    y_pred = np.array([0, 1, 2, 0, 1, 2])

    metrics = calculate_classification_metrics(y_true, y_pred)

    assert metrics["accuracy"] == 1.0
    assert metrics["precision"] == 1.0
    assert metrics["recall"] == 1.0
    assert metrics["f1_score"] == 1.0


def test_calculate_classification_metrics_all_wrong():
    y_true = np.array([0, 0, 0, 0])
    y_pred = np.array([1, 1, 1, 1])

    metrics = calculate_classification_metrics(y_true, y_pred)

    assert metrics["accuracy"] == 0.0
    assert metrics["recall"] == 0.0


def test_calculate_classification_metrics_returns_all_four_keys():
    y_true = np.array([0, 1, 1, 0])
    y_pred = np.array([0, 1, 0, 0])

    metrics = calculate_classification_metrics(y_true, y_pred)

    assert set(metrics.keys()) == {"accuracy", "precision", "recall", "f1_score"}
    assert all(isinstance(v, float) for v in metrics.values())


def test_calculate_iou_identical_boxes_is_one():
    box = np.array([10, 10, 20, 20])  # x, y, w, h
    assert calculate_iou(box, box) == 1.0


def test_calculate_iou_disjoint_boxes_is_zero():
    box_a = np.array([0, 0, 10, 10])
    box_b = np.array([100, 100, 10, 10])
    assert calculate_iou(box_a, box_b) == 0.0


def test_calculate_iou_partial_overlap():
    box_a = np.array([0, 0, 10, 10])  # covers [0,10] x [0,10], area 100
    box_b = np.array([5, 5, 10, 10])  # covers [5,15] x [5,15], area 100
    # intersection: [5,10] x [5,10] = 25; union = 100 + 100 - 25 = 175
    assert abs(calculate_iou(box_a, box_b) - 25 / 175) < 1e-9


def test_calculate_iou_zero_area_box_is_zero():
    box_a = np.array([0, 0, 0, 0])
    box_b = np.array([0, 0, 10, 10])
    assert calculate_iou(box_a, box_b) == 0.0
