"""
Integration tests for Phase 2, item 3 (RBAC + hash-chained audit
logging) exercised through the ACTUAL LangGraph pipeline -- see
tests/unit/test_auth.py and tests/unit/test_audit_logger.py for the
unit-level coverage of the rules and the chain themselves.

This is item 3's requirement 5, first half: simulate an authorized
radiologist approving a case and an unauthorized user attempting the
same, and assert the latter fails.
"""
from __future__ import annotations

import json
import socket
import sqlite3
import uuid
from pathlib import Path

import numpy as np
import pytest
from langgraph.checkpoint.sqlite import SqliteSaver
from langgraph.types import Command
from PIL import Image

from medagent.agents.orchestrator import build_graph, resume_case, run_case
from medagent.agents.state import PatientMetadata
from medagent.privacy.deidentify import DEFAULT_CACHE_DIR
from medagent.security.audit_logger import verify_chain
from medagent.security.audit_store import JSONLAuditStore
from medagent.security.auth import AuthenticationError, AuthorizationError

RADIOLOGIST = {"user_id": "r.chen", "role": "radiologist"}
ADMIN = {"user_id": "admin.bob", "role": "admin"}


def _ollama_reachable(host: str = "localhost", port: int = 11434, timeout: float = 0.5) -> bool:
    """Same probe test_phase0_smoke.py uses -- see the one assertion
    below that depends on an LLM actually being available."""
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except OSError:
        return False


@pytest.fixture(autouse=True)
def _cleanup_dicom_cache():
    yield
    cache_dir = Path(DEFAULT_CACHE_DIR)
    if cache_dir.is_dir():
        for artifact in cache_dir.glob("rbac-test-*"):
            artifact.unlink()


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


@pytest.fixture
def paused_case(isolated_graph, sample_image_path, audit_log):
    """A real case run through the whole pipeline and paused at the
    human_review interrupt, ready for a review decision."""
    metadata: PatientMetadata = {
        "age": 61, "sex": "F", "view_position": "PA", "patient_id": "RBAC-TEST-001",
    }
    case_id = f"rbac-test-{uuid.uuid4().hex[:8]}"
    result = run_case(
        isolated_graph, case_id=case_id, image_path=sample_image_path,
        patient_metadata=metadata, submitted_by="tech.a",
    )
    assert "__interrupt__" in result, "fixture expected the case to pause at human_review"
    return case_id


def _events(audit_log_path) -> list[str]:
    return [r["event_type"] for r in JSONLAuditStore(audit_log_path).read_all_records()]


# ── RBAC through the real graph ─────────────────────────────────────

def test_radiologist_can_approve(isolated_graph, paused_case, audit_log):
    result = resume_case(isolated_graph, paused_case, {"user": RADIOLOGIST, "action": "approve"})

    assert result["human_decision"] == "approved"
    assert result["reviewed_by"] == "r.chen"
    assert "case_finalized" in _events(audit_log)


def test_radiologist_can_revise(isolated_graph, paused_case, audit_log):
    result = resume_case(
        isolated_graph, paused_case,
        {"user": RADIOLOGIST, "action": "revise", "edited_text": "Corrected impression."},
    )

    assert result["human_decision"] == "revised"
    assert result["final_report"] == "Corrected impression."
    assert result["reviewed_by"] == "r.chen"


def test_admin_cannot_approve(isolated_graph, paused_case, audit_log):
    """The headline unauthorized case: an admin is not a licensed
    clinician and may not sign off on a diagnosis."""
    with pytest.raises(AuthorizationError, match="licensed clinical act"):
        resume_case(isolated_graph, paused_case, {"user": ADMIN, "action": "approve"})

    assert "review_access_denied" in _events(audit_log)
    assert "case_finalized" not in _events(audit_log)


def test_admin_cannot_revise(isolated_graph, paused_case, audit_log):
    with pytest.raises(AuthorizationError):
        resume_case(
            isolated_graph, paused_case,
            {"user": ADMIN, "action": "revise", "edited_text": "unauthorized edit"},
        )


def test_admin_can_reject(isolated_graph, paused_case, audit_log):
    """Rejection only routes a case toward manual workup, so it is
    permitted for the operational role too."""
    result = resume_case(
        isolated_graph, paused_case,
        {"user": ADMIN, "action": "reject", "reason": "Image quality insufficient."},
    )

    assert result["human_decision"] == "rejected"
    assert result["reviewed_by"] == "admin.bob"
    assert "case_archived" in _events(audit_log)


@pytest.mark.parametrize(
    "payload",
    [
        {"action": "approve"},                                         # no user block at all
        {"user": {"role": "radiologist"}, "action": "approve"},        # no user_id
        {"user": {"user_id": "x", "role": "surgeon"}, "action": "approve"},  # unknown role
    ],
)
def test_unidentified_callers_cannot_resume(isolated_graph, paused_case, audit_log, payload):
    with pytest.raises(AuthenticationError):
        resume_case(isolated_graph, paused_case, payload)


def test_a_denied_attempt_leaves_the_case_approvable(isolated_graph, paused_case, audit_log):
    """Regression test for a real bug found building this: LangGraph
    persists the resume value against the interrupted task, so a node
    that RAISES after consuming one gets replayed with that same value
    forever -- a single unauthorized attempt would wedge the case and no
    radiologist could ever approve it. A denied attempt must block the
    action without consuming the case."""
    with pytest.raises(AuthorizationError):
        resume_case(isolated_graph, paused_case, {"user": ADMIN, "action": "approve"})
    with pytest.raises(AuthenticationError):
        resume_case(isolated_graph, paused_case, {"action": "approve"})

    result = resume_case(isolated_graph, paused_case, {"user": RADIOLOGIST, "action": "approve"})

    assert result["human_decision"] == "approved"
    assert result["reviewed_by"] == "r.chen"


def test_direct_graph_invoke_cannot_bypass_rbac_or_wedge_the_case(
    isolated_graph, paused_case, audit_log
):
    """Defense in depth: a caller who skips resume_case() and drives the
    compiled graph directly still cannot get an unauthorized approval
    through -- and still cannot wedge the case doing it."""
    result = isolated_graph.invoke(
        Command(resume={"user": ADMIN, "action": "approve"}),
        {"configurable": {"thread_id": paused_case}},
    )

    assert "__interrupt__" in result, "case should still be paused, not approved"
    assert result["__interrupt__"][0].value["denied"]
    assert result.get("human_decision") is None

    approved = resume_case(isolated_graph, paused_case, {"user": RADIOLOGIST, "action": "approve"})
    assert approved["human_decision"] == "approved"


# ── Audit trail over a real run ─────────────────────────────────────

def test_full_lifecycle_is_audited_and_the_chain_verifies(isolated_graph, paused_case, audit_log):
    resume_case(isolated_graph, paused_case, {"user": RADIOLOGIST, "action": "approve"})

    events = _events(audit_log)
    for expected in (
        "case_started", "deidentification_completed", "human_review_resumed", "case_finalized",
    ):
        assert expected in events, f"{expected} missing from audit trail: {events}"

    # ai_report_drafted is asserted only when an LLM server is actually
    # reachable. Its absence otherwise is correct, not a gap: with no
    # LLM, report_agent_node fails into its documented fallback and no
    # draft is ever produced -- an audit trail claiming a report was
    # drafted when none was would be the bug.
    if _ollama_reachable():
        assert "ai_report_drafted" in events

    assert verify_chain(JSONLAuditStore(audit_log).read_all_records()).is_valid


def test_audit_records_carry_no_phi_from_a_real_run(isolated_graph, paused_case, audit_log):
    """Records must capture only when/which case/what/who -- never
    patient metadata, report text, or image paths."""
    resume_case(isolated_graph, paused_case, {"user": RADIOLOGIST, "action": "approve"})

    records = JSONLAuditStore(audit_log).read_all_records()
    assert records
    for record in records:
        assert set(record) == {
            "sequence", "timestamp", "case_id", "event_type",
            "user_id", "notes", "previous_hash", "entry_hash",
        }
        # The patient_id this case ran under must not have leaked into
        # any field, including the free-text note.
        assert "RBAC-TEST-001" not in str(record)


def test_a_real_runs_audit_log_detects_middle_line_tampering(isolated_graph, paused_case, audit_log):
    """Item 3, requirement 5's second half, end to end: tamper with a
    middle line of an audit log produced by an actual pipeline run."""
    resume_case(isolated_graph, paused_case, {"user": RADIOLOGIST, "action": "approve"})
    assert verify_chain(JSONLAuditStore(audit_log).read_all_records()).is_valid

    lines = audit_log.read_text(encoding="utf-8").splitlines()
    middle = len(lines) // 2
    record = json.loads(lines[middle])
    record["user_id"] = "attacker"
    lines[middle] = json.dumps(record, sort_keys=True)
    audit_log.write_text("\n".join(lines) + "\n", encoding="utf-8")

    result = verify_chain(JSONLAuditStore(audit_log).read_all_records())
    assert not result.is_valid
    assert result.broken_at_index == middle
