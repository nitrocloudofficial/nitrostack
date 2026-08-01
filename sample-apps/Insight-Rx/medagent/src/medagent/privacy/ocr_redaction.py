"""
Burned-in pixel text redaction -- Phase 2, item 1
(Strategic_Startup_Roadmap.pdf: "add DICOM tag + burned-in-pixel-OCR
scrubbing").

Older X-ray scanners and some PACS exports burn patient identifiers
directly into the image pixels (name, DOB, accession number printed as
an overlay) -- text that DICOM tag scrubbing (dicom_scrubbing.py) can't
touch, since it never lived in a tag to begin with. This module runs
OCR (EasyOCR, a pure-Python/PyTorch detector -- no system Tesseract
binary required, which this environment doesn't have installed) over
the pixel array and blacks out every detected text region.

Deliberately biased toward over-redaction: a chest X-ray does not
naturally contain text, so ANY detected text region is either PHI or a
scanner artifact worth removing either way. The default confidence
threshold is low (0.15) for exactly this reason -- in a de-identification
gate, a false-positive blackout over a stray artifact costs nothing;
a missed real name costs everything.
"""
from __future__ import annotations

import logging
from functools import lru_cache

import cv2
import numpy as np

logger = logging.getLogger("medagent.privacy.ocr_redaction")

DEFAULT_MIN_CONFIDENCE = 0.15


class OCRRedactionError(Exception):
    """Raised when OCR-based redaction can't be safely completed.
    Callers (privacy/deidentify.py) must NOT catch this broadly and fall
    back to the un-redacted image -- see that module's hard-gate design."""


@lru_cache(maxsize=1)
def _get_reader():
    """Lazily builds (and caches) the EasyOCR reader -- it loads real
    model weights, expensive to construct repeatedly per case. GPU is
    disabled explicitly: EasyOCR's GPU path targets CUDA, not Apple
    Silicon's MPS backend, so requesting it here would silently fall
    back to CPU anyway; being explicit avoids a confusing warning per
    case."""
    import easyocr

    return easyocr.Reader(["en"], gpu=False, verbose=False)


def _to_uint8_grayscale(image: np.ndarray) -> np.ndarray:
    """EasyOCR expects a uint8 image; this project's arrays are float32
    in an arbitrary range depending on which pipeline stage produced
    them (raw pixel values, [0,1]-normalized, or CLAHE-enhanced) -- so
    this always min-max rescales to uint8 rather than assuming a range."""
    array = np.asarray(image, dtype=np.float32)
    span = array.max() - array.min()
    normalized = (array - array.min()) / span if span > 1e-6 else np.zeros_like(array)
    return (normalized * 255).astype(np.uint8)


def redact_burned_in_text(
    image: np.ndarray,
    min_confidence: float = DEFAULT_MIN_CONFIDENCE,
) -> tuple[np.ndarray, int]:
    """
    Detects text in `image` (a 2D grayscale array, any numeric dtype/range)
    via OCR and blacks out every detected region at or above
    `min_confidence`, filling the exact detected polygon (not just its
    bounding rectangle, so rotated/skewed burned-in text is still fully
    covered) with black.

    Returns (redacted_image, num_regions_redacted). `redacted_image` is
    float32 in the SAME range as the input `image` (the blackout value
    is the input's own minimum, not a hardcoded 0, so this composes
    correctly regardless of which preprocessing stage calls it).

    Raises OCRRedactionError on any unexpected OCR failure -- callers
    must treat that as a hard stop, not fall back to the unredacted
    image (see this module's docstring).
    """
    image = np.asarray(image, dtype=np.float32)
    if image.ndim != 2:
        raise OCRRedactionError(f"redact_burned_in_text() expected a 2D grayscale array, got shape {image.shape}")

    try:
        reader = _get_reader()
        ocr_input = _to_uint8_grayscale(image)
        detections = reader.readtext(ocr_input)
    except Exception as exc:  # noqa: BLE001 - any OCR failure must halt, not silently pass the image through
        raise OCRRedactionError(f"OCR text detection failed: {type(exc).__name__}: {exc}") from exc

    redacted = image.copy()
    fill_value = float(image.min())
    num_redacted = 0

    for bbox, text, confidence in detections:
        if confidence < min_confidence:
            continue
        polygon = np.array(bbox, dtype=np.int32)
        cv2.fillPoly(redacted, [polygon], color=fill_value)
        num_redacted += 1
        logger.info(
            "Redacted burned-in text region (confidence=%.2f, %d char(s)) at %s",
            confidence, len(text), polygon.tolist(),
        )

    if num_redacted:
        logger.warning(
            "Redacted %d burned-in text region(s) from image -- this image had text baked into "
            "its pixels, which is itself a signal the source scanner/export pipeline may not be "
            "PHI-safe upstream of this system.",
            num_redacted,
        )

    return redacted, num_redacted


if __name__ == "__main__":
    import sys

    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")

    if len(sys.argv) < 2:
        print("Usage: python -m medagent.privacy.ocr_redaction <path-to-image>")
        raise SystemExit(1)

    img = cv2.imread(sys.argv[1], cv2.IMREAD_GRAYSCALE)
    redacted, n = redact_burned_in_text(img)
    out_path = sys.argv[1].rsplit(".", 1)[0] + "_redacted.png"
    cv2.imwrite(out_path, redacted.astype(np.uint8))
    print(f"Redacted {n} region(s); wrote {out_path}")
