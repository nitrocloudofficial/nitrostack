from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app


def make_client() -> TestClient:
    return TestClient(create_app(Settings(api_key="test-secret")))


def test_health_returns_the_public_contract() -> None:
    with make_client() as client:
        response = client.get("/health", headers={"Authorization": "Bearer test-secret"})

    assert response.status_code == 200
    assert response.json() == {
        "status": "healthy",
        "service": "seer-ml",
        "version": "0.1.0",
    }


def test_health_rejects_a_missing_api_key() -> None:
    with make_client() as client:
        response = client.get("/health")

    assert response.status_code == 401
    assert response.json() == {"detail": "Unauthorized"}


def test_health_rejects_an_invalid_api_key() -> None:
    with make_client() as client:
        response = client.get("/health", headers={"Authorization": "Bearer wrong-secret"})

    assert response.status_code == 401
    assert response.json() == {"detail": "Unauthorized"}
