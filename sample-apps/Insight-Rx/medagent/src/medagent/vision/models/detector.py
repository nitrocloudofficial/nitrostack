"""
Lung-opacity detector -- AI Perception Layer (TRD 3.1).

Faster R-CNN + ResNet-50-FPN (torchvision). DenseNet is a poor detection
backbone -- localization stays on its own ResNet-50-FPN model, separate
from classifier.py's DenseNet-121, rather than trying to share one
backbone across both tasks.

Only two output classes: background (0, torchvision's fixed convention)
and lung_opacity (1). The richer multi-finding label set lives on the
classifier; the detector's job is strictly localizing the primary
finding, not per-box differential diagnosis -- that reasoning belongs
to the Diagnosis Agent downstream, not the vision layer.

Operational knobs (score threshold, NMS IoU, max detections, checkpoint
path) come from settings.py / .env, per the project's "read config
through get_settings(), never os.environ directly" convention -- not
from configs/model_config.yaml, which stays as architectural
documentation only for this module.
"""
from __future__ import annotations

import logging
from pathlib import Path

import torch
from torch import nn
from torchvision.models.detection import FasterRCNN_ResNet50_FPN_Weights, fasterrcnn_resnet50_fpn
from torchvision.models.detection.faster_rcnn import FastRCNNPredictor

from medagent.utils.settings import get_settings

logger = logging.getLogger("medagent.vision.detector")

DETECTOR_LABELS = ["background", "lung_opacity"]


def build_detector(
    checkpoint_path: str | None = None,
    score_threshold: float | None = None,
    nms_iou_threshold: float | None = None,
    max_detections: int | None = None,
    device: str | torch.device = "cpu",
) -> nn.Module:
    """
    Builds a Faster R-CNN R50-FPN with a 2-class head (background +
    lung_opacity), pre-configured to apply the score threshold, NMS IoU
    threshold, and max-detections cap internally (via torchvision's own
    box_score_thresh / box_nms_thresh / box_detections_per_img) -- so
    vision/inference.py doesn't need to reimplement filtering torchvision
    already does at inference time.

    Any argument left as None falls back to settings.py
    (detector_score_threshold / detector_nms_iou_threshold /
    detector_max_detections / detector_checkpoint_path).

    Loads a fine-tuned checkpoint if present at that path. Otherwise
    starts from COCO-pretrained backbone/RPN weights (or, if those can't
    be fetched -- e.g. no network -- a randomly initialized backbone)
    with a freshly initialized box-classification head, and logs a loud
    warning: localization is NOT clinically meaningful until Phase 1
    fine-tuning on annotated chest X-rays (e.g. the RSNA Pneumonia
    Detection Challenge) lands.
    """
    settings = get_settings()
    checkpoint_path = checkpoint_path or settings.detector_checkpoint_path
    score_threshold = score_threshold if score_threshold is not None else settings.detector_score_threshold
    nms_iou_threshold = nms_iou_threshold if nms_iou_threshold is not None else settings.detector_nms_iou_threshold
    max_detections = max_detections if max_detections is not None else settings.detector_max_detections

    common_kwargs = dict(
        box_score_thresh=score_threshold,
        box_nms_thresh=nms_iou_threshold,
        box_detections_per_img=max_detections,
    )

    try:
        model = fasterrcnn_resnet50_fpn(weights=FasterRCNN_ResNet50_FPN_Weights.DEFAULT, **common_kwargs)
    except Exception:  # noqa: BLE001 - e.g. no network access to fetch COCO weights
        logger.warning(
            "Could not fetch COCO-pretrained Faster R-CNN weights (offline / not "
            "cached) -- backbone is randomly initialized. Detections will be noise "
            "until Phase 1 training.", exc_info=True,
        )
        model = fasterrcnn_resnet50_fpn(weights=None, **common_kwargs)

    in_features = model.roi_heads.box_predictor.cls_score.in_features
    model.roi_heads.box_predictor = FastRCNNPredictor(in_features, len(DETECTOR_LABELS))

    checkpoint_file = Path(checkpoint_path)
    if checkpoint_file.is_file():
        state_dict = torch.load(checkpoint_file, map_location="cpu")
        missing, unexpected = model.load_state_dict(state_dict, strict=False)
        if missing or unexpected:
            logger.warning(
                "Loaded detector checkpoint %s with mismatched keys "
                "(missing=%d, unexpected=%d).", checkpoint_file, len(missing), len(unexpected),
            )
        else:
            logger.info("Loaded fine-tuned detector checkpoint from %s", checkpoint_file)
    else:
        logger.info(
            "No fine-tuned detector checkpoint at %s -- the box-classification head "
            "is RANDOMLY INITIALIZED on top of COCO-pretrained features. Bounding "
            "boxes are NOT clinically meaningful until Phase 1 training lands "
            "(see Strategic_Startup_Roadmap.pdf).", checkpoint_file,
        )

    model.to(device)
    model.eval()
    return model


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
    model = build_detector()
    with torch.no_grad():
        out = model([torch.rand(3, 224, 224)])
    print("labels:", DETECTOR_LABELS)
    print({k: v.shape for k, v in out[0].items()})
