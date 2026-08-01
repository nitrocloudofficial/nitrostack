"""
Unit tests for agents/verification_checks.py (Phase 2, item 4: the
deterministic half of the Verifier firewall).

These are the tests that matter most for this module's purpose: every
function here is pure, so each check can be pinned down exactly, with no
LLM and no model server involved.
"""
from __future__ import annotations

import pytest

from medagent.agents.verification_checks import (
    MIN_VISION_CONFIDENCE,
    CorrectionPrompt,
    available_citation_indices,
    check_citation_grounding,
    check_region_box_consistency,
    check_schema_compliance,
    find_abnormality_mentions,
    is_low_confidence,
    run_deterministic_checks,
)

VALID_FINDINGS = {
    "finding_label": "Right lower lobe consolidation",
    "anatomical_region": "right lower lobe",
    "severity": "high",
    "clinical_reasoning": "Dense consolidation with air bronchograms.",
}
BOX = {"label": "lung_opacity", "x_min": 0.3, "y_min": 0.4, "x_max": 0.5, "y_max": 0.6, "score": 0.8}
NORMAL = {"predicted_class": "Normal", "class_probabilities": {}, "calibrated_confidence": 0.95}
ABNORMAL = {"predicted_class": "Lung Opacity", "class_probabilities": {}, "calibrated_confidence": 0.93}
EVIDENCE = (
    "[1] Source: ATS/IDSA\nEmpiric antibiotic therapy...\n\n"
    "[2] Source: ATS/IDSA\nSeverity assessment via CURB-65..."
)


# ── Low-confidence abstention (requirement 1) ───────────────────────

@pytest.mark.parametrize("confidence", [0.0, 0.1, 0.42, 0.599])
def test_confidence_below_threshold_is_low(confidence):
    assert is_low_confidence({"calibrated_confidence": confidence})


@pytest.mark.parametrize("confidence", [0.60, 0.61, 0.9, 1.0])
def test_confidence_at_or_above_threshold_is_not_low(confidence):
    """The threshold is inclusive -- exactly 0.60 passes."""
    assert not is_low_confidence({"calibrated_confidence": confidence})


def test_threshold_is_the_documented_value():
    assert MIN_VISION_CONFIDENCE == 0.60


@pytest.mark.parametrize(
    "classification",
    [None, {}, "not a dict", {"calibrated_confidence": None}, {"calibrated_confidence": "0.9"},
     {"calibrated_confidence": True}],
)
def test_missing_or_malformed_confidence_counts_as_low(classification):
    """"We could not establish confidence" and "confidence was too low"
    mean the same thing to a gate deciding whether to trust downstream
    reasoning. Note bool is rejected too -- True would otherwise pass as
    1.0 through a naive numeric check."""
    assert is_low_confidence(classification)


# ── Schema compliance (requirement 2a) ──────────────────────────────

def test_valid_findings_pass_schema_check():
    assert check_schema_compliance(VALID_FINDINGS).passed


@pytest.mark.parametrize("missing", ["finding_label", "anatomical_region", "severity", "clinical_reasoning"])
def test_missing_required_field_fails_schema_check(missing):
    findings = {k: v for k, v in VALID_FINDINGS.items() if k != missing}
    outcome = check_schema_compliance(findings)
    assert not outcome.passed
    assert missing in outcome.reason


@pytest.mark.parametrize("severity", ["critical", "HIGH", "urgent", "", None, 3])
def test_severity_outside_the_enum_fails_schema_check(severity):
    outcome = check_schema_compliance({**VALID_FINDINGS, "severity": severity})
    assert not outcome.passed
    assert "severity" in outcome.reason


@pytest.mark.parametrize("findings", [None, "a string", ["a", "list"], 42])
def test_non_dict_findings_fail_schema_check(findings):
    outcome = check_schema_compliance(findings)
    assert not outcome.passed
    assert "DiagnosisOutput" in outcome.reason


# ── Negation-aware text analysis ────────────────────────────────────

def test_affirmed_abnormality_is_detected():
    affirmed, _ = find_abnormality_mentions("FINDINGS: Focal consolidation in the right lower lobe.")
    assert "consolidation" in affirmed


@pytest.mark.parametrize(
    "text",
    [
        "No focal consolidation.",
        "There is no consolidation identified.",
        "Negative for consolidation.",
        "Without consolidation.",
        "The lungs are free of consolidation.",
        "Consolidation has been ruled out.",
    ],
)
def test_negated_abnormalities_are_not_read_as_claims(text):
    """The false-positive case that would otherwise loop the report agent
    pointlessly: a clean study explicitly stating what is absent."""
    affirmed, negated = find_abnormality_mentions(text)
    assert affirmed == []
    assert "consolidation" in negated


@pytest.mark.parametrize(
    "text",
    [
        "Consolidation has been ruled out.",
        "Consolidation is absent.",
        "Consolidation is not identified.",
        "Consolidation was excluded.",
        "Consolidation is not visualized on this study.",
    ],
)
def test_postposed_negation_is_detected(text):
    """Radiology prose negates after the noun at least as often as
    before it; scanning only backwards would read all of these as
    positive findings."""
    affirmed, negated = find_abnormality_mentions(text)
    assert affirmed == []
    assert "consolidation" in negated


def test_postposed_negation_does_not_reach_back_past_another_finding():
    """In "consolidation is present, effusion is absent" the trailing
    "is absent" belongs to the effusion, not the consolidation."""
    affirmed, negated = find_abnormality_mentions("Consolidation is present, effusion is absent.")
    assert "consolidation" in affirmed
    assert "effusion" in negated


def test_negation_scope_extends_across_a_list():
    affirmed, negated = find_abnormality_mentions("No consolidation, effusion, or pneumothorax.")
    assert affirmed == []
    assert set(negated) == {"consolidation", "effusion", "pneumothorax"}


def test_contrastive_conjunction_resets_negation_scope():
    """"no effusion but there is consolidation" asserts consolidation."""
    affirmed, negated = find_abnormality_mentions("No effusion but there is consolidation.")
    assert "consolidation" in affirmed
    assert "effusion" in negated


def test_negation_does_not_leak_across_sentences():
    affirmed, negated = find_abnormality_mentions("No effusion. Focal opacity in the left base.")
    assert "opacity" in affirmed
    assert "effusion" in negated


# ── Region-vs-box consistency (requirement 2b) ──────────────────────

def test_boxes_present_and_report_describes_abnormality_passes():
    assert check_region_box_consistency(
        ABNORMAL, [BOX], "FINDINGS: Consolidation in the right lower lobe."
    ).passed


def test_boxes_present_but_report_reads_as_normal_fails():
    """The detector is pointing at something the prose ignores."""
    outcome = check_region_box_consistency(
        ABNORMAL, [BOX, BOX], "FINDINGS: No acute abnormality. The lungs are clear."
    )
    assert not outcome.passed
    assert "localized 2 abnormality region(s)" in outcome.reason


def test_no_boxes_and_normal_classification_with_clean_report_passes():
    assert check_region_box_consistency(
        NORMAL, [], "FINDINGS: No focal consolidation or effusion. IMPRESSION: Normal study."
    ).passed


def test_no_boxes_and_normal_classification_but_report_invents_a_finding_fails():
    """The hallucination case: prose inventing an opacity that no part of
    the perception layer reported."""
    outcome = check_region_box_consistency(
        NORMAL, [], "FINDINGS: Focal opacity in the left upper lobe."
    )
    assert not outcome.passed
    assert "opacity" in outcome.reason


def test_no_boxes_but_abnormal_classification_does_not_forbid_findings():
    """A classifier can legitimately see diffuse disease the box
    detector cannot localize -- that is not a hallucination, so prose
    describing it must not be flagged."""
    assert check_region_box_consistency(
        ABNORMAL, [], "FINDINGS: Diffuse interstitial opacities bilaterally."
    ).passed


# ── Citation grounding (requirement 3) ──────────────────────────────

def test_grounded_citations_pass():
    assert check_citation_grounding("Antibiotics indicated [1]. Severity per [2].", EVIDENCE).passed


def test_hallucinated_citation_fails():
    outcome = check_citation_grounding("Start antibiotics [3].", EVIDENCE)
    assert not outcome.passed
    assert "[3]" in outcome.reason


def test_report_with_no_citations_passes():
    """Not citing is allowed; citing something that does not exist is not."""
    assert check_citation_grounding("FINDINGS: Consolidation in the RLL.", EVIDENCE).passed


def test_any_citation_fails_when_no_evidence_was_retrieved():
    outcome = check_citation_grounding(
        "Per guidelines [1].", "No matching ATS/IDSA guideline evidence found for 'Pneumonia'."
    )
    assert not outcome.passed
    assert "no guidelines were retrieved" in outcome.reason


def test_mixed_grounded_and_ungrounded_reports_only_the_ungrounded():
    outcome = check_citation_grounding("Both [1] and [7] apply.", EVIDENCE)
    assert not outcome.passed
    assert "[7]" in outcome.reason
    assert "[1]" in outcome.reason  # listed as available, not as ungrounded
    assert outcome.reason.index("[7]") < outcome.reason.index("available")


def test_available_indices_prefer_the_anchored_source_form():
    """Bracketed numbers inside guideline prose must not count as
    citation slots -- treating them as available would make ungrounded
    citations look grounded."""
    evidence = "[1] Source: ATS/IDSA\nSee table [99] for dosing details."
    assert available_citation_indices(evidence) == {1}


def test_available_indices_fall_back_when_evidence_is_formatted_differently():
    assert available_citation_indices("[1] some guideline\n[2] another guideline") == {1, 2}


# ── Aggregation and the correction prompt (requirement 4) ───────────

def test_run_deterministic_checks_reports_every_failure_at_once():
    """One regeneration cycle should be able to fix everything wrong --
    there are only two retries available."""
    state = {
        "diagnosis_findings": {**VALID_FINDINGS, "severity": "critical"},
        "classification": NORMAL,
        "detections": [],
        "draft_report": "FINDINGS: Focal opacity in the left base [4].",
        "retrieved_evidence": EVIDENCE,
    }
    failed = [outcome for outcome in run_deterministic_checks(state) if not outcome.passed]
    assert {outcome.check for outcome in failed} == {
        "schema_compliance", "region_box_consistency", "citation_grounding",
    }


def test_run_deterministic_checks_passes_a_clean_state():
    state = {
        "diagnosis_findings": VALID_FINDINGS,
        "classification": ABNORMAL,
        "detections": [BOX],
        "draft_report": "FINDINGS: Consolidation in the right lower lobe [1].",
        "retrieved_evidence": EVIDENCE,
    }
    assert all(outcome.passed for outcome in run_deterministic_checks(state))


def test_correction_prompt_contains_every_exact_error_string():
    correction = CorrectionPrompt(failures=["first problem", "second problem"])
    note = correction.to_note()
    assert "first problem" in note
    assert "second problem" in note
    assert "2 issue(s)" in note
