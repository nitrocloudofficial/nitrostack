import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "version": "1.0.0"}

def test_chat_endpoint_mock():
    # Simple test for chat endpoint
    response = client.post("/api/v1/chat/", json={
        "message": "hello",
        "history": [],
        "stream": False
    })
    assert response.status_code == 200
    assert "response" in response.json()
