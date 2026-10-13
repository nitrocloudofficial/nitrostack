"""
End-to-end Orchestrator Tests via the /agent/chat HTTP endpoint.
Uses FastAPI TestClient with mocked backend services.
"""

import sys
import os
from unittest.mock import patch

_BACKEND_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if _BACKEND_ROOT not in sys.path:
    sys.path.insert(0, _BACKEND_ROOT)

import pytest
from fastapi.testclient import TestClient
from api.app import app

client = TestClient(app)

# Shared mock data
MOCK_RATE   = {"base": "USD", "target": "INR", "rate": 96.56, "date": "2026-07-25",
               "source": "Frankfurter API (Live)", "cache": "LIVE", "latency_ms": 42.0,
               "provider": "Frankfurter API", "previous_close": 96.37, "timestamp": "2026-07-25T10:00:00Z",
               "last_updated": "2026-07-25T10:00:00Z", "market": "Mid-Market"}
MOCK_CONV   = {"base": "USD", "target": "INR", "original_amount": 1000.0,
               "converted_amount": 96560.0, "rate": 96.56, "date": "2026-07-25",
               "source": "Frankfurter API (Live)", "cache": "LIVE", "latency_ms": 42.0}
MOCK_PROVS  = [{"provider_id": "wise", "provider_name": "Wise",
                "website": "https://wise.com", "payment_methods": ["bank_transfer"],
                "payout_methods": ["bank_deposit"], "delivery_speed": "instant",
                "fee_model": "low_flat", "tracking_available": True}]
MOCK_COMP   = {"country": "India", "currency": "INR", "kyc_required": True,
               "required_documents": ["Passport", "Aadhaar Card"],
               "purpose_required": True, "aml_check": True,
               "sanctions_screening": True, "risk_level": "Low",
               "regulatory_framework": ["FEMA", "PMLA"]}
MOCK_KYC    = {"kyc_required": True, "required_documents": ["Passport"], "purpose_required": True}
MOCK_AML    = {"aml_check": True, "sanctions_screening": True}
MOCK_DOCS   = ["Passport", "Aadhaar Card"]


class TestAgentChatEndpoint:

    def test_agent_health_endpoint(self):
        resp = client.get("/agent/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "healthy"
        assert "exchange" in data["agents"]
        assert "provider" in data["agents"]
        assert "compliance" in data["agents"]

    @patch("services.exchange_service.get_latest_rate", return_value=MOCK_RATE)
    def test_single_exchange_query(self, mock_rate):
        resp = client.post("/agent/chat", json={
            "query": "What is the USD to INR rate?",
            "session_id": "test-exchange",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "exchange" in data["agents_used"]
        assert data["status"] in ("success", "partial")
        assert len(data["summary"]) > 0

    @patch("services.exchange_service.get_latest_rate", return_value=MOCK_RATE)
    @patch("services.exchange_service.convert_amount", return_value=MOCK_CONV)
    @patch("services.provider_service.compare_providers", return_value=MOCK_PROVS)
    @patch("services.provider_service.get_supported_corridors", return_value=[])
    @patch("services.compliance_service.get_country_rules", return_value=MOCK_COMP)
    @patch("services.compliance_service.get_kyc_requirements", return_value=MOCK_KYC)
    @patch("services.compliance_service.get_required_documents", return_value=MOCK_DOCS)
    @patch("services.compliance_service.get_aml_requirements", return_value=MOCK_AML)
    def test_multi_agent_query(self, *mocks):
        resp = client.post("/agent/chat", json={
            "query": "Send 1000 USD to India. Best provider and what documents do I need?",
            "session_id": "test-multi",
            "context": {
                "base_currency": "USD",
                "target_currency": "INR",
                "amount": 1000,
                "from_country": "US",
                "to_country": "IN",
            },
        })
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["agents_used"]) >= 2
        assert data["status"] in ("success", "partial")

    def test_session_memory_endpoint(self):
        # Clear first
        client.delete("/agent/session/test-memory")
        # Get empty session
        resp = client.get("/agent/session/test-memory")
        assert resp.status_code == 200
        assert resp.json()["message_count"] == 0

    def test_clear_session_endpoint(self):
        resp = client.delete("/agent/session/test-clear")
        assert resp.status_code == 200
        assert resp.json()["cleared"] is True

    def test_empty_query_rejected(self):
        resp = client.post("/agent/chat", json={"query": "", "session_id": "test"})
        assert resp.status_code == 422  # FastAPI validation

    def test_existing_endpoints_still_work(self):
        """Verify zero regressions on existing API endpoints."""
        health = client.get("/health")
        assert health.status_code == 200

        providers = client.get("/providers")
        assert providers.status_code == 200

        compliance = client.get("/compliance")
        assert compliance.status_code == 200
