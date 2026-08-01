"""Unit tests for agents/state.py -- the shared typed graph state schema."""
from __future__ import annotations

import operator
from typing import get_type_hints

from medagent.agents.state import AgentState, new_case_state


def _metadata(**overrides):
    base = {"age": 40, "sex": "F", "view_position": "PA", "patient_id": "P-1"}
    base.update(overrides)
    return base


def test_new_case_state_sets_expected_defaults():
    state = new_case_state(
        case_id="case-1",
        thread_id="case-1",
        image_path="data/raw/sample.png",
        patient_metadata=_metadata(),
    )

    assert state["case_id"] == "case-1"
    assert state["thread_id"] == "case-1"
    assert state["image_path"] == "data/raw/sample.png"
    assert state["classification"] is None
    assert state["detections"] is None
    assert state["gradcam_heatmap_path"] is None
    assert state["heatmap_bbox_alignment_score"] is None
    assert state["diagnosis_findings"] is None
    assert state["retrieved_evidence"] is None
    assert state["verification_status"] == "pending"
    assert state["verification_notes"] is None
    assert state["regeneration_count"] == 0
    assert state["draft_report"] is None
    assert state["human_decision"] is None
    assert state["human_feedback"] is None
    assert state["final_report"] is None
    assert state["errors"] == []


def test_patient_metadata_round_trips_through_new_case_state():
    state = new_case_state(
        case_id="case-2",
        thread_id="case-2",
        image_path="x.png",
        patient_metadata=_metadata(age=65, sex="M", view_position="AP", patient_id="P-2"),
    )
    assert state["patient_metadata"] == {
        "age": 65, "sex": "M", "view_position": "AP", "patient_id": "P-2",
    }


def test_errors_field_uses_operator_add_reducer():
    """LangGraph merges partial node updates to `errors` using whatever
    reducer function is attached to its Annotated[...] metadata -- this is
    what makes multiple nodes' failures accumulate instead of one
    overwriting another (see orchestrator.py's node docstrings). Assert
    the reducer is exactly operator.add, and exercise it the way LangGraph
    would apply it across two nodes' partial updates, rather than
    re-deriving full graph-merge behavior here."""
    hints = get_type_hints(AgentState, include_extras=True)
    errors_hint = hints["errors"]

    assert getattr(errors_hint, "__metadata__", None) == (operator.add,)
    assert operator.add(["diagnosis_agent_node: boom"], ["verifier_agent_node: boom"]) == [
        "diagnosis_agent_node: boom",
        "verifier_agent_node: boom",
    ]


def test_new_case_state_errors_list_is_not_shared_between_calls():
    """Guards against a classic mutable-default-style bug: two cases must
    not accidentally share (and silently corrupt) the same errors list."""
    state_a = new_case_state("a", "a", "img.png", _metadata())
    state_b = new_case_state("b", "b", "img.png", _metadata())

    state_a["errors"].append("only case a's error")

    assert state_a["errors"] == ["only case a's error"]
    assert state_b["errors"] == []
