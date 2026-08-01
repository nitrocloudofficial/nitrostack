"""
Guards on the on-disk prompt templates in agents/prompts/.

These exist because of a real bug found in Phase 2 item 4: report_agent
computed a `correction_notes` value on every regeneration and passed it
to .format(), but report_prompt.txt had no {correction_notes} placeholder
-- so str.format() silently discarded it and every rewrite went back to
the LLM with no idea what the Verifier had rejected. The feedback loop
looked wired end to end and was, in fact, blind.

Nothing about that failure was visible at runtime: no exception, no log
line, just a retry loop that could only converge by luck. A placeholder
silently dropped from a template is invisible in exactly the same way,
so it gets an explicit test.
"""
from __future__ import annotations

from pathlib import Path

import pytest

PROMPTS_DIR = Path(__file__).resolve().parents[2] / "src" / "medagent" / "agents" / "prompts"


def _read(name: str) -> str:
    path = PROMPTS_DIR / name
    assert path.exists(), f"missing prompt template: {path}"
    return path.read_text(encoding="utf-8")


def test_report_prompt_consumes_the_verifier_correction_notes():
    """The regeneration loop's entire purpose: report_agent must be able
    to tell the LLM what the Verifier rejected."""
    assert "{correction_notes}" in _read("report_prompt.txt")


@pytest.mark.parametrize(
    "placeholder",
    ["{patient_metadata}", "{diagnosis_findings}", "{retrieved_evidence}", "{prior_studies}"]
)
def test_report_prompt_consumes_its_other_required_inputs(placeholder):
    assert placeholder in _read("report_prompt.txt")


def test_report_prompt_formats_with_exactly_what_report_agent_supplies():
    """str.format() raises KeyError on a placeholder the caller does not
    supply, so this catches a template that references something
    report_agent_node never passes -- the inverse of the dropped-
    placeholder bug, and a hard crash rather than a silent one."""
    supplied = {
        "finding_label": "x", "anatomical_region": "x", "severity": "high",
        "clinical_reasoning": "x", "detections": "x", "retrieved_evidence": "x",
        "patient_metadata": "x", "correction_notes": "x", "diagnosis_findings": "x",
        "prior_studies": "x",
        "case_id": "x",
    }
    _read("report_prompt.txt").format(**supplied)  # must not raise
