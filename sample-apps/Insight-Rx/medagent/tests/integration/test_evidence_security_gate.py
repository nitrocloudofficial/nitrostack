"""
Integration test for Phase 2 item 2's FAISS signing hard gate, exercised
through the ACTUAL LangGraph pipeline (not just get_vectorstore() in
isolation -- see tests/unit/test_vectorstore_signing.py for that unit-
level coverage). Confirms a tampered/unsigned index halts run_case() the
same way a failed PHI de-identification gate does
(test_orchestrator_graph.py's toxic-DICOM tests), by re-raising
SecurityError out of evidence_agent_node instead of degrading to a
"no evidence found" result that would still reach human_review.
"""
from __future__ import annotations

import json
import sqlite3
import uuid
from pathlib import Path

import numpy as np
import pytest
from langchain_community.vectorstores import FAISS
from langgraph.checkpoint.sqlite import SqliteSaver
from PIL import Image

import medagent.rag.vectorstore as vectorstore_module
from medagent.agents.orchestrator import build_graph, run_case
from medagent.agents.state import PatientMetadata
from medagent.privacy.deidentify import DEFAULT_CACHE_DIR
from medagent.rag.vectorstore import get_embeddings, save_vectorstore
from medagent.security.artifact_signing import SecurityError, write_signature_file
from medagent.utils.settings import Settings

SIGNING_KEY = "integration-test-faiss-signing-key"
GUIDELINE_TEXT = "Pneumonia guideline: integration-test marker chunk about empiric antibiotics."


@pytest.fixture(autouse=True)
def _reset_vectorstore_cache():
    """get_vectorstore() memoizes into a module-level global -- reset it
    around every test so one test's (possibly tampered) index can't leak
    into the next."""
    vectorstore_module._vectorstore = None
    yield
    vectorstore_module._vectorstore = None


@pytest.fixture(autouse=True)
def _cleanup_dicom_cache():
    """deidentify_node (Phase 2 item 1) runs before evidence_agent_node
    in this graph and writes into the real DEFAULT_CACHE_DIR -- same
    cleanup as test_orchestrator_graph.py, scoped to this file's own
    case_id prefix so it can't delete another test's in-flight files."""
    yield
    cache_dir = Path(DEFAULT_CACHE_DIR)
    if cache_dir.is_dir():
        for artifact in cache_dir.glob("sec-test-*"):
            artifact.unlink()


@pytest.fixture
def signed_index(tmp_path, monkeypatch):
    """Builds and signs a tiny one-document FAISS index in tmp_path, and
    points rag/vectorstore.py at it (instead of the real
    vectorstore/faiss_index/) for the duration of the test.

    Note: this is the first place in the suite where `faiss` gets used
    for a real on-disk index rather than the in-memory sample fallback.
    See tests/conftest.py for why EasyOCR's reader must already be warm
    before this runs on this platform -- that module-level warm-up
    covers every test in the session, this fixture doesn't need its own
    copy of it."""
    vs = FAISS.from_texts([GUIDELINE_TEXT], get_embeddings())
    index_path, docstore_path = save_vectorstore(vs, tmp_path, "testidx")
    signature_path = tmp_path / "testidx.sig"
    write_signature_file([index_path, docstore_path], SIGNING_KEY.encode("utf-8"), signature_path)

    fake_settings = Settings(
        faiss_index_dir=str(tmp_path), faiss_index_name="testidx", faiss_signing_key=SIGNING_KEY
    )
    monkeypatch.setattr(vectorstore_module, "get_settings", lambda: fake_settings)
    return index_path, docstore_path, signature_path


@pytest.fixture
def sample_image_path(tmp_path) -> str:
    path = tmp_path / "sample_cxr.png"
    array = (np.random.default_rng(0).random((512, 512)) * 255).astype("uint8")
    Image.fromarray(array, mode="L").save(path)
    return str(path)


@pytest.fixture
def isolated_graph(tmp_path):
    connection = sqlite3.connect(str(tmp_path / "test_checkpoints.db"), check_same_thread=False)
    checkpointer = SqliteSaver(connection)
    checkpointer.setup()
    return build_graph(checkpointer=checkpointer)


def _run(isolated_graph, sample_image_path, patient_id):
    metadata: PatientMetadata = {"age": 50, "sex": "M", "view_position": "PA", "patient_id": patient_id}
    case_id = f"sec-test-{uuid.uuid4().hex[:8]}"
    return run_case(isolated_graph, case_id=case_id, image_path=sample_image_path, patient_metadata=metadata)


def test_valid_signed_index_reaches_human_review_with_real_evidence(isolated_graph, sample_image_path, signed_index):
    result = _run(isolated_graph, sample_image_path, "SEC-TEST-001")

    assert "__interrupt__" in result
    assert "integration-test marker chunk" in result["retrieved_evidence"]


def test_tampered_faiss_index_halts_the_graph(isolated_graph, sample_image_path, signed_index):
    index_path, _, _ = signed_index
    data = bytearray(index_path.read_bytes())
    data[-1] ^= 0xFF
    index_path.write_bytes(bytes(data))

    with pytest.raises(SecurityError):
        _run(isolated_graph, sample_image_path, "SEC-TEST-002")


def test_tampered_docstore_metadata_halts_the_graph(isolated_graph, sample_image_path, signed_index):
    """A tampered JSON metadata sidecar (item 2 requirement 4's second
    tamper vector) must halt the graph too, not just a tampered .faiss
    binary -- an attacker who could inject fabricated "clinical
    guidance" into the Report Agent's citations without ever touching
    the vector index itself is exactly what this signature covers."""
    _, docstore_path, _ = signed_index
    payload = json.loads(docstore_path.read_text())
    any_doc_id = next(iter(payload["docstore"]))
    payload["docstore"][any_doc_id]["page_content"] = "INJECTED: fabricated clinical guidance."
    docstore_path.write_text(json.dumps(payload))

    with pytest.raises(SecurityError):
        _run(isolated_graph, sample_image_path, "SEC-TEST-003")


def test_missing_signature_halts_the_graph(isolated_graph, sample_image_path, signed_index):
    _, _, signature_path = signed_index
    signature_path.unlink()

    with pytest.raises(SecurityError):
        _run(isolated_graph, sample_image_path, "SEC-TEST-004")
