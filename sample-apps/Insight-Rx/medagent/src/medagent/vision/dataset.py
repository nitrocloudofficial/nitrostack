"""
PyTorch Dataset for chest X-ray classification, built on top of
preprocessing.py's preprocess_radiograph(). Training-mode instances
apply light augmentation (horizontal flip + small-angle rotation);
eval-mode instances are strictly deterministic -- no randomness enters
the pipeline at all, so the same index always produces the exact same
tensor. Corrupted or missing files are logged and never crash the
DataLoader; they either substitute the next loadable sample or return a
flagged placeholder, depending on `on_error`.
"""
from __future__ import annotations

import logging
from pathlib import Path
from typing import Literal, Optional, Sequence, Union

import torch
import torchvision.transforms as T
from torch.utils.data import Dataset

from medagent.vision.preprocessing import preprocess_radiograph

logger = logging.getLogger("medagent.vision.dataset")

DatasetMode = Literal["train", "eval"]
ErrorPolicy = Literal["placeholder", "skip"]

# Conservative, chest-X-ray-appropriate augmentations: small rotations
# and horizontal flips only. No color jitter, no heavy crops -- this is
# diagnostic imagery, and aggressive augmentation risks distorting or
# fabricating the exact opacity/lesion shapes the model needs to learn.
_TRAIN_AUGMENTATIONS = T.Compose(
    [
        T.RandomHorizontalFlip(p=0.5),
        T.RandomRotation(degrees=7),
    ]
)


class RadiographDataset(Dataset):
    """
    Args:
        file_paths: image file paths (PNG/JPEG/DICOM -- anything
            preprocess_radiograph's load_image supports).
        labels: optional integer class labels, one per file_paths entry.
            If omitted, every item's label is -1 (pure-inference
            dataset with no ground truth).
        target_size: (height, width) forwarded to preprocess_radiograph.
        mode: "train" applies random augmentation; "eval" is strictly
            deterministic -- the same index always yields an identical
            tensor, which matters for reproducible validation/test runs.
        clahe_clip_limit: forwarded to preprocess_radiograph.
        to_rgb: forwarded to preprocess_radiograph.
        on_error: what to do when a file fails to load --
            "placeholder" (default) returns a zero tensor with
            valid=False and label=-1 at that index; "skip" instead
            substitutes the next loadable sample (wrapping around the
            dataset), so batches never contain placeholder data, at the
            cost of that epoch seeing a duplicate elsewhere.
    """

    def __init__(
        self,
        file_paths: Sequence[Union[str, Path]],
        labels: Optional[Sequence[int]] = None,
        target_size: tuple[int, int] = (224, 224),
        mode: DatasetMode = "eval",
        clahe_clip_limit: float = 2.0,
        to_rgb: bool = True,
        on_error: ErrorPolicy = "placeholder",
    ) -> None:
        if labels is not None and len(labels) != len(file_paths):
            raise ValueError(
                f"labels length ({len(labels)}) must match file_paths length "
                f"({len(file_paths)})"
            )
        if mode not in ("train", "eval"):
            raise ValueError(f"mode must be 'train' or 'eval', got {mode!r}")
        if on_error not in ("placeholder", "skip"):
            raise ValueError(f"on_error must be 'placeholder' or 'skip', got {on_error!r}")

        self.file_paths = [Path(p) for p in file_paths]
        self.labels = list(labels) if labels is not None else None
        self.target_size = target_size
        self.mode: DatasetMode = mode
        self.clahe_clip_limit = clahe_clip_limit
        self.to_rgb = to_rgb
        self.on_error: ErrorPolicy = on_error

        self._num_channels = 3 if to_rgb else 1

    def __len__(self) -> int:
        return len(self.file_paths)

    def set_mode(self, mode: DatasetMode) -> None:
        """Switches between 'train' (augmented) and 'eval' (deterministic)
        without rebuilding the dataset -- handy for a single dataset
        instance reused across a train/validation split boundary."""
        if mode not in ("train", "eval"):
            raise ValueError(f"mode must be 'train' or 'eval', got {mode!r}")
        self.mode = mode

    def _placeholder_tensor(self) -> torch.Tensor:
        h, w = self.target_size
        return torch.zeros((self._num_channels, h, w), dtype=torch.float32)

    def _load_one(self, index: int) -> Optional[torch.Tensor]:
        """Returns a preprocessed (and, in train mode, augmented) tensor
        for `index`, or None if loading failed -- the caller decides how
        to handle a None (placeholder vs. substitution)."""
        path = self.file_paths[index]
        try:
            tensor = preprocess_radiograph(
                path,
                target_size=self.target_size,
                clahe_clip_limit=self.clahe_clip_limit,
                to_rgb=self.to_rgb,
            )
        except Exception:
            logger.exception("Failed to load/preprocess image at index %d (%s)", index, path)
            return None

        if self.mode == "train":
            tensor = _TRAIN_AUGMENTATIONS(tensor)

        return tensor

    def _find_next_valid(
        self, start_index: int
    ) -> tuple[Optional[torch.Tensor], int, Path, int]:
        """
        Walks forward from start_index (wrapping around, excluding
        start_index itself) looking for the next sample that loads
        successfully. Bounded to len(self) - 1 attempts, so a dataset
        that's entirely corrupted can't recurse or loop forever --
        returns (None, start_index, ..., -1) if every other sample
        also fails.
        """
        n = len(self)
        for offset in range(1, n):
            candidate = (start_index + offset) % n
            tensor = self._load_one(candidate)
            if tensor is not None:
                logger.warning(
                    "on_error='skip': substituting index %d for originally-requested "
                    "index %d", candidate, start_index,
                )
                label = self.labels[candidate] if self.labels is not None else -1
                return tensor, candidate, self.file_paths[candidate], label

        logger.error(
            "on_error='skip' could not find any loadable sample among the other "
            "%d item(s) in the dataset -- falling back to a placeholder.", n - 1,
        )
        return None, start_index, self.file_paths[start_index], -1

    def __getitem__(self, index: int) -> dict:
        path = self.file_paths[index]
        label = self.labels[index] if self.labels is not None else -1

        tensor = self._load_one(index)

        if tensor is None and self.on_error == "skip":
            tensor, index, path, label = self._find_next_valid(index)

        if tensor is None:
            # Either on_error == "placeholder", or "skip" exhausted every
            # other index without finding a loadable image.
            return {
                "image": self._placeholder_tensor(),
                "label": torch.tensor(-1, dtype=torch.long),
                "path": str(path),
                "valid": False,
            }

        return {
            "image": tensor,
            "label": torch.tensor(label, dtype=torch.long),
            "path": str(path),
            "valid": True,
        }