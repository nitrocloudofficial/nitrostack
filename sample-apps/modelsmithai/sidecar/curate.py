"""
curate.py - The Curator agent's capability.

Given a folder of class subfolders (as produced by scout.py), it:
  1. Loads CLIP once (open-clip, CPU).
  2. For every image, computes a CLIP embedding.
  3. ZERO-SHOT VERIFY: scores the image against text prompts built from the
     class list plus a "something else" bucket. Keeps the image only if its OWN
     class is the top match AND above `threshold`. Otherwise MOVES it to a
     _rejected/ subfolder (moved, not deleted - so you can show what it caught).
  4. DEDUP: drops near-identical images via embedding cosine similarity.
  5. CACHES embeddings to embeddings.npz so the Trainer reuses them (no image
     gets embedded twice).

Class list is inferred from subfolder names - nothing to hardcode.

Run standalone:
    python curate.py C:/hack/storage/images
    python curate.py C:/hack/storage/images 0.24     # custom threshold
"""

from __future__ import annotations

import os
import sys
import json
import shutil

import numpy as np
from PIL import Image
import torch
import open_clip

MODEL_NAME = "ViT-B-32"
PRETRAINED = "laion2b_s34b_b79k"
DEFAULT_THRESHOLD = 0.24      # min softmax prob for the correct class
DEDUP_SIM = 0.98             # cosine sim above which two images are "duplicates"
VALID_EXT = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp"}


def _list_classes(root: str) -> list[str]:
    return sorted(
        d for d in os.listdir(root)
        if os.path.isdir(os.path.join(root, d)) and not d.startswith("_")
    )


def _list_images(folder: str) -> list[str]:
    out = []
    for f in os.listdir(folder):
        p = os.path.join(folder, f)
        if os.path.isfile(p) and os.path.splitext(f)[1].lower() in VALID_EXT:
            out.append(p)
    return out


def curate(images_root: str, threshold: float = DEFAULT_THRESHOLD) -> dict:
    classes = _list_classes(images_root)
    if not classes:
        return {"error": f"no class subfolders found in {images_root}"}

    print(f"[curator] loading CLIP {MODEL_NAME} ({PRETRAINED}) ...")
    device = "cuda" if torch.cuda.is_available() else "cpu"
    model, _, preprocess = open_clip.create_model_and_transforms(
        MODEL_NAME, pretrained=PRETRAINED
    )
    model = model.to(device).eval()
    tokenizer = open_clip.get_tokenizer(MODEL_NAME)

    # Text prompts: one per class + an "else" bucket to catch off-target junk.
    prompt_labels = classes + ["something else"]
    prompts = [f"a photo of a {c}" for c in classes] + ["a random unrelated image"]
    with torch.no_grad():
        text_tokens = tokenizer(prompts).to(device)
        text_feats = model.encode_text(text_tokens)
        text_feats = text_feats / text_feats.norm(dim=-1, keepdim=True)

    report = {"classes": classes, "threshold": threshold, "per_class": {}}
    all_embeds: list[np.ndarray] = []
    all_labels: list[int] = []
    all_paths: list[str] = []

    for ci, cname in enumerate(classes):
        cdir = os.path.join(images_root, cname)
        rej_dir = os.path.join(cdir, "_rejected")
        os.makedirs(rej_dir, exist_ok=True)

        imgs = _list_images(cdir)
        kept, rejected, dup = 0, 0, 0
        kept_embeds: list[np.ndarray] = []

        for path in imgs:
            try:
                img = Image.open(path).convert("RGB")
            except Exception:
                shutil.move(path, os.path.join(rej_dir, os.path.basename(path)))
                rejected += 1
                continue

            with torch.no_grad():
                x = preprocess(img).unsqueeze(0).to(device)
                feat = model.encode_image(x)
                feat = feat / feat.norm(dim=-1, keepdim=True)
                logits = (100.0 * feat @ text_feats.T).softmax(dim=-1)[0]

            top_idx = int(logits.argmax())
            own_prob = float(logits[ci])
            emb = feat.cpu().numpy()[0]

            # verify: own class must be the winner and clear the threshold
            if top_idx != ci or own_prob < threshold:
                shutil.move(path, os.path.join(rej_dir, os.path.basename(path)))
                rejected += 1
                continue

            # dedup: compare against already-kept embeddings in this class
            is_dup = any(float(np.dot(emb, e)) >= DEDUP_SIM for e in kept_embeds)
            if is_dup:
                shutil.move(path, os.path.join(rej_dir, os.path.basename(path)))
                dup += 1
                continue

            kept_embeds.append(emb)
            all_embeds.append(emb)
            all_labels.append(ci)
            all_paths.append(path)
            kept += 1

        report["per_class"][cname] = {
            "found": len(imgs), "kept": kept,
            "rejected_offtarget": rejected, "rejected_duplicate": dup,
        }
        print(f"[curator] {cname:>10}: kept {kept}, off-target {rejected}, dup {dup}")

    # cache embeddings for the Trainer
    if all_embeds:
        np.savez(
            os.path.join(images_root, "embeddings.npz"),
            embeddings=np.stack(all_embeds),
            labels=np.array(all_labels),
            paths=np.array(all_paths),
            classes=np.array(classes),
        )
        report["embeddings_cache"] = os.path.join(images_root, "embeddings.npz")
        report["total_kept"] = len(all_embeds)

    with open(os.path.join(images_root, "_curate_report.json"), "w",
              encoding="utf-8") as f:
        json.dump(report, f, indent=2)

    return report


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("usage: python curate.py <images_root> [threshold]")
        raise SystemExit(1)
    root = sys.argv[1]
    thr = float(sys.argv[2]) if len(sys.argv) > 2 else DEFAULT_THRESHOLD
    rep = curate(root, thr)
    print(json.dumps(rep, indent=2))
