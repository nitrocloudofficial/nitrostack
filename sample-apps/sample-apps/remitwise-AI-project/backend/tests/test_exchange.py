"""
Backend Test Suite — RemitWise AI
Tests for live exchange rate endpoint, historical endpoint, currency validation, health status, and cache.
"""

import sys
import os

_PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _PROJECT_ROOT not in sys.path:
    sys.path.insert(0, _PROJECT_ROOT)

from fastapi.testclient import TestClient
from api.app import app

client = TestClient(app)


def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["backend"] == "healthy"
    assert "uptime_seconds" in data


def test_get_latest_rate_success():
    response = client.get("/exchange/latest?base=USD&target=INR")
    assert response.status_code == 200
    data = response.json()
    assert data["base"] == "USD"
    assert data["target"] == "INR"
    assert isinstance(data["rate"], float)
    assert data["rate"] > 0
    assert "provider" in data
    assert "timestamp" in data
    assert "cache" in data


def test_get_latest_rate_cache_hit():
    # First request populates cache
    client.get("/exchange/latest?base=USD&target=EUR")
    # Second request should return cache HIT
    response2 = client.get("/exchange/latest?base=USD&target=EUR")
    assert response2.status_code == 200
    data2 = response2.json()
    assert data2["cache"] == "HIT"


def test_invalid_currency_validation():
    # Invalid currency AAA
    response = client.get("/exchange/latest?base=AAA&target=INR")
    assert response.status_code == 400
    assert "Invalid or unsupported" in response.json()["detail"]


def test_same_currency_validation():
    response = client.get("/exchange/latest?base=USD&target=USD")
    assert response.status_code == 400
    assert "differ" in response.json()["detail"]


def test_get_historical_rates():
    response = client.get("/exchange/history?base=USD&target=INR&start_date=2026-07-01&end_date=2026-07-15")
    assert response.status_code == 200
    data = response.json()
    assert data["base"] == "USD"
    assert data["target"] == "INR"
    assert "rates" in data
    assert isinstance(data["rates"], dict)


def test_list_currencies():
    response = client.get("/exchange/currencies")
    assert response.status_code == 200
    data = response.json()
    assert "currencies" in data
    assert "USD" in data["currencies"] or "USD" in data["currencies"].values()


if __name__ == "__main__":
    print("Running backend tests...")
    test_health_check()
    print("[OK] Health check passed")
    test_get_latest_rate_success()
    print("[OK] Live rate test passed")
    test_get_latest_rate_cache_hit()
    print("[OK] Cache HIT test passed")
    test_invalid_currency_validation()
    print("[OK] Invalid currency validation (400) passed")
    test_same_currency_validation()
    print("[OK] Same currency validation (400) passed")
    test_get_historical_rates()
    print("[OK] Historical rates test passed")
    test_list_currencies()
    print("[OK] List currencies test passed")
    print("ALL BACKEND TESTS PASSED SUCCESSFULLY!")
