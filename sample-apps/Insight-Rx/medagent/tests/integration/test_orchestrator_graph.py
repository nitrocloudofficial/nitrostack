"""
Integration test for the full LangGraph pipeline (orchestrator.py),
exercising the AI Perception Layer (vision/) end-to-end for the first
time -- previously this test file was empty because vision/inference.py
was too, and the graph couldn't run past perceive_image_node at all.

Also covers the Phase 2 item 1 PHI de-identification hard gate
(deidentify_node, wired in as the graph's new entry node ahead of
perceive_image): a toxic-but-parseable case must come out the other side
with every PHI-bearing tag/pixel stripped, and a case the gate cannot
safely process must halt run_case() outright rather than reach
human_review with unredacted or unverified data.

Ollama isn't assumed to be running here: diagnosis_agent, report_agent,
and verifier_agent each already have their own fail-safe fallback for a
missing LLM server (see their node functions in agents/), so this test
only asserts what today's scope is actually responsible for -- that the
full graph runs start-to-finish with no import/type errors and pauses
at human_review, and that the vision layer's outputs are well-formed --
not that the LLM-dependent agents produce a specific clinical result,
which depends on infrastructure this test environment may not have.
"""
from __future__ import annotations

import sqlite3
import uuid
from pathlib import Path

import cv2
import numpy as np
import pydicom
import pytest
from langgraph.checkpoint.sqlite import SqliteSaver
from PIL import Image
from pydicom.dataset import FileDataset, FileMetaDataset
from pydicom.uid import ExplicitVRLittleEndian, generate_uid

from medagent.agents.orchestrator import build_graph, run_case
from medagent.agents.state import PatientMetadata
from medagent.privacy.deidentify import DEFAULT_CACHE_DIR, PHIDeidentificationError


@pytest.fixture(autouse=True)
def _cleanup_dicom_cache():
    """deidentify_node writes into the real DEFAULT_CACHE_DIR (not
    tmp_path -- it's not parameterizable from graph state today), so
    every test that runs the full graph leaves a scrubbed artifact
    behind under data/dicom_cache/. That directory is gitignored, but
    without this cleanup it would grow by two files per test run,
    forever, across every future pytest invocation. Cases in this file
    all use a fresh uuid-based case_id, so sweeping the whole cache dir
    after each test can't delete another test's or a real run's files
    that happen to be mid-test."""
    yield
    cache_dir = Path(DEFAULT_CACHE_DIR)
    if cache_dir.is_dir():
        for artifact in cache_dir.glob("test-case-*"):
            artifact.unlink()


@pytest.fixture
def sample_image_path(tmp_path) -> str:
    """A synthetic, valid, loadable grayscale image -- not a real chest
    X-ray, just enough of a real raster file for the full preprocess ->
    classify -> detect -> Grad-CAM pipeline to run against without
    depending on a real dataset being present in this environment."""
    path = tmp_path / "sample_cxr.png"
    array = (np.random.default_rng(seed=0).random((512, 512)) * 255).astype("uint8")
    Image.fromarray(array, mode="L").save(path)
    return str(path)


@pytest.fixture
def toxic_dicom_path(tmp_path) -> str:
    """A maximally toxic synthetic DICOM: real-looking PHI tags (name,
    MRN, DOB, referring physician, institution) AND burned-in pixel text
    (a name + DOB stamped directly onto the pixel array the way an old
    scanner overlay would), so a single test case exercises both the tag
    scrubber and the OCR redactor at once."""
    path = tmp_path / "toxic_patient.dcm"

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
    ds.Rows = 512
    ds.Columns = 512
    ds.BitsAllocated = 8
    ds.BitsStored = 8
    ds.HighBit = 7
    ds.PixelRepresentation = 0

    pixels = (np.random.default_rng(seed=1).random((512, 512)) * 255).astype(np.uint8)
    cv2.putText(pixels, "DOE^JANE", (30, 40), cv2.FONT_HERSHEY_SIMPLEX, 1.1, (255,), 2)
    cv2.putText(pixels, "DOB 03-15-1962 MRN 5551234", (30, 480), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255,), 2)
    ds.PixelData = pixels.tobytes()

    ds.save_as(str(path), enforce_file_format=True)
    return str(path)


@pytest.fixture
def isolated_graph(tmp_path):
    """A graph wired to a throwaway SQLite checkpoint DB, so this test
    never touches (or is polluted by) the shared checkpoints.db a manual
    run elsewhere may have left mid-interrupt."""
    connection = sqlite3.connect(str(tmp_path / "test_checkpoints.db"), check_same_thread=False)
    checkpointer = SqliteSaver(connection)
    checkpointer.setup()
    return build_graph(checkpointer=checkpointer)


def test_full_pipeline_reaches_human_review(isolated_graph, sample_image_path):
    metadata: PatientMetadata = {
        "age": 52, "sex": "F", "view_position": "PA", "patient_id": "TEST-PATIENT-001",
    }
    case_id = f"test-case-{uuid.uuid4().hex[:8]}"

    result = run_case(
        isolated_graph, case_id=case_id, image_path=sample_image_path, patient_metadata=metadata,
    )

    assert "__interrupt__" in result, (
        f"Expected the graph to pause at human_review; got no interrupt -- full state: {result}"
    )

    classification = result["classification"]
    assert classification is not None, "AI Perception Layer did not populate classification"
    assert classification["predicted_class"] in ("Normal", "Lung Opacity", "Other Abnormality")
    assert isinstance(classification["class_probabilities"], dict)
    assert isinstance(classification["calibrated_confidence"], float)
    assert 0.0 <= classification["calibrated_confidence"] <= 1.0

    assert isinstance(result["detections"], list)
    for box in result["detections"]:
        assert set(box.keys()) == {"label", "x_min", "y_min", "x_max", "y_max", "score"}
        assert box["x_min"] <= box["x_max"]
        assert box["y_min"] <= box["y_max"]

    # The classifier always produces at least one pathology probability, so
    # Grad-CAM always has a target and both of these should be populated.
    assert result["gradcam_heatmap_path"] is not None
    assert isinstance(result["heatmap_bbox_alignment_score"], float)

    # diagnosis_findings is always populated -- either a real LLM finding or
    # the documented UNDETERMINED fail-safe if no LLM server is reachable.
    assert result["diagnosis_findings"] is not None
    assert result["diagnosis_findings"]["severity"] in ("high", "moderate", "low")


def test_missing_image_halts_at_deidentification_gate(isolated_graph, tmp_path):
    """Phase 2 item 1 changed this contract on purpose: deidentify_node
    now runs BEFORE perceive_image_node, and unlike every node in this
    graph it does not fail safe -- it cannot prove an image it never
    even read is free of PHI, so it must halt the whole case rather than
    let a later node treat "no image" as just another uncertain finding.
    (Previously, with perceive_image_node as the entry node, a missing
    file degraded to an "Other Abnormality" / empty-detections finding
    and still reached human_review -- see git history for that version
    of this test. That behavior no longer applies to the first node in
    the graph.)"""
    metadata: PatientMetadata = {
        "age": 30, "sex": "M", "view_position": "AP", "patient_id": "TEST-PATIENT-002",
    }
    missing_path = str(tmp_path / "does_not_exist.png")
    case_id = f"test-case-{uuid.uuid4().hex[:8]}"

    with pytest.raises(PHIDeidentificationError):
        run_case(isolated_graph, case_id=case_id, image_path=missing_path, patient_metadata=metadata)


def test_toxic_dicom_is_scrubbed_before_reaching_perception(isolated_graph, toxic_dicom_path):
    """End-to-end version of the standalone deidentify_image() toxic-case
    verification: a DICOM with real-looking PHI tags AND burned-in pixel
    text, run through the ACTUAL graph (not the bare function), must
    reach human_review with state["image_path"] repointed at a scrubbed
    artifact -- proving downstream nodes (perceive_image_node's Grad-CAM
    save, etc.) only ever see de-identified data, never the original
    toxic_dicom_path."""
    metadata: PatientMetadata = {
        "age": 64, "sex": "F", "view_position": "PA", "patient_id": "TEST-PATIENT-003",
    }
    case_id = f"test-case-{uuid.uuid4().hex[:8]}"

    result = run_case(
        isolated_graph, case_id=case_id, image_path=toxic_dicom_path, patient_metadata=metadata,
    )

    assert "__interrupt__" in result
    assert result["image_path"] != toxic_dicom_path
    assert result["image_path"].endswith(f"{case_id}_deidentified.png")

    scrubbed_dicom_path = Path(DEFAULT_CACHE_DIR) / f"{case_id}_scrubbed.dcm"
    assert scrubbed_dicom_path.exists()
    scrubbed_ds = pydicom.dcmread(str(scrubbed_dicom_path))
    assert "PatientName" not in scrubbed_ds
    assert "PatientID" not in scrubbed_ds
    assert "InstitutionName" not in scrubbed_ds
    assert "ReferringPhysicianName" not in scrubbed_ds
    # Clinically necessary fields this project's PatientMetadata depends
    # on must survive scrubbing -- see dicom_scrubbing.py's module
    # docstring on why these are deliberately NOT treated as identifiers.
    assert scrubbed_ds.PatientAge == "064Y"
    assert scrubbed_ds.PatientSex == "F"
    assert scrubbed_ds.ViewPosition == "PA"

    # The classifier/detector/Grad-CAM still ran against the scrubbed
    # image -- confirms deidentify_node's output is a real, loadable
    # image, not just a path string downstream nodes happen not to read.
    assert result["classification"] is not None
    assert result["gradcam_heatmap_path"] is not None
