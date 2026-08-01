"""
RemitWise AI – Agent Schemas
==============================
All Pydantic models for inter-agent communication.

These are the contracts that agents speak to each other with.
Every agent input and output must conform to these schemas.
"""

from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Enumerations
# ---------------------------------------------------------------------------

class AgentName(str, Enum):
    """Identifies which specialist agent produced a response."""
    EXCHANGE   = "exchange"
    PROVIDER   = "provider"
    COMPLIANCE = "compliance"
    ORCHESTRATOR = "orchestrator"


class AgentStatus(str, Enum):
    """Execution status of an agent run."""
    SUCCESS = "success"
    PARTIAL = "partial"    # ran but some tools failed
    FAILED  = "failed"     # agent could not produce any result


class IntentType(str, Enum):
    """Detected user intent categories."""
    EXCHANGE_RATE    = "exchange_rate"
    CURRENCY_CONVERT = "currency_convert"
    PROVIDER_COMPARE = "provider_compare"
    PROVIDER_INFO    = "provider_info"
    COMPLIANCE_KYC   = "compliance_kyc"
    COMPLIANCE_AML   = "compliance_aml"
    COMPLIANCE_DOCS  = "compliance_docs"
    MULTI_DOMAIN     = "multi_domain"
    UNKNOWN          = "unknown"


# ---------------------------------------------------------------------------
# Conversation Memory
# ---------------------------------------------------------------------------

class ConversationMessage(BaseModel):
    """A single turn in the conversation history."""
    role: str = Field(..., description="'user' or 'assistant'")
    content: str = Field(..., description="Message text")
    timestamp: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )
    agents_used: List[str] = Field(default_factory=list)
    planner_name: Optional[str] = Field(None, description="Planner used for this turn")
    provider_name: Optional[str] = Field(None, description="LLM provider name ('ollama', 'mock', 'openai')")
    reasoning: Optional[str] = Field(None, description="Planner reasoning")
    confidence: Optional[float] = Field(None, description="Planner confidence score")



# ---------------------------------------------------------------------------
# Agent I/O
# ---------------------------------------------------------------------------

class AgentContext(BaseModel):
    """
    Structured context extracted from the user query.
    Agents use this instead of parsing free-text themselves.
    """
    base_currency: Optional[str]   = Field(None, description="Source currency, e.g. 'USD'")
    target_currency: Optional[str] = Field(None, description="Target currency, e.g. 'INR'")
    amount: Optional[float]        = Field(None, description="Transfer amount")
    from_country: Optional[str]    = Field(None, description="Sender country ISO-2, e.g. 'US'")
    to_country: Optional[str]      = Field(None, description="Receiver country ISO-2, e.g. 'IN'")
    provider_id: Optional[str]     = Field(None, description="Specific provider ID if queried")
    start_date: Optional[str]      = Field(None, description="YYYY-MM-DD for historical queries")
    end_date: Optional[str]        = Field(None, description="YYYY-MM-DD for historical queries")
    raw_query: str                 = Field("", description="Original user query text")
    extra: Dict[str, Any]          = Field(default_factory=dict)


class AgentRequest(BaseModel):
    """Input sent to a specialist agent from the orchestrator."""
    session_id: str       = Field(..., description="Conversation session identifier")
    context: AgentContext = Field(..., description="Structured query context")
    history: List[ConversationMessage] = Field(
        default_factory=list,
        description="Recent conversation history for context"
    )


class ToolCall(BaseModel):
    """Record of a single tool invocation by an agent."""
    tool_name: str              = Field(..., description="Name of the tool/function called")
    parameters: Dict[str, Any]  = Field(default_factory=dict)
    result: Optional[Any]       = Field(None, description="Tool return value")
    error: Optional[str]        = Field(None, description="Error message if tool failed")
    latency_ms: float           = Field(0.0, description="Tool execution time")


class AgentResponse(BaseModel):
    """
    Structured output from any specialist agent.
    The orchestrator collects these and passes them to the Merger.
    """
    agent: AgentName                   = Field(..., description="Which agent produced this")
    status: AgentStatus                = Field(..., description="Execution outcome")
    data: Dict[str, Any]               = Field(default_factory=dict, description="Agent result payload")
    summary: str                       = Field("", description="Human-readable summary of findings")
    tool_calls: List[ToolCall]         = Field(default_factory=list, description="Tools that were invoked")
    error: Optional[str]               = Field(None, description="Error details if status is FAILED")
    execution_time_ms: float           = Field(0.0, description="Total agent execution time")
    timestamp: str                     = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )


# ---------------------------------------------------------------------------
# Planner Output
# ---------------------------------------------------------------------------

class PlanStep(BaseModel):
    """A single step in the orchestrator's execution plan."""
    agent: AgentName              = Field(..., description="Agent to execute")
    reason: str                   = Field("", description="Why this agent was selected")
    priority: int                 = Field(1, description="Execution order (lower = first)")
    depends_on: List[AgentName]   = Field(
        default_factory=list,
        description="Agents that must complete before this one"
    )


class ExecutionPlan(BaseModel):
    """The orchestrator's plan: which agents to run and in what order."""
    steps: List[PlanStep]          = Field(default_factory=list)
    intents: List[IntentType]      = Field(default_factory=list)
    is_multi_domain: bool          = Field(False)
    extracted_context: AgentContext = Field(default_factory=AgentContext)
    confidence: float              = Field(1.0, description="Planning confidence 0.0–1.0")
    reasoning: Optional[str]        = Field(None, description="Explanation for agent selection")
    planner_name: Optional[str]     = Field(None, description="Name of the planner ('llm' or 'rule_based')")
    provider_name: Optional[str]    = Field(None, description="Name of the LLM provider ('ollama', 'mock', 'openai')")
    planning_latency_ms: float      = Field(0.0, description="Time taken to produce plan in milliseconds")



# ---------------------------------------------------------------------------
# Orchestrator I/O
# ---------------------------------------------------------------------------

class OrchestratorRequest(BaseModel):
    """Top-level request from the user (or MCP/API layer) to the orchestrator."""
    query: str                     = Field(..., description="Raw user query in natural language")
    session_id: str                = Field("default", description="Session identifier for memory")
    context: Optional[Dict[str, Any]] = Field(
        None,
        description="Optional pre-extracted context (currencies, countries, amount)"
    )
    history: List[ConversationMessage] = Field(
        default_factory=list,
        description="Previous conversation turns (override memory if provided)"
    )


class OrchestratorResponse(BaseModel):
    """Final response from the orchestrator back to the caller."""
    session_id: str                    = Field(..., description="Session identifier")
    query: str                         = Field(..., description="Original user query")
    agents_used: List[str]             = Field(default_factory=list)
    plan: List[PlanStep]               = Field(default_factory=list)
    results: Dict[str, Any]            = Field(
        default_factory=dict,
        description="Keyed by agent name, each value is AgentResponse.data"
    )
    agent_responses: List[AgentResponse] = Field(
        default_factory=list,
        description="Full AgentResponse objects (includes tool calls, timing)"
    )
    summary: str                       = Field("", description="Merged natural-language answer")
    status: str                        = Field("success", description="'success' | 'partial' | 'failed'")
    total_execution_ms: float          = Field(0.0)
    timestamp: str                     = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )
