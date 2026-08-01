"""
RemitWise AI – LLM Planner
===========================
Intelligent LLM-powered planning agent. Reads user intent in natural language,
extracts structured entities, maps them to specialist agents, and produces
an ExecutionPlan for the Executor.
"""

from __future__ import annotations

import json
import re
import time
from typing import Dict, List, Optional, Union

from pydantic import BaseModel, Field, ValidationError

from agents.orchestrator.base_planner import BasePlanner
from agents.orchestrator.providers import BaseLLMProvider, get_llm_provider
from agents.shared.logger import AgentLogger
from agents.shared.schemas import (
    AgentContext,
    AgentName,
    ExecutionPlan,
    IntentType,
    PlanStep,
)
from agents.shared.utils import normalize_country, normalize_currency


logger = AgentLogger("LLMPlanner")


SYSTEM_PROMPT = """You are the Planning Agent for RemitWise AI.

Your ONLY responsibility is deciding which specialist agents should execute.

You NEVER answer the user's question.

Available agents:

ExchangeAgent
Responsibilities: Exchange rates, Currency conversion, Currency information

ProviderAgent
Responsibilities: Provider comparison, Transfer fees, Transfer speed, Recommendations

ComplianceAgent
Responsibilities: KYC, AML, Compliance, Transfer regulations, Required documents, Transfer limits

Read the user request carefully.

Extract:
base_currency
target_currency
amount
from_country
to_country

Determine:
which agents are required
their execution order

Return ONLY JSON.
Never return explanations."""


# ---------------------------------------------------------------------------
# Pydantic Output Validation Contract
# ---------------------------------------------------------------------------

class LLMContextModel(BaseModel):
    """Context fields extracted by the LLM."""
    base_currency: Optional[str]   = Field(None, description="Source currency code (e.g. 'USD')")
    target_currency: Optional[str] = Field(None, description="Target currency code (e.g. 'INR')")
    amount: Optional[float]        = Field(None, description="Numerical transfer amount")
    from_country: Optional[str]    = Field(None, description="Sender country code ISO-2 (e.g. 'US')")
    to_country: Optional[str]      = Field(None, description="Receiver country code ISO-2 (e.g. 'IN')")


class LLMPlanResponseModel(BaseModel):
    """Validated schema for LLM planner JSON output."""
    agents: List[str]            = Field(..., description="List of required agent names")
    reasoning: str               = Field(..., description="Reasoning behind agent selection")
    context: LLMContextModel     = Field(default_factory=LLMContextModel)
    confidence: float            = Field(1.0, ge=0.0, le=1.0, description="Confidence score between 0.0 and 1.0")


# ---------------------------------------------------------------------------
# Agent Mapping Helper
# ---------------------------------------------------------------------------

_AGENT_MAPPING: Dict[str, AgentName] = {
    "exchangeagent":   AgentName.EXCHANGE,
    "exchange":        AgentName.EXCHANGE,
    "provideragent":   AgentName.PROVIDER,
    "provider":        AgentName.PROVIDER,
    "complianceagent": AgentName.COMPLIANCE,
    "compliance":      AgentName.COMPLIANCE,
}


class LLMPlanner(BasePlanner):
    """
    LLM-powered intent reasoning and execution plan generator.
    """

    def __init__(
        self,
        provider: Optional[BaseLLMProvider] = None,
        max_retries: int = 1,
    ) -> None:
        self.provider = provider or get_llm_provider()
        self.max_retries = max_retries
        self._logger = logger

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def plan(
        self,
        query: str,
        context_override: Optional[Dict] = None,
    ) -> ExecutionPlan:
        """
        Analyze query using LLM and return ExecutionPlan.
        Raises RuntimeError or ValidationError on failure.
        """
        start_t = time.perf_counter()
        override = context_override or {}

        attempts = 0
        last_exception: Optional[Exception] = None
        active_provider = self.provider

        while attempts <= self.max_retries:
            attempts += 1
            try:
                raw_response = active_provider.complete(
                    prompt=query,
                    system_prompt=SYSTEM_PROMPT,
                )
                parsed_model = self._parse_and_validate(raw_response)
                plan = self._build_execution_plan(
                    query=query,
                    model=parsed_model,
                    override=override,
                    start_t=start_t,
                    provider_name=getattr(active_provider, "provider_name", "llm"),
                )
                self._logger.info(
                    f"🤖 LLMPlanner successful ({plan.planning_latency_ms:.1f}ms) | "
                    f"Provider: {plan.provider_name} | "
                    f"Agents: {[s.agent.value for s in plan.steps]}"
                )
                return plan

            except Exception as exc:
                last_exception = exc
                prov_name = getattr(active_provider, "provider_name", "llm")
                if prov_name == "ollama":
                    self._logger.warning("Ollama unavailable. Switching to MockProvider.")
                    from agents.orchestrator.providers.mock_provider import MockProvider
                    active_provider = MockProvider()
                    attempts -= 1  # Allow fallback provider attempt
                else:
                    self._logger.warning(
                        f"LLMPlanner attempt {attempts}/{self.max_retries + 1} failed ({prov_name}): {exc}"
                    )

        raise RuntimeError(
            f"LLMPlanner failed after {attempts} attempt(s): {last_exception}"
        ) from last_exception

    # ------------------------------------------------------------------
    # Parsing & Parsing Validation
    # ------------------------------------------------------------------

    def _parse_and_validate(self, raw_text: str) -> LLMPlanResponseModel:
        """Extract JSON substring, parse with json, and validate with Pydantic."""
        cleaned_text = raw_text.strip()

        # Remove markdown code fence if present
        if cleaned_text.startswith("```"):
            cleaned_text = re.sub(r"^```(?:json)?\s*", "", cleaned_text, flags=re.IGNORECASE)
            cleaned_text = re.sub(r"\s*```$", "", cleaned_text)
            cleaned_text = cleaned_text.strip()

        # If still not starting with {, search for first { and last }
        if not (cleaned_text.startswith("{") and cleaned_text.endswith("}")):
            json_match = re.search(r"\{.*\}", cleaned_text, re.DOTALL)
            if json_match:
                cleaned_text = json_match.group(0)

        try:
            data = json.loads(cleaned_text)
        except json.JSONDecodeError as err:
            raise ValueError(f"Invalid JSON string from LLM: {err} in '{raw_text[:100]}...'") from err

        return LLMPlanResponseModel.model_validate(data)

    # ------------------------------------------------------------------
    # Plan Construction
    # ------------------------------------------------------------------

    def _build_execution_plan(
        self,
        query: str,
        model: LLMPlanResponseModel,
        override: Dict,
        start_t: float,
        provider_name: str = "llm",
    ) -> ExecutionPlan:
        """Map LLMPlanResponseModel to standard ExecutionPlan."""

        # 1. Map requested agent names to AgentName enum (deduplicated)
        agents: List[AgentName] = []
        seen: set = set()
        for raw_agent in model.agents:
            norm_key = raw_agent.lower().strip()
            agent_enum = _AGENT_MAPPING.get(norm_key)
            if agent_enum and agent_enum not in seen:
                agents.append(agent_enum)
                seen.add(agent_enum)

        if not agents:
            # Fallback if LLM listed unknown agent string
            agents = [AgentName.EXCHANGE]

        # Order agents by standard sequence: Exchange → Provider → Compliance
        order = [AgentName.EXCHANGE, AgentName.PROVIDER, AgentName.COMPLIANCE]
        ordered_agents = [a for a in order if a in agents]

        # 2. Extract and merge context
        llm_ctx = model.context

        base_currency = override.get("base_currency") or normalize_currency(llm_ctx.base_currency)
        target_currency = override.get("target_currency") or normalize_currency(llm_ctx.target_currency)
        amount = override.get("amount") if override.get("amount") is not None else llm_ctx.amount
        from_country = override.get("from_country") or normalize_country(llm_ctx.from_country)
        to_country = override.get("to_country") or normalize_country(llm_ctx.to_country)

        # Infer missing currency from country
        if not target_currency and to_country:
            from agents.shared.utils import country_to_currency
            target_currency = country_to_currency(to_country)
        if not base_currency and from_country:
            from agents.shared.utils import country_to_currency
            base_currency = country_to_currency(from_country) or "USD"

        ctx = AgentContext(
            base_currency=base_currency,
            target_currency=target_currency,
            amount=amount,
            from_country=from_country,
            to_country=to_country,
            raw_query=query,
        )

        # 3. Build PlanSteps
        steps: List[PlanStep] = []
        for i, agent in enumerate(ordered_agents):
            reason = self._step_reason(agent, ctx)
            steps.append(
                PlanStep(
                    agent=agent,
                    reason=reason,
                    priority=i + 1,
                    depends_on=[],
                )
            )

        intents = self._infer_intents(ordered_agents)
        latency_ms = round((time.perf_counter() - start_t) * 1000, 2)

        return ExecutionPlan(
            steps=steps,
            intents=intents,
            is_multi_domain=len(ordered_agents) > 1,
            extracted_context=ctx,
            confidence=model.confidence,
            reasoning=model.reasoning,
            planner_name="llm",
            provider_name=provider_name,
            planning_latency_ms=latency_ms,
        )

    def _step_reason(self, agent: AgentName, ctx: AgentContext) -> str:
        """Generate human-readable step rationale."""
        if agent == AgentName.EXCHANGE:
            pair = f" ({ctx.base_currency}→{ctx.target_currency})" if (ctx.base_currency and ctx.target_currency) else ""
            amount_str = f" for {ctx.amount}" if ctx.amount else ""
            return f"Exchange rate and conversion query{pair}{amount_str}"
        if agent == AgentName.PROVIDER:
            corridor = f" ({ctx.from_country}→{ctx.to_country})" if (ctx.from_country and ctx.to_country) else ""
            return f"Provider comparison and recommendation{corridor}"
        if agent == AgentName.COMPLIANCE:
            country = ctx.to_country or ctx.from_country or "specified country"
            return f"KYC/AML compliance requirements for {country}"
        return "General query"

    def _infer_intents(self, agents: List[AgentName]) -> List[IntentType]:
        """Infer IntentTypes from agents list for schema compatibility."""
        intents = []
        if AgentName.EXCHANGE in agents:
            intents.append(IntentType.EXCHANGE_RATE)
        if AgentName.PROVIDER in agents:
            intents.append(IntentType.PROVIDER_COMPARE)
        if AgentName.COMPLIANCE in agents:
            intents.append(IntentType.COMPLIANCE_KYC)
        if len(agents) > 1:
            intents.append(IntentType.MULTI_DOMAIN)
        return intents or [IntentType.UNKNOWN]
