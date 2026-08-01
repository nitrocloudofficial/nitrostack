"""
Request/response schemas for the HTTP API -- Phase 2.5.

These are the wire contract between the React console (ui/index.html)
and the LangGraph pipeline. They are deliberately separate from
agents/state.py's AgentState: the graph state is an internal structure
that changes as agents change, while this is a published surface a
browser depends on. Mapping between them explicitly (see
server.py::_case_response) means a refactor inside the graph does not
silently break the UI.
"""
from __future__ import annotations

from typing import Any, Literal, Optional

from pydantic import BaseModel, Field


class UserPayload(BaseModel):
    """The caller's identity, mirroring security/auth.py's UserContext.

    Note this is *asserted* by the client, not authenticated. The API
    validates the shape and enforces the role's permissions; it does not
    verify the person is who they claim to be. Wiring a real identity
    provider in front of this is tracked in REG-002 section 6.2 -- the
    same limitation the RBAC layer itself carries."""

    user_id: str = Field(..., min_length=1)
    role: Literal["radiologist", "admin"]


class PatientMetadataPayload(BaseModel):
    age: int = Field(..., ge=0, le=120)
    sex: Literal["M", "F", "O"]
    view_position: Literal["PA", "AP"]
    patient_id: str = Field(..., min_length=1)


class ReviewRequest(BaseModel):
    """A clinician's decision at the human_review gate."""

    user: UserPayload
    action: Literal["approve", "revise", "reject"]
    edited_text: Optional[str] = None
    reason: Optional[str] = None

    def to_resume_payload(self) -> dict:
        """The shape human_review_node expects (see its docstring)."""
        payload: dict[str, Any] = {"user": self.user.model_dump(), "action": self.action}
        if self.edited_text is not None:
            payload["edited_text"] = self.edited_text
        if self.reason is not None:
            payload["reason"] = self.reason
        return payload


class CaseResponse(BaseModel):
    """A case's current state as the console renders it."""

    case_id: str
    status: Literal["awaiting_review", "finalized", "archived", "unknown"]
    patient_metadata: Optional[dict] = None
    classification: Optional[dict] = None
    detections: list[dict] = Field(default_factory=list)
    diagnosis_findings: Optional[dict] = None
    retrieved_evidence: Optional[str] = None
    # Prior imaging from the PACS bridge (Phase 3 item 2). None means the
    # PACS was never queried or was unreachable; [] means it answered
    # "none on file". The console renders both as an empty panel but says
    # which, and badges any study carrying simulated=True.
    prior_studies: Optional[list[dict]] = None
    draft_report: Optional[str] = None
    final_report: Optional[str] = None
    verification_status: Optional[str] = None
    verification_notes: Optional[str] = None
    verification_escalated: bool = False
    regeneration_count: int = 0
    human_decision: Optional[str] = None
    reviewed_by: Optional[str] = None
    # null = not applicable (no detections, or a Normal read), NOT a
    # measured zero. The console renders null as "N/A".
    heatmap_bbox_alignment_score: Optional[float] = None
    # Trained-artifact provenance, so the UI can flag an untrained
    # detector or uncalibrated confidence rather than implying both are
    # clinically meaningful.
    model_provenance: Optional[dict] = None
    # Asset availability, so the UI knows which image tabs to offer
    # rather than probing for 404s.
    has_deidentified_image: bool = False
    has_gradcam: bool = False
    errors: list[str] = Field(default_factory=list)


class AuditRecord(BaseModel):
    sequence: int
    timestamp: str
    case_id: str
    event_type: str
    user_id: Optional[str] = None
    notes: Optional[str] = None
    previous_hash: str
    entry_hash: str


class AuditResponse(BaseModel):
    """The audit trail plus the verdict on its integrity.

    The verification result is returned alongside the records on
    purpose: a console that displays an audit log without saying whether
    the chain still verifies invites the reader to assume it does."""

    records: list[AuditRecord]
    chain_valid: bool
    records_checked: int
    broken_at_index: Optional[int] = None
    reason: Optional[str] = None


class PermissionsResponse(BaseModel):
    """The RBAC matrix as enforced, so the console can disable actions a
    role cannot perform rather than offering them and failing at submit."""

    matrix: dict[str, list[str]]
