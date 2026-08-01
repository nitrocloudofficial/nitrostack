"""
RemitWise AI – Exchange Agent
==============================
Specialist agent responsible for all exchange-rate and currency
conversion queries.

Inherits from BaseAgent and implements the _run() method which:
  1. Determines which exchange tools to call based on context
  2. Executes them via self._call_tool()
  3. Returns a structured AgentResponse

Tools used (all in-process calls to exchange_service):
  • get_latest_rate(base, target)
  • convert_amount(base, target, amount)
  • get_historical_rates(base, target, start_date, end_date)
"""

from __future__ import annotations

from datetime import date, timedelta
from typing import Any, Dict, List, Optional

from agents.shared.base_agent import BaseAgent
from agents.shared.schemas import (
    AgentName,
    AgentRequest,
    AgentResponse,
    AgentStatus,
)
from agents.exchange.prompt import EXCHANGE_SYSTEM_PROMPT
from agents.exchange import tools as exchange_tools
from agents.shared.utils import normalize_currency, fmt_currency


class ExchangeAgent(BaseAgent):
    """
    Handles all foreign-exchange queries:
      - Latest rates
      - Currency conversion
      - Historical rate data
    """

    @property
    def name(self) -> AgentName:
        return AgentName.EXCHANGE

    @property
    def description(self) -> str:
        return (
            "Expert foreign exchange agent. Handles live rates, "
            "currency conversion, and historical rate trends."
        )

    @property
    def system_prompt(self) -> str:
        return EXCHANGE_SYSTEM_PROMPT

    # ------------------------------------------------------------------
    # Core logic
    # ------------------------------------------------------------------

    def _run(self, request: AgentRequest) -> AgentResponse:
        ctx = request.context
        tool_calls: List[Any] = []
        data: Dict[str, Any] = {}
        errors: List[str] = []

        # Resolve currencies with fallback normalisation
        base   = self._resolve_currency(ctx.base_currency)
        target = self._resolve_currency(ctx.target_currency)

        if not base or not target:
            return AgentResponse(
                agent=self.name,
                status=AgentStatus.FAILED,
                data={},
                summary=(
                    "Could not determine source or target currency. "
                    "Please specify the currencies (e.g. 'USD to INR')."
                ),
                error="Missing base or target currency in context.",
            )

        # ── Tool 1: Latest rate (always fetch) ──────────────────────
        rate_data, err = self._call_tool(
            "get_latest_rate",
            exchange_tools.get_latest_rate,
            {"base": base, "target": target},
            tool_calls,
        )
        if err:
            errors.append(f"Rate fetch failed: {err}")
        else:
            data["exchange_rate"] = rate_data

        # ── Tool 2: Amount conversion (if amount given) ──────────────
        if ctx.amount and ctx.amount > 0 and rate_data:
            converted, err2 = self._call_tool(
                "convert_amount",
                exchange_tools.convert_amount,
                {"base": base, "target": target, "amount": ctx.amount},
                tool_calls,
            )
            if err2:
                errors.append(f"Conversion failed: {err2}")
            else:
                data["conversion"] = converted

        # ── Summary ─────────────────────────────────────────────────
        summary = self._build_summary(base, target, data, ctx.amount)

        status = (
            AgentStatus.SUCCESS if not errors
            else (AgentStatus.PARTIAL if data else AgentStatus.FAILED)
        )

        return AgentResponse(
            agent=self.name,
            status=status,
            data=data,
            summary=summary,
            tool_calls=tool_calls,
            error="; ".join(errors) if errors and not data else None,
        )

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _resolve_currency(self, raw: Optional[str]) -> Optional[str]:
        """Normalise currency code, returning uppercase ISO-4217 or None."""
        if not raw:
            return None
        normed = normalize_currency(raw)
        return normed or (raw.upper().strip() if len(raw.strip()) == 3 else None)

    def _build_summary(
        self,
        base: str,
        target: str,
        data: Dict[str, Any],
        amount: Optional[float],
    ) -> str:
        """Build a human-readable summary of the exchange agent's findings."""
        parts: List[str] = []

        rate_data = data.get("exchange_rate", {})
        if rate_data:
            rate = rate_data.get("rate", 0)
            dt   = rate_data.get("date", "today")
            src  = rate_data.get("source", "")
            parts.append(
                f"Current {base}/{target} rate: {rate:.4f} (as of {dt}, source: {src})"
            )

        conv = data.get("conversion", {})
        if conv and amount:
            original_fmt  = fmt_currency(amount, base)
            converted_fmt = fmt_currency(conv.get("converted_amount", 0), target)
            parts.append(f"{original_fmt} = {converted_fmt}")

        if not parts:
            return f"Unable to retrieve exchange rate for {base}/{target}."

        return " | ".join(parts)
