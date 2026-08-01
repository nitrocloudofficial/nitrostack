"""
De-identification hard gate -- Phase 2, item 1
(Strategic_Startup_Roadmap.pdf: "add DICOM tag + burned-in-pixel-OCR
scrubbing").

The single entry point orchestrator.py's deidentify_node calls before
ANY other node touches a case's image. Unlike every other node in this
graph, this one does NOT fail safe by degrading to an "undetermined"
result -- a failed de-identification pass must halt the case entirely:
by the time a downstream node (or a human reviewer) could notice
something went wrong, unredacted data may already be written to disk
(a Grad-CAM heatmap PNG, a checkpoint, a log line). See
PHIDeidentificationError below and deidentify_node's docstring in
orchestrator.py for why this is a deliberate exception to how every
other node in this graph handles failure.
"""
from __future__ import annotations

import logging
from pathlib import Path

import cv2
import numpy as np

from medagent.privacy.dicom_scrubbing import PHIScrubError, scrub_dicom_dataset
from medagent.privacy.ocr_redaction import OCRRedactionError, redact_burned_in_text
from medagent.vision.preprocessing import (
    _DICOM_EXTENSIONS,
    _load_raster,
    extract_dicom_pixels,
    read_dicom_dataset,
    to_grayscale,
)

logger = logging.getLogger("medagent.privacy.deidentify")

DEFAULT_CACHE_DIR = "data/dicom_cache"


class PHIDeidentificationError(Exception):
    """Raised when a case's image can't be safely de-identified. Callers
    MUST NOT catch this broadly and fall back to the original image --
    it is meant to propagate all the way out of the graph and halt the
    case, not be swallowed into an "undetermined" result the way every
    other node's failures are."""


def deidentify_image(image_path: str, case_id: str, cache_dir: str | Path = DEFAULT_CACHE_DIR) -> str:
    """
    Produces a de-identified image ready for the rest of the pipeline
    and returns its path. Never returns a path to unredacted data -- if
    de-identification can't be guaranteed, this raises instead of
    returning a "best effort" result.

    - DICOM input: scrubs PHI tags (dicom_scrubbing.py) and writes a
      scrubbed DICOM copy to `cache_dir` -- this is the "local cache"
      the requirement refers to: anything this system caches from a
      DICOM source must never carry the original identifying tags.
      Pixels are then extracted from the SAME scrubbed dataset,
      OCR-redacted, and written as a PNG for the perception layer.
    - Raster (PNG/JPEG) input: no DICOM tags to scrub; pixels are
      loaded, OCR-redacted, and written as a PNG.

    Raises PHIDeidentificationError on any unexpected failure, wrapping
    the more specific PHIScrubError / OCRRedactionError from the
    underlying scrubbing steps (those propagate as-is, not re-wrapped,
    so a caller inspecting the exception type can tell which stage
    failed).
    """
    image_path = Path(image_path)
    cache_dir = Path(cache_dir)

    try:
        cache_dir.mkdir(parents=True, exist_ok=True)

        if image_path.suffix.lower() in _DICOM_EXTENSIONS:
            dcm = read_dicom_dataset(image_path)
            scrub_dicom_dataset(dcm)  # mutates dcm in place; raises PHIScrubError on failure

            scrubbed_dicom_path = cache_dir / f"{case_id}_scrubbed.dcm"
            dcm.save_as(str(scrubbed_dicom_path), enforce_file_format=True)
            logger.info("Wrote PHI-scrubbed DICOM copy for case=%s to %s", case_id, scrubbed_dicom_path)

            pixels = extract_dicom_pixels(dcm)
        else:
            pixels = to_grayscale(_load_raster(image_path))

        redacted_pixels, num_ocr_redactions = redact_burned_in_text(pixels)

        output_path = cache_dir / f"{case_id}_deidentified.png"
        span = redacted_pixels.max() - redacted_pixels.min()
        normalized = (
            (redacted_pixels - redacted_pixels.min()) / span if span > 1e-6 else np.zeros_like(redacted_pixels)
        )
        cv2.imwrite(str(output_path), (normalized * 255).astype(np.uint8))

        logger.info(
            "De-identified case=%s: %d burned-in text region(s) redacted -> %s",
            case_id, num_ocr_redactions, output_path,
        )
        return str(output_path)

    except (PHIScrubError, OCRRedactionError):
        raise
    except Exception as exc:  # noqa: BLE001 - any unexpected failure here must halt, not degrade
        raise PHIDeidentificationError(
            f"Unexpected error de-identifying image for case={case_id}: {type(exc).__name__}: {exc}"
        ) from exc
