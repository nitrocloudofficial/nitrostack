"""
RemitWise AI – Response Merger
================================
Synthesises multiple AgentResponse objects into a single coherent answer.

Responsibilities:
  • Combine data from all agents into one flat result dict
  • Generate a unified natural-language summary
  • Avoid information duplication
  • Degrade gracefully when some agents failed (partial results)

Design: pure function — no I/O, no state, fully testable.

Usage::

    merger = Merger()
    final = merger.merge(responses=[exchange_resp, provider_resp, compliance_resp])
    # final.summary: "Current USD/INR rate is 96.56. Wise is the cheapest provider..."
    # final.results: { "exchange": {...}, "provider": {...}, "compliance": {...} }
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from agents.shared.logger import AgentLogger
from agents.shared.schemas import AgentName, AgentResponse, AgentStatus
from agents.shared.utils import fmt_currency

logger = AgentLogger("Merger")


class MergeResult:
    """Simple container for merger output."""
    def __init__(
        self,
        results: Dict[str, Any],
        summary: str,
        status: str,
        agents_used: List[str],
    ) -> None:
        self.results     = results
        self.summary     = summary
        self.status      = status
        self.agents_used = agents_used


class Merger:
    """
    Merges AgentResponse objects from multiple specialist agents into a
    single coherent response.
    """

    def __init__(self) -> None:
        self._logger = logger

    def merge(self, responses: List[AgentResponse]) -> MergeResult:
        """
        Merge all agent responses into a unified result.

        Parameters
        ----------
        responses : list[AgentResponse]
            One or more agent responses, in execution order.

        Returns
        -------
        MergeResult
        """
        if not responses:
            return MergeResult(
                results={},
                summary="No agents executed — unable to answer the query.",
                status="failed",
                agents_used=[],
            )

        # Split by success/failure
        successful = [r for r in responses if r.status != AgentStatus.FAILED]
        failed     = [r for r in responses if r.status == AgentStatus.FAILED]

        # Build keyed results dict (agent name → data payload)
        results: Dict[str, Any] = {}
        for resp in responses:
            results[resp.agent.value] = {
                "status":           resp.status.value,
                "data":             resp.data,
                "summary":          resp.summary,
                "tool_calls_count": len(resp.tool_calls),
                "execution_ms":     resp.execution_time_ms,
                "error":            resp.error,
            }

        # Generate merged summary
        summary = self._build_summary(successful, failed)

        # Overall status
        if not successful:
            status = "failed"
        elif failed:
            status = "partial"
        else:
            status = "success"

        agents_used = [r.agent.value for r in responses]

        self._logger.log_merge(agents_used, summary[:80])

        return MergeResult(
            results=results,
            summary=summary,
            status=status,
            agents_used=agents_used,
        )

    # ------------------------------------------------------------------
    # Summary generation
    # ------------------------------------------------------------------

    def _build_summary(
        self,
        successful: List[AgentResponse],
        failed: List[AgentResponse],
    ) -> str:
        """
        Compose a natural-language paragraph merging all agent summaries.
        Each domain contributes one clear sentence.
        """
        parts: List[str] = []

        # ── Exchange section ─────────────────────────────────────────
        exchange_resp = self._find(successful, AgentName.EXCHANGE)
        if exchange_resp:
            parts.append(self._exchange_paragraph(exchange_resp.data))

        # ── Provider section ─────────────────────────────────────────
        provider_resp = self._find(successful, AgentName.PROVIDER)
        if provider_resp:
            parts.append(self._provider_paragraph(provider_resp.data))

        # ── Compliance section ───────────────────────────────────────
        compliance_resp = self._find(successful, AgentName.COMPLIANCE)
        if compliance_resp:
            parts.append(self._compliance_paragraph(compliance_resp.data))

        # ── Failures ────────────────────────────────────────────────
        for f in failed:
            parts.append(
                f"⚠ Note: {f.agent.value.capitalize()} agent could not complete "
                f"({f.error or 'unknown error'})."
            )

        if not parts:
            return "Unable to process your query. Please try again."

        return " ".join(parts)

    # ------------------------------------------------------------------
    # Per-domain paragraph builders
    # ------------------------------------------------------------------

    def _exchange_paragraph(self, data: Dict[str, Any]) -> str:
        rate_data = data.get("exchange_rate", {})
        conv_data = data.get("conversion", {})

        if not rate_data and not conv_data:
            return "Exchange rate data is unavailable at this time."

        sentences: List[str] = []

        if rate_data:
            base   = rate_data.get("base", "")
            target = rate_data.get("target", "")
            rate   = rate_data.get("rate", 0)
            dt     = rate_data.get("date", "")
            src    = rate_data.get("source", "")
            sentences.append(
                f"💱 Current {base}/{target} rate: {rate:.4f}"
                + (f" (as of {dt}" + (f" via {src})" if src else ")") if dt else "")
                + "."
            )

        if conv_data:
            orig  = conv_data.get("original_amount", 0)
            conv  = conv_data.get("converted_amount", 0)
            base  = conv_data.get("base", "")
            tgt   = conv_data.get("target", "")
            sentences.append(
                f"You will receive approximately "
                f"{fmt_currency(conv, tgt)} for {fmt_currency(orig, base)}."
            )

        return " ".join(sentences)

    def _provider_paragraph(self, data: Dict[str, Any]) -> str:
        best_name = data.get("best_provider_name", data.get("best_provider", ""))
        corridor  = data.get("corridor", "")
        count     = data.get("provider_count", 0)
        reason    = data.get("recommendation_reason", "")

        if not best_name:
            return f"No providers found for the {corridor} corridor."

        parts = [f"🏦 For the {corridor} corridor, {count} provider(s) are available."]
        parts.append(f"Top recommendation: {best_name}.")
        if reason:
            parts.append(reason)
        return " ".join(parts)

    def _compliance_paragraph(self, data: Dict[str, Any]) -> str:
        country   = data.get("primary_country", "")
        docs      = data.get("documents", [])
        kyc       = data.get("kyc_required", False)
        aml       = data.get("aml_check", False)
        sanctions = data.get("sanctions_screening", False)
        risk      = data.get("risk_level", "")

        if not country and not docs:
            return "Compliance information is unavailable."

        parts: List[str] = []
        if country:
            parts.append(f"📋 Compliance for {country}:")
        if kyc:
            parts.append("KYC verification required.")
        if docs:
            parts.append(f"Required documents: {', '.join(docs)}.")
        if aml:
            parts.append("AML screening applies.")
        if sanctions:
            parts.append("Sanctions screening required.")
        if risk:
            parts.append(f"Risk level: {risk}.")

        return " ".join(parts)

    # ------------------------------------------------------------------
    # Utility
    # ------------------------------------------------------------------

    def _find(
        self,
        responses: List[AgentResponse],
        name: AgentName,
    ) -> Optional[AgentResponse]:
        """Return the first response matching the given agent name."""
        for r in responses:
            if r.agent == name:
                return r
        return None
