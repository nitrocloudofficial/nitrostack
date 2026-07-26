"""
train_real.py - The Trainer agent's real capability.

Reads the CLIP embeddings cached by curate.py (embeddings.npz), fits a
logistic-regression head, evaluates on a held-out split, and writes a .pt
model file. Trains in ~1 second because the heavy work (CLIP embedding) was
already done by the Curator.

Returns real metrics: overall accuracy, per-class recall, and confusion pairs
(which the Diagnostician later reads to decide what data to fetch next).

Used two ways:
  - standalone:  python train_real.py C:/hack/storage/images
  - imported by the sidecar's /train endpoint (Step: wire into app.py)
"""

from __future__ import annotations

import os
import sys
import json

import numpy as np
import torch
import torch.nn as nn
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression


def train_from_cache(images_root: str, val_frac: float = 0.25, seed: int = 0) -> dict:
    cache = os.path.join(images_root, "embeddings.npz")
    if not os.path.exists(cache):
        return {"error": f"no embeddings cache at {cache} - run curate.py first"}

    data = np.load(cache, allow_pickle=True)
    X = data["embeddings"].astype("float32")
    y = data["labels"].astype("int64")
    classes = [str(c) for c in data["classes"]]

    if len(X) < len(classes) * 4:
        return {"error": f"too few samples ({len(X)}) for {len(classes)} classes"}

    # stratified split so every class appears in train and val
    X_tr, X_val, y_tr, y_val = train_test_split(
        X, y, test_size=val_frac, random_state=seed, stratify=y
    )

    # fit logistic regression head (fast, strong on CLIP features)
    clf = LogisticRegression(max_iter=2000, C=1.0)
    clf.fit(X_tr, y_tr)

    # evaluate
    y_pred = clf.predict(X_val)
    overall = float((y_pred == y_val).mean())

    per_class_recall = {}
    confusion = {}  # "true->pred": count, for wrong predictions only
    for ci, cname in enumerate(classes):
        mask = y_val == ci
        n = int(mask.sum())
        if n:
            per_class_recall[cname] = round(float((y_pred[mask] == ci).mean()), 3)
        for pj, pred in zip(np.where(mask)[0], y_pred[mask]):
            if pred != ci:
                key = f"{cname}->{classes[int(pred)]}"
                confusion[key] = confusion.get(key, 0) + 1

    # ---- write a real .pt model ----
    # Save the head as a torch Linear layer so the artifact is a genuine .pt
    # that torch.load() reads (this is what the Sentinel will later scan/convert).
    W = torch.tensor(clf.coef_, dtype=torch.float32)
    b = torch.tensor(clf.intercept_, dtype=torch.float32)
    in_dim = W.shape[1]
    n_cls = W.shape[0]
    head = nn.Linear(in_dim, n_cls)
    with torch.no_grad():
        head.weight.copy_(W)
        head.bias.copy_(b)

    model_path = os.path.join(images_root, "model.pt")
    torch.save(
        {
            "state_dict": head.state_dict(),
            "classes": classes,
            "clip_model": "ViT-B-32",
            "clip_pretrained": "laion2b_s34b_b79k",
            "input_dim": in_dim,
        },
        model_path,
    )

    report = {
        "accuracy": round(overall, 3),
        "per_class": per_class_recall,
        "confusion_pairs": confusion,
        "classes": classes,
        "n_train": int(len(X_tr)),
        "n_val": int(len(X_val)),
        "model_path": model_path.replace("\\", "/"),
    }
    with open(os.path.join(images_root, "_train_report.json"), "w",
              encoding="utf-8") as f:
        json.dump(report, f, indent=2)
    return report


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("usage: python train_real.py <images_root>")
        raise SystemExit(1)
    print(json.dumps(train_from_cache(sys.argv[1]), indent=2))
