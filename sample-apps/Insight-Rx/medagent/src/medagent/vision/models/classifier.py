"""
PneumoNet-CXR classifier -- AI Perception Layer (TRD 3.1).

Wraps the domain-pretrained DenseNet-121 (backbone.py), then bucket-maps
its 18 independent per-pathology probabilities onto the 3-class scheme
state.py's ClassificationResult declares ("Normal" / "Lung Opacity" /
"Other Abnormality"). vision/inference.py calls predict() and drops the
result straight into AgentState.classification.

Temperature scaling deliberately does NOT live on this class. An
earlier version of PneumoNetCXR carried its own temperature parameter,
which risked applying calibration twice -- once here, once again in
whatever loaded evaluation/calibration.py's TemperatureScaler -- if both
were ever used together. That module is now the single place a
temperature is fit, saved, and applied; predict() below accepts an
external `temperature` value and applies it to this model's raw logits
instead.
"""
from __future__ import annotations

import logging
from pathlib import Path

import torch
from torch import nn

from medagent.agents.state import ClassificationResult
from medagent.utils.settings import get_settings
from medagent.vision.models.backbone import build_backbone

logger = logging.getLogger("medagent.vision.classifier")

# Pathologies that are effectively synonymous with pneumonia/consolidation
# map to the "Lung Opacity" bucket; every other real (non-empty) pathology
# name falls into "Other Abnormality" so an unrecognized-but-present
# finding is never silently dropped into "Normal".
_LUNG_OPACITY_PATHOLOGIES = {"Lung Opacity", "Pneumonia", "Consolidation", "Infiltration"}


class PneumoNetCXR(nn.Module):
    """DenseNet-121 backbone, exposed as-is. forward() returns RAW
    per-pathology logits -- no temperature, no sigmoid -- so callers
    (predict() below, evaluation/calibration.py's TemperatureScaler,
    Grad-CAM) all operate on the same unscaled quantity rather than each
    assuming a different one."""

    def __init__(self, backbone: nn.Module) -> None:
        super().__init__()
        self.backbone = backbone
        self.pathologies: list[str] = list(backbone.pathologies)

    def forward(self, pixel_values: torch.Tensor) -> torch.Tensor:
        """Raw per-pathology logits, shape [batch, num_pathologies]."""
        return self.backbone(pixel_values)


def build_classifier(
    checkpoint_path: str | None = None,
    device: str | torch.device = "cpu",
) -> PneumoNetCXR:
    """
    Returns a PneumoNetCXR in eval mode on `device`.

    Loads a fine-tuned checkpoint from settings.classifier_checkpoint_path
    if present. Otherwise uses backbone.py's domain-pretrained
    DenseNet-121 as-is. Calibration (temperature) is not part of this
    model or its checkpoint -- see evaluation/calibration.py's
    TemperatureScaler, applied externally by predict() below.
    """
    settings = get_settings()
    checkpoint_path_str = checkpoint_path or settings.classifier_checkpoint_path

    backbone = build_backbone(device="cpu")
    model = PneumoNetCXR(backbone)

    checkpoint_file = Path(checkpoint_path_str)
    if checkpoint_file.is_file():
        state_dict = torch.load(checkpoint_file, map_location="cpu")
        missing, unexpected = model.load_state_dict(state_dict, strict=False)
        if missing or unexpected:
            logger.warning(
                "Loaded classifier checkpoint %s with mismatched keys "
                "(missing=%d, unexpected=%d).", checkpoint_file, len(missing), len(unexpected),
            )
        else:
            logger.info("Loaded fine-tuned classifier checkpoint from %s", checkpoint_file)
    else:
        logger.info(
            "No fine-tuned classifier checkpoint at %s -- using backbone.py's "
            "domain-pretrained weights as-is (uncalibrated until Phase 1 fits a "
            "temperature against a held-out set).",
            checkpoint_file,
        )

    model.to(device)
    model.eval()
    return model


def predict(
    model: PneumoNetCXR,
    pixel_values: torch.Tensor,
    device: str | torch.device = "cpu",
    temperature: float = 1.0,
) -> ClassificationResult:
    """
    Runs the model on a single preprocessed, single-channel image tensor
    ([1, H, W]) and returns EXACTLY state.py's ClassificationResult shape:
    predicted_class, class_probabilities, calibrated_confidence.

    `temperature` scales the model's raw logits before sigmoid --
    1.0 (default) is a no-op; vision/inference.py passes in whatever
    evaluation/calibration.py's TemperatureScaler.load() returns, so this
    function itself stays agnostic to where that value came from.

    Bucket-maps the 18 independent per-pathology probabilities onto
    state.py's 3-way predicted_class using MAX (not sum/average) within
    each bucket: these are independent multi-label sigmoid outputs, not a
    single softmax distribution, and a recall-oriented system should treat
    one strongly positive finding as making its whole bucket positive, not
    average it down against unrelated negative findings. "Normal" is
    derived as 1 - the strongest finding anywhere, since torchxrayvision's
    pathology set has no explicit "no finding" output of its own.
    """
    with torch.no_grad():
        logits = model(pixel_values.unsqueeze(0).to(device)).squeeze(0).cpu()
        probs = torch.sigmoid(logits / temperature)

    class_probabilities = {label: float(p) for label, p in zip(model.pathologies, probs)}

    opacity_prob = max(
        (class_probabilities[p] for p in _LUNG_OPACITY_PATHOLOGIES if p in class_probabilities),
        default=0.0,
    )
    other_abnormality_prob = max(
        (p for label, p in class_probabilities.items() if label not in _LUNG_OPACITY_PATHOLOGIES),
        default=0.0,
    )
    normal_prob = 1.0 - max(opacity_prob, other_abnormality_prob)

    bucket_probs = {
        "Normal": normal_prob,
        "Lung Opacity": opacity_prob,
        "Other Abnormality": other_abnormality_prob,
    }
    predicted_class = max(bucket_probs, key=bucket_probs.get)

    return {
        "predicted_class": predicted_class,
        "class_probabilities": class_probabilities,
        "calibrated_confidence": bucket_probs[predicted_class],
    }


if __name__ == "__main__":
    import json

    from medagent.evaluation.calibration import TemperatureScaler

    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
    model = build_classifier()
    scaler = TemperatureScaler.load()  # T=1.0 unless models/temperature.json exists
    print("temperature:", scaler.temperature)
    result = predict(model, torch.zeros(1, 224, 224), temperature=scaler.temperature)
    print(json.dumps(result, indent=2))
