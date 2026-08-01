"""
Verifier Agent -- Verification Layer (TRD 3.1), hardened into a
deterministic safety firewall in Phase 2 item 4
(Strategic_Startup_Roadmap.pdf).

Runs after the Report Agent, in three stages, cheapest and most
authoritative first:

  1. Low-confidence abstention. If the vision layer's calibrated
     confidence is below MIN_VISION_CONFIDENCE, nothing downstream of it
     is worth checking -- the case is flagged and escalated straight to
     human review, bypassing every remaining stage. Crucially this does
     NOT enter the regeneration loop: rewriting the prose cannot raise
     the confidence of a model that already ran.

  2. Deterministic checks (verification_checks.py). Pure Python:
     schema compliance, report-vs-detector consistency, and citation
     grounding. A failure here is authoritative and short-circuits the
     LLM stage -- there is no point asking a language model for a second
     opinion on a fact that has already been settled arithmetically, and
     it lets the firewall work even with no model server reachable.

  3. LLM semantic review. Only reached once the deterministic checks
     pass. Catches the contradictions that need reading comprehension
     rather than arithmetic, and remains the fallible layer -- which is
     precisely why it is last rather than only.

Stages 1 and 2 are why this file is a firewall rather than a reviewer:
they cannot hallucinate a pass.
"""
from __future__ import annotations

import logging
import json
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, Field

from medagent.agents.state import AgentState
from medagent.agents.verification_checks import (
    LOW_CONFIDENCE_NOTE,
    CorrectionPrompt,
    is_low_confidence,
    run_deterministic_checks,
)
from medagent.llm.loader import get_llm

logger = logging.getLogger("medagent.agents.verifier")

# Regeneration budget. This counts RETRIES, so the report agent gets at
# most 1 + MAX_VERIFICATION_RETRIES = 3 attempts before the case is
# escalated to a human -- matching the roadmap's "if it fails 3 times,
# set status to flagged and route to human_review".
MAX_VERIFICATION_RETRIES = 2

_PROMPT_PATH = Path(__file__).parent / "prompts" / "verifier_prompt.txt"

_FALLBACK_PROMPT = """\
You are an expert AI clinical quality assurance verifier. 
Your job is to check if the drafted clinical report contradicts the diagnosis findings or the retrieved medical evidence.
If the draft report adds fabricated information (e.g., wrong anatomy, incorrect severity, or hallucinated evidence), you MUST flag it.
If the report is entirely consistent with the facts provided, you must pass it.

FINDING LABEL: {finding_label}
SEVERITY: {severity}
REASONING: {clinical_reasoning}
EVIDENCE: {retrieved_evidence}

DRAFT REPORT TO VERIFY:
{draft_report}

RESPOND ONLY WITH VALID JSON. The JSON must contain exactly two keys:
"status": either "passed" or "flagged"
"notes": a string explaining the specific issues if flagged, or an empty string if passed.
"""

class VerificationResult(BaseModel):
    """Structured verdict the LLM is constrained to return."""
    status: Literal["passed", "flagged"] = Field(
        ...,
        description="'passed' if the draft report is fully consistent... 'flagged' if it contains any contradiction."
    )
    notes: str = Field(
        ...,
        description="Specific issue(s) found if flagged; empty string if passed.",
    )


def verifier_agent_node(state: AgentState) -> dict:
    """
    LangGraph node: Verifier Agent. See this module's docstring for the
    three-stage design and why the deterministic stages run first.
    """
    case_id = state.get("case_id", "unknown")
    current_count = state.get("regeneration_count") or 0

    # Nothing to verify. report_agent_node failed upstream (its error is
    # already on state["errors"]), so this returns without a verdict --
    # verification_status stays "pending" and route_after_verification
    # sends the case to a human, which is the correct destination for a
    # case that has no report at all. Deliberately adds no error of its
    # own: the real failure is already recorded, and duplicating it here
    # would just obscure the root cause.
    if not (state.get("draft_report") or "").strip():
        logger.warning("Case %s: no draft report to verify -- deferring to human review", case_id)
        return {}

    # ── Stage 1: low-confidence abstention ───────────────────────────
    if is_low_confidence(state.get("classification")):
        confidence = (state.get("classification") or {}).get("calibrated_confidence")
        logger.warning(
            "Case %s: vision confidence %s below threshold -- escalating without further checks",
            case_id, confidence,
        )
        return {
            "verification_status": "flagged",
            "verification_notes": LOW_CONFIDENCE_NOTE,
            # Escalate straight to a human rather than entering the
            # regeneration loop: no rewrite of the prose can change what
            # the vision model already scored.
            "verification_escalated": True,
            "regeneration_count": current_count,
        }

    # ── Stage 2: deterministic checks ────────────────────────────────
    failures = [outcome for outcome in run_deterministic_checks(state) if not outcome.passed]
    if failures:
        correction = CorrectionPrompt(failures=[outcome.reason for outcome in failures])
        new_count = current_count + 1
        logger.warning(
            "Case %s failed %d deterministic check(s) on attempt %d: %s",
            case_id, len(failures), new_count, [outcome.check for outcome in failures],
        )
        return {
            "verification_status": "flagged",
            "verification_notes": correction.to_note(),
            "regeneration_count": new_count,
        }

    # ── Stage 3: LLM semantic review ─────────────────────────────────
    try:
        findings = state.get("diagnosis_findings") or {}

        if _PROMPT_PATH.exists():
            prompt_template = _PROMPT_PATH.read_text()
            if "JSON" not in prompt_template:
                prompt_template += "\n\nRESPOND ONLY WITH VALID JSON containing exactly two keys: 'status' and 'notes'."
        else:
            logger.warning("verifier_prompt.txt not found. Using fallback prompt.")
            prompt_template = _FALLBACK_PROMPT

        format_args = {
            "finding_label": findings.get("finding_label", "Undetermined"),
            "severity": findings.get("severity", "high"),
            "clinical_reasoning": findings.get("clinical_reasoning", ""),
            "retrieved_evidence": state.get("retrieved_evidence") or "No evidence retrieved.",
            "draft_report": state.get("draft_report") or "",
            "diagnosis_findings": json.dumps(findings, indent=2),
            "case_id": case_id
        }

        # Bypass .format() completely
        prompt = prompt_template
        for key, value in format_args.items():
            prompt = prompt.replace("{" + key + "}", str(value))

        # format="json" is an override on top of get_llm()'s configured
        # model/temperature -- Ollama's structured-JSON decoding mode,
        # needed here since this node parses the response as JSON below.
        llm = get_llm("verifier_agent", format="json")

        response = llm.invoke(prompt)
        
        content = response.content.strip()
        if content.startswith("```json"):
            content = content[7:]
        if content.startswith("```"):
            content = content[3:]
        if content.endswith("```"):
            content = content[:-3]
            
        parsed_data = json.loads(content.strip())
        
        # --- THE FIX: CLEANUP AI OUTPUT VARIATIONS ---
        # 1. Rename verification_status to status
        if "verification_status" in parsed_data:
            parsed_data["status"] = parsed_data.pop("verification_status")
            
        # 2. Force status to lowercase
        if "status" in parsed_data and isinstance(parsed_data["status"], str):
            parsed_data["status"] = parsed_data["status"].lower()
        
        # 3. Rename reason to notes
        if "reason" in parsed_data and "notes" not in parsed_data:
            parsed_data["notes"] = parsed_data.pop("reason")
            
        result = VerificationResult(**parsed_data)

        new_count = current_count + 1 if result.status == "flagged" else current_count

        if result.status == "flagged":
            logger.warning(
                "Case %s flagged by verifier (attempt %d): %s", case_id, new_count, result.notes
            )
        else:
            logger.info("Case %s: verifier passed", case_id)

        return {
            "verification_status": result.status,
            "verification_notes": result.notes,
            "regeneration_count": new_count,
        }

    except Exception as exc:  # noqa: BLE001
        logger.exception("verifier_agent_node failed for case=%s", case_id)
        return {"errors": [f"verifier_agent_node: {type(exc).__name__}: {exc}"]}


# ─────────────────────────────────────────────────────────────────────
# Standalone Execution / Testing Block
# ─────────────────────────────────────────────────────────────────────
if __name__ == "__main__":

    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")

    _BASE_FINDINGS = {
        "finding_label": "Pneumonia",
        "anatomical_region": "right lower lobe",
        "severity": "high",
        "clinical_reasoning": "Consolidation detected.",
    }
    _EVIDENCE = "[1] Source: ATS/IDSA\nEmpiric antibiotic therapy for community-acquired pneumonia..."
    _CONFIDENT = {"predicted_class": "Lung Opacity", "class_probabilities": {}, "calibrated_confidence": 0.94}
    _BOX = [{"label": "lung_opacity", "x_min": 0.3, "y_min": 0.4, "x_max": 0.5, "y_max": 0.6, "score": 0.8}]

    # Each scenario isolates one stage of the firewall. Only the last
    # reaches the LLM, so the first three run with no model server.
    scenarios = [
        ("Low vision confidence -> abstain and escalate", {
            "classification": {**_CONFIDENT, "calibrated_confidence": 0.41},
            "detections": _BOX,
            "draft_report": "FINDINGS: Focal consolidation in the right lower lobe.",
        }),
        ("Hallucinated citation [3] -> ungrounded", {
            "classification": _CONFIDENT, "detections": _BOX,
            "draft_report": "FINDINGS: Consolidation in the right lower lobe [1]. Start antibiotics [3].",
        }),
        ("Prose invents a finding the vision layer never saw", {
            "classification": {**_CONFIDENT, "predicted_class": "Normal"}, "detections": [],
            "draft_report": "FINDINGS: Focal opacity in the left upper lobe.",
        }),
        ("Clean draft -> falls through to the LLM stage", {
            "classification": _CONFIDENT, "detections": _BOX,
            "draft_report": "FINDINGS: Consolidation in the right lower lobe [1]. IMPRESSION: Pneumonia.",
        }),
    ]

    for title, overrides in scenarios:
        mock_state: AgentState = {
            "case_id": "TEST-VERIFIER-001",
            "diagnosis_findings": _BASE_FINDINGS,
            "retrieved_evidence": _EVIDENCE,
            "regeneration_count": 0,
            "errors": [],
            **overrides,
        }
        print(f"\n=== {title} ===")
        print(json.dumps(verifier_agent_node(mock_state), indent=2))