"""
Tests for the Orchestrator Planner.

Covers:
  - Single-domain intent detection
  - Multi-domain intent detection
  - Context extraction (currencies, countries, amounts)
  - Agent selection
  - Edge cases (empty query, ambiguous query)
"""

import sys
import os

# Ensure project root is importable
_BACKEND_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if _BACKEND_ROOT not in sys.path:
    sys.path.insert(0, _BACKEND_ROOT)

import pytest
from agents.orchestrator.planner import Planner
from agents.shared.schemas import AgentName, IntentType


@pytest.fixture
def planner() -> Planner:
    return Planner()


# ---------------------------------------------------------------------------
# Single-domain: Exchange
# ---------------------------------------------------------------------------

class TestExchangeIntentDetection:

    def test_explicit_rate_query(self, planner):
        plan = planner.plan("What is the USD to INR exchange rate?")
        assert AgentName.EXCHANGE in [s.agent for s in plan.steps]
        assert len(plan.steps) == 1

    def test_conversion_query(self, planner):
        plan = planner.plan("Convert 500 USD to INR")
        assert AgentName.EXCHANGE in [s.agent for s in plan.steps]
        assert plan.extracted_context.base_currency == "USD"
        assert plan.extracted_context.target_currency == "INR"
        assert plan.extracted_context.amount == 500.0

    def test_currency_code_extraction(self, planner):
        plan = planner.plan("GBP to EUR rate please")
        ctx = plan.extracted_context
        assert ctx.base_currency == "GBP"
        assert ctx.target_currency == "EUR"

    def test_amount_extraction_with_commas(self, planner):
        plan = planner.plan("How much is 1,000 USD in INR?")
        assert plan.extracted_context.amount == 1000.0

    def test_amount_extraction_plain(self, planner):
        plan = planner.plan("Send 250 dollars to India")
        assert plan.extracted_context.amount == 250.0


# ---------------------------------------------------------------------------
# Single-domain: Provider
# ---------------------------------------------------------------------------

class TestProviderIntentDetection:

    def test_cheapest_provider_query(self, planner):
        plan = planner.plan("What is the cheapest provider for US to India?")
        assert AgentName.PROVIDER in [s.agent for s in plan.steps]

    def test_compare_providers_query(self, planner):
        plan = planner.plan("Compare remittance providers from US to IN")
        assert AgentName.PROVIDER in [s.agent for s in plan.steps]

    def test_country_extraction_from_india(self, planner):
        plan = planner.plan("best provider to send money to India")
        ctx = plan.extracted_context
        assert ctx.to_country == "IN"

    def test_wise_specific_query(self, planner):
        plan = planner.plan("Tell me about Wise fees")
        agents = [s.agent for s in plan.steps]
        assert AgentName.PROVIDER in agents


# ---------------------------------------------------------------------------
# Single-domain: Compliance
# ---------------------------------------------------------------------------

class TestComplianceIntentDetection:

    def test_kyc_query(self, planner):
        plan = planner.plan("What KYC documents do I need for India?")
        assert AgentName.COMPLIANCE in [s.agent for s in plan.steps]

    def test_document_query(self, planner):
        plan = planner.plan("What documents are required to send money to India?")
        assert AgentName.COMPLIANCE in [s.agent for s in plan.steps]

    def test_aml_query(self, planner):
        plan = planner.plan("What are the AML requirements for transfers to Philippines?")
        assert AgentName.COMPLIANCE in [s.agent for s in plan.steps]

    def test_country_extraction_philippines(self, planner):
        plan = planner.plan("compliance rules for Philippines")
        ctx = plan.extracted_context
        assert ctx.to_country == "PH"


# ---------------------------------------------------------------------------
# Multi-domain queries
# ---------------------------------------------------------------------------

class TestMultiDomainDetection:

    def test_full_remittance_query(self, planner):
        plan = planner.plan(
            "I want to send 1000 USD to India. "
            "Which provider is cheapest? What KYC documents do I need?"
        )
        agents = [s.agent for s in plan.steps]
        assert AgentName.EXCHANGE in agents
        assert AgentName.PROVIDER in agents
        assert AgentName.COMPLIANCE in agents
        assert plan.is_multi_domain is True

    def test_two_domain_query(self, planner):
        plan = planner.plan("compare providers and check compliance for US to India")
        agents = [s.agent for s in plan.steps]
        assert AgentName.PROVIDER in agents
        assert AgentName.COMPLIANCE in agents

    def test_execution_order(self, planner):
        """Exchange should always be first, then Provider, then Compliance."""
        plan = planner.plan(
            "USD to INR rate, cheapest provider, and KYC for India"
        )
        agents = [s.agent for s in plan.steps]
        if AgentName.EXCHANGE in agents and AgentName.PROVIDER in agents:
            assert agents.index(AgentName.EXCHANGE) < agents.index(AgentName.PROVIDER)
        if AgentName.PROVIDER in agents and AgentName.COMPLIANCE in agents:
            assert agents.index(AgentName.PROVIDER) < agents.index(AgentName.COMPLIANCE)


# ---------------------------------------------------------------------------
# Context override
# ---------------------------------------------------------------------------

class TestContextOverride:

    def test_override_country(self, planner):
        plan = planner.plan(
            "what's the rate?",
            context_override={"from_country": "US", "to_country": "IN", "base_currency": "USD", "target_currency": "INR"}
        )
        ctx = plan.extracted_context
        assert ctx.from_country == "US"
        assert ctx.to_country == "IN"

    def test_override_amount(self, planner):
        plan = planner.plan(
            "send money to india",
            context_override={"amount": 5000.0}
        )
        assert plan.extracted_context.amount == 5000.0


# ---------------------------------------------------------------------------
# Edge cases
# ---------------------------------------------------------------------------

class TestEdgeCases:

    def test_empty_query_does_not_crash(self, planner):
        plan = planner.plan("hello")
        # Should return a plan with at least one agent (fallback)
        assert len(plan.steps) >= 1

    def test_plan_has_priority_ordering(self, planner):
        plan = planner.plan("compare providers and rates for USD to INR")
        priorities = [s.priority for s in plan.steps]
        assert priorities == sorted(priorities)

    def test_confidence_high_for_clear_queries(self, planner):
        plan = planner.plan("USD to INR exchange rate")
        assert plan.confidence >= 0.8

    def test_plan_steps_have_reasons(self, planner):
        plan = planner.plan("cheapest provider US to India")
        for step in plan.steps:
            assert len(step.reason) > 0
