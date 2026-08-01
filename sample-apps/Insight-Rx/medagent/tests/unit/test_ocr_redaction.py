"""
Unit tests for privacy/ocr_redaction.py (Phase 2, item 1: burned-in
pixel text redaction via EasyOCR).

Two of these tests run the real EasyOCR model (slow-ish, but this is the
one thing worth verifying against a real detector rather than a fake --
a mocked reader can't tell us whether burned-in text actually gets
found). The fill-value test below deliberately fakes the reader instead,
since it's testing redact_burned_in_text()'s own polygon-fill logic, not
OCR accuracy, and a fake keeps it fast and deterministic.
"""
from __future__ import annotations

import cv2
import numpy as np
import pytest

import medagent.privacy.ocr_redaction as ocr_redaction
from medagent.privacy.ocr_redaction import OCRRedactionError, redact_burned_in_text


def test_redact_burned_in_text_detects_real_burned_in_text():
    # cv2.putText requires a uint8 (CV_8U) buffer -- draw on that, then
    # hand redact_burned_in_text() the float32 array it actually expects
    # to receive from the rest of this project's pipeline.
    image_u8 = np.zeros((512, 512), dtype=np.uint8)
    cv2.putText(image_u8, "SMITH JOHN", (30, 60), cv2.FONT_HERSHEY_SIMPLEX, 1.1, (255,), 2)
    cv2.putText(image_u8, "DOB 04-12-1985", (30, 480), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255,), 2)
    image = image_u8.astype(np.float32)

    redacted, num_redacted = redact_burned_in_text(image)

    assert num_redacted >= 1
    # Both lines of burned-in text were bright (255) blocks -- a real
    # redaction blacks enough of them out that total brightness drops
    # substantially, even if OCR splits/merges the two lines differently.
    assert redacted.sum() < image.sum() * 0.9


def test_redact_burned_in_text_no_text_present_returns_zero_regions():
    rng = np.random.default_rng(0)
    image = (rng.random((256, 256)) * 255).astype(np.float32)

    redacted, num_redacted = redact_burned_in_text(image)

    assert num_redacted == 0
    assert np.array_equal(redacted, image)


def test_redact_burned_in_text_raises_on_non_2d_input():
    image = np.zeros((10, 10, 3), dtype=np.float32)
    with pytest.raises(OCRRedactionError):
        redact_burned_in_text(image)


def test_redact_burned_in_text_uses_true_image_minimum_as_fill_value(monkeypatch):
    """Regression test for a real early bug in this module: the blackout
    fill value must be the INPUT image's own minimum, not a hardcoded 0
    -- otherwise redacting a case whose pixel range never includes 0
    (e.g. already-normalized to [50, 200]) would paint the "redacted"
    region a value BRIGHTER than real content, defeating the point."""

    class _FakeReader:
        def readtext(self, _array):
            return [([[10, 10], [50, 10], [50, 30], [10, 30]], "FAKE", 0.9)]

    monkeypatch.setattr(ocr_redaction, "_get_reader", lambda: _FakeReader())

    image = np.full((100, 100), 150.0, dtype=np.float32)
    image[0, 0] = 50.0  # true global minimum, away from both 0 and the 150 background

    redacted, num_redacted = redact_burned_in_text(image)

    assert num_redacted == 1
    assert redacted[20, 20] == pytest.approx(50.0)
    assert redacted[0, 0] == pytest.approx(50.0)  # untouched region unaffected
