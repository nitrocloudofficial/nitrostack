#!/usr/bin/env bash
# Phase 1: fine-tunes classifier.py's PneumoNetCXR "Lung Opacity" output
# against a labeled dataset -- see src/medagent/vision/train.py for the
# full recipe (focal loss + AdamW + cosine LR schedule + color jitter,
# then post-hoc temperature calibration), logged to MLflow.
#
# --train-manifest / --val-manifest are CSVs with `image_path,label`
# columns (label: 0 or 1) -- e.g. built from the RSNA Pneumonia
# Detection Challenge. Override any default via the matching env var.
set -euo pipefail

cd "$(dirname "$0")/.."

python -m medagent.vision.train \
    --train-manifest "${TRAIN_MANIFEST:-data/processed/train_manifest.csv}" \
    --val-manifest "${VAL_MANIFEST:-data/processed/val_manifest.csv}" \
    --epochs "${EPOCHS:-10}" \
    --batch-size "${BATCH_SIZE:-8}" \
    --lr "${LR:-1e-4}"
