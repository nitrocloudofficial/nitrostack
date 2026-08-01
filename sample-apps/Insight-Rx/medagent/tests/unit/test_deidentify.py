"""
Unit tests for privacy/deidentify.py -- the Phase 2 item 1 hard-gate
entry point that orchestrator.py's deidentify_node calls. Every test
here uses its own tmp_path cache_dir so nothing lands in the real
data/dicom_cache/ (see test_orchestrator_graph.py's integration tests
for the full-graph, real-cache-dir version of this behavior).
"""
from __future__ import annotations

import cv2
import numpy as np
import pydicom
import pytest
from PIL import Image
from pydicom.dataset import FileDataset, FileMetaDataset
from pydicom.uid import ExplicitVRLittleEndian, generate_uid

import medagent.privacy.deidentify as deidentify_module
from medagent.privacy.deidentify import PHIDeidentificationError, deidentify_image
from medagent.privacy.dicom_scrubbing import PHIScrubError
from medagent.privacy.ocr_redaction import OCRRedactionError


def _toxic_dicom(path) -> None:
    meta = FileMetaDataset()
    meta.MediaStorageSOPClassUID = pydicom.uid.SecondaryCaptureImageStorage
    meta.MediaStorageSOPInstanceUID = generate_uid()
    meta.TransferSyntaxUID = ExplicitVRLittleEndian

    ds = FileDataset(str(path), {}, file_meta=meta, preamble=b"\x00" * 128)
    ds.PatientName = "Doe^Jane"
    ds.PatientID = "REAL-MRN-5551234"
    ds.PatientBirthDate = "19620315"
    ds.PatientAge = "064Y"
    ds.PatientSex = "F"
    ds.ViewPosition = "PA"
    ds.InstitutionName = "St. Mary Regional Medical Center"
    ds.ReferringPhysicianName = "House^Gregory"
    ds.Modality = "CR"
    ds.BodyPartExamined = "CHEST"
    ds.SamplesPerPixel = 1
    ds.PhotometricInterpretation = "MONOCHROME2"
    ds.Rows = 256
    ds.Columns = 256
    ds.BitsAllocated = 8
    ds.BitsStored = 8
    ds.HighBit = 7
    ds.PixelRepresentation = 0

    pixels = (np.random.default_rng(seed=2).random((256, 256)) * 255).astype(np.uint8)
    cv2.putText(pixels, "DOE^JANE", (15, 25), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255,), 1)
    ds.PixelData = pixels.tobytes()
    ds.save_as(str(path), enforce_file_format=True)


def test_deidentify_image_dicom_scrubs_tags_and_writes_both_artifacts(tmp_path):
    dicom_path = tmp_path / "toxic.dcm"
    _toxic_dicom(dicom_path)
    cache_dir = tmp_path / "cache"

    output_path = deidentify_image(image_path=str(dicom_path), case_id="case-abc", cache_dir=cache_dir)

    assert output_path == str(cache_dir / "case-abc_deidentified.png")
    assert (cache_dir / "case-abc_deidentified.png").exists()

    scrubbed_dicom_path = cache_dir / "case-abc_scrubbed.dcm"
    assert scrubbed_dicom_path.exists()
    scrubbed = pydicom.dcmread(str(scrubbed_dicom_path))
    assert "PatientName" not in scrubbed
    assert "PatientID" not in scrubbed
    assert "InstitutionName" not in scrubbed
    assert "ReferringPhysicianName" not in scrubbed
    assert scrubbed.PatientSex == "F"
    assert scrubbed.ViewPosition == "PA"

    # The original toxic file must never itself be touched/overwritten --
    # de-identification always produces a NEW artifact, never mutates the
    # source in place.
    original = pydicom.dcmread(str(dicom_path))
    assert original.PatientName == "Doe^Jane"


def test_deidentify_image_raster_input_has_no_dicom_tags_to_scrub(tmp_path):
    raster_path = tmp_path / "plain.png"
    array = (np.random.default_rng(0).random((256, 256)) * 255).astype("uint8")
    Image.fromarray(array, mode="L").save(raster_path)
    cache_dir = tmp_path / "cache"

    output_path = deidentify_image(image_path=str(raster_path), case_id="case-raster", cache_dir=cache_dir)

    assert output_path == str(cache_dir / "case-raster_deidentified.png")
    assert (cache_dir / "case-raster_deidentified.png").exists()
    assert not (cache_dir / "case-raster_scrubbed.dcm").exists()


def test_deidentify_image_raises_on_missing_file(tmp_path):
    missing_path = tmp_path / "does_not_exist.png"
    with pytest.raises(PHIDeidentificationError):
        deidentify_image(image_path=str(missing_path), case_id="case-missing", cache_dir=tmp_path / "cache")


def test_deidentify_image_raises_on_corrupt_dicom(tmp_path):
    corrupt_path = tmp_path / "corrupt.dcm"
    corrupt_path.write_bytes(b"not a real dicom file" * 10)
    with pytest.raises(PHIDeidentificationError):
        deidentify_image(image_path=str(corrupt_path), case_id="case-corrupt", cache_dir=tmp_path / "cache")


def test_deidentify_image_propagates_phiscruberror_unwrapped(tmp_path, monkeypatch):
    """Requirement 4 (hard gate): callers must be able to tell a real
    scrubbing failure apart from a generic one, so PHIScrubError must
    reach the caller as-is, not get wrapped in PHIDeidentificationError."""
    dicom_path = tmp_path / "toxic.dcm"
    _toxic_dicom(dicom_path)

    def _boom(_dcm):
        raise PHIScrubError("simulated scrub failure")

    monkeypatch.setattr(deidentify_module, "scrub_dicom_dataset", _boom)

    with pytest.raises(PHIScrubError):
        deidentify_image(image_path=str(dicom_path), case_id="case-scrub-fail", cache_dir=tmp_path / "cache")


def test_deidentify_image_propagates_ocrredactionerror_unwrapped(tmp_path, monkeypatch):
    raster_path = tmp_path / "plain.png"
    array = (np.random.default_rng(0).random((256, 256)) * 255).astype("uint8")
    Image.fromarray(array, mode="L").save(raster_path)

    def _boom(_image, min_confidence=None):
        raise OCRRedactionError("simulated OCR failure")

    monkeypatch.setattr(deidentify_module, "redact_burned_in_text", _boom)

    with pytest.raises(OCRRedactionError):
        deidentify_image(image_path=str(raster_path), case_id="case-ocr-fail", cache_dir=tmp_path / "cache")
