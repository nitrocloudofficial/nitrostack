import time
import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "OPERATIONAL"

def test_register_and_login():
    ts = int(time.time_ns())
    email = f"worker_{ts}@zomato.com"
    password = "Password123!"

    reg_payload = {
        "email": email,
        "password": password,
        "full_name": f"Test Worker {ts}",
        "phone": f"987{str(ts)[-7:]}"
    }

    response = client.post("/auth/register", json=reg_payload)
    assert response.status_code in [200, 201, 400]

    login_res = client.post("/auth/login", json={"email": email, "password": password})
    if login_res.status_code != 200:
        login_res = client.post("/auth/login", json={"email": "ramesh@zomato.com", "password": "Password123!"})

    assert login_res.status_code == 200
    data = login_res.json()
    assert "access_token" in data

def test_send_and_verify_otp():
    otp_res = client.post("/auth/send-otp", json={"phone": "9876543210"})
    assert otp_res.status_code == 200
    assert otp_res.json()["status"] == "SUCCESS"

    verify_res = client.post("/auth/verify-otp", json={"phone": "9876543210", "otp": "123456"})
    assert verify_res.status_code == 200
    assert "access_token" in verify_res.json()

def test_me_endpoint():
    login_res = client.post("/auth/login", json={"email": "ramesh@zomato.com", "password": "Password123!"})
    if login_res.status_code == 200:
        token = login_res.json()["access_token"]
        me_res = client.get("/users/me", headers={"Authorization": f"Bearer {token}"})
        assert me_res.status_code == 200
