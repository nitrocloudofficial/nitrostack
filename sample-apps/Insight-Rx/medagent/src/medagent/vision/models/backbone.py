"""
Vision backbone factory -- AI Perception Layer (TRD 3.1).

DenseNet-121 with chest-X-ray domain-pretrained weights via
torchxrayvision (https://github.com/mlmed/torchxrayvision), trained
across NIH/PadChest/CheXpert/MIMIC/Kaggle-RSNA -- NOT bare ImageNet
weights, which have never seen a radiograph. Falls back to a
randomly-headed timm densenet121 only if those weights can't be
fetched (package missing, offline, no local cache yet) and logs a loud
warning when it does: that fallback exists so the graph still runs
end-to-end before torchxrayvision's weights are cached, not as an
equivalent substitute for domain-pretrained features.

Both paths expose the same contract: `.pathologies` (the label list the
raw logits correspond to) and `.features` (the conv trunk, for
gradcam.py's target-layer lookup) -- see get_target_layer() below.
"""
from __future__ import annotations

import logging

import torch
from torch import nn

from medagent.utils.settings import get_settings

logger = logging.getLogger("medagent.vision.backbone")

# Canonical 18-pathology schema torchxrayvision's "-all" weights predict
# (== xrv.datasets.default_pathologies). The timm fallback targets this
# same schema (with a freshly initialized head) so classifier.py's
# bucket-mapping logic is identical regardless of which backbone loaded.
DEFAULT_PATHOLOGIES = [
    "Atelectasis", "Consolidation", "Infiltration", "Pneumothorax", "Edema",
    "Emphysema", "Fibrosis", "Effusion", "Pneumonia", "Pleural_Thickening",
    "Cardiomegaly", "Nodule", "Mass", "Hernia", "Lung Lesion", "Fracture",
    "Lung Opacity", "Enlarged Cardiomediastinum",
]


class _TimmDenseNetFallback(nn.Module):
    """ImageNet-pretrained timm densenet121 conv trunk + a freshly
    initialized linear head over DEFAULT_PATHOLOGIES, exposing the same
    "raw logits over pathologies" forward contract as the real
    torchxrayvision model. The head is NOT pretrained -- it exists purely
    so the graph has something real to run before torchxrayvision's
    weights can be fetched, not as an equivalent substitute."""

    def __init__(self) -> None:
        super().__init__()
        import timm

        # in_chans=1: torchxrayvision models take single-channel input;
        # matching that here keeps preprocessing identical across both paths.
        self.trunk = timm.create_model("densenet121", pretrained=True, num_classes=0, in_chans=1)
        with torch.no_grad():
            probe = self.trunk(torch.zeros(1, 1, 224, 224))
        self.head = nn.Linear(probe.shape[-1], len(DEFAULT_PATHOLOGIES))
        self.pathologies = list(DEFAULT_PATHOLOGIES)
        self.features = self.trunk.features  # uniform target-layer lookup, see get_target_layer()

        # This trunk is genuinely ImageNet-pretrained and needs standard
        # ImageNet mean/std normalization to produce sane features -- unlike
        # the torchxrayvision path, which expects its own ~[-1024,1024]
        # convention. Callers always hand both backbone paths a tensor
        # already mapped to that shared [-1024,1024] convention (see
        # normalize_for_backbone() below), so this reverses it back to
        # [0,1] first, then applies single-channel ImageNet stats
        # (channel-averaged, since this trunk sees 1 channel, not 3).
        self.register_buffer("_imagenet_mean", torch.tensor([(0.485 + 0.456 + 0.406) / 3]).view(1, 1, 1))
        self.register_buffer("_imagenet_std", torch.tensor([(0.229 + 0.224 + 0.225) / 3]).view(1, 1, 1))

    def forward(self, pixel_values: torch.Tensor) -> torch.Tensor:
        zero_one = (pixel_values + 1024.0) / 2048.0
        normalized = (zero_one - self._imagenet_mean) / self._imagenet_std
        return self.head(self.trunk(normalized))


def build_backbone(
    weights_id: str | None = None,
    device: str | torch.device = "cpu",
    cache_dir: str | None = None,
) -> nn.Module:
    """
    Returns a DenseNet-121 in eval mode on `device` whose forward() yields
    RAW (pre-sigmoid) logits over `.pathologies`.

    Primary path: torchxrayvision's named pretrained weights (default
    "densenet121-res224-all", configurable via settings.vision_weights_id /
    VISION_WEIGHTS_ID). Those weight sets ship with their own per-pathology
    `op_threshs` calibration, which forces forward() to return normalized
    probabilities regardless of the `apply_sigmoid` flag -- disabled here
    (`op_threshs = None`) so callers get true raw logits and can apply
    their own temperature scaling (classifier.py) instead.

    Fallback path: if the package is missing or the weights can't be
    fetched (offline / not cached), falls back to _TimmDenseNetFallback
    and logs a loud warning -- see its docstring.
    """
    settings = get_settings()
    weights_id = weights_id or settings.vision_weights_id
    cache_dir = cache_dir if cache_dir is not None else settings.vision_cache_dir

    try:
        import torchxrayvision as xrv

        kwargs = {"weights": weights_id}
        if cache_dir:
            kwargs["cache_dir"] = cache_dir
        model = xrv.models.DenseNet(**kwargs)
        model.op_threshs = None
        model.apply_sigmoid = False
        logger.info(
            "Loaded torchxrayvision DenseNet-121 (weights=%r), %d pathologies.",
            weights_id, len(model.pathologies),
        )
    except Exception:  # noqa: BLE001 - package missing, offline, or weights not cached
        logger.warning(
            "Could not load torchxrayvision weights=%r (package missing, offline, or "
            "not cached) -- falling back to an ImageNet-pretrained timm densenet121 "
            "with a RANDOMLY INITIALIZED pathology head. This is NOT a domain-pretrained "
            "chest-X-ray model; treat outputs as noise until torchxrayvision's weights "
            "can be fetched or Phase 1 fine-tuning lands.",
            weights_id,
            exc_info=True,
        )
        model = _TimmDenseNetFallback()

    model.to(device)
    model.eval()
    return model


def normalize_for_backbone(tensor: torch.Tensor) -> torch.Tensor:
    """
    Rescales a [0,1] tensor (preprocess_radiograph()'s output) to the
    ~[-1024, 1024] range torchxrayvision's models expect -- their own
    xrv.utils.normalize(img, maxval) convention, inlined here since the
    input is already known to be exactly [0,1] rather than an arbitrary
    maxval: `(2 * (img / 1.0) - 1) * 1024`.

    Callers (vision/inference.py, gradcam.py) apply this ONCE and reuse
    the result for both the classifier and Grad-CAM, so the model always
    sees the same input it's asked to explain. Both backbone paths expect
    a tensor already in this range -- _TimmDenseNetFallback reverses it
    back to [0,1] internally before applying its own ImageNet
    normalization (see its forward() above); torchxrayvision's DenseNet
    uses it directly.
    """
    return tensor * 2048.0 - 1024.0


def get_target_layer(model: nn.Module) -> nn.Module:
    """Grad-CAM target layer for the DenseNet family: the final dense
    block's batch norm (`features.norm5`), matching
    configs/model_config.yaml's `target_layer` convention. Works for both
    the torchxrayvision model and the timm fallback -- both expose
    `.features` as the conv trunk."""
    return model.features.norm5


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
    m = build_backbone()
    print("pathologies:", m.pathologies)
    print("target layer:", get_target_layer(m))
    with torch.no_grad():
        out = m(torch.zeros(1, 1, 224, 224))
    print("raw logits shape:", out.shape, "range:", out.min().item(), out.max().item())
