"""
RemitWise AI – Compliance Agent
================================
Specialist agent responsible for KYC, AML, required documents,
and country-specific compliance rules.

Inherits from BaseAgent and implements _run() which:
  1. Identifies which country (or countries) are relevant
  2. Fetches KYC, AML, and document requirements for each
  3. Returns a unified structured AgentResponse
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
from agents.compliance.prompt import COMPLIANCE_SYSTEM_PROMPT
from agents.compliance import tools as compliance_tools


class ComplianceAgent(BaseAgent):
    """
    Handles KYC/AML compliance queries for remittance corridors.
    Checks both sender and receiver countries when both are known.
    """

    @property
    def name(self) -> AgentName:
        return AgentName.COMPLIANCE

    @property
    def description(self) -> str:
        return (
            "Compliance expert for international remittance. "
            "Handles KYC requirements, AML rules, required documents, and transfer limits."
        )

    @property
    def system_prompt(self) -> str:
        return COMPLIANCE_SYSTEM_PROMPT

    # ------------------------------------------------------------------
    # Core logic
    # ------------------------------------------------------------------

    def _run(self, request: AgentRequest) -> AgentResponse:
        ctx = request.context
        tool_calls: List[Any] = []
        data: Dict[str, Any] = {}
        errors: List[str] = []

        # Determine which countries to check
        countries_to_check: List[str] = []
        if ctx.to_country:
            countries_to_check.append(ctx.to_country.upper().strip())
        if ctx.from_country and ctx.from_country.upper() != (ctx.to_country or "").upper():
            countries_to_check.append(ctx.from_country.upper().strip())

        if not countries_to_check:
            # Default: check IN (most common destination in demo)
            countries_to_check = ["IN"]
            self._logger.warning("No country in context — defaulting to IN")

        # Process each country
        country_results: Dict[str, Any] = {}
        for code in countries_to_check:
            result = self._check_country(code, tool_calls, errors)
            if result:
                country_results[code] = result

        if not country_results:
            return AgentResponse(
                agent=self.name,
                status=AgentStatus.FAILED,
                data={},
                summary="Could not retrieve compliance data for the specified countries.",
                error="; ".join(errors) if errors else "No compliance data found.",
            )

        # Flatten: primary country is the receiver (first in list)
        primary_code = countries_to_check[0]
        primary      = country_results.get(primary_code, {})

        data["primary_country"]     = primary_code
        data["countries_checked"]   = countries_to_check
        data["compliance"]          = country_results

        # Convenience top-level fields for the Merger to use
        data["kyc_required"]        = primary.get("kyc_required", False)
        data["aml_check"]           = primary.get("aml_check", False)
        data["sanctions_screening"] = primary.get("sanctions_screening", False)
        data["documents"]           = primary.get("documents", [])
        data["risk_level"]          = primary.get("risk_level", "Unknown")
        data["regulatory_framework"] = primary.get("regulatory_framework", [])

        summary = self._build_summary(primary_code, data)
        status  = AgentStatus.SUCCESS if not errors else AgentStatus.PARTIAL

        return AgentResponse(
            agent=self.name,
            status=status,
            data=data,
            summary=summary,
            tool_calls=tool_calls,
            error="; ".join(errors) if errors and not country_results else None,
        )

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _check_country(
        self,
        code: str,
        tool_calls: list,
        errors: list,
    ) -> Optional[Dict[str, Any]]:
        """Run all compliance tools for a single country code."""
        country_data: Dict[str, Any] = {"country_code": code}

        # Full compliance profile
        full_rules, err = self._call_tool(
            "get_country_rules",
            compliance_tools.get_country_rules,
            {"country_code": code},
            tool_calls,
        )
        if err:
            errors.append(f"Rules fetch failed for {code}: {err}")
            return None

        if not full_rules:
            errors.append(f"Country {code} not found in compliance dataset.")
            return None

        # KYC requirements
        kyc, err2 = self._call_tool(
            "get_kyc_requirements",
            compliance_tools.get_kyc_requirements,
            {"country_code": code},
            tool_calls,
        )
        if not err2 and kyc:
            country_data["kyc_required"]   = kyc.get("kyc_required", False)
            country_data["purpose_required"] = kyc.get("purpose_required", False)

        # Required documents
        docs, err3 = self._call_tool(
            "get_required_documents",
            compliance_tools.get_required_documents,
            {"country_code": code},
            tool_calls,
        )
        if not err3:
            country_data["documents"] = docs or []

        # AML requirements
        aml, err4 = self._call_tool(
            "get_aml_requirements",
            compliance_tools.get_aml_requirements,
            {"country_code": code},
            tool_calls,
        )
        if not err4 and aml:
            country_data["aml_check"]           = aml.get("aml_check", False)
            country_data["sanctions_screening"]  = aml.get("sanctions_screening", False)

        # From full rules
        country_data["risk_level"]          = full_rules.get("risk_level", "Unknown")
        country_data["regulatory_framework"] = full_rules.get("regulatory_framework", [])
        country_data["country_name"]        = full_rules.get("country", code)
        country_data["currency"]            = full_rules.get("currency", "")

        return country_data

    def _build_summary(self, primary_code: str, data: Dict[str, Any]) -> str:
        """Build a human-readable compliance summary."""
        parts: List[str] = []

        docs = data.get("documents", [])
        if docs:
            parts.append(f"Required documents: {', '.join(docs)}")

        kyc = data.get("kyc_required", False)
        if kyc:
            parts.append("KYC verification is mandatory")

        aml = data.get("aml_check", False)
        if aml:
            parts.append("AML screening applies")

        sanctions = data.get("sanctions_screening", False)
        if sanctions:
            parts.append("sanctions screening required")

        risk = data.get("risk_level", "")
        if risk:
            parts.append(f"risk level: {risk}")

        if not parts:
            return f"Compliance data retrieved for {primary_code}."

        return f"For {primary_code}: " + "; ".join(parts) + "."
