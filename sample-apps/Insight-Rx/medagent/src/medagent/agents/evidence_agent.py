"""
Evidence Agent -- RAG node in the clinical decision LangGraph pipeline.

Runs after the Diagnosis Agent. Takes the diagnosis label from
state["diagnosis_findings"]["finding_label"], retrieves the top 3 most
relevant ATS/IDSA guideline chunks from the local FAISS vector store,
and returns them as a single formatted string for the Report Agent to
cite from.
"""
from __future__ import annotations

import logging

from medagent.agents.state import AgentState
from medagent.rag.retriever import get_retriever
from medagent.security.artifact_signing import SecurityError

logger = logging.getLogger("medagent.agents.evidence")

TOP_K = 3


def evidence_agent_node(state: AgentState) -> dict:
    """
    LangGraph node: Evidence Agent.

    Every failure here degrades gracefully to a "no evidence" / errors-
    list result EXCEPT SecurityError (security/artifact_signing.py,
    Phase 2 item 2): that means the on-disk FAISS index is unsigned,
    unverifiable, or has been tampered with, and get_retriever() ->
    get_vectorstore() deliberately raises instead of falling back to a
    safe sample index for exactly that reason -- see
    rag/vectorstore.py's get_vectorstore() docstring. Swallowing it here
    would silently turn a detected tampering event into an ordinary
    "no evidence found" case that still sails through to human_review,
    which defeats the entire point of signing the index in the first
    place. It is re-raised instead, propagating out of graph.invoke()
    to halt the case completely -- the same hard-gate pattern
    deidentify_node uses for PHIDeidentificationError.
    """
    case_id = state.get("case_id", "unknown")

    try:
        diagnosis_findings = state.get("diagnosis_findings") or {}
        finding_label = (diagnosis_findings.get("finding_label") or "").strip()

        if not finding_label:
            raise ValueError("diagnosis_findings.finding_label is missing or empty")

        retriever = get_retriever()

        # FIXED: LangChain uses .invoke() to search the vector database
        hits = retriever.invoke(finding_label)[:TOP_K]

        if not hits:
            logger.warning("Case %s: no guideline evidence found for %r", case_id, finding_label)
            return {
                "retrieved_evidence": (
                    f"No matching ATS/IDSA guideline evidence found for '{finding_label}'."
                )
            }

        # Format the retrieved documents into a single readable string
        formatted = "\n\n".join(
            f"[{i}] Source: {hit.metadata.get('source', 'Unknown')}\n{hit.page_content.strip()}"
            for i, hit in enumerate(hits, start=1)
        )
        return {"retrieved_evidence": formatted}

    except SecurityError:
        logger.error(
            "evidence_agent_node HALTING case=%s -- FAISS index signature verification "
            "failed. This is treated as a security incident, not a retrieval failure.",
            case_id,
        )
        raise
    except Exception as exc:  # noqa: BLE001 - never let an ordinary retrieval failure crash the graph
        logger.exception("evidence_agent_node failed for case=%s", case_id)
        return {"errors": [f"evidence_agent_node: {type(exc).__name__}: {exc}"]}


# ─────────────────────────────────────────────────────────────────────
# Standalone Execution / Testing Block
# ─────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import json
    
    # Configure basic logging to see terminal output
    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
    
    print("\n[INIT] Starting Evidence Agent (RAG) Test Run...")
    
    # Create a mock AgentState representing an upstream diagnosis
    mock_state: AgentState = {
        "case_id": "TEST-RAG-777",
        "classification": "",
        "detections": "",
        "patient_metadata": "",
        "diagnosis_findings": {
            "finding_label": "Pneumonia",
            "anatomical_region": "right lower lobe",
            "severity": "high",
            "clinical_reasoning": "Mock reasoning for test."
        },
        "errors": []
    }
    
    finding = mock_state["diagnosis_findings"]["finding_label"]
    print(f"\n[INPUT] Extracted diagnosis label from state: '{finding}'")
    print("[PROCESSING] Querying RAG Vector Database for ATS/IDSA guidelines...")
    
    # Run the node
    result_state = evidence_agent_node(mock_state)
    
    # Print the result
    print("\n[OUTPUT] Final Result from Evidence Agent:")
    print(json.dumps(result_state, indent=2))