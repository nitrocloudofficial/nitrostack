"""
Explainability -- Grad-CAM heatmaps + heatmap/bounding-box alignment
score, AI Perception Layer (TRD 3.1).

Two responsibilities:
  - generate_gradcam_heatmap(): runs Grad-CAM (pytorch_grad_cam) against
    classifier.py's PneumoNetCXR for a single target pathology, saves an
    overlay PNG to disk, and returns its path plus the raw activation
    map for reuse.
  - compute_alignment_score(): the fraction of that activation map's
    mass that falls inside the detector's bounding boxes -- a trust
    signal for whether the classifier "looked where the detector says
    the abnormality is" (PRD 2.3 explainability alignment;
    AgentState.heatmap_bbox_alignment_score).

Choosing *which* pathology index to target (e.g. the strongest overall
finding) is vision/inference.py's job, not this module's -- gradcam.py
is a pure utility over whatever index it's given.
"""
from __future__ import annotations

import logging
from pathlib import Path

import numpy as np
import torch
from PIL import Image
from pytorch_grad_cam import GradCAM
from pytorch_grad_cam.utils.image import show_cam_on_image
from pytorch_grad_cam.utils.model_targets import ClassifierOutputTarget

from medagent.agents.state import BoundingBox
from medagent.utils.settings import get_settings
from medagent.vision.models.backbone import get_target_layer
from medagent.vision.models.classifier import PneumoNetCXR

logger = logging.getLogger("medagent.vision.gradcam")


def generate_gradcam_heatmap(
    model: PneumoNetCXR,
    pixel_values: torch.Tensor,
    target_pathology_index: int,
    case_id: str,
    output_dir: str | None = None,
    device: str | torch.device = "cpu",
) -> tuple[str, np.ndarray]:
    """
    Runs Grad-CAM against `model` for `target_pathology_index`, overlays
    the resulting heatmap on `pixel_values` (a single-channel [1, H, W]
    tensor -- the same preprocessed image predict() was called on),
    saves it to <output_dir>/<case_id>_gradcam.png, and returns
    (saved_path, grayscale_cam). `output_dir` defaults to
    settings.gradcam_output_dir / GRADCAM_OUTPUT_DIR.

    grayscale_cam is the raw [H, W] activation map in [0,1], returned
    alongside the path so compute_alignment_score() below can reuse it
    without recomputing Grad-CAM.
    """
    settings = get_settings()
    output_dir_path = Path(output_dir or settings.gradcam_output_dir)
    output_dir_path.mkdir(parents=True, exist_ok=True)

    target_layer = get_target_layer(model.backbone)
    input_tensor = pixel_values.unsqueeze(0).to(device)  # [1, 1, H, W]

    with GradCAM(model=model, target_layers=[target_layer]) as cam:
        grayscale_cam = cam(
            input_tensor=input_tensor,
            targets=[ClassifierOutputTarget(target_pathology_index)],
        )[0]  # [H, W], values in [0,1]

    # show_cam_on_image expects an RGB [0,1] float image -- replicate the
    # single grayscale channel for visualization only; the model itself
    # only ever sees 1 channel.
    base_image = pixel_values.squeeze(0).cpu().numpy()
    span = base_image.max() - base_image.min()
    base_image = (base_image - base_image.min()) / span if span > 1e-8 else np.zeros_like(base_image)
    rgb_image = np.stack([base_image] * 3, axis=-1).astype(np.float32)

    overlay = show_cam_on_image(rgb_image, grayscale_cam, use_rgb=True)

    output_path = output_dir_path / f"{case_id}_gradcam.png"
    Image.fromarray(overlay).save(output_path)
    logger.info("Saved Grad-CAM heatmap for case=%s to %s", case_id, output_path)

    return str(output_path), grayscale_cam


def compute_alignment_score(grayscale_cam: np.ndarray, detections: list[BoundingBox]) -> float:
    """
    Fraction of Grad-CAM activation mass that falls inside the
    detector's bounding boxes, in [0,1].

    `grayscale_cam` is the [H, W] array from generate_gradcam_heatmap();
    `detections` is the normalized-coordinate BoundingBox list from the
    detector (see vision/models/detector.py) for the SAME image.

    With no detections, there's nothing to align against -- this
    returns 0.0 rather than 1.0 (vacuously "perfect") so a case with no
    localized findings never reads as a confidently-aligned one. Treat
    0.0 here as "not applicable", not "misaligned", when `detections`
    is empty.
    """
    total_mass = float(grayscale_cam.sum())
    if not detections or total_mass <= 1e-8:
        return 0.0

    height, width = grayscale_cam.shape
    mask = np.zeros_like(grayscale_cam, dtype=bool)
    for box in detections:
        x_min = max(0, int(round(box["x_min"] * width)))
        x_max = min(width, int(round(box["x_max"] * width)))
        y_min = max(0, int(round(box["y_min"] * height)))
        y_max = min(height, int(round(box["y_max"] * height)))
        mask[y_min:y_max, x_min:x_max] = True

    inside_mass = float(grayscale_cam[mask].sum())
    return inside_mass / total_mass


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")

    from medagent.vision.models.classifier import build_classifier, predict

    model = build_classifier(device="cpu")
    tensor = torch.rand(1, 224, 224) * 2048 - 1024  # fake input in roughly torchxrayvision's range

    result = predict(model, tensor)
    top_pathology = max(result["class_probabilities"], key=result["class_probabilities"].get)
    target_index = model.pathologies.index(top_pathology)

    path, cam = generate_gradcam_heatmap(model, tensor, target_index, case_id="smoke-test")
    print("heatmap saved to:", path)

    fake_detections: list[BoundingBox] = [
        {"label": "lung_opacity", "x_min": 0.2, "y_min": 0.2, "x_max": 0.6, "y_max": 0.6, "score": 0.8}
    ]
    score = compute_alignment_score(cam, fake_detections)
    print("alignment score (with a fake box):", score)
    print("alignment score (no boxes):", compute_alignment_score(cam, []))
