"""
Integration tests for the HTTP API (Phase 2.5).

Exercises the real FastAPI app against the real LangGraph pipeline --
the vision layer is stubbed for speed, but the PHI gate, RBAC, the audit
chain and the checkpointer are all genuinely running. The property under
test is that the Phase 2 clinical controls remain enforced when reached
over HTTP, and that each one surfaces as a distinguishable status code
rather than a generic 500.
"""
from __future__ import annotations

import io
import json
import sqlite3
import uuid
from pathlib import Path

import numpy as np
import pytest
from fastapi.testclient import TestClient
from langgraph.checkpoint.sqlite import SqliteSaver
from PIL import Image

import medagent.api.server as server_module
from medagent.agents.orchestrator import build_graph
from medagent.privacy.deidentify import DEFAULT_CACHE_DIR

RADIOLOGIST = {"user_id": "r.chen", "role": "radiologist"}
ADMIN = {"user_id": "admin.bob", "role": "admin"}
METADATA = {"age": 54, "sex": "F", "view_position": "PA", "patient_id": "API-TEST-001"}


@pytest.fixture(autouse=True)
def _cleanup_artifacts():
    yield
    cache = Path(DEFAULT_CACHE_DIR)
    if cache.is_dir():
        for artifact in cache.glob("api-test-*"):
            artifact.unlink()


@pytest.fixture(autouse=True)
def _isolate_server_state(tmp_path, monkeypatch):
    """Points the app's graph, case registry and upload dir at throwaway
    locations. Without this, every test run would append to the real
    checkpoint DB and case registry."""
    connection = sqlite3.connect(str(tmp_path / "checkpoints.db"), check_same_thread=False)
    checkpointer = SqliteSaver(connection)
    checkpointer.setup()
    monkeypatch.setattr(server_module, "_graph", build_graph(checkpointer=checkpointer))
    monkeypatch.setattr(server_module, "_REGISTRY_PATH", tmp_path / "case_registry.json")
    monkeypatch.setattr(server_module, "_UPLOAD_DIR", tmp_path / "uploads")
    yield
    monkeypatch.setattr(server_module, "_graph", None)


@pytest.fixture(autouse=True)
def _stub_perception(monkeypatch):
    """Replaces model inference with a fixed confident reading, so these
    tests measure the API and its gates rather than re-testing the vision
    layer (which has its own coverage)."""
    def _stub(image_path, metadata):
        return {
            "classification": {
                "predicted_class": "Lung Opacity",
                "class_probabilities": {"Lung Opacity": 0.91},
                "calibrated_confidence": 0.91,
            },
            "detections": [{"label": "lung_opacity", "x_min": 0.3, "y_min": 0.4,
                            "x_max": 0.5, "y_max": 0.6, "score": 0.82}],
            "gradcam_heatmap_path": None,
            "heatmap_bbox_alignment_score": 0.7,
        }

    monkeypatch.setattr("medagent.agents.orchestrator.run_perception", _stub)


@pytest.fixture
def client():
    return TestClient(server_module.app)


def _png_bytes(seed: int = 0) -> io.BytesIO:
    buffer = io.BytesIO()
    array = (np.random.default_rng(seed).random((256, 256)) * 255).astype("uint8")
    Image.fromarray(array, mode="L").save(buffer, format="PNG")
    buffer.seek(0)
    return buffer


def _submit(client, case_id: str | None = None):
    case_id = case_id or f"api-test-{uuid.uuid4().hex[:8]}"
    response = client.post(
        "/api/cases",
        files={"image": ("cxr.png", _png_bytes(), "image/png")},
        data={"case_id": case_id, "patient_metadata": json.dumps(METADATA), "submitted_by": "tech.a"},
    )
    return case_id, response


# ── Basics ──────────────────────────────────────────────────────────

def test_health(client):
    assert client.get("/api/health").json()["status"] == "ok"


def test_console_is_served(client):
    response = client.get("/")
    assert response.status_code == 200
    assert "Radiograph Review Console" in response.text


def test_permissions_reflect_the_enforced_matrix(client):
    """The console disables actions from this payload, so it must match
    what the server actually enforces."""
    from medagent.security.auth import describe_permission_matrix

    assert client.get("/api/auth/permissions").json()["matrix"] == describe_permission_matrix()


# ── Case lifecycle ──────────────────────────────────────────────────

def test_submit_runs_the_pipeline_and_pauses_for_review(client):
    case_id, response = _submit(client)
    assert response.status_code == 200

    body = response.json()
    assert body["case_id"] == case_id
    assert body["status"] == "awaiting_review"
    assert body["classification"]["predicted_class"] == "Lung Opacity"
    assert body["has_deidentified_image"] is True


def test_submitted_case_appears_in_the_listing(client):
    case_id, _ = _submit(client)
    listed = [c["case_id"] for c in client.get("/api/cases").json()["cases"]]
    assert case_id in listed


def test_get_unknown_case_is_404(client):
    assert client.get("/api/cases/does-not-exist").status_code == 404


def test_deidentified_asset_is_served(client):
    case_id, _ = _submit(client)
    response = client.get(f"/api/cases/{case_id}/assets/deidentified")
    assert response.status_code == 200
    assert response.headers["content-type"] == "image/png"


def test_only_deidentified_assets_are_exposed(client):
    """There is deliberately no route that can return the original
    upload -- which is also why submit deletes it."""
    case_id, _ = _submit(client)
    assert client.get(f"/api/cases/{case_id}/assets/original").status_code == 400


@pytest.mark.parametrize("bad_id", ["../etc/passwd", "a/b", "with space", ""])
def test_malformed_case_ids_are_rejected(client, bad_id):
    """case_id reaches the filesystem, so anything outside the safe
    alphabet is refused at the edge rather than sanitized later."""
    response = client.post(
        "/api/cases",
        files={"image": ("cxr.png", _png_bytes(), "image/png")},
        data={"case_id": bad_id, "patient_metadata": json.dumps(METADATA)},
    )
    assert response.status_code in (400, 404, 422)


def test_invalid_patient_metadata_is_rejected(client):
    response = client.post(
        "/api/cases",
        files={"image": ("cxr.png", _png_bytes(), "image/png")},
        data={"case_id": f"api-test-{uuid.uuid4().hex[:8]}", "patient_metadata": "not json"},
    )
    assert response.status_code == 400


@pytest.mark.parametrize(
    "metadata,expected_field",
    [
        ({"age": 50, "sex": "F", "view_position": "PA", "patient_id": ""}, "patient_id"),
        ({"age": "", "sex": "", "view_position": "", "patient_id": ""}, "age"),
        ({}, "age"),
        ({"age": 50, "sex": "Female", "view_position": "PA", "patient_id": "P1"}, "sex"),
        ({"age": 999, "sex": "F", "view_position": "PA", "patient_id": "P1"}, "age"),
        ({"age": 50, "sex": "F", "view_position": "LATERAL", "patient_id": "P1"}, "view_position"),
    ],
)
def test_schema_invalid_metadata_returns_422_naming_the_field(client, metadata, expected_field):
    """Regression: ValidationError was uncaught, so valid JSON that failed
    the schema -- an empty patient_id, say -- escaped as a bare 500 with
    "Internal Server Error" in the browser and a stack trace in the log.
    A rejected field is client-correctable, and the caller has to be told
    which field to fix."""
    response = client.post(
        "/api/cases",
        files={"image": ("cxr.png", _png_bytes(), "image/png")},
        data={"case_id": f"api-test-{uuid.uuid4().hex[:8]}",
              "patient_metadata": json.dumps(metadata)},
    )

    assert response.status_code == 422, response.text
    assert expected_field in response.json()["detail"]


def test_non_object_metadata_returns_422_not_500(client):
    response = client.post(
        "/api/cases",
        files={"image": ("cxr.png", _png_bytes(), "image/png")},
        data={"case_id": f"api-test-{uuid.uuid4().hex[:8]}", "patient_metadata": json.dumps(["a", "list"])},
    )
    assert response.status_code == 422
    assert "must be a JSON object" in response.json()["detail"]


def test_a_rejected_payload_creates_no_case(client):
    """A 422 must leave nothing behind -- no half-registered case for the
    console to list and no checkpoint to resume."""
    case_id = f"api-test-{uuid.uuid4().hex[:8]}"
    client.post(
        "/api/cases",
        files={"image": ("cxr.png", _png_bytes(), "image/png")},
        data={"case_id": case_id,
              "patient_metadata": json.dumps({"age": 50, "sex": "F", "view_position": "PA", "patient_id": ""})},
    )

    assert client.get(f"/api/cases/{case_id}").status_code == 404
    assert case_id not in [c["case_id"] for c in client.get("/api/cases").json()["cases"]]


# ── RBAC over HTTP ──────────────────────────────────────────────────

def test_radiologist_can_approve(client):
    case_id, _ = _submit(client)
    response = client.post(f"/api/cases/{case_id}/review",
                           json={"user": RADIOLOGIST, "action": "approve"})

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "finalized"
    assert body["reviewed_by"] == "r.chen"


def test_admin_approval_is_forbidden(client):
    """The Phase 2 clinical restriction must survive being reached over
    HTTP, and must arrive as a 403 the console can explain -- not a 500."""
    case_id, _ = _submit(client)
    response = client.post(f"/api/cases/{case_id}/review",
                           json={"user": ADMIN, "action": "approve"})

    assert response.status_code == 403
    assert response.json()["error"] == "forbidden"
    assert "licensed clinical act" in response.json()["detail"]


def test_admin_can_reject(client):
    case_id, _ = _submit(client)
    response = client.post(
        f"/api/cases/{case_id}/review",
        json={"user": ADMIN, "action": "reject", "reason": "Image quality insufficient."},
    )
    assert response.status_code == 200
    assert response.json()["status"] == "archived"


def test_a_denied_review_leaves_the_case_approvable(client):
    """The wedge regression, over HTTP: a refused attempt must block the
    action without consuming the case."""
    case_id, _ = _submit(client)

    assert client.post(f"/api/cases/{case_id}/review",
                       json={"user": ADMIN, "action": "approve"}).status_code == 403

    approved = client.post(f"/api/cases/{case_id}/review",
                           json={"user": RADIOLOGIST, "action": "approve"})
    assert approved.status_code == 200
    assert approved.json()["status"] == "finalized"


def test_review_without_a_user_block_is_rejected(client):
    case_id, _ = _submit(client)
    response = client.post(f"/api/cases/{case_id}/review", json={"action": "approve"})
    assert response.status_code == 422  # schema requires `user`


def test_unknown_role_is_rejected(client):
    case_id, _ = _submit(client)
    response = client.post(
        f"/api/cases/{case_id}/review",
        json={"user": {"user_id": "x", "role": "surgeon"}, "action": "approve"},
    )
    assert response.status_code == 422


# ── Audit ───────────────────────────────────────────────────────────

def test_audit_records_the_full_lifecycle_and_verifies(client):
    case_id, _ = _submit(client)
    client.post(f"/api/cases/{case_id}/review", json={"user": RADIOLOGIST, "action": "approve"})

    body = client.get(f"/api/audit?case_id={case_id}").json()
    events = [r["event_type"] for r in body["records"]]

    assert "case_started" in events
    assert "deidentification_completed" in events
    assert "human_review_resumed" in events
    assert "case_finalized" in events
    assert body["chain_valid"] is True


def test_denied_attempts_are_audited(client):
    case_id, _ = _submit(client)
    client.post(f"/api/cases/{case_id}/review", json={"user": ADMIN, "action": "approve"})

    events = [r["event_type"] for r in client.get(f"/api/audit?case_id={case_id}").json()["records"]]
    assert "review_access_denied" in events


def test_audit_chain_verdict_covers_the_whole_log_not_the_filter(client):
    """Filtering to one case must not report a break for every record
    legitimately absent from the filter -- the chain is only meaningful
    as a whole sequence."""
    first, _ = _submit(client)
    second, _ = _submit(client)

    filtered = client.get(f"/api/audit?case_id={second}").json()
    assert filtered["chain_valid"] is True
    assert filtered["records_checked"] > len(filtered["records"])
    assert {r["case_id"] for r in filtered["records"]} == {second}
