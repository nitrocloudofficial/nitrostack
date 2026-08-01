"""
Main agentic state machine for the Autonomous Medical Imaging Diagnosis &
Clinical Decision Agent.

Pipeline (TRD 3.1):

    START
      -> deidentify             (PHI hard gate: DICOM tag scrubbing + burned-in-pixel
                                  OCR redaction -- Strategic_Startup_Roadmap.pdf Phase 2
                                  item 1. Unlike every node below, a failure here
                                  propagates and halts the case; it does not degrade to
                                  an "undetermined" result.)
      -> perceive_image        (AI Perception Layer: classify + localize + Grad-CAM)
      -> diagnosis_agent        (Agentic Intelligence Layer -> diagnosis_findings)
      -> evidence_agent          (Knowledge Layer / RAG over ATS-IDSA guidelines
                                   -> a single formatted retrieved_evidence string)
      -> pacs_retrieval           (Interoperability Layer, Phase 3 item 2: prior imaging
                                    for this patient via the NitroStack MCP bridge.
                                    Async; degrades to prior_studies=None if the PACS is
                                    unreachable -- supplementary context, never a halt.)
      -> report_agent             (drafts structured clinical report, with priors in view)
      -> verifier_agent            (Verification Layer, hardened in Phase 2 item 4 into
                                    a deterministic firewall: low-confidence abstention,
                                    then pure-Python schema/consistency/citation-grounding
                                    checks, then LLM semantic review. Loops correctable
                                    defects back to report_agent up to
                                    MAX_VERIFICATION_RETRIES times; escalates the rest
                                    straight to human_review.)
      -> human_review                (hard interrupt: NOTHING is finalized without
                                       a clinician decision -- see PRD "1. Complete
                                       Problem Statement", Human-in-the-Loop paradigm.
                                       RBAC-gated: resuming requires an authenticated
                                       user, and only a 'radiologist' may approve or
                                       revise -- Phase 2 item 3, see security/auth.py)
      -> finalize_report | archive_case
      -> END

Every lifecycle transition above emits a record to the hash-chained
audit trail (security/audit_logger.py): case_started,
deidentification_completed/failed, ai_report_drafted,
human_review_resumed, review_access_denied, case_finalized,
case_archived.

Changelog vs. the previous version of this file: diagnosis_agent now
writes a single `diagnosis_findings` dict (finding_label,
anatomical_region, severity, clinical_reasoning) instead of separate
`preliminary_diagnosis` / `confidence_score` fields, and evidence_agent
now writes `retrieved_evidence` as one pre-formatted citable string
instead of a list of evidence dicts. The human_review interrupt payload
below has been updated to match -- it no longer references
`confidence_score`, which no node has written since that change and
which was silently reaching the UI as None.

Run this module directly for a smoke test:  `python -m medagent.agents.orchestrator`
"""
from __future__ import annotations

import asyncio
import logging
import sqlite3
from typing import Literal

from langchain_core.runnables import RunnableLambda
from langgraph.checkpoint.sqlite import SqliteSaver
from langgraph.graph import END, START, StateGraph
from langgraph.graph.state import CompiledStateGraph
from langgraph.types import Command, interrupt

from medagent.agents.diagnosis_agent import diagnosis_agent_node
from medagent.agents.evidence_agent import evidence_agent_node
from medagent.agents.report_agent import report_agent_node
from medagent.agents.state import AgentState, PatientMetadata, new_case_state
from medagent.agents.verifier_agent import MAX_VERIFICATION_RETRIES, verifier_agent_node
from medagent.privacy.deidentify import deidentify_image
from medagent.security.audit_logger import get_audit_logger
from medagent.security.auth import (
    AuthenticationError,
    AuthorizationError,
    UserContext,
    authorize_review_action,
)
from medagent.utils.settings import get_settings
from medagent.vision.inference import run_perception

logger = logging.getLogger("medagent.orchestrator")

# Regeneration budget lives with the agent that enforces it -- see
# verifier_agent.MAX_VERIFICATION_RETRIES and route_after_verification.


# ─────────────────────────────────────────────────────────────────────
# Nodes that don't warrant their own agent module
# ─────────────────────────────────────────────────────────────────────

def deidentify_node(state: AgentState) -> dict:
    """
    PHI de-identification hard gate (Strategic_Startup_Roadmap.pdf,
    Phase 2 item 1) -- runs FIRST, before anything else touches this
    case's image. Scrubs DICOM metadata tags and redacts any burned-in
    pixel text (see privacy/deidentify.py), then rewrites
    state["image_path"] to point at the de-identified copy, so every
    downstream node -- perceive_image, Grad-CAM's saved heatmap overlay,
    anything ever cached from this case -- only ever sees the scrubbed
    image, never the original.

    Deliberately does NOT catch exceptions the way every other node in
    this graph does. perceive_image_node, diagnosis_agent_node, etc. all
    fail safe by degrading to an "undetermined" result and letting the
    case continue to human review -- correct behavior for "the AI is
    uncertain". It is NOT correct behavior here: if de-identification
    fails, this system cannot prove the image is safe to touch at all,
    and by the time a human reviewer might notice something was wrong,
    a heatmap, a checkpoint, or a log line may already have persisted
    unredacted data downstream. A raised PHIDeidentificationError
    propagates out of graph.invoke() itself and halts the case
    completely -- no later node ever runs, nothing downstream ever
    gets a chance to write anything.

    It still logs loudly and writes an audit-trail entry before
    re-raising: a hard halt must not also be a *silent* one -- without
    this, a case that fails the gate would leave zero record anywhere
    (no report, no log, no audit line) that it was ever attempted.
    """
    try:
        scrubbed_path = deidentify_image(image_path=state["image_path"], case_id=state["case_id"])
    except Exception as exc:
        logger.exception(
            "PHI de-identification FAILED for case=%s -- halting case, no downstream "
            "node will run.", state["case_id"],
        )
        get_audit_logger().append_event(
            case_id=state["case_id"],
            event_type="deidentification_failed",
            notes=f"halted: {type(exc).__name__}: {exc}",
        )
        raise

    get_audit_logger().append_event(
        case_id=state["case_id"], event_type="deidentification_completed"
    )
    return {"image_path": scrubbed_path}


def perceive_image_node(state: AgentState) -> dict:
    """
    AI Perception Layer. Not an LLM agent -- a deterministic CNN/ViT
    inference call (classification + bounding boxes + Grad-CAM), wrapped
    as a graph node so its outputs flow into the same typed state as
    everything downstream. See vision/inference.py for the actual model
    calls; kept out-of-line here to keep this file orchestration-only.
    """
    try:
        result = run_perception(
            image_path=state["image_path"],
            metadata=state["patient_metadata"],
        )
        return {
            "classification": result["classification"],
            "detections": result["detections"],
            "gradcam_heatmap_path": result["gradcam_heatmap_path"],
            "heatmap_bbox_alignment_score": result["heatmap_bbox_alignment_score"],
            "model_provenance": result.get("model_provenance"),
        }
    except Exception as exc:  # noqa: BLE001 - surface into graph state, don't crash the run
        logger.exception("perceive_image_node failed for case=%s", state["case_id"])
        return {"errors": [f"perceive_image_node: {exc}"]}


def _authorize_review(decision: object, case_id: str) -> UserContext:
    """
    Validates the identity and permissions on a human_review decision
    payload, recording a review_access_denied audit event for any
    refusal before re-raising it.

    Shared by resume_case() (which refuses before the graph is ever
    invoked) and human_review_node() (which re-prompts), so the RBAC
    rules and their audit trail have exactly one implementation.
    """
    audit = get_audit_logger()
    decision_dict = decision if isinstance(decision, dict) else {}
    action = decision_dict.get("action")

    try:
        user = UserContext.from_payload(decision_dict.get("user"))
    except AuthenticationError as exc:
        # No user_id to attribute this to -- which is itself the finding.
        audit.append_event(
            case_id=case_id, event_type="review_access_denied",
            notes=f"unauthenticated attempt action={action!r}: {exc}",
        )
        logger.error("Case %s: unauthenticated human_review attempt (action=%r)", case_id, action)
        raise

    try:
        authorize_review_action(user, action)
    except AuthorizationError as exc:
        audit.append_event(
            case_id=case_id, event_type="review_access_denied", user_id=user.user_id,
            notes=f"denied action={action!r} role={user.role!r}: {exc}",
        )
        logger.error(
            "Case %s: user=%s role=%s DENIED action=%r -- case remains open for an authorized reviewer.",
            case_id, user.user_id, user.role, action,
        )
        raise

    return user


async def pacs_retrieval_node(state: AgentState) -> dict:
    """
    Fetches this patient's prior imaging from the PACS bridge over MCP
    (Phase 3 item 2), so report_agent can draft with knowledge of what
    came before rather than reading every study as if it were the first.

    Genuinely async: the MCP client spawns and talks to a Node child
    process. LangGraph's sync `invoke()` cannot drive a bare `async def`,
    so build_graph() registers this alongside a thin sync bridge -- see
    _PACS_NODE below.

    Degrades, never halts. Prior imaging is supplementary context, so an
    unreachable or unbuilt PACS leaves `prior_studies` as None and the
    case proceeds exactly as it did before this node existed. That is the
    same fail-safe contract every node here follows except the two
    deliberate hard gates (deidentify, and the FAISS signature check
    inside evidence_agent), and it is why McpClientError is caught rather
    than propagated.

    None vs []: None means the PACS was never successfully queried; []
    means it answered "no priors on file". Both leave the panel empty,
    but only one is an outage.
    """
    from medagent.integration.mcp_client import McpClientError, query_prior_studies

    case_id = state.get("case_id", "unknown")
    patient_id = (state.get("patient_metadata") or {}).get("patient_id")

    if not patient_id:
        logger.warning("Case %s: no patient_id in metadata -- skipping PACS lookup", case_id)
        return {"prior_studies": None}

    try:
        payload = await query_prior_studies(patient_id)
    except McpClientError as exc:
        # Not an error entry on state: a missing PACS is an infrastructure
        # gap, not a defect in this case's analysis, and surfacing it in
        # `errors` would make every case look degraded wherever the
        # bridge simply is not deployed.
        logger.warning("Case %s: PACS lookup unavailable for %s -- %s", case_id, patient_id, exc)
        return {"prior_studies": None}
    except Exception as exc:  # noqa: BLE001 - a supplementary lookup must never take down a case
        logger.exception("Case %s: unexpected PACS failure for %s", case_id, patient_id)
        return {"prior_studies": None}

    studies = payload.get("studies") or []
    logger.info(
        "Case %s: PACS returned %d prior study/studies for %s (dataSource=%s)",
        case_id, len(studies), patient_id, payload.get("dataSource"),
    )
    return {"prior_studies": studies}


def _pacs_retrieval_sync(state: AgentState) -> dict:
    """
    Sync bridge for pacs_retrieval_node.

    Everything upstream -- run_case(), resume_case(), and the FastAPI
    handlers, which are deliberately sync so they run in the threadpool
    rather than blocking the event loop -- drives the graph with
    `invoke()`. LangGraph refuses to run a bare `async def` node under
    `invoke()` ("No synchronous function provided"), so this wrapper
    supplies the sync path while the async one above stays the real
    implementation. Registering both (RunnableLambda(..., afunc=...))
    means the graph works under `invoke()` today and `ainvoke()` later
    with no further change.
    """
    try:
        return asyncio.run(pacs_retrieval_node(state))
    except RuntimeError as exc:
        # Only reachable if a caller invokes the SYNC graph from inside a
        # running loop; the correct fix there is ainvoke(), which uses
        # the async implementation directly and never reaches this.
        logger.warning(
            "Case %s: PACS sync bridge cannot run inside an active event loop (%s) -- "
            "use graph.ainvoke() from async callers. Continuing without priors.",
            state.get("case_id", "unknown"), exc,
        )
        return {"prior_studies": None}


# One node, two implementations: sync for invoke(), async for ainvoke().
_PACS_NODE = RunnableLambda(_pacs_retrieval_sync, afunc=pacs_retrieval_node, name="pacs_retrieval")


def human_review_node(state: AgentState) -> Command[Literal["finalize_report", "archive_case"]]:
    """
    Hard Human-in-the-Loop checkpoint (PRD 1, PRD 2.2 "Human Oversight
    Dashboard"). Execution pauses here -- durably, via the checkpointer --
    until a clinician acts in the Streamlit dashboard and the thread is
    resumed with `graph.invoke(Command(resume={...}), config)`.

    Expected resume payload shape (Phase 2 item 3 added the mandatory
    `user` block -- an anonymous resume is no longer accepted):
        {"user": {"user_id": "r.chen", "role": "radiologist"},
         "action": "approve"}
        {"user": {...}, "action": "revise", "edited_text": "<clinician-edited report>"}
        {"user": {...}, "action": "reject", "reason": "<free text>"}

    On an unauthorized attempt this node RE-INTERRUPTS rather than
    raising, re-presenting the same review payload with a `denied`
    explanation attached. That is not a stylistic choice -- it is
    required for correctness. LangGraph persists the resume value
    against the task, so a node that raises after consuming one gets
    replayed with that SAME value on every subsequent invoke: one
    unauthorized attempt would brick the case permanently, and no
    legitimate radiologist could ever approve it afterward. Looping back
    to interrupt() instead leaves the case cleanly paused and resumable
    by anyone properly authorized.

    resume_case() refuses unauthorized decisions before the graph is
    invoked at all, so callers using the documented API get a plain
    AuthorizationError. This node's check is the defense-in-depth layer
    underneath it, covering callers who invoke the compiled graph
    directly -- and it is written so that even those callers cannot
    wedge a case.
    """
    audit = get_audit_logger()
    review_payload = {
        "type": "clinical_review_required",
        "case_id": state["case_id"],
        "patient_metadata": state["patient_metadata"],
        "classification": state["classification"],
        "detections": state["detections"],
        "gradcam_heatmap_path": state["gradcam_heatmap_path"],
        "heatmap_bbox_alignment_score": state["heatmap_bbox_alignment_score"],
        "diagnosis_findings": state["diagnosis_findings"],
        "retrieved_evidence": state["retrieved_evidence"],
        "draft_report": state["draft_report"],
    }

    while True:
        decision = interrupt(review_payload)
        try:
            user = _authorize_review(decision, state["case_id"])
            break
        except (AuthenticationError, AuthorizationError) as exc:
            review_payload = {**review_payload, "denied": str(exc)}

    action = decision.get("action")
    audit.append_event(
        case_id=state["case_id"], event_type="human_review_resumed",
        user_id=user.user_id, notes=f"action={action} role={user.role}",
    )

    if action == "approve":
        return Command(
            update={
                "human_decision": "approved",
                "final_report": state["draft_report"],
                "reviewed_by": user.user_id,
            },
            goto="finalize_report",
        )

    if action == "revise":
        edited = decision.get("edited_text", state["draft_report"])
        return Command(
            update={
                "human_decision": "revised",
                "human_feedback": decision.get("edited_text", ""),
                "final_report": edited,
                "reviewed_by": user.user_id,
            },
            goto="finalize_report",
        )

    # action == "reject" -- authorize_review_action() has already refused
    # anything that isn't one of the three known actions, so this branch
    # is reached only by a genuine, authorized rejection.
    return Command(
        update={
            "human_decision": "rejected",
            "human_feedback": decision.get("reason", ""),
            "reviewed_by": user.user_id,
        },
        goto="archive_case",
    )


def finalize_report_node(state: AgentState) -> dict:
    """Persist the clinician-approved/revised report and emit an audit trail entry."""
    get_audit_logger().append_event(
        case_id=state["case_id"],
        event_type="case_finalized",
        user_id=state.get("reviewed_by"),
        notes=f"decision={state['human_decision']}",
    )
    logger.info("Case %s finalized with decision=%s", state["case_id"], state["human_decision"])
    return {}


def archive_case_node(state: AgentState) -> dict:
    """Clinician rejected the draft outright -- archive for manual radiologist workup."""
    get_audit_logger().append_event(
        case_id=state["case_id"],
        event_type="case_archived",
        user_id=state.get("reviewed_by"),
        notes=state.get("human_feedback") or "decision=rejected",
    )
    logger.warning("Case %s archived (clinician rejected draft)", state["case_id"])
    return {}


# ─────────────────────────────────────────────────────────────────────
# Conditional routing
# ─────────────────────────────────────────────────────────────────────

def route_after_verification(state: AgentState) -> Literal["report_agent", "human_review"]:
    """
    Loop the draft back through report_agent when the Verifier flags a
    *correctable* defect (TRD 3.1, Verification Layer), bounded so a
    stubborn case always reaches a human rather than looping forever.

    Three ways to reach human_review, in precedence order:
      - not flagged at all (passed, or no verdict because there was no
        report to verify),
      - flagged AND escalated -- a defect no rewrite can fix, today
        meaning low vision-model confidence (Phase 2 item 4),
      - flagged, correctable, but the regeneration budget is spent.

    The budget arithmetic: `regeneration_count` counts failures so far,
    and MAX_VERIFICATION_RETRIES counts retries, so after the Nth
    failure the retries already used is N-1. Permitting a retry while
    `count <= MAX_VERIFICATION_RETRIES` therefore yields 1 initial
    attempt + 2 retries = 3 total attempts before escalation.
    """
    if state.get("verification_status") != "flagged":
        return "human_review"
    if state.get("verification_escalated"):
        return "human_review"
    if state.get("regeneration_count", 0) <= MAX_VERIFICATION_RETRIES:
        return "report_agent"
    return "human_review"


# ─────────────────────────────────────────────────────────────────────
# Graph construction
# ─────────────────────────────────────────────────────────────────────

def build_graph(checkpointer=None) -> CompiledStateGraph:
    settings = get_settings()
    builder = StateGraph(AgentState)

    builder.add_node("deidentify", deidentify_node)
    builder.add_node("perceive_image", perceive_image_node)
    builder.add_node("diagnosis_agent", diagnosis_agent_node)
    builder.add_node("evidence_agent", evidence_agent_node)
    builder.add_node("pacs_retrieval", _PACS_NODE)
    builder.add_node("report_agent", report_agent_node)
    builder.add_node("verifier_agent", verifier_agent_node)
    builder.add_node("human_review", human_review_node)
    builder.add_node("finalize_report", finalize_report_node)
    builder.add_node("archive_case", archive_case_node)

    builder.add_edge(START, "deidentify")
    builder.add_edge("deidentify", "perceive_image")
    builder.add_edge("perceive_image", "diagnosis_agent")
    builder.add_edge("diagnosis_agent", "evidence_agent")
    # PACS priors land before drafting so report_agent can reference them.
    builder.add_edge("evidence_agent", "pacs_retrieval")
    builder.add_edge("pacs_retrieval", "report_agent")
    builder.add_edge("report_agent", "verifier_agent")
    builder.add_conditional_edges(
        "verifier_agent",
        route_after_verification,
        {"report_agent": "report_agent", "human_review": "human_review"},
    )
    # human_review routes dynamically via Command(goto=...); no static edge needed.
    builder.add_edge("finalize_report", END)
    builder.add_edge("archive_case", END)

    if checkpointer is None:
        # A checkpointer is *mandatory* here, not optional -- interrupt()
        # cannot suspend/resume a case without persisted state. SQLite is
        # the offline-friendly default; swap for Postgres in multi-replica
        # deployments (see docs/architecture.md).
        #
        # SqliteSaver.from_conn_string() is a @contextmanager (it closes the
        # connection on exit), which doesn't fit here: the checkpointer this
        # function returns needs to stay open for the graph's whole process
        # lifetime, across separate run_case()/resume_case() calls -- so the
        # connection is opened directly instead, matching what that context
        # manager does internally minus the auto-close.
        connection = sqlite3.connect(settings.checkpoint_db_path, check_same_thread=False)
        checkpointer = SqliteSaver(connection)
        checkpointer.setup()

    return builder.compile(checkpointer=checkpointer)


# ─────────────────────────────────────────────────────────────────────
# Public entry points used by the Streamlit dashboard / API layer
# ─────────────────────────────────────────────────────────────────────

def run_case(
    graph: CompiledStateGraph,
    case_id: str,
    image_path: str,
    patient_metadata: PatientMetadata,
    submitted_by: str | None = None,
) -> dict:
    """
    Starts a new case. Runs until the graph either completes or hits the
    human_review interrupt, whichever comes first. Returns the current
    state snapshot; check `__interrupt__` in the returned dict to know
    whether clinician input is now required.

    `submitted_by` is the user_id of whoever submitted the case, for the
    case_started audit event. Optional because a case can legitimately
    be ingested by an automated feed (a PACS watcher) with no human
    submitter -- unlike human_review, submission carries no clinical
    authority, so there is nothing here to authorize.
    """
    get_audit_logger().append_event(
        case_id=case_id, event_type="case_started", user_id=submitted_by
    )

    config = {"configurable": {"thread_id": case_id}}
    initial_state = new_case_state(
        case_id=case_id,
        thread_id=case_id,
        image_path=image_path,
        patient_metadata=patient_metadata,
    )
    return graph.invoke(initial_state, config)


def resume_case(graph: CompiledStateGraph, case_id: str, clinician_decision: dict) -> dict:
    """
    Resumes a case paused at human_review. `clinician_decision` must match
    the payload shape documented on human_review_node -- including the
    mandatory `user` block, without which the resume is refused:
        {"user": {"user_id": "r.chen", "role": "radiologist"}, "action": "approve"}

    Authorization is checked HERE, before the graph is invoked at all, so
    an unauthorized attempt raises AuthenticationError/AuthorizationError
    without the graph ever seeing the payload -- the case is left
    untouched and still resumable by a properly authorized reviewer.
    (human_review_node re-checks independently for callers who bypass
    this function; both paths share _authorize_review(), so there is one
    implementation of the rules and one audit trail for refusals.)
    """
    _authorize_review(clinician_decision, case_id)

    config = {"configurable": {"thread_id": case_id}}
    return graph.invoke(Command(resume=clinician_decision), config)


if __name__ == "__main__":
    import tempfile
    from pathlib import Path

    import numpy as np
    from PIL import Image

    logging.basicConfig(level=logging.INFO)
    demo_graph = build_graph()

    demo_metadata: PatientMetadata = {
        "age": 47,
        "sex": "F",
        "view_position": "PA",
        "patient_id": "DEMO-0001",
    }

    # No real chest X-ray ships with this repo -- generate a throwaway
    # synthetic raster so this smoke test still exercises the full
    # deidentify -> perceive_image -> ... pipeline end-to-end instead of
    # halting at the very first node for lack of a file to read.
    with tempfile.TemporaryDirectory() as tmp_dir:
        sample_path = Path(tmp_dir) / "demo_sample_cxr.png"
        array = (np.random.default_rng(seed=0).random((512, 512)) * 255).astype("uint8")
        Image.fromarray(array, mode="L").save(sample_path)

        result = run_case(
            demo_graph,
            case_id="demo-case-001",
            image_path=str(sample_path),
            patient_metadata=demo_metadata,
            submitted_by="demo.technician",
        )
        print("Paused for clinician review:" if "__interrupt__" in result else "Completed:", result)

        # Demonstrate the Phase 2 item 3 RBAC gate: an admin cannot sign
        # off on a diagnosis, a radiologist can, and the refusal leaves
        # the case open rather than consuming it.
        for demo_user in ({"user_id": "demo.admin", "role": "admin"},
                          {"user_id": "demo.radiologist", "role": "radiologist"}):
            try:
                final = resume_case(
                    demo_graph, "demo-case-001", {"user": demo_user, "action": "approve"}
                )
                print(f"approve as {demo_user['role']}: OK -> {final['human_decision']}")
            except (AuthenticationError, AuthorizationError) as exc:
                print(f"approve as {demo_user['role']}: DENIED -> {exc}")