"""
Report Agent -- drafts the structured clinical report that the
clinician ultimately sees in the Human Oversight Dashboard (PRD 2.2).

Runs after the Evidence Agent. Reads patient metadata, the Diagnosis
Agent's structured finding, and the Evidence Agent's pre-formatted
guideline text, and asks a local Ollama-served LLM to draft a
FINDINGS/IMPRESSION/EVIDENCE/SEVERITY report from them.
"""
from __future__ import annotations

import logging
import json
from pathlib import Path

from medagent.agents.state import AgentState
from medagent.llm.loader import get_llm
from medagent.security.audit_logger import get_audit_logger

logger = logging.getLogger("medagent.agents.report")

_PROMPT_PATH = Path(__file__).parent / "prompts" / "report_prompt.txt"

# Fallback prompt in case the text file doesn't exist yet
_FALLBACK_PROMPT = """\
You are an expert AI medical assistant drafting a structured clinical report.
Review the provided data and draft a clear, concise report with the following sections: 
FINDINGS, IMPRESSION, EVIDENCE, and SEVERITY.

PATIENT METADATA: {patient_metadata}
DETECTIONS: {detections}
FINDING LABEL: {finding_label}
ANATOMICAL REGION: {anatomical_region}
SEVERITY: {severity}
REASONING: {clinical_reasoning}
RETRIEVED EVIDENCE: {retrieved_evidence}
PRIOR IMAGING: {prior_studies}
CORRECTION NOTES: {correction_notes}

Report Draft:"""


def report_agent_node(state: AgentState) -> dict:
    """
    LangGraph node: Report Agent.

    Reads `patient_metadata`, `diagnosis_findings`, `detections`, and
    `retrieved_evidence` off the shared graph state (plus
    `verification_notes` on a regeneration loop back from
    verifier_agent), drafts a structured clinical report via a local
    Ollama LLM, and returns a partial state update.
    """
    case_id = state.get("case_id", "unknown")

    try:
        findings = state.get("diagnosis_findings") or {}

        correction_notes = (
            state.get("verification_notes")
            if state.get("verification_status") == "flagged"
            else "None -- first draft."
        )

        # Fail-safe: Use text file if it exists, otherwise use fallback string
        if _PROMPT_PATH.exists():
            prompt_template = _PROMPT_PATH.read_text()
        else:
            logger.warning("report_prompt.txt not found. Using fallback prompt.")
            prompt_template = _FALLBACK_PROMPT

        # Prior imaging from the PACS bridge (Phase 3 item 2). Rendered as
        # compact lines rather than raw JSON so the model reads it as
        # history. The SIMULATED marker is carried through verbatim: a
        # model drafting comparative language ("unchanged from the prior
        # study") off fabricated priors would put that claim in front of a
        # clinician, so the prompt states plainly what the priors are.
        prior_studies = state.get("prior_studies")
        if prior_studies:
            lines = "\n".join(
                f"- {study.get('studyDate', 'unknown date')} "
                f"{study.get('modality', '?')}/{study.get('viewPosition', '?')}: "
                f"{study.get('reportImpression', 'no impression recorded')}"
                for study in prior_studies
            )
            if any(study.get("simulated") for study in prior_studies):
                prior_studies_text = (
                    "*** SIMULATED PRIOR STUDIES -- stand-in records from a test PACS, NOT this "
                    "patient's real history. Do not state or imply comparison against a real prior "
                    "study in the report. ***\n" + lines
                )
            else:
                prior_studies_text = lines
        elif prior_studies is None:
            prior_studies_text = "Prior imaging unavailable (PACS not reachable)."
        else:
            prior_studies_text = "No prior studies on file for this patient."

        # We pass EVERYTHING the text file might ask for to avoid KeyErrors
        prompt = prompt_template.format(
            prior_studies=prior_studies_text,
            finding_label=findings.get("finding_label", "Undetermined"),
            anatomical_region=findings.get("anatomical_region", "unknown"),
            severity=findings.get("severity", "high"),
            clinical_reasoning=findings.get("clinical_reasoning", ""),
            detections=state.get("detections", "None provided."),
            retrieved_evidence=state.get("retrieved_evidence") or "No evidence retrieved.",
            patient_metadata=state.get("patient_metadata", "Unknown"),
            correction_notes=correction_notes,
            diagnosis_findings=json.dumps(findings, indent=2), # <-- The exact fix!
            case_id=case_id
        )

        llm = get_llm("report_agent")
        response = llm.invoke(prompt)
        draft_report = response.content.strip()

        # Audited per draft, not per case: verifier_agent can loop a case
        # back here (up to MAX_REGENERATIONS), and each regenerated draft
        # is its own reportable event -- an auditor reconstructing what a
        # clinician actually saw needs to know a report was redrafted.
        # The report TEXT is deliberately not logged, only that a draft
        # of a given length happened; see audit_logger.py's PHI policy.
        get_audit_logger().append_event(
            case_id=case_id,
            event_type="ai_report_drafted",
            notes=f"draft_chars={len(draft_report)} regeneration_count={state.get('regeneration_count', 0)}",
        )

        logger.info("Case %s: report_agent drafted %d chars", case_id, len(draft_report))
        return {"draft_report": draft_report}

    except Exception as exc:  # noqa: BLE001 - never let a bad LLM call crash the graph
        logger.exception("report_agent_node failed for case=%s", case_id)
        return {"errors": [f"report_agent_node: {type(exc).__name__}: {exc}"]}


# ─────────────────────────────────────────────────────────────────────
# Standalone Execution / Testing Block
# ─────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    
    # 1. Configure basic logging to see terminal output
    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
    
    print("\n[INIT] Starting Report Agent Test Run...")
    
    # 2. Create a mock AgentState simulating the previous steps (Diagnosis & Evidence)
    mock_state: AgentState = {
        "case_id": "TEST-REPORT-999",
        "classification": "Pneumonia",
        "detections": "Opacity in Right Lower Lobe",
        "patient_metadata": "65-year-old male with persistent cough.",
        "diagnosis_findings": {
            "finding_label": "Pneumonia",
            "anatomical_region": "Right lower lobe",
            "severity": "high",
            "clinical_reasoning": "Consolidation detected matching clinical presentation."
        },
        "retrieved_evidence": "[1] ATS/IDSA Guidelines: Empiric antibiotic therapy should be initiated for CAP with lower lobe consolidation.",
        "errors": []
    }
    
    print("\n[INPUT] Feeding mock data to Report Agent...")
    print("[PROCESSING] Asking Ollama to draft the clinical report (this may take a few seconds)...")
    
    # 3. Run the node
    result_state = report_agent_node(mock_state)
    
    # 4. Print the result
    print("\n[OUTPUT] Final Draft Report from Ollama:")
    
    if "draft_report" in result_state:
        print("\n" + "="*50)
        print(result_state["draft_report"])
        print("="*50 + "\n")
    else:
        print(json.dumps(result_state, indent=2))