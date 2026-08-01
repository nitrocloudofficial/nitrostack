"""
Unit tests for privacy/dicom_scrubbing.py (Phase 2, item 1: DICOM tag
scrubbing).
"""
from __future__ import annotations

import pydicom
import pytest
from pydicom.dataset import FileDataset, FileMetaDataset
from pydicom.uid import ExplicitVRLittleEndian, generate_uid

from medagent.privacy.dicom_scrubbing import PHIScrubError, scrub_dicom_dataset


def _toxic_dataset(patient_age: str = "064Y") -> pydicom.Dataset:
    meta = FileMetaDataset()
    meta.MediaStorageSOPClassUID = pydicom.uid.SecondaryCaptureImageStorage
    meta.MediaStorageSOPInstanceUID = generate_uid()
    meta.TransferSyntaxUID = ExplicitVRLittleEndian

    ds = FileDataset("dummy.dcm", {}, file_meta=meta, preamble=b"\x00" * 128)
    ds.PatientName = "Doe^Jane"
    ds.PatientID = "REAL-MRN-5551234"
    ds.PatientBirthDate = "19620315"
    ds.PatientAge = patient_age
    ds.PatientSex = "F"
    ds.ViewPosition = "PA"
    ds.InstitutionName = "St. Mary Regional Medical Center"
    ds.ReferringPhysicianName = "House^Gregory"
    ds.OperatorsName = "Tech^Bob"
    ds.AccessionNumber = "ACC12345"
    ds.Modality = "CR"
    ds.BodyPartExamined = "CHEST"
    return ds


def test_scrub_removes_all_phi_tags():
    ds = _toxic_dataset()
    scrub_dicom_dataset(ds)

    assert "PatientName" not in ds
    assert "PatientID" not in ds
    assert "PatientBirthDate" not in ds
    assert "InstitutionName" not in ds
    assert "ReferringPhysicianName" not in ds
    assert "OperatorsName" not in ds
    assert "AccessionNumber" not in ds


def test_scrub_preserves_clinically_necessary_fields():
    ds = _toxic_dataset()
    scrub_dicom_dataset(ds)

    assert ds.PatientSex == "F"
    assert ds.ViewPosition == "PA"
    assert ds.Modality == "CR"
    assert ds.BodyPartExamined == "CHEST"


def test_scrub_caps_age_90_and_over():
    ds = _toxic_dataset(patient_age="094Y")
    scrub_dicom_dataset(ds)
    assert ds.PatientAge == "090Y"


def test_scrub_leaves_age_under_90_exact():
    ds = _toxic_dataset(patient_age="064Y")
    scrub_dicom_dataset(ds)
    assert ds.PatientAge == "064Y"


def test_scrub_is_idempotent_and_returns_the_same_dataset():
    ds = _toxic_dataset()
    returned = scrub_dicom_dataset(ds)
    assert returned is ds
    # Scrubbing an already-scrubbed dataset must not raise (no keyword to
    # remove the second time around).
    scrub_dicom_dataset(ds)
    assert "PatientName" not in ds


@pytest.mark.parametrize("bad_input", ["not a dataset", {"PatientName": "Doe^Jane"}, None, 12345])
def test_scrub_raises_phiscruberror_on_non_dataset_input(bad_input):
    with pytest.raises(PHIScrubError):
        scrub_dicom_dataset(bad_input)


def test_scrub_dataset_with_no_phi_tags_present_is_a_noop():
    meta = FileMetaDataset()
    meta.MediaStorageSOPClassUID = pydicom.uid.SecondaryCaptureImageStorage
    meta.MediaStorageSOPInstanceUID = generate_uid()
    meta.TransferSyntaxUID = ExplicitVRLittleEndian
    ds = FileDataset("dummy.dcm", {}, file_meta=meta, preamble=b"\x00" * 128)
    ds.PatientSex = "M"
    ds.ViewPosition = "AP"

    scrub_dicom_dataset(ds)  # must not raise even though nothing to remove
    assert ds.PatientSex == "M"
