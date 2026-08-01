"""
Shared state schema for the clinical decision multi-agent graph.

Every node in the LangGraph reads from and writes to this single typed
state object. Keeping it as one TypedDict (rather than passing bespoke
objects between agents) is what makes the graph resumable: the
checkpointer only needs to be able to serialize this dict to persist
and restore execution at any node boundary -- including across the
human-in-the-loop interrupt.
"""
from __future__ import annotations

import operator
from typing import Annotated, Literal, Optional, TypedDict


class PatientMetadata(TypedDict):
    age: int
    sex: Literal["M", "F", "O"]
    view_position: Literal["PA", "AP"]
    patient_id: str


class BoundingBox(TypedDict):
    label: str                 # e.g. "lung_opacity"
    x_min: float
    y_min: float
    x_max: float
    y_max: float
    score: float                # detector confidence, 0-1


class ClassificationResult(TypedDict):
    predicted_class: Literal["Normal", "Lung Opacity", "Other Abnormality"]
    class_probabilities: dict[str, float]
    calibrated_confidence: float   # post Platt/temperature scaling, see evaluation/calibration.py


class DiagnosisFindings(TypedDict):
    """Mirrors agents.diagnosis_agent.DiagnosisOutput exactly -- this is
    the structured-output schema the local LLM is constrained to, stored
    back onto the shared graph state as a plain dict."""
    finding_label: str
    anatomical_region: str
    severity: Literal["high", "moderate", "low"]
    clinical_reasoning: str


class AgentState(TypedDict):
    # ── Case identity ─────────────────────────────────────────────
    case_id: str
    thread_id: str

    # ── Raw inputs (Multimodal Ingestion, PRD 2.2) ──────────────────
    image_path: str
    patient_metadata: PatientMetadata

    # ── AI Perception Layer outputs (TRD 3.1) ───────────────────────
    classification: Optional[ClassificationResult]
    detections: Optional[list[BoundingBox]]
    gradcam_heatmap_path: Optional[str]
    # None means "not applicable" -- no detections to align against, or a
    # "Normal" read. Distinct from a measured 0.0, which would mean the
    # heatmap and the boxes genuinely do not overlap.
    heatmap_bbox_alignment_score: Optional[float]

    # Which trained artifacts backed this run (vision/inference.py's
    # model_provenance()). Lets the console say when boxes come from an
    # untrained detector head or confidence is uncalibrated, instead of
    # rendering both as if they were clinically meaningful.
    model_provenance: Optional[dict]  # explainability alignment, PRD 2.3

    # ── Agentic Intelligence Layer ───────────────────────────────────
    # diagnosis_agent's structured finding. Note there is no separate
    # numeric "confidence_score" field here on purpose: statistical
    # confidence lives on classification.calibrated_confidence (from the
    # vision model), while diagnosis_findings.severity is the LLM's
    # categorical clinical assessment. Conflating the two into one
    # "confidence" number was the bug this schema used to have.
    diagnosis_findings: Optional[DiagnosisFindings]

    # evidence_agent returns a single pre-formatted, citable string
    # (top-3 guideline chunks), not a list -- report_agent and
    # verifier_agent drop it straight into their prompts as-is.
    retrieved_evidence: Optional[str]

    # Prior imaging for this patient, from the PACS bridge over MCP
    # (integration/mcp_client.py, Phase 3). A list of DICOM study
    # metadata dicts; empty means "none on file", which is a different
    # clinical fact from None ("PACS was never queried / unreachable").
    # Both render as an empty panel, but only one of them is an outage,
    # so the distinction is kept rather than collapsed to [].
    #
    # While the PACS is the simulated fixture server, each study carries
    # simulated=True and the UI badges it -- prior history shown beside a
    # real radiograph must never be mistaken for the genuine record.
    prior_studies: Optional[list[dict]]

    verification_status: Optional[Literal["pending", "passed", "flagged"]]
    verification_notes: Optional[str]
    regeneration_count: int
    # Set by verifier_agent when a case must go straight to a human
    # rather than back through the regeneration loop -- today that means
    # low vision-model confidence, where rewriting the report cannot
    # change what the vision model already scored. Distinct from
    # `flagged`: every escalation is flagged, but not every flag is an
    # escalation. See route_after_verification in orchestrator.py.
    verification_escalated: Optional[bool]

    # ── Reporting & Human-in-the-Loop (PRD 2.2, 1.) ──────────────────
    draft_report: Optional[str]
    human_decision: Optional[Literal["approved", "revised", "rejected"]]
    human_feedback: Optional[str]
    final_report: Optional[str]
    # user_id of the authenticated reviewer who acted at human_review
    # (security/auth.py). Recorded on state so finalize_report_node and
    # archive_case_node can attribute their audit events to a person
    # rather than to "the system" -- deliberately just the id, never the
    # role or any other identity detail, since state is checkpointed to
    # disk and this is the minimum needed for attribution.
    reviewed_by: Optional[str]

    # ── Control / observability ─────────────────────────────────────
    # operator.add reducer: every node appends rather than overwrites,
    # so nothing gets silently dropped when nodes run out of order.
    errors: Annotated[list[str], operator.add]


def new_case_state(
    case_id: str,
    thread_id: str,
    image_path: str,
    patient_metadata: PatientMetadata,
) -> AgentState:
    """Factory for a fresh graph invocation. See orchestrator.run_case()."""
    return AgentState(
        case_id=case_id,
        thread_id=thread_id,
        image_path=image_path,
        patient_metadata=patient_metadata,
        classification=None,
        detections=None,
        gradcam_heatmap_path=None,
        heatmap_bbox_alignment_score=None,
        model_provenance=None,
        diagnosis_findings=None,
        retrieved_evidence=None,
        # None, not [] -- the PACS has not been queried yet at this point.
        prior_studies=None,
        verification_status="pending",
        verification_notes=None,
        regeneration_count=0,
        verification_escalated=False,
        draft_report=None,
        human_decision=None,
        human_feedback=None,
        final_report=None,
        reviewed_by=None,
        errors=[],
    )
