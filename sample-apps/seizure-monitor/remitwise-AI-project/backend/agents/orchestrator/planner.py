"""
RemitWise AI – Orchestrator Planner
=====================================
Pure rule-based intent detection and agent selection.

No LLM required. The Planner uses keyword matching, regex patterns,
and extracted context to determine:
  1. What the user intends (IntentType)
  2. Which agents should be invoked
  3. What structured context (currencies, countries, amounts) to pass

Design principle: fast, deterministic, fully testable.
Typical latency: < 1ms.

Usage::

    planner = Planner()
    plan = planner.plan(query="Send 1000 USD to India, cheapest provider?")
    # plan.steps = [ExchangeAgent, ProviderAgent]
    # plan.extracted_context.base_currency = "USD"
    # plan.extracted_context.to_country = "IN"
"""

from __future__ import annotations

import re
import time
from typing import Dict, List, Optional, Set, Tuple

from agents.orchestrator.base_planner import BasePlanner
from agents.shared.logger import AgentLogger
from agents.shared.schemas import (
    AgentContext,
    AgentName,
    ExecutionPlan,
    IntentType,
    PlanStep,
)
from agents.shared.utils import normalize_country, normalize_currency


logger = AgentLogger("Planner")


# ---------------------------------------------------------------------------
# Keyword / Pattern Registries
# ---------------------------------------------------------------------------

# Exchange-rate keywords
_EXCHANGE_KEYWORDS: Set[str] = {
    "rate", "rates", "exchange", "convert", "conversion", "how much",
    "worth", "value", "price", "usd", "eur", "gbp", "inr", "jpy", "aed",
    "currency", "currencies", "forex", "fx", "mid-market", "send money",
    "transfer amount", "receive", "receiving",
}

# Provider keywords
_PROVIDER_KEYWORDS: Set[str] = {
    "provider", "providers", "wise", "remitly", "western union", "sendwave",
    "xoom", "service", "services", "cheapest", "cheapest option", "best option",
    "compare", "comparison", "fee", "fees", "delivery", "speed", "fast",
    "faster", "payout", "payment method", "bank transfer", "cash pickup",
    "mobile money", "fastest", "recommend", "recommendation", "corridor",
    "who should i use", "which provider", "cash", "pickup", "counter", "branch",
    "send", "transfer", "remit", "option", "urgent",
}

# Compliance keywords
_COMPLIANCE_KEYWORDS: Set[str] = {
    "kyc", "aml", "compliance", "document", "documents", "identity",
    "verification", "verify", "passport", "id", "identity proof",
    "address proof", "sanctions", "screening", "regulation", "regulations",
    "regulatory", "limit", "limits", "maximum", "require", "required",
    "what do i need", "paperwork", "legal",
}

# Country name → ISO-2 (supplement utils.py with common spoken forms)
_COUNTRY_PATTERNS: Dict[str, str] = {
    r"\bindia\b":           "IN",
    r"\bindian\b":          "IN",
    r"\busa?\b":            "US",
    r"\bamerica\b":         "US",
    r"\bunited states\b":   "US",
    r"\buk\b":              "GB",
    r"\bbritain\b":         "GB",
    r"\bengland\b":         "GB",
    r"\bunited kingdom\b":  "GB",
    r"\bphilippines\b":     "PH",
    r"\bfilipino\b":        "PH",
    r"\bmexico\b":          "MX",
    r"\bmexican\b":         "MX",
    r"\bkenya\b":           "KE",
    r"\bkenyan\b":          "KE",
    r"\bnigeria\b":         "NG",
    r"\bnigerian\b":        "NG",
    r"\bgermany\b":         "DE",
    r"\bgerman\b":          "DE",
    r"\bcanada\b":          "CA",
    r"\bcanadian\b":        "CA",
    r"\baustralia\b":       "AU",
    r"\baustralian\b":      "AU",
}

# Currency patterns (3-letter codes appearing in query)
_CURRENCY_RE = re.compile(
    r"\b(USD|EUR|GBP|INR|JPY|AED|CAD|AUD|SGD|HKD|MXN|PHP|KES|NGN|CHF|CNY)\b",
    re.IGNORECASE,
)

# Amount patterns: "$1,000", "1000 USD", "1.5k", etc.
_AMOUNT_RE = re.compile(
    r"(?:\$|€|£|₹)?\s*(\d{1,3}(?:[,_]\d{3})*(?:\.\d+)?|\d+(?:\.\d+)?)\s*(?:k\b)?",
    re.IGNORECASE,
)


class RuleBasedPlanner(BasePlanner):
    """
    Rule-based intent detector and execution plan generator.

    Given a raw user query (and optional pre-extracted context),
    returns an ``ExecutionPlan`` describing which agents to run
    and what structured context to pass them.
    """

    def __init__(self) -> None:
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
        Analyse *query* and produce an ExecutionPlan.

        Parameters
        ----------
        query : str
            Raw natural-language user query.
        context_override : dict, optional
            Pre-extracted context from the API caller (e.g. from a frontend
            that already knows the country/currency).  Merged with extracted
            context; caller values take precedence.

        Returns
        -------
        ExecutionPlan
        """
        start_t = time.perf_counter()
        q_lower = query.lower()

        # 1. Extract context from query
        ctx = self._extract_context(q_lower, query, context_override or {})

        # 2. Detect intents
        intents = self._detect_intents(q_lower, ctx)

        # 3. Select agents from intents
        agents_needed = self._select_agents(intents)

        # 4. Build ordered plan steps
        steps = self._build_steps(agents_needed, ctx)

        latency_ms = round((time.perf_counter() - start_t) * 1000, 2)

        reasoning = (
            f"RuleBasedPlanner detected intents: {[i.value for i in intents]} "
            f"for query: '{query}'"
        )

        plan = ExecutionPlan(
            steps=steps,
            intents=intents,
            is_multi_domain=len(agents_needed) > 1,
            extracted_context=ctx,
            confidence=self._confidence(intents),
            reasoning=reasoning,
            planner_name="rule_based",
            planning_latency_ms=latency_ms,
        )

        self._logger.log_plan(
            [s.agent.value for s in steps],
            [i.value for i in intents],
        )
        return plan


    # ------------------------------------------------------------------
    # Context extraction
    # ------------------------------------------------------------------

    def _extract_context(
        self,
        q_lower: str,
        q_original: str,
        override: Dict,
    ) -> AgentContext:
        """Extract structured entities from the query text."""

        # Currencies
        currencies = _CURRENCY_RE.findall(q_original)
        currencies = [c.upper() for c in currencies]

        base_currency   = override.get("base_currency")   or (currencies[0] if currencies else None)
        target_currency = override.get("target_currency") or (currencies[1] if len(currencies) > 1 else None)

        # Countries
        from_country = override.get("from_country")
        to_country   = override.get("to_country")
        if not from_country or not to_country:
            found_countries = self._extract_countries(q_lower)
            if len(found_countries) >= 2:
                if not from_country:
                    from_country = found_countries[0]
                if not to_country:
                    to_country = found_countries[1]
            elif len(found_countries) == 1:
                country = found_countries[0]
                # If explicit "from <country>", set from_country
                if any(kw in q_lower for kw in [f"from {country.lower()}", "from us", "from usa"]):
                    if not from_country:
                        from_country = country
                else:
                    if not to_country:
                        to_country = country
                    if not from_country and country != "US":
                        from_country = "US"

        # Amount
        amount = override.get("amount") or self._extract_amount(q_original)

        # Infer missing currency from country
        if not target_currency and to_country:
            from agents.shared.utils import country_to_currency
            target_currency = country_to_currency(to_country)
        if not base_currency and from_country:
            from agents.shared.utils import country_to_currency
            base_currency = country_to_currency(from_country) or "USD"

        return AgentContext(
            base_currency=base_currency,
            target_currency=target_currency,
            amount=amount,
            from_country=from_country or (override.get("from_country")),
            to_country=to_country or (override.get("to_country")),
            raw_query=q_original,
        )

    def _extract_countries(self, q_lower: str) -> List[str]:
        """Extract country ISO-2 codes from query text (preserves order)."""
        found: List[str] = []
        seen:  Set[str]  = set()
        for pattern, code in _COUNTRY_PATTERNS.items():
            if re.search(pattern, q_lower) and code not in seen:
                found.append(code)
                seen.add(code)
        return found

    def _extract_amount(self, query: str) -> Optional[float]:
        """Extract the first numeric amount from the query."""
        matches = _AMOUNT_RE.findall(query)
        for m in matches:
            cleaned = m.replace(",", "").replace("_", "")
            try:
                val = float(cleaned)
                # Skip suspiciously small values (likely date years or port numbers)
                if 0.01 <= val <= 10_000_000:
                    return val
            except ValueError:
                continue
        return None

    # ------------------------------------------------------------------
    # Intent detection
    # ------------------------------------------------------------------

    def _detect_intents(
        self,
        q_lower: str,
        ctx: AgentContext,
    ) -> List[IntentType]:
        """Return the list of matched intent types (may be multiple)."""
        intents: List[IntentType] = []

        # Score each domain
        exchange_hits   = sum(1 for kw in _EXCHANGE_KEYWORDS   if kw in q_lower)
        provider_hits   = sum(1 for kw in _PROVIDER_KEYWORDS   if kw in q_lower)
        compliance_hits = sum(1 for kw in _COMPLIANCE_KEYWORDS if kw in q_lower)

        # Currency pair in context strongly implies exchange
        if ctx.base_currency and ctx.target_currency:
            exchange_hits += 3
        if ctx.amount:
            exchange_hits += 1

        # Threshold: ≥1 keyword hit for that domain
        if exchange_hits >= 1:
            if ctx.amount:
                intents.append(IntentType.CURRENCY_CONVERT)
            else:
                intents.append(IntentType.EXCHANGE_RATE)

        if provider_hits >= 1:
            intents.append(IntentType.PROVIDER_COMPARE)

        if compliance_hits >= 1:
            if "kyc" in q_lower:
                intents.append(IntentType.COMPLIANCE_KYC)
            elif "aml" in q_lower:
                intents.append(IntentType.COMPLIANCE_AML)
            elif "document" in q_lower:
                intents.append(IntentType.COMPLIANCE_DOCS)
            else:
                intents.append(IntentType.COMPLIANCE_KYC)  # default compliance

        if not intents:
            intents.append(IntentType.UNKNOWN)

        if len({i for i in intents if i != IntentType.UNKNOWN}) > 1:
            intents.append(IntentType.MULTI_DOMAIN)

        return intents

    # ------------------------------------------------------------------
    # Agent selection
    # ------------------------------------------------------------------

    def _select_agents(self, intents: List[IntentType]) -> List[AgentName]:
        """Map detected intents to agent names (deduplicated, ordered)."""
        agents: List[AgentName] = []
        seen: Set[AgentName]    = set()

        intent_to_agent = {
            IntentType.EXCHANGE_RATE:    AgentName.EXCHANGE,
            IntentType.CURRENCY_CONVERT: AgentName.EXCHANGE,
            IntentType.PROVIDER_COMPARE: AgentName.PROVIDER,
            IntentType.PROVIDER_INFO:    AgentName.PROVIDER,
            IntentType.COMPLIANCE_KYC:   AgentName.COMPLIANCE,
            IntentType.COMPLIANCE_AML:   AgentName.COMPLIANCE,
            IntentType.COMPLIANCE_DOCS:  AgentName.COMPLIANCE,
        }

        # Preferred execution order: Exchange → Provider → Compliance
        order = [AgentName.EXCHANGE, AgentName.PROVIDER, AgentName.COMPLIANCE]
        needed: Set[AgentName] = set()

        for intent in intents:
            agent = intent_to_agent.get(intent)
            if agent:
                needed.add(agent)

        if not needed:
            # Fallback: run exchange agent for unknown queries with currency context
            needed.add(AgentName.EXCHANGE)

        for agent in order:
            if agent in needed:
                agents.append(agent)

        return agents

    # ------------------------------------------------------------------
    # Plan step construction
    # ------------------------------------------------------------------

    def _build_steps(
        self,
        agents: List[AgentName],
        ctx: AgentContext,
    ) -> List[PlanStep]:
        """Build ordered PlanStep list from agent list."""
        steps = []
        for i, agent in enumerate(agents):
            reason = self._step_reason(agent, ctx)
            steps.append(
                PlanStep(
                    agent=agent,
                    reason=reason,
                    priority=i + 1,
                    depends_on=[],  # all run independently (sequential by default)
                )
            )
        return steps

    def _step_reason(self, agent: AgentName, ctx: AgentContext) -> str:
        """Generate a human-readable reason for including this agent."""
        if agent == AgentName.EXCHANGE:
            pair = ""
            if ctx.base_currency and ctx.target_currency:
                pair = f" ({ctx.base_currency}→{ctx.target_currency})"
            amount_str = f" for {ctx.amount}" if ctx.amount else ""
            return f"Exchange rate and conversion query{pair}{amount_str}"
        if agent == AgentName.PROVIDER:
            corridor = ""
            if ctx.from_country and ctx.to_country:
                corridor = f" ({ctx.from_country}→{ctx.to_country})"
            return f"Provider comparison and recommendation{corridor}"
        if agent == AgentName.COMPLIANCE:
            country = ctx.to_country or ctx.from_country or "specified country"
            return f"KYC/AML compliance requirements for {country}"
        return "General query"

    # ------------------------------------------------------------------
    # Confidence scoring
    # ------------------------------------------------------------------

    def _confidence(self, intents: List[IntentType]) -> float:
        """Return a planning confidence score 0.0–1.0."""
        if IntentType.UNKNOWN in intents and len(intents) == 1:
            return 0.3
        if IntentType.MULTI_DOMAIN in intents:
            return 0.95
        return 0.9


# Alias for backward compatibility
Planner = RuleBasedPlanner

