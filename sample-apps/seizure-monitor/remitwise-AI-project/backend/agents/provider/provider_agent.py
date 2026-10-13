"""
RemitWise AI – Provider Agent
==============================
Specialist agent responsible for provider comparison, recommendation,
and detailed provider information queries.

Inherits from BaseAgent and implements _run() which:
  1. Determines the corridor from context (from_country → to_country)
  2. Calls compare_providers to get the matching list
  3. Applies ranking logic to find the best provider
  4. Returns structured AgentResponse with recommendation
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from agents.shared.base_agent import BaseAgent
from agents.shared.schemas import (
    AgentName,
    AgentRequest,
    AgentResponse,
    AgentStatus,
)
from agents.provider.prompt import PROVIDER_SYSTEM_PROMPT
from agents.provider import tools as provider_tools


# Fee model ranking: lower index = lower fee preference
_FEE_RANK = {
    "no_fee":          0,
    "low_flat":        1,
    "flat":            2,
    "percentage":      3,
    "fx_markup_only":  1,
    "flat_plus_fx":    4,
    "unknown":         5,
}

# Delivery speed ranking: lower index = faster
_SPEED_RANK = {
    "instant":          0,
    "minutes":          0,
    "1_hour":           1,
    "same_day":         2,
    "1-3_days":         3,
    "1_3_business_days":3,
    "2_5_business_days":4,
    "3_5_business_days":5,
    "unknown":          6,
}


class ProviderAgent(BaseAgent):
    """
    Handles remittance provider comparison and recommendation.
    Determines the best provider for a given corridor.
    """

    @property
    def name(self) -> AgentName:
        return AgentName.PROVIDER

    @property
    def description(self) -> str:
        return (
            "International remittance provider expert. "
            "Compares providers by fee, speed, and rating for any corridor."
        )

    @property
    def system_prompt(self) -> str:
        return PROVIDER_SYSTEM_PROMPT

    # ------------------------------------------------------------------
    # Core logic
    # ------------------------------------------------------------------

    def _run(self, request: AgentRequest) -> AgentResponse:
        ctx = request.context
        tool_calls: List[Any] = []
        data: Dict[str, Any] = {}
        errors: List[str] = []

        from_country = (ctx.from_country or "US").upper().strip()
        to_country   = (ctx.to_country   or "IN").upper().strip()

        # ── Tool 1: Compare providers for the corridor ───────────────
        providers, err = self._call_tool(
            "compare_providers",
            provider_tools.compare_providers,
            {"from_country": from_country, "to_country": to_country},
            tool_calls,
        )
        if err:
            errors.append(f"Provider compare failed: {err}")
        elif not providers:
            errors.append(
                f"No providers found for corridor {from_country} → {to_country}"
            )
        else:
            query_str = (ctx.raw_query or "").strip()
            ranked     = self._rank_providers(providers, query=query_str)
            best       = ranked[0] if ranked else None
            data["corridor"]         = f"{from_country} → {to_country}"
            data["all_providers"]    = ranked
            data["best_provider"]    = best.get("provider_id") if best else None
            data["best_provider_name"] = best.get("provider_name") if best else None
            data["recommendation_reason"] = self._build_reason(best) if best else ""
            data["provider_count"]   = len(ranked)

        # ── Tool 2: Get corridor list (informational) ────────────────
        corridors, err2 = self._call_tool(
            "get_corridors",
            provider_tools.get_corridors,
            {"from_country": from_country, "to_country": to_country},
            tool_calls,
        )
        if not err2 and corridors:
            data["corridor_support"] = corridors

        # ── Summary ─────────────────────────────────────────────────
        summary = self._build_summary(from_country, to_country, data)

        status = (
            AgentStatus.SUCCESS if data.get("best_provider")
            else (AgentStatus.PARTIAL if data else AgentStatus.FAILED)
        )

        return AgentResponse(
            agent=self.name,
            status=status,
            data=data,
            summary=summary,
            tool_calls=tool_calls,
            error="; ".join(errors) if errors and not data.get("best_provider") else None,
        )

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _rank_providers(self, providers: List[Dict[str, Any]], query: str = "") -> List[Dict[str, Any]]:
        """
        Rank providers based on user query intent (cash pickup, instant speed, low fees)
        and baseline fee/speed scores.
        """
        q_lower = query.lower() if query else ""

        is_cash_requested = any(w in q_lower for w in ["cash", "pickup", "counter", "branch"])
        is_fast_requested = any(w in q_lower for w in ["urgent", "instant", "fast", "minute", "emergency"])

        def score(p: Dict[str, Any]) -> tuple:
            p_id = str(p.get("provider_id", "")).lower()
            p_name = str(p.get("provider_name", "")).lower()
            payouts = [str(m).lower() for m in p.get("payout_methods", [])]
            payments = [str(m).lower() for m in p.get("payment_methods", [])]
            speed = str(p.get("delivery_speed", "")).lower()
            fee_model = str(p.get("fee_model", "unknown")).lower().replace(" ", "_")

            # Intent boost score (lower is better)
            intent_penalty = 0

            # If user explicitly asked about a provider by name/id
            if p_id in q_lower or p_name in q_lower or (p_id == "western_union" and "western" in q_lower):
                intent_penalty -= 200

            if is_cash_requested:
                has_cash = any("cash" in m for m in payouts + payments)
                if not has_cash:
                    intent_penalty += 100 # Heavily penalize non-cash providers if cash is requested!

            if is_fast_requested:
                if "minute" in speed or "instant" in speed:
                    intent_penalty -= 5

            fee_score = _FEE_RANK.get(fee_model, 5)
            speed_score = _SPEED_RANK.get(speed.replace(" ", "_"), 6)

            return (intent_penalty, fee_score, speed_score)

        return sorted(providers, key=score)

    def _build_reason(self, provider: Dict[str, Any]) -> str:
        """Build a plain-English recommendation reason for the top provider."""
        parts = []
        name = provider.get("provider_name", "This provider")
        fee  = provider.get("fee_model", "")
        speed = provider.get("delivery_speed", "")
        methods = provider.get("payment_methods", [])

        if fee:
            parts.append(f"offers a {fee} fee structure")
        if speed:
            parts.append(f"delivers in {speed}")
        if methods:
            parts.append(f"accepts {', '.join(methods[:3])}")

        if not parts:
            return f"{name} is the top-rated option for this corridor."
        return f"{name} is recommended — it {', '.join(parts)}."

    def _build_summary(
        self,
        from_country: str,
        to_country: str,
        data: Dict[str, Any],
    ) -> str:
        """Build a human-readable summary of the provider agent's findings."""
        if not data.get("best_provider"):
            return (
                f"No providers found supporting the {from_country} → {to_country} corridor."
            )

        best_name  = data.get("best_provider_name", data["best_provider"])
        count      = data.get("provider_count", 0)
        reason     = data.get("recommendation_reason", "")
        corridor   = data.get("corridor", f"{from_country} → {to_country}")

        return (
            f"Found {count} provider(s) for {corridor}. "
            f"Top recommendation: {best_name}. {reason}"
        )
