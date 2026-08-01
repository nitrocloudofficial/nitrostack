"""
AI Perception Layer entrypoint -- TRD 3.1.

`run_perception()` is what orchestrator.py's perceive_image_node calls.
Pipeline: preprocess -> classify (classifier.py) -> detect (detector.py)
-> Grad-CAM + alignment score (gradcam.py) -> shape everything into
exactly the ClassificationResult / BoundingBox contracts state.py
declares.

Fail-safe like every other node in the graph (diagnosis_agent_node,
evidence_agent_node, report_agent_node, verifier_agent_node all follow
the same shape): this function never raises. Any failure -- a bad
image, a model bug, a disk error -- is logged via logger.exception and
turned into a well-formed "undetermined" result rather than an
exception, so a broken perception run escalates through the normal
recall-over-precision / human-review path instead of crashing the
graph or silently reading as healthy.
"""
from __future__ import annotations

import logging
from functools import lru_cache
from pathlib import Path

import torch

from medagent.agents.state import BoundingBox, ClassificationResult, PatientMetadata
from medagent.evaluation.calibration import DEFAULT_TEMPERATURE_PATH, TemperatureScaler
from medagent.utils.settings import get_settings
from medagent.vision.gradcam import compute_alignment_score, generate_gradcam_heatmap
from medagent.vision.models.backbone import normalize_for_backbone
from medagent.vision.models.classifier import build_classifier
from medagent.vision.models.classifier import predict as classify_image
from medagent.vision.models.detector import DETECTOR_LABELS, build_detector
from medagent.vision.preprocessing import preprocess_radiograph

logger = logging.getLogger("medagent.vision.inference")


def _resolve_device() -> str:
    """settings.device == "auto" resolves to cuda > mps > cpu; anything else
    (a deployment forcing a specific backend) is used as given."""
    settings = get_settings()
    if settings.device != "auto":
        return settings.device
    if torch.cuda.is_available():
        return "cuda"
    if torch.backends.mps.is_available():
        return "mps"
    return "cpu"


@lru_cache(maxsize=1)
def _get_classifier():
    return build_classifier(device=_resolve_device())


@lru_cache(maxsize=1)
def _get_detector():
    return build_detector(device=_resolve_device())


@lru_cache(maxsize=1)
def _get_temperature_scaler() -> TemperatureScaler:
    """Loads the fitted calibration temperature from disk (see
    evaluation/calibration.py). Cached like the models above: this reads
    the same file for every case in a process's lifetime, so there's no
    reason to re-parse it per request -- restart the process (or clear
    this cache) to pick up a newly re-fit temperature."""
    return TemperatureScaler.load()


def _undetermined_result() -> dict:
    """Well-formed fallback for any perception failure. predicted_class is
    "Other Abnormality", never "Normal" -- an undetermined case must never
    be silently deprioritized (the same recall-over-precision rule
    diagnosis_agent.py's own failure fallback follows)."""
    classification: ClassificationResult = {
        "predicted_class": "Other Abnormality",
        "class_probabilities": {},
        "calibrated_confidence": 0.0,
    }
    return {
        "classification": classification,
        "detections": [],
        "gradcam_heatmap_path": None,
        "heatmap_bbox_alignment_score": None,
        "model_provenance": model_provenance(),
    }


def _run_detection(model, rgb_tensor: torch.Tensor, device: str) -> list[BoundingBox]:
    _, height, width = rgb_tensor.shape
    with torch.no_grad():
        output = model([rgb_tensor.to(device)])[0]

    detections: list[BoundingBox] = []
    for box, score, label_id in zip(output["boxes"].cpu(), output["scores"].cpu(), output["labels"].cpu()):
        x_min, y_min, x_max, y_max = box.tolist()
        label_index = int(label_id)
        detections.append(
            {
                "label": DETECTOR_LABELS[label_index] if label_index < len(DETECTOR_LABELS) else "unknown",
                # Normalized to [0,1] relative to the preprocessed input size --
                # diagnosis_agent's prompt already documents detections as
                # "normalized coordinates".
                "x_min": x_min / width,
                "y_min": y_min / height,
                "x_max": x_max / width,
                "y_max": y_max / height,
                "score": float(score),
            }
        )
    return detections


def model_provenance() -> dict:
    """
    Which trained artifacts are actually backing this run.

    The console reports confidences to four significant figures and draws
    boxes on a radiograph; both look equally authoritative whether or not
    a fine-tuned checkpoint exists behind them. Today the detector head is
    randomly initialized (no checkpoint), so its boxes are noise -- and
    nothing in the payload said so, which is what made "cluttered boxes"
    read as an NMS problem rather than an untrained-model problem.

    Derived from the filesystem on every call rather than cached: these
    files appear when training lands, and a cached "missing" would
    outlive the fix. Cheap enough (three stat calls) to not warrant a
    cache next to model inference.
    """
    settings = get_settings()
    detector_trained = Path(settings.detector_checkpoint_path).is_file()
    classifier_finetuned = Path(settings.classifier_checkpoint_path).is_file()
    temperature_fitted = Path(DEFAULT_TEMPERATURE_PATH).is_file()

    return {
        "detector_checkpoint_loaded": detector_trained,
        "classifier_checkpoint_loaded": classifier_finetuned,
        "temperature_fitted": temperature_fitted,
        # Confidence is only meaningfully calibrated once a temperature
        # has been fitted. Reported separately from the raw flags so the
        # UI does not have to re-derive the rule.
        "confidence_calibrated": temperature_fitted,
        # The one the console needs most: whether to trust the overlay.
        "detections_clinically_meaningful": detector_trained,
    }


def run_perception(image_path: str, metadata: PatientMetadata | None = None) -> dict:
    """
    Runs the full AI Perception Layer for one case and returns exactly
    the four keys perceive_image_node expects: classification,
    detections, gradcam_heatmap_path, heatmap_bbox_alignment_score.

    `metadata` is accepted for interface compatibility with the
    orchestrator's call site and reserved for future multimodal fusion
    (e.g. age/view-position-conditioned inference); the classifier and
    detector are image-only today.

    Never raises -- see module docstring.
    """
    case_id = (metadata or {}).get("patient_id") or Path(image_path).stem
    device = _resolve_device()

    try:
        # Classifier + Grad-CAM take single-channel input (torchxrayvision's
        # convention); the detector takes 3-channel input (its COCO-pretrained
        # ResNet-50-FPN backbone expects it) -- two preprocessing calls, same
        # underlying pipeline, different `to_rgb`.
        gray_tensor = normalize_for_backbone(preprocess_radiograph(image_path, to_rgb=False))
        rgb_tensor = preprocess_radiograph(image_path, to_rgb=True)

        classifier = _get_classifier()
        temperature = _get_temperature_scaler().temperature
        classification = classify_image(classifier, gray_tensor, device=device, temperature=temperature)

        detector = _get_detector()
        detections = _run_detection(detector, rgb_tensor, device)

        top_pathology = max(
            classification["class_probabilities"],
            key=classification["class_probabilities"].get,
            default=None,
        )
        if top_pathology is not None:
            target_index = classifier.pathologies.index(top_pathology)
            # Still generate and save the heatmap even for a "Normal" read --
            # a clinician sanity-checking a normal case still benefits from
            # seeing where the model looked. Only the *alignment score*
            # below is overridden for "Normal": there's no detected
            # abnormality to align a heatmap against, so scoring it against
            # whatever boxes the detector happened to fire (independently of
            # the classifier's verdict) would be a comparison against the
            # wrong thing, not a real alignment measurement.
            gradcam_heatmap_path, grayscale_cam = generate_gradcam_heatmap(
                classifier, gray_tensor, target_index, case_id=case_id, device=device,
            )
            # None, not 0.0, when there is nothing to align against.
            # compute_alignment_score() already documents its 0.0 as
            # meaning "not applicable", but a float cannot carry that
            # distinction any further: once it reaches the console, a
            # vacuous 0.0 and a genuinely measured zero overlap render
            # as the same "0%", which reads as "the model looked in
            # entirely the wrong place" -- an alarming claim to make
            # about a case where no measurement was possible at all.
            # None survives serialization as JSON null and lets the UI
            # say N/A. The calculation itself is unchanged.
            if classification["predicted_class"] == "Normal" or not detections:
                heatmap_bbox_alignment_score = None
            else:
                heatmap_bbox_alignment_score = compute_alignment_score(grayscale_cam, detections)
        else:
            gradcam_heatmap_path, heatmap_bbox_alignment_score = None, None

        return {
            "classification": classification,
            "detections": detections,
            "gradcam_heatmap_path": gradcam_heatmap_path,
            "heatmap_bbox_alignment_score": heatmap_bbox_alignment_score,
            "model_provenance": model_provenance(),
        }

    except Exception as exc:  # noqa: BLE001 - perception must never crash the graph; see module docstring
        logger.exception("run_perception failed for image_path=%r case_id=%r: %s", image_path, case_id, exc)
        return _undetermined_result()


if __name__ == "__main__":
    import json
    import sys

    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")

    if len(sys.argv) < 2:
        print("Usage: python -m medagent.vision.inference <path-to-image>")
        raise SystemExit(1)

    demo_metadata: PatientMetadata = {
        "age": 47, "sex": "F", "view_position": "PA", "patient_id": "DEMO-0001",
    }
    result = run_perception(sys.argv[1], demo_metadata)
    print(json.dumps(result, indent=2))
