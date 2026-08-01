"""
Tests for Exchange, Provider, Compliance Agents and the Merger.
Uses mocking to avoid live API calls.
"""

import sys
import os
from unittest.mock import patch, MagicMock

_BACKEND_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if _BACKEND_ROOT not in sys.path:
    sys.path.insert(0, _BACKEND_ROOT)

import pytest
from agents.shared.schemas import (
    AgentContext, AgentName, AgentRequest, AgentStatus
)
from agents.exchange.exchange_agent import ExchangeAgent
from agents.provider.provider_agent import ProviderAgent
from agents.compliance.compliance_agent import ComplianceAgent
from agents.orchestrator.merger import Merger


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

def make_request(
    base="USD", target="INR", amount=None,
    from_country="US", to_country="IN",
    query="test query"
) -> AgentRequest:
    return AgentRequest(
        session_id="test-session",
        context=AgentContext(
            base_currency=base,
            target_currency=target,
            amount=amount,
            from_country=from_country,
            to_country=to_country,
            raw_query=query,
        ),
    )


MOCK_RATE_DATA = {
    "base": "USD", "target": "INR", "rate": 96.56,
    "date": "2026-07-25", "source": "Frankfurter API (Live)",
    "cache": "LIVE", "latency_ms": 42.0, "provider": "Frankfurter API",
}

MOCK_CONVERT_DATA = {
    "base": "USD", "target": "INR",
    "original_amount": 1000.0, "converted_amount": 96560.0,
    "rate": 96.56, "date": "2026-07-25",
    "source": "Frankfurter API (Live)", "cache": "LIVE", "latency_ms": 42.0,
}

MOCK_PROVIDERS = [
    {
        "provider_id": "wise",
        "provider_name": "Wise",
        "website": "https://wise.com",
        "payment_methods": ["bank_transfer", "debit_card"],
        "payout_methods": ["bank_deposit"],
        "delivery_speed": "instant",
        "fee_model": "low_flat",
        "tracking_available": True,
    },
    {
        "provider_id": "western_union",
        "provider_name": "Western Union",
        "website": "https://westernunion.com",
        "payment_methods": ["cash", "bank_transfer"],
        "payout_methods": ["cash_pickup", "bank_deposit"],
        "delivery_speed": "same_day",
        "fee_model": "flat_plus_fx",
        "tracking_available": True,
    },
]

MOCK_COMPLIANCE = {
    "country": "India",
    "currency": "INR",
    "kyc_required": True,
    "required_documents": ["Passport", "Aadhaar Card", "Proof of Address"],
    "purpose_required": True,
    "aml_check": True,
    "sanctions_screening": True,
    "risk_level": "Low",
    "regulatory_framework": ["FEMA", "PMLA"],
}


# ---------------------------------------------------------------------------
# Exchange Agent Tests
# ---------------------------------------------------------------------------

class TestExchangeAgent:

    @patch("agents.exchange.tools.exchange_service")
    def test_rate_lookup_success(self, mock_service):
        mock_service.get_latest_rate.return_value = MOCK_RATE_DATA
        agent = ExchangeAgent()
        req   = make_request(query="USD to INR rate")
        resp  = agent.execute(req)

        assert resp.agent == AgentName.EXCHANGE
        assert resp.status == AgentStatus.SUCCESS
        assert "exchange_rate" in resp.data
        assert resp.data["exchange_rate"]["rate"] == 96.56
        assert "96.56" in resp.summary

    @patch("agents.exchange.tools.exchange_service")
    def test_conversion_success(self, mock_service):
        mock_service.get_latest_rate.return_value = MOCK_RATE_DATA
        mock_service.convert_amount.return_value  = MOCK_CONVERT_DATA
        agent = ExchangeAgent()
        req   = make_request(amount=1000.0, query="convert 1000 USD to INR")
        resp  = agent.execute(req)

        assert resp.status == AgentStatus.SUCCESS
        assert "conversion" in resp.data
        assert resp.data["conversion"]["converted_amount"] == 96560.0

    def test_missing_currency_returns_failed(self):
        agent = ExchangeAgent()
        req   = AgentRequest(
            session_id="test",
            context=AgentContext(raw_query="what is the rate?"),
        )
        resp = agent.execute(req)
        assert resp.status == AgentStatus.FAILED

    @patch("agents.exchange.tools.exchange_service")
    def test_tool_failure_returns_partial_or_failed(self, mock_service):
        mock_service.get_latest_rate.side_effect = ConnectionError("API down")
        agent = ExchangeAgent()
        req   = make_request()
        resp  = agent.execute(req)
        # Should not raise — must return FAILED response
        assert resp.status in (AgentStatus.FAILED, AgentStatus.PARTIAL)
        assert resp.error is not None


# ---------------------------------------------------------------------------
# Provider Agent Tests
# ---------------------------------------------------------------------------

class TestProviderAgent:

    @patch("agents.provider.tools.provider_service")
    def test_compare_success(self, mock_service):
        mock_service.compare_providers.return_value   = MOCK_PROVIDERS
        mock_service.get_supported_corridors.return_value = []
        agent = ProviderAgent()
        req   = make_request(query="compare providers US to India")
        resp  = agent.execute(req)

        assert resp.agent == AgentName.PROVIDER
        assert resp.status == AgentStatus.SUCCESS
        assert resp.data["best_provider"] == "wise"  # wise ranks first (low_flat + instant)
        assert resp.data["provider_count"] == 2

    @patch("agents.provider.tools.provider_service")
    def test_no_providers_returns_failed(self, mock_service):
        mock_service.compare_providers.return_value   = []
        mock_service.get_supported_corridors.return_value = []
        agent = ProviderAgent()
        req   = make_request()
        resp  = agent.execute(req)
        assert resp.status in (AgentStatus.FAILED, AgentStatus.PARTIAL)

    @patch("agents.provider.tools.provider_service")
    def test_ranking_prefers_low_fee_fast_delivery(self, mock_service):
        mock_service.compare_providers.return_value = MOCK_PROVIDERS
        mock_service.get_supported_corridors.return_value = []
        agent  = ProviderAgent()
        req    = make_request()
        resp   = agent.execute(req)
        # Wise (low_flat + instant) should beat Western Union (flat_plus_fx + same_day)
        assert resp.data["best_provider"] == "wise"


# ---------------------------------------------------------------------------
# Compliance Agent Tests
# ---------------------------------------------------------------------------

class TestComplianceAgent:

    @patch("agents.compliance.tools.compliance_service")
    def test_compliance_success(self, mock_service):
        mock_service.get_country_rules.return_value      = MOCK_COMPLIANCE
        mock_service.get_kyc_requirements.return_value   = {
            "kyc_required": True, "required_documents": ["Passport"], "purpose_required": True
        }
        mock_service.get_required_documents.return_value = ["Passport", "Aadhaar Card"]
        mock_service.get_aml_requirements.return_value   = {
            "aml_check": True, "sanctions_screening": True
        }
        agent = ComplianceAgent()
        req   = make_request(query="KYC for India")
        resp  = agent.execute(req)

        assert resp.agent == AgentName.COMPLIANCE
        assert resp.status == AgentStatus.SUCCESS
        assert resp.data["kyc_required"] is True
        assert "Passport" in resp.data["documents"]

    @patch("agents.compliance.tools.compliance_service")
    def test_unknown_country_returns_failed(self, mock_service):
        mock_service.get_country_rules.return_value = None
        agent = ComplianceAgent()
        req   = AgentRequest(
            session_id="test",
            context=AgentContext(to_country="ZZ", raw_query="compliance for ZZ"),
        )
        resp = agent.execute(req)
        assert resp.status in (AgentStatus.FAILED, AgentStatus.PARTIAL)


# ---------------------------------------------------------------------------
# Merger Tests
# ---------------------------------------------------------------------------

class TestMerger:

    def _make_exchange_resp(self) -> "AgentResponse":
        from agents.shared.schemas import AgentResponse, AgentStatus, AgentName
        return AgentResponse(
            agent=AgentName.EXCHANGE,
            status=AgentStatus.SUCCESS,
            data={
                "exchange_rate": MOCK_RATE_DATA,
                "conversion": MOCK_CONVERT_DATA,
            },
            summary="USD/INR rate: 96.56",
        )

    def _make_provider_resp(self) -> "AgentResponse":
        from agents.shared.schemas import AgentResponse, AgentStatus, AgentName
        return AgentResponse(
            agent=AgentName.PROVIDER,
            status=AgentStatus.SUCCESS,
            data={
                "corridor": "US → IN",
                "best_provider": "wise",
                "best_provider_name": "Wise",
                "provider_count": 2,
                "recommendation_reason": "Wise offers low fees.",
            },
            summary="Wise is the top provider.",
        )

    def _make_compliance_resp(self) -> "AgentResponse":
        from agents.shared.schemas import AgentResponse, AgentStatus, AgentName
        return AgentResponse(
            agent=AgentName.COMPLIANCE,
            status=AgentStatus.SUCCESS,
            data={
                "primary_country": "IN",
                "kyc_required": True,
                "documents": ["Passport", "Aadhaar Card"],
                "aml_check": True,
                "sanctions_screening": True,
                "risk_level": "Low",
            },
            summary="KYC required, bring passport.",
        )

    def test_merge_single_exchange(self):
        merger = Merger()
        result = merger.merge([self._make_exchange_resp()])
        assert result.status == "success"
        assert "exchange" in result.results
        assert "96.56" in result.summary

    def test_merge_all_three_agents(self):
        merger = Merger()
        result = merger.merge([
            self._make_exchange_resp(),
            self._make_provider_resp(),
            self._make_compliance_resp(),
        ])
        assert result.status == "success"
        assert len(result.agents_used) == 3
        assert "exchange" in result.results
        assert "provider" in result.results
        assert "compliance" in result.results
        # Summary should mention all three domains
        assert any(kw in result.summary.lower() for kw in ["rate", "usd", "inr"])
        assert "wise" in result.summary.lower()
        assert any(kw in result.summary.lower() for kw in ["kyc", "passport", "document"])

    def test_merge_empty_returns_failed(self):
        merger  = Merger()
        result  = merger.merge([])
        assert result.status == "failed"

    def test_partial_failure_handled(self):
        from agents.shared.schemas import AgentResponse, AgentStatus, AgentName
        failed_resp = AgentResponse(
            agent=AgentName.PROVIDER,
            status=AgentStatus.FAILED,
            data={},
            summary="",
            error="Provider API unavailable",
        )
        merger = Merger()
        result = merger.merge([self._make_exchange_resp(), failed_resp])
        assert result.status == "partial"
        assert "provider" in result.results
        assert result.results["provider"]["error"] == "Provider API unavailable"
