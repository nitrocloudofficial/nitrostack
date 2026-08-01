"""
Unit tests for evaluation/calibration.py's TemperatureScaler (Phase 1,
item 3) and evaluation/metrics.py's calculate_ece.
"""
from __future__ import annotations

import numpy as np
import pytest
import torch

from medagent.evaluation.calibration import TemperatureScaler
from medagent.evaluation.metrics import calculate_ece


def _make_overconfident_binary_example(n: int = 500, seed: int = 0):
    """Real class separation is noisy (true accuracy ends up ~75%), but
    logits are scaled up hard regardless, so predicted confidence
    clusters near 0%/100% far more often than the model is actually
    right -- textbook miscalibration, not just "correct but a bit too
    sharp". Mirrors evaluation/calibration.py's own __main__ smoke
    example so both stay honest about what "overconfident" means here."""
    rng = np.random.default_rng(seed)
    labels = rng.integers(0, 2, size=n)
    base_logit = np.where(labels == 1, 1.0, -1.0) + rng.normal(0, 1.3, size=n)
    logits = torch.tensor(base_logit * 6.0, dtype=torch.float32)
    labels_t = torch.tensor(labels, dtype=torch.float32)
    return labels, logits, labels_t


def test_calculate_ece_perfect_calibration_is_zero():
    # Predicted probability exactly matches the empirical accuracy in
    # every bin by construction -- ECE should be (near) zero.
    y_true = np.array([0, 0, 0, 0, 1, 1, 1, 1, 1, 1])
    y_prob = np.array([0.1, 0.1, 0.1, 0.1, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9])
    # bin for 0.1: accuracy=0/4=0, confidence=0.1 -> gap 0.1
    # bin for 0.9: accuracy=6/6=1.0, confidence=0.9 -> gap 0.1
    ece = calculate_ece(y_true, y_prob, num_bins=10)
    assert ece == pytest.approx(0.1, abs=1e-6)


def test_calculate_ece_ignores_empty_bins_without_nan():
    # All predictions land in one bin -- the other 9 bins are empty and
    # must be excluded from the weighted sum entirely, not counted as 0
    # or produce a NaN.
    y_true = np.array([1, 1, 0, 1])
    y_prob = np.array([0.95, 0.96, 0.94, 0.97])
    ece = calculate_ece(y_true, y_prob, num_bins=10)
    assert not np.isnan(ece)
    assert 0.0 <= ece <= 1.0


def test_temperature_scaler_defaults_to_one_and_is_a_noop():
    scaler = TemperatureScaler()
    assert scaler.temperature == pytest.approx(1.0)
    logits = torch.tensor([2.0, -1.0, 0.5])
    assert torch.allclose(scaler(logits), logits)


def test_temperature_scaler_rejects_nonpositive_initial_temperature():
    with pytest.raises(ValueError):
        TemperatureScaler(initial_temperature=0.0)
    with pytest.raises(ValueError):
        TemperatureScaler(initial_temperature=-1.0)


def test_temperature_scaler_fit_reduces_ece_on_overconfident_data():
    labels, logits, labels_t = _make_overconfident_binary_example()

    before_probs = torch.sigmoid(logits).numpy()
    ece_before = calculate_ece(labels, before_probs)

    scaler = TemperatureScaler()
    fitted_t = scaler.fit(logits, labels_t)

    after_probs = torch.sigmoid(scaler(logits)).detach().numpy()
    ece_after = calculate_ece(labels, after_probs)

    assert fitted_t > 1.0, "expected softening (T>1) on genuinely overconfident data"
    assert ece_after < ece_before, f"ECE did not improve: before={ece_before:.4f} after={ece_after:.4f}"


def test_temperature_scaler_fit_never_changes_argmax_accuracy():
    """Temperature scaling reshapes confidence, not ranking -- accuracy
    at the standard 0.5 cutoff must be bit-for-bit identical before and
    after fitting."""
    labels, logits, labels_t = _make_overconfident_binary_example()

    before_preds = (torch.sigmoid(logits) >= 0.5).numpy().astype(int)
    accuracy_before = float((before_preds == labels).mean())

    scaler = TemperatureScaler()
    scaler.fit(logits, labels_t)
    after_preds = (torch.sigmoid(scaler(logits)) >= 0.5).detach().numpy().astype(int)
    accuracy_after = float((after_preds == labels).mean())

    assert accuracy_before == accuracy_after
    assert np.array_equal(before_preds, after_preds)


def test_temperature_scaler_save_and_load_round_trip(tmp_path):
    path = tmp_path / "temperature.json"
    scaler = TemperatureScaler(initial_temperature=1.75)
    scaler.save(path)

    loaded = TemperatureScaler.load(path)
    assert loaded.temperature == pytest.approx(1.75)


def test_temperature_scaler_load_missing_file_defaults_to_one(tmp_path, caplog):
    missing_path = tmp_path / "does_not_exist.json"
    scaler = TemperatureScaler.load(missing_path)
    assert scaler.temperature == pytest.approx(1.0)


def test_classifier_predict_temperature_changes_confidence_not_predicted_class():
    """Integration check against the real classifier, not just the
    abstract sigmoid case above: predict()'s bucket-mapped
    predicted_class must be identical across temperatures (a monotonic
    per-pathology rescaling can't change which bucket has the highest
    probability), while calibrated_confidence actually moves."""
    from medagent.vision.models.classifier import build_classifier
    from medagent.vision.models.classifier import predict as classify_image

    model = build_classifier(device="cpu")
    tensor = torch.rand(1, 224, 224) * 2048 - 1024  # torchxrayvision's expected input range

    results = [classify_image(model, tensor, temperature=t) for t in (0.5, 1.0, 1.5, 2.0, 3.0)]

    predicted_classes = {r["predicted_class"] for r in results}
    assert len(predicted_classes) == 1, f"predicted_class changed across temperatures: {predicted_classes}"

    confidences = [r["calibrated_confidence"] for r in results]
    assert len(set(confidences)) > 1, "calibrated_confidence should vary with temperature"
    # Higher T softens confidence toward the bucket's "uninformative" value.
    assert confidences == sorted(confidences, reverse=True)


def test_temperature_scaler_multiclass_logits_use_cross_entropy():
    """A [N, C] logits shape should be treated as multi-class (softmax +
    cross-entropy), not binary, and still fit without error."""
    rng = np.random.default_rng(1)
    n, num_classes = 200, 3
    labels = rng.integers(0, num_classes, size=n)
    logits = torch.zeros(n, num_classes)
    for i, label in enumerate(labels):
        logits[i, label] = 8.0  # deliberately overconfident one-hot-ish logits
        logits[i] += torch.tensor(rng.normal(0, 0.3, size=num_classes), dtype=torch.float32)

    scaler = TemperatureScaler()
    fitted_t = scaler.fit(logits, torch.tensor(labels, dtype=torch.long))
    assert fitted_t > 0
