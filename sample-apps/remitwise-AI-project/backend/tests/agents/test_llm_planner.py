"""
RemitWise AI – LLM Planner & Multi-Provider Unit Tests
======================================================
Tests LLMPlanner, RuleBasedPlanner, provider abstractions (MockProvider, OpenAIProvider, OllamaProvider),
malformed JSON parsing, retries, and Orchestrator fallbacks.
"""

from __future__ import annotations

import json
import pytest
from typing import Dict, Optional

from agents.orchestrator.base_planner import BasePlanner
from agents.orchestrator.planner import RuleBasedPlanner, Planner
from agents.orchestrator.llm_planner import LLMPlanner, LLMPlanResponseModel
from agents.orchestrator.providers import (
    BaseLLMProvider,
    MockProvider,
    OpenAIProvider,
    OllamaProvider,
    get_llm_provider,
)
from agents.orchestrator.orchestrator import OrchestratorAgent
from agents.shared.schemas import AgentName, OrchestratorRequest, ExecutionPlan
from config import settings


# ---------------------------------------------------------------------------
# Test Provider Abstraction
# ---------------------------------------------------------------------------

def test_mock_provider_basic():
    provider = MockProvider()
    res = provider.complete("Send 1000 USD to India, cheapest provider and KYC?")
    data = json.loads(res)
    assert "ExchangeAgent" in data["agents"]
    assert "ProviderAgent" in data["agents"]
    assert "ComplianceAgent" in data["agents"]
    assert data["context"]["base_currency"] == "USD"
    assert data["context"]["to_country"] == "IN"


def test_mock_provider_failure_flag():
    provider = MockProvider(should_fail=True)
    with pytest.raises(RuntimeError) as exc_info:
        provider.complete("USD to INR rate")
    assert "Simulated MockProvider failure" in str(exc_info.value)


def test_mock_provider_canned_response():
    canned = '{"agents": ["ExchangeAgent"], "reasoning": "Test", "context": {}, "confidence": 0.9}'
    provider = MockProvider(canned_response=canned)
    res = provider.complete("Anything")
    assert res == canned


def test_get_llm_provider_factory():
    p_mock = get_llm_provider("mock")
    assert isinstance(p_mock, MockProvider)

    p_openai = get_llm_provider("openai")
    assert isinstance(p_openai, OpenAIProvider)

    p_ollama = get_llm_provider("ollama")
    assert isinstance(p_ollama, OllamaProvider)


# ---------------------------------------------------------------------------
# Test RuleBasedPlanner & Planner Alias
# ---------------------------------------------------------------------------

def test_rule_based_planner_basic():
    planner = RuleBasedPlanner()
    plan = planner.plan("Send 1000 USD to India, cheapest provider")
    assert plan.planner_name == "rule_based"
    assert plan.planning_latency_ms >= 0.0
    assert any(s.agent == AgentName.EXCHANGE for s in plan.steps)
    assert any(s.agent == AgentName.PROVIDER for s in plan.steps)



def test_planner_alias_backward_compatibility():
    planner = Planner()  # should alias RuleBasedPlanner
    assert isinstance(planner, BasePlanner)
    plan = planner.plan("KYC requirements for Philippines")
    assert any(s.agent == AgentName.COMPLIANCE for s in plan.steps)


# ---------------------------------------------------------------------------
# Test LLMPlanner Happy Path & Validation
# ---------------------------------------------------------------------------

def test_llm_planner_happy_path():
    provider = MockProvider()
    planner = LLMPlanner(provider=provider)
    plan = planner.plan("Send 5000 USD to India with Wise, what are the KYC docs?")

    assert plan.planner_name == "llm"
    assert plan.planning_latency_ms >= 0.0
    assert plan.confidence > 0.0
    assert len(plan.steps) == 3
    assert plan.steps[0].agent == AgentName.EXCHANGE
    assert plan.steps[1].agent == AgentName.PROVIDER
    assert plan.steps[2].agent == AgentName.COMPLIANCE
    assert plan.extracted_context.base_currency == "USD"
    assert plan.extracted_context.to_country == "IN"


def test_llm_planner_codeblock_markdown_cleaning():
    markdown_json = """```json
    {
      "agents": ["ExchangeAgent", "ProviderAgent"],
      "reasoning": "Markdown fence wrapped response",
      "context": {
        "base_currency": "EUR",
        "target_currency": "GBP",
        "amount": 250
      },
      "confidence": 0.95
    }
    ```"""
    provider = MockProvider(canned_response=markdown_json)
    planner = LLMPlanner(provider=provider)
    plan = planner.plan("Convert 250 EUR to GBP")

    assert plan.planner_name == "llm"
    assert plan.extracted_context.base_currency == "EUR"
    assert plan.extracted_context.target_currency == "GBP"
    assert plan.extracted_context.amount == 250.0
    assert len(plan.steps) == 2


# ---------------------------------------------------------------------------
# Test Malformed JSON & Retries & Failures
# ---------------------------------------------------------------------------

def test_llm_planner_malformed_json_retry_failure():
    bad_json = "This is not JSON at all!"
    provider = MockProvider(canned_response=bad_json)
    planner = LLMPlanner(provider=provider, max_retries=1)

    with pytest.raises(RuntimeError) as exc_info:
        planner.plan("Send money")
    assert "LLMPlanner failed after 2 attempt(s)" in str(exc_info.value)


def test_llm_planner_pydantic_validation_error():
    invalid_schema = '{"agents": "not a list", "reasoning": 123}'
    provider = MockProvider(canned_response=invalid_schema)
    planner = LLMPlanner(provider=provider, max_retries=0)

    with pytest.raises(RuntimeError) as exc_info:
        planner.plan("Check rates")
    assert "LLMPlanner failed after 1 attempt(s)" in str(exc_info.value)


# ---------------------------------------------------------------------------
# Test Orchestrator Fallback Mechanics
# ---------------------------------------------------------------------------

def test_orchestrator_successful_llm_planning():
    llm_p = LLMPlanner(provider=MockProvider())
    rule_p = RuleBasedPlanner()
    orch = OrchestratorAgent(llm_planner=llm_p, rule_planner=rule_p)

    req = OrchestratorRequest(query="Send 1000 USD to India, best rate?")
    resp = orch.run(req)

    assert resp.status == "success"
    assert "exchange" in resp.agents_used


def test_orchestrator_fallback_to_rule_based_on_llm_failure():
    failing_provider = MockProvider(should_fail=True)
    failing_llm_planner = LLMPlanner(provider=failing_provider, max_retries=0)
    rule_planner = RuleBasedPlanner()

    orch = OrchestratorAgent(llm_planner=failing_llm_planner, rule_planner=rule_planner)

    req = OrchestratorRequest(query="What is the USD to INR exchange rate?")
    resp = orch.run(req)

    # Output should still succeed seamlessly via rule-based fallback!
    assert resp.status == "success"
    assert "exchange" in resp.agents_used
    assert len(resp.plan) > 0


# ---------------------------------------------------------------------------
# Test Ollama Fallback & Provider Service & Metadata Exposure
# ---------------------------------------------------------------------------

def test_ollama_provider_unavailable_autofallback_to_mock():
    # Ollama instance on dummy offline host
    offline_ollama = OllamaProvider(host="http://localhost:59999", timeout=0.1)
    planner = LLMPlanner(provider=offline_ollama, max_retries=0)

    # Should automatically fallback from Ollama to MockProvider without crashing
    plan = planner.plan("Send 1000 USD to India, cheapest provider and KYC?")
    assert plan.planner_name == "llm"
    assert plan.provider_name == "mock"
    assert len(plan.steps) == 3


def test_provider_service_us_to_in_lookup():
    from services.provider_service import compare_providers, get_supported_corridors

    # Query with ISO-2 'US' -> 'IN'
    matches_us = compare_providers("US", "IN")
    assert len(matches_us) >= 3
    provider_names_us = [p["provider_name"] for p in matches_us]
    assert "Wise" in provider_names_us

    # Query with ISO-3 'USA' -> 'IN'
    matches_usa = compare_providers("USA", "IN")
    assert len(matches_usa) == len(matches_us)


def test_execution_plan_metadata_exposure():
    planner = LLMPlanner(provider=MockProvider())
    plan = planner.plan("Convert 100 USD to INR")

    assert plan.planner_name == "llm"
    assert plan.provider_name == "mock"
    assert plan.confidence > 0.0
    assert plan.planning_latency_ms >= 0.0
    assert plan.reasoning is not None

