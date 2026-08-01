"""
Phase 1 training entry point for the classifier's "Lung Opacity" output --
fine-tunes classifier.py's PneumoNetCXR end-to-end against a labeled,
binary (opacity present/absent) dataset such as the RSNA Pneumonia
Detection Challenge.

Only the "Lung Opacity" output index is supervised here. RSNA's labels
are binary, not the full 18-pathology multi-label target the
domain-pretrained model natively predicts, so this fine-tunes toward
that one index and leaves the model's other 17 pathology outputs
untouched by a given run. A genuine multi-label fine-tune (combining
RSNA with NIH ChestXray14 / CheXpert / etc. for the other labels) is
Phase 1 work beyond what one binary-labeled dataset supports.

Recipe (Strategic_Startup_Roadmap.pdf, Phase 1): focal loss (Lin et al.
2017, RetinaNet) for the severe class imbalance any real CXR dataset
has, AdamW, a cosine LR schedule, and color-jitter augmentation on top
of dataset.py's existing flip/rotation augmentation -- then a second,
separate calibration pass that fits a temperature via
evaluation/calibration.py's TemperatureScaler (L-BFGS on NLL, Guo et al.
2017's own method) against a held-out validation set, the standard
two-stage "train, then calibrate on unseen data" recipe. The fitted
temperature is saved separately from the model checkpoint (see
TemperatureScaler.save()) -- it is not part of PneumoNetCXR's own
state_dict; vision/inference.py loads and applies it independently.
"""
from __future__ import annotations

import argparse
import csv
import logging
from pathlib import Path

import torch
import torch.nn.functional as F
import torchvision.transforms as T
from torch.utils.data import DataLoader

from medagent.evaluation.calibration import DEFAULT_TEMPERATURE_PATH, TemperatureScaler
from medagent.evaluation.metrics import calculate_classification_metrics
from medagent.evaluation.mlflow_tracking import MLflowTracker
from medagent.utils.settings import get_settings
from medagent.vision.dataset import RadiographDataset
from medagent.vision.models.backbone import normalize_for_backbone
from medagent.vision.models.classifier import build_classifier

logger = logging.getLogger("medagent.vision.train")

_TARGET_PATHOLOGY = "Lung Opacity"
_COLOR_JITTER = T.ColorJitter(brightness=0.15, contrast=0.15)


def focal_loss(logits: torch.Tensor, targets: torch.Tensor, alpha: float = 0.25, gamma: float = 2.0) -> torch.Tensor:
    """
    Binary focal loss over a single output logit vs. a binary target --
    down-weights easy (already well-classified) examples so the loss
    concentrates on hard/rare positives, the standard fix for the severe
    class imbalance real CXR datasets have (most films are unremarkable;
    the positive finding is rare). logits/targets: shape [batch].
    """
    bce = F.binary_cross_entropy_with_logits(logits, targets, reduction="none")
    p_t = torch.exp(-bce)  # recovers p if target==1 else (1-p) from the BCE value
    alpha_t = alpha * targets + (1 - alpha) * (1 - targets)
    return (alpha_t * (1 - p_t) ** gamma * bce).mean()


def _resolve_device(device: str | None) -> str:
    device = device or get_settings().device
    if device != "auto":
        return device
    if torch.cuda.is_available():
        return "cuda"
    if torch.backends.mps.is_available():
        return "mps"
    return "cpu"


def _forward_target_logits(model, images: torch.Tensor, target_index: int, device: str) -> torch.Tensor:
    """Raw (pre-temperature, pre-sigmoid) logit for _TARGET_PATHOLOGY only --
    training and calibration both operate on this, not on
    PneumoNetCXR.forward()'s temperature-scaled probabilities."""
    return model.backbone(normalize_for_backbone(images).to(device))[:, target_index]


def _evaluate(model, loader: DataLoader, target_index: int, device: str) -> dict[str, float]:
    model.eval()
    all_preds, all_labels = [], []
    with torch.no_grad():
        for batch in loader:
            valid = batch["valid"]
            if not valid.any():
                continue
            logits = _forward_target_logits(model, batch["image"][valid], target_index, device)
            all_preds.append((torch.sigmoid(logits) >= 0.5).long().cpu())
            all_labels.append(batch["label"][valid].long())
    if not all_preds:
        return {"accuracy": 0.0, "precision": 0.0, "recall": 0.0, "f1_score": 0.0}
    y_pred = torch.cat(all_preds).numpy()
    y_true = torch.cat(all_labels).numpy()
    return calculate_classification_metrics(y_true, y_pred)


def _fit_temperature(model, loader: DataLoader, target_index: int, device: str) -> TemperatureScaler:
    """Collects held-out validation logits/labels for _TARGET_PATHOLOGY
    and fits a TemperatureScaler against them (see
    evaluation/calibration.py -- L-BFGS on NLL, Guo et al. 2017)."""
    model.eval()
    all_logits, all_labels = [], []
    with torch.no_grad():
        for batch in loader:
            valid = batch["valid"]
            if not valid.any():
                continue
            all_logits.append(_forward_target_logits(model, batch["image"][valid], target_index, device).cpu())
            all_labels.append(batch["label"][valid].float())

    scaler = TemperatureScaler()
    if not all_logits:
        logger.warning("No valid validation examples -- keeping temperature=1.0 (no calibration fit).")
        return scaler

    logits = torch.cat(all_logits)
    labels = torch.cat(all_labels)
    scaler.fit(logits, labels)
    return scaler


def train(
    train_paths: list[str],
    train_labels: list[int],
    val_paths: list[str],
    val_labels: list[int],
    epochs: int = 10,
    batch_size: int = 8,
    lr: float = 1e-4,
    device: str | None = None,
    checkpoint_path: str | None = None,
    temperature_path: str | None = None,
) -> dict[str, float]:
    """Runs the full fine-tune -> calibrate -> save recipe and returns the
    final validation metrics dict."""
    settings = get_settings()
    device = _resolve_device(device)
    checkpoint_path = checkpoint_path or settings.classifier_checkpoint_path
    temperature_path = temperature_path or DEFAULT_TEMPERATURE_PATH

    model = build_classifier(device=device)
    target_index = model.pathologies.index(_TARGET_PATHOLOGY)

    train_dataset = RadiographDataset(train_paths, train_labels, mode="train", to_rgb=False)
    val_dataset = RadiographDataset(val_paths, val_labels, mode="eval", to_rgb=False)
    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=batch_size, shuffle=False)

    optimizer = torch.optim.AdamW(model.parameters(), lr=lr, weight_decay=1e-4)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=max(epochs, 1))

    with MLflowTracker(
        experiment_name="medagent-classifier",
        run_name=f"pneumonet-cxr-{_TARGET_PATHOLOGY.replace(' ', '_').lower()}",
        params={
            "epochs": epochs, "batch_size": batch_size, "lr": lr,
            "target_pathology": _TARGET_PATHOLOGY, "loss": "focal", "optimizer": "AdamW",
            "lr_schedule": "cosine",
        },
    ) as run:
        for epoch in range(epochs):
            model.train()
            running_loss, n_batches = 0.0, 0

            for batch in train_loader:
                valid = batch["valid"]
                if not valid.any():
                    continue
                images = batch["image"][valid]
                labels = batch["label"][valid].float().to(device)

                # Color-jitter applied per-batch here (not baked into
                # RadiographDataset's shared flip/rotation augmentation) so
                # this training recipe can change independently of the
                # preprocessing pipeline every other consumer relies on.
                images = torch.stack([_COLOR_JITTER(img) for img in images])
                logits = _forward_target_logits(model, images, target_index, device)

                optimizer.zero_grad()
                loss = focal_loss(logits, labels)
                loss.backward()
                optimizer.step()

                running_loss += loss.item()
                n_batches += 1

            scheduler.step()
            val_metrics = _evaluate(model, val_loader, target_index, device)
            avg_train_loss = running_loss / max(n_batches, 1)

            logger.info(
                "epoch %d/%d: train_focal_loss=%.4f val_accuracy=%.4f val_recall=%.4f lr=%.2e",
                epoch + 1, epochs, avg_train_loss, val_metrics["accuracy"], val_metrics["recall"],
                scheduler.get_last_lr()[0],
            )
            run.log_metrics(
                {"train_focal_loss": avg_train_loss, **{f"val_{k}": v for k, v in val_metrics.items()}},
                step=epoch,
            )

        scaler = _fit_temperature(model, val_loader, target_index, device)
        run.log_metrics({"fitted_temperature": scaler.temperature})

        checkpoint_file = Path(checkpoint_path)
        checkpoint_file.parent.mkdir(parents=True, exist_ok=True)
        torch.save(model.state_dict(), checkpoint_file)
        run.log_artifact(str(checkpoint_file))

        scaler.save(temperature_path)
        run.log_artifact(str(temperature_path))

        logger.info(
            "Saved fine-tuned checkpoint to %s and fitted temperature (T=%.3f) to %s",
            checkpoint_file, scaler.temperature, temperature_path,
        )

    return _evaluate(model, val_loader, target_index, device)


def _load_manifest(csv_path: str) -> tuple[list[str], list[int]]:
    """Reads a two-column CSV (image_path,label) into parallel lists.
    label must be 0 or 1 -- this script only supervises the single binary
    "Lung Opacity" output index (see module docstring)."""
    paths: list[str] = []
    labels: list[int] = []
    with open(csv_path, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            paths.append(row["image_path"])
            labels.append(int(row["label"]))
    return paths, labels


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--train-manifest", required=True, help="CSV with image_path,label columns")
    parser.add_argument("--val-manifest", required=True, help="CSV with image_path,label columns")
    parser.add_argument("--epochs", type=int, default=10)
    parser.add_argument("--batch-size", type=int, default=8)
    parser.add_argument("--lr", type=float, default=1e-4)
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")

    train_paths, train_labels = _load_manifest(args.train_manifest)
    val_paths, val_labels = _load_manifest(args.val_manifest)

    metrics = train(
        train_paths, train_labels, val_paths, val_labels,
        epochs=args.epochs, batch_size=args.batch_size, lr=args.lr,
    )
    print("Final validation metrics:", metrics)


if __name__ == "__main__":
    main()
