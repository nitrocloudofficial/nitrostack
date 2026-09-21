import pytest
from fastapi.testclient import TestClient
import os
import json
import sys

# Ensure backend directory is in path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from api_server import app

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"ok": True, "service": "forgemind-api-gateway"}

def test_get_machines_endpoint():
    response = client.get("/api/machines")
    assert response.status_code == 200
    machines = response.json()
    assert isinstance(machines, list)
    if len(machines) > 0:
        # Verify telemetry mapping from telemetry_logs.json
        first_machine = machines[0]
        assert "id" in first_machine
        assert "telemetry" in first_machine
        assert "vibration" in first_machine["telemetry"]
        assert "temperature" in first_machine["telemetry"]
        
        # Verify EQ101 (first machine) vibration matches telemetry_logs.json (vibration = 7.8)
        eq101 = next((m for m in machines if m["id"] == "EQ101"), None)
        if eq101:
            assert eq101["telemetry"]["vibration"] == 7.8
            assert eq101["telemetry"]["temperature"] == 78.4
            assert eq101["status"] == "WARNING"

def test_get_scenarios_endpoint():
    response = client.get("/api/scenarios")
    assert response.status_code == 200
    scenarios = response.json()
    assert isinstance(scenarios, list)
