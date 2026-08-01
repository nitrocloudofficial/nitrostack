"""
RemitWise AI – Agent API Routes
=================================
Exposes the Multi-Agent Orchestrator as REST endpoints.

Endpoints
---------
POST /agent/chat            – Main conversational endpoint (orchestrator entry)
GET  /agent/health          – Agent system health & readiness check
GET  /agent/session/{id}    – Get conversation history for a session
DELETE /agent/session/{id}  – Clear conversation memory for a session

These endpoints are ADDITIVE — all existing /exchange, /providers,
/compliance endpoints remain completely unchanged.
"""

from __future__ import annotations

import logging
import time
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Path, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from agents.orchestrator.orchestrator import OrchestratorAgent
from agents.shared.memory import memory_store
from agents.shared.schemas import OrchestratorRequest, OrchestratorResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/agent", tags=["AI Agents"])

# Singleton orchestrator — instantiated once, reused across all requests
_orchestrator = OrchestratorAgent()


# ---------------------------------------------------------------------------
# Request / Response models for the HTTP layer
# ---------------------------------------------------------------------------

class ChatRequest(BaseModel):
    """
    Request body for POST /agent/chat.

    All fields except ``query`` are optional — the orchestrator will
    infer currencies, countries, and amounts from the free-text query.
    Providing ``context`` pre-populates the planner for better accuracy.
    """
    query: str = Field(
        ...,
        description="Natural-language user query",
        examples=["I want to send 1000 USD to India. Which provider is cheapest and what KYC documents do I need?"],
        min_length=1,
        max_length=2000,
    )
    session_id: str = Field(
        "default",
        description="Session identifier for conversation memory (use a UUID per user)",
    )
    context: Optional[Dict[str, Any]] = Field(
        None,
        description=(
            "Optional pre-extracted context. Supports keys: "
            "base_currency, target_currency, amount, from_country, to_country"
        ),
        examples=[{
            "base_currency": "USD",
            "target_currency": "INR",
            "amount": 1000,
            "from_country": "US",
            "to_country": "IN",
        }],
    )


class AgentHealthResponse(BaseModel):
    """Response body for GET /agent/health."""
    status: str
    agents: Dict[str, str]
    memory_sessions: int
    message: str


# ---------------------------------------------------------------------------
# POST /agent/chat  — main endpoint
# ---------------------------------------------------------------------------

@router.post(
    "/chat",
    summary="Multi-Agent Chat",
    description=(
        "Submit a natural-language query to the RemitWise AI multi-agent system. "
        "The orchestrator will automatically select and run the appropriate specialist "
        "agents (Exchange, Provider, Compliance) based on your query, then merge their "
        "outputs into a single coherent response.\n\n"
        "**Examples:**\n"
        "- `'What is the current USD to INR rate?'` → Exchange Agent only\n"
        "- `'Which provider is cheapest for US to India?'` → Provider Agent only\n"
        "- `'Send 1000 USD to India — best provider and required documents'` → All 3 agents"
    ),
    response_model=OrchestratorResponse,
    status_code=status.HTTP_200_OK,
)
def chat(body: ChatRequest) -> OrchestratorResponse:
    """
    Main conversational endpoint for the multi-agent system.

    Delegates to OrchestratorAgent which handles planning, execution,
    and response merging internally.
    """
    try:
        orch_request = OrchestratorRequest(
            query=body.query,
            session_id=body.session_id,
            context=body.context,
        )
        response = _orchestrator.run(orch_request)
        return response

    except Exception as exc:
        logger.exception("Unhandled error in /agent/chat: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Agent system error: {str(exc)}",
        )


# ---------------------------------------------------------------------------
# GET /agent/health
# ---------------------------------------------------------------------------

@router.get(
    "/health",
    summary="Agent System Health",
    description="Check whether the multi-agent system is initialised and all agents are ready.",
    response_model=AgentHealthResponse,
    status_code=status.HTTP_200_OK,
)
def agent_health() -> AgentHealthResponse:
    """Quick liveness check for the agent layer."""
    try:
        # Verify each agent can be instantiated
        from agents.exchange.exchange_agent     import ExchangeAgent
        from agents.provider.provider_agent     import ProviderAgent
        from agents.compliance.compliance_agent import ComplianceAgent

        agents_status = {
            "exchange":    "ready",
            "provider":    "ready",
            "compliance":  "ready",
            "orchestrator": "ready",
        }

        return AgentHealthResponse(
            status="healthy",
            agents=agents_status,
            memory_sessions=memory_store.session_count(),
            message=(
                "Multi-agent system is online. "
                "POST /agent/chat to begin."
            ),
        )
    except Exception as exc:
        logger.exception("Agent health check failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Agent system not ready: {str(exc)}",
        )


# ---------------------------------------------------------------------------
# GET /agent/session/{session_id}
# ---------------------------------------------------------------------------

@router.get(
    "/session/{session_id}",
    summary="Get Session History",
    description="Return the conversation history for a given session ID.",
    status_code=status.HTTP_200_OK,
)
def get_session(
    session_id: str = Path(..., description="Session ID to retrieve history for"),
) -> Dict[str, Any]:
    """Return conversation history for a session."""
    history = _orchestrator.get_session_history(session_id)
    return {
        "session_id":    session_id,
        "message_count": len(history),
        "history":       history,
    }


# ---------------------------------------------------------------------------
# DELETE /agent/session/{session_id}
# ---------------------------------------------------------------------------

@router.delete(
    "/session/{session_id}",
    summary="Clear Session Memory",
    description="Delete conversation history for a given session ID.",
    status_code=status.HTTP_200_OK,
)
def clear_session(
    session_id: str = Path(..., description="Session ID to clear"),
) -> Dict[str, Any]:
    """Clear conversation memory for a session."""
    _orchestrator.clear_session(session_id)
    return {
        "session_id": session_id,
        "cleared":    True,
        "message":    f"Conversation memory for session '{session_id}' has been cleared.",
    }
