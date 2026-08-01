"""
RemitWise AI – Mock LLM Provider
=================================
Mock provider for deterministic testing, offline development, and unit test isolation.
Does not perform any network calls.
"""

from __future__ import annotations

import json
import re
from typing import Dict, List, Optional

from agents.orchestrator.providers.base_provider import BaseLLMProvider
from agents.shared.logger import AgentLogger

logger = AgentLogger("MockProvider")


class MockProvider(BaseLLMProvider):
    """
    Mock LLM Provider that generates realistic JSON responses based on prompt keywords,
    or returns custom canned responses for testing edge cases.
    """

    def __init__(
        self,
        canned_response: Optional[str] = None,
        should_fail: bool = False,
        failure_message: str = "Simulated MockProvider failure",
    ) -> None:
        self.canned_response = canned_response
        self.should_fail = should_fail
        self.failure_message = failure_message

    @property
    def provider_name(self) -> str:
        return "mock"

    def complete(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
    ) -> str:
        """
        Generate mock JSON completion text.
        """
        if self.should_fail:
            raise RuntimeError(self.failure_message)

        if self.canned_response is not None:
            return self.canned_response

        # Analyze prompt text to infer reasonable mock output
        q_lower = prompt.lower()

        agents: List[str] = []
        base_currency: Optional[str] = None
        target_currency: Optional[str] = None
        amount: Optional[float] = None
        from_country: Optional[str] = None
        to_country: Optional[str] = None

        # Check currencies
        currencies = re.findall(r"\b(USD|EUR|GBP|INR|JPY|AED|CAD|AUD|MXN|PHP)\b", prompt, re.IGNORECASE)
        currencies = [c.upper() for c in currencies]
        if currencies:
            base_currency = currencies[0]
            if len(currencies) > 1:
                target_currency = currencies[1]

        # Check amount
        amt_match = re.search(r"\b(\d+(?:\.\d+)?)\b", prompt)
        if amt_match:
            try:
                amt_val = float(amt_match.group(1))
                if 1.0 <= amt_val <= 1_000_000:
                    amount = amt_val
            except ValueError:
                pass

        # Check countries
        if "india" in q_lower or "inr" in q_lower:
            to_country = "IN"
            if not target_currency:
                target_currency = "INR"
        if "us" in q_lower or "usa" in q_lower or "america" in q_lower or "usd" in q_lower:
            from_country = "US"
            if not base_currency:
                base_currency = "USD"
        if "philippines" in q_lower or "php" in q_lower:
            to_country = "PH"
            target_currency = "PHP"
        if "mexico" in q_lower or "mxn" in q_lower:
            to_country = "MX"
            target_currency = "MXN"

        # Check domain intents
        if any(w in q_lower for w in ["rate", "rates", "convert", "conversion", "how much", "usd", "inr", "exchange", "val"]):
            agents.append("ExchangeAgent")
        if any(w in q_lower for w in ["provider", "providers", "cheapest", "compare", "wise", "remitly", "western", "union", "fee", "speed", "cash", "pickup", "counter", "branch", "send", "transfer"]):
            agents.append("ProviderAgent")
        if any(w in q_lower for w in ["kyc", "aml", "compliance", "document", "documents", "passport", "id", "require"]):
            agents.append("ComplianceAgent")

        if not agents:
            agents = ["ExchangeAgent"]

        # Deduplicate while preserving order
        unique_agents = []
        for a in agents:
            if a not in unique_agents:
                unique_agents.append(a)

        reasoning = f"MockProvider inferred required agents ({', '.join(unique_agents)}) from prompt."

        mock_payload = {
            "agents": unique_agents,
            "reasoning": reasoning,
            "context": {
                "base_currency": base_currency,
                "target_currency": target_currency,
                "amount": amount,
                "from_country": from_country,
                "to_country": to_country,
            },
            "confidence": 0.98,
        }

        return json.dumps(mock_payload, indent=2)
