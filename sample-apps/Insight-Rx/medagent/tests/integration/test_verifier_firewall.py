"""
Integration tests for Phase 2, item 4 -- the Verifier firewall driving
the real LangGraph regeneration loop.

This is item 4's requirement 5: mock the Report Agent's LLM into
hallucinating an ungrounded citation and prove the Verifier catches it,
routes back for a rewrite, and increments the retry counter -- then
prove the loop terminates at a human instead of spinning forever.

The vision layer is stubbed here (it has its own coverage in
test_orchestrator_graph.py) so these tests are fast, deterministic, and
about one thing: the verify -> correct -> re-verify control flow.
"""
from __future__ import annotations

import sqlite3
import uuid
from pathlib import Path

import numpy as np
import pytest
from langgraph.checkpoint.sqlite import SqliteSaver
from PIL import Image

import medagent.agents.report_agent as report_agent_module
import medagent.agents.verifier_agent as verifier_agent_module
from medagent.agents.orchestrator import build_graph, run_case
from medagent.agents.state import PatientMetadata
from medagent.agents.verifier_agent import MAX_VERIFICATION_RETRIES
from medagent.privacy.deidentify import DEFAULT_CACHE_DIR

# The sample guideline index yields citations [1]..[3], so [9] is
# reliably ungrounded no matter which chunks the retriever returns.
HALLUCINATED_REPORT = (
    "FINDINGS: Focal consolidation in the right lower lobe.\n"
    "IMPRESSION: Community-acquired pneumonia.\n"
    "EVIDENCE: Empiric antibiotic therapy is indicated [9]."
)
GROUNDED_REPORT = (
    "FINDINGS: Focal consolidation in the right lower lobe.\n"
    "IMPRESSION: Community-acquired pneumonia.\n"
    "EVIDENCE: Empiric antibiotic therapy is indicated [1]."
)


class _FakeResponse:
    def __init__(self, content: str):
        self.content = content


class _ScriptedLLM:
    """Returns each scripted response in turn, repeating the last one
    once the script runs out, and counts how many times it was called --
    which is how these tests observe that a regeneration actually
    happened."""

    def __init__(self, *responses: str):
        self.responses = list(responses)
        self.call_count = 0

    def invoke(self, _prompt):
        index = min(self.call_count, len(self.responses) - 1)
        self.call_count += 1
        return _FakeResponse(self.responses[index])


@pytest.fixture(autouse=True)
def _cleanup_dicom_cache():
    yield
    cache_dir = Path(DEFAULT_CACHE_DIR)
    if cache_dir.is_dir():
        for artifact in cache_dir.glob("verifier-test-*"):
            artifact.unlink()


@pytest.fixture
def stub_perception(monkeypatch):
    """Replaces the vision layer with a confident abnormal reading:
    high calibrated confidence plus one localized box, so the
    low-confidence gate stays open and the report is expected to
    describe a finding."""
    def _stub(image_path, metadata):
        return {
            "classification": {
                "predicted_class": "Lung Opacity",
                "class_probabilities": {"Lung Opacity": 0.93},
                "calibrated_confidence": 0.93,
            },
            "detections": [
                {"label": "lung_opacity", "x_min": 0.3, "y_min": 0.4,
                 "x_max": 0.5, "y_max": 0.6, "score": 0.81}
            ],
            "gradcam_heatmap_path": "data/processed/gradcam/stub.png",
            "heatmap_bbox_alignment_score": 0.72,
        }

    monkeypatch.setattr("medagent.agents.orchestrator.run_perception", _stub)


@pytest.fixture
def sample_image_path(tmp_path) -> str:
    path = tmp_path / "sample_cxr.png"
    Image.fromarray(
        (np.random.default_rng(0).random((256, 256)) * 255).astype("uint8"), mode="L"
    ).save(path)
    return str(path)


@pytest.fixture
def isolated_graph(tmp_path):
    connection = sqlite3.connect(str(tmp_path / "checkpoints.db"), check_same_thread=False)
    checkpointer = SqliteSaver(connection)
    checkpointer.setup()
    return build_graph(checkpointer=checkpointer)


def _run(graph, image_path):
    metadata: PatientMetadata = {
        "age": 58, "sex": "M", "view_position": "PA", "patient_id": "VERIFIER-TEST-001",
    }
    return graph.invoke(
        {
            "case_id": (case_id := f"verifier-test-{uuid.uuid4().hex[:8]}"),
            "thread_id": case_id, "image_path": image_path, "patient_metadata": metadata,
            "classification": None, "detections": None, "gradcam_heatmap_path": None,
            "heatmap_bbox_alignment_score": None, "diagnosis_findings": None,
            "retrieved_evidence": None, "verification_status": "pending",
            "verification_notes": None, "regeneration_count": 0, "verification_escalated": False,
            "draft_report": None, "human_decision": None, "human_feedback": None,
            "final_report": None, "reviewed_by": None, "errors": [],
        },
        {"configurable": {"thread_id": case_id}},
    )


# ── The headline requirement ────────────────────────────────────────

def test_hallucinated_citation_is_caught_and_triggers_a_retry(
    isolated_graph, sample_image_path, stub_perception, monkeypatch
):
    """The Report Agent invents a citation that was never retrieved. The
    Verifier must catch it deterministically -- no LLM opinion involved
    -- and send the case back for a rewrite."""
    report_llm = _ScriptedLLM(HALLUCINATED_REPORT, GROUNDED_REPORT)
    verifier_llm = _ScriptedLLM('{"status": "passed", "notes": ""}')
    monkeypatch.setattr(report_agent_module, "get_llm", lambda *a, **k: report_llm)
    monkeypatch.setattr(verifier_agent_module, "get_llm", lambda *a, **k: verifier_llm)

    result = _run(isolated_graph, sample_image_path)

    # The report agent ran twice: the hallucinated draft, then the fix.
    assert report_llm.call_count == 2, "expected exactly one regeneration"
    assert result["regeneration_count"] == 1
    assert result["draft_report"] == GROUNDED_REPORT
    assert result["verification_status"] == "passed"
    assert "__interrupt__" in result


def test_the_correction_prompt_names_the_ungrounded_citation(
    isolated_graph, sample_image_path, stub_perception, monkeypatch
):
    """The Report Agent can only fix what it is told about, so the
    correction text must identify the offending citation exactly."""
    notes_seen: list[str] = []

    class _CapturingLLM(_ScriptedLLM):
        def invoke(self, prompt):
            notes_seen.append(prompt)
            return super().invoke(prompt)

    report_llm = _CapturingLLM(HALLUCINATED_REPORT, GROUNDED_REPORT)
    monkeypatch.setattr(report_agent_module, "get_llm", lambda *a, **k: report_llm)
    monkeypatch.setattr(
        verifier_agent_module, "get_llm",
        lambda *a, **k: _ScriptedLLM('{"status": "passed", "notes": ""}'),
    )

    _run(isolated_graph, sample_image_path)

    regeneration_prompt = notes_seen[1]
    assert "[9]" in regeneration_prompt
    assert "failed deterministic verification" in regeneration_prompt


def test_a_persistently_hallucinating_report_escalates_instead_of_looping(
    isolated_graph, sample_image_path, stub_perception, monkeypatch
):
    """The loop must terminate. With a report agent that never corrects
    itself, the case gets 1 initial attempt + MAX_VERIFICATION_RETRIES
    rewrites, then goes to a human still flagged."""
    report_llm = _ScriptedLLM(HALLUCINATED_REPORT)  # never corrects
    monkeypatch.setattr(report_agent_module, "get_llm", lambda *a, **k: report_llm)
    monkeypatch.setattr(
        verifier_agent_module, "get_llm",
        lambda *a, **k: _ScriptedLLM('{"status": "passed", "notes": ""}'),
    )

    result = _run(isolated_graph, sample_image_path)

    assert report_llm.call_count == 1 + MAX_VERIFICATION_RETRIES == 3
    assert result["regeneration_count"] == 3
    assert result["verification_status"] == "flagged"
    assert "[9]" in result["verification_notes"]
    assert "__interrupt__" in result, "an unfixable case must still reach a human"


def test_a_grounded_report_passes_without_any_regeneration(
    isolated_graph, sample_image_path, stub_perception, monkeypatch
):
    report_llm = _ScriptedLLM(GROUNDED_REPORT)
    monkeypatch.setattr(report_agent_module, "get_llm", lambda *a, **k: report_llm)
    monkeypatch.setattr(
        verifier_agent_module, "get_llm",
        lambda *a, **k: _ScriptedLLM('{"status": "passed", "notes": ""}'),
    )

    result = _run(isolated_graph, sample_image_path)

    assert report_llm.call_count == 1
    assert result["regeneration_count"] == 0
    assert result["verification_status"] == "passed"


# ── Low-confidence abstention through the graph ─────────────────────

def test_low_vision_confidence_escalates_without_entering_the_retry_loop(
    isolated_graph, sample_image_path, monkeypatch
):
    """Rewriting prose cannot raise the confidence of a model that has
    already run, so this must go straight to a human rather than burning
    regeneration attempts -- and must not even reach the other checks,
    despite this draft also carrying a hallucinated citation."""
    def _low_confidence(image_path, metadata):
        return {
            "classification": {
                "predicted_class": "Lung Opacity",
                "class_probabilities": {"Lung Opacity": 0.44},
                "calibrated_confidence": 0.44,
            },
            "detections": [],
            "gradcam_heatmap_path": None,
            "heatmap_bbox_alignment_score": 0.0,
        }

    monkeypatch.setattr("medagent.agents.orchestrator.run_perception", _low_confidence)
    report_llm = _ScriptedLLM(HALLUCINATED_REPORT)
    monkeypatch.setattr(report_agent_module, "get_llm", lambda *a, **k: report_llm)

    verifier_llm = _ScriptedLLM('{"status": "passed", "notes": ""}')
    monkeypatch.setattr(verifier_agent_module, "get_llm", lambda *a, **k: verifier_llm)

    result = _run(isolated_graph, sample_image_path)

    assert result["verification_status"] == "flagged"
    assert result["verification_escalated"] is True
    assert result["verification_notes"] == "Escalated: Low vision model confidence."
    assert result["regeneration_count"] == 0, "abstention must not consume the retry budget"
    assert report_llm.call_count == 1, "no rewrite should have been attempted"
    assert verifier_llm.call_count == 0, "the LLM stage must be bypassed entirely"
    assert "__interrupt__" in result
