"""
Phase 0 end-to-end smoke test (Strategic_Startup_Roadmap.pdf, Phase 0
checklist item E): the single test that answers "does Phase 0 actually
work end to end" -- a synthetic image runs through preprocess -> classify
-> detect -> Grad-CAM -> diagnosis -> evidence -> report -> verify, and
the graph pauses cleanly at human_review with a fully populated state.

Two modes, detected automatically via a TCP probe of Ollama's default
port:
  - Ollama reachable (a real local server, e.g. `ollama serve` with the
    models named in settings.py's *_llm_model fields pulled): asserts
    the full strict contract -- zero agent errors, and diagnosis/report/
    verification fields hold real generated content, not fallback
    placeholders.
  - Ollama unreachable (no LLM server in this environment): the vision
    layer assertions still run at full strength -- that's this
    environment's actual coverage -- but diagnosis_agent, report_agent,
    and verifier_agent are allowed to hit their own documented fail-safe
    fallbacks (see those files) instead of failing this test. Those
    fallbacks -- an UNDETERMINED finding, a null draft report, a
    verification_status left at "pending" -- ARE the correct behavior
    with no LLM server reachable, not a bug this test should flag.

To exercise strict mode locally: `ollama serve`, then `ollama pull` the
models configured under settings.py's *_llm_model fields, then re-run
this file.
"""
from __future__ import annotations

import socket
import sqlite3
import uuid
from pathlib import Path

import numpy as np
import pytest
from langgraph.checkpoint.sqlite import SqliteSaver
from PIL import Image

from medagent.agents.orchestrator import build_graph, run_case
from medagent.agents.state import PatientMetadata
from medagent.privacy.deidentify import DEFAULT_CACHE_DIR


def _ollama_reachable(host: str = "localhost", port: int = 11434, timeout: float = 0.5) -> bool:
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except OSError:
        return False


@pytest.fixture(autouse=True)
def _cleanup_dicom_cache():
    """The Phase 2 item 1 hard gate (deidentify_node) writes its scrubbed
    output into the real DEFAULT_CACHE_DIR, not tmp_path -- see the same
    fixture in tests/integration/test_orchestrator_graph.py. Without this,
    every run of this suite leaves one more orphaned PNG behind forever."""
    yield
    cache_dir = Path(DEFAULT_CACHE_DIR)
    if cache_dir.is_dir():
        for artifact in cache_dir.glob("phase0-smoke-*"):
            artifact.unlink()


@pytest.fixture
def synthetic_cxr(tmp_path) -> str:
    """A synthetic, valid, loadable grayscale image standing in for a real
    chest X-ray -- this environment has no licensed dataset to ship as a
    fixture, and the point of this test is pipeline correctness end to
    end, not clinical accuracy against it."""
    path = tmp_path / "sample_cxr.png"
    array = (np.random.default_rng(2026).random((512, 512)) * 255).astype("uint8")
    Image.fromarray(array, mode="L").save(path)
    return str(path)


@pytest.fixture
def graph(tmp_path):
    """A graph wired to a throwaway SQLite checkpoint DB, isolated from
    the shared checkpoints.db a manual run elsewhere may have left
    mid-interrupt."""
    connection = sqlite3.connect(str(tmp_path / "phase0_smoke_checkpoints.db"), check_same_thread=False)
    checkpointer = SqliteSaver(connection)
    checkpointer.setup()
    return build_graph(checkpointer=checkpointer)


def test_phase0_full_pipeline_reaches_human_review_with_populated_state(graph, synthetic_cxr):
    metadata: PatientMetadata = {
        "age": 58, "sex": "F", "view_position": "PA", "patient_id": "PHASE0-SMOKE-001",
    }
    case_id = f"phase0-smoke-{uuid.uuid4().hex[:8]}"

    result = run_case(graph, case_id=case_id, image_path=synthetic_cxr, patient_metadata=metadata)

    # --- The graph reached the human_review pause ---------------------
    assert "__interrupt__" in result, f"Graph did not pause at human_review -- full state: {result}"
    interrupt_payload = result["__interrupt__"][0].value
    assert interrupt_payload["type"] == "clinical_review_required"
    assert interrupt_payload["case_id"] == case_id

    # --- perceive_image populated every vision-state field -------------
    classification = result["classification"]
    assert classification is not None, "perceive_image did not populate classification"
    assert classification["predicted_class"] in ("Normal", "Lung Opacity", "Other Abnormality")
    assert isinstance(classification["class_probabilities"], dict) and classification["class_probabilities"]
    assert isinstance(classification["calibrated_confidence"], float)
    assert 0.0 <= classification["calibrated_confidence"] <= 1.0

    detections = result["detections"]
    assert isinstance(detections, list), "perceive_image did not populate detections"
    for box in detections:
        assert set(box.keys()) == {"label", "x_min", "y_min", "x_max", "y_max", "score"}
        assert box["x_min"] <= box["x_max"] and box["y_min"] <= box["y_max"]

    assert result["gradcam_heatmap_path"] is not None, "perceive_image did not populate gradcam_heatmap_path"
    assert isinstance(result["heatmap_bbox_alignment_score"], float)
    assert 0.0 <= result["heatmap_bbox_alignment_score"] <= 1.0

    # --- diagnosis_agent ran (real finding or its own fail-safe) -------
    assert result["diagnosis_findings"] is not None, "diagnosis_agent did not run"
    assert result["diagnosis_findings"]["severity"] in ("high", "moderate", "low")

    # --- evidence_agent ran -- pure local retrieval, doesn't depend on
    # an LLM server, so this always succeeds regardless of Ollama. -----
    assert result["retrieved_evidence"] is not None, "evidence_agent did not run"

    # --- regeneration loop bookkeeping is present and sane -------------
    assert isinstance(result["regeneration_count"], int) and result["regeneration_count"] >= 0

    if _ollama_reachable():
        # Strict mode: a real LLM server is reachable -- every
        # LLM-dependent agent should have actually run end to end, not
        # fallen back, and no node should have recorded an error.
        assert result["errors"] == [], f"Expected zero agent errors with a live LLM server, got: {result['errors']}"
        assert result["diagnosis_findings"]["finding_label"] != "UNDETERMINED"
        assert result["draft_report"], "report_agent did not produce a draft report"
        # "passed", not "consistent": VerificationResult constrains the
        # verifier to Literal["passed", "flagged"] and always has. The
        # state schema used to declare "consistent" and this assertion
        # used to match it, but no code ever produced that value -- the
        # mismatch survived because this branch only runs with a live
        # Ollama. Fixed alongside Phase 2 item 4.
        assert result["verification_status"] in ("passed", "flagged")
    else:
        # No LLM server in this environment: diagnosis_agent, report_agent,
        # and verifier_agent each independently fail closed on the same
        # connection error -- assert that's *specifically* what happened,
        # not some other, unrelated failure this test would otherwise mask.
        assert result["errors"], "Expected connection-failure errors with no LLM server reachable, got none"
        for error in result["errors"]:
            assert "connect" in error.lower(), f"Non-connection error recorded with no LLM server available: {error!r}"
        assert result["draft_report"] is None
        assert result["verification_status"] == "pending"
