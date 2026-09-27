import time
import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.utils.sha256 import generate_invoice_sha256
from backend.utils.ledger import SUPPORTED_BANKS
from backend.utils.gst_validator import verify_gst_portal
from backend.utils.eway_validator import validate_eway_bill

client = TestClient(app)

def test_sha256_generation():
    hash1 = generate_invoice_sha256("27AAACG1234H1Z5", "ZOMATO-1", "INV-100", "2026-07-25", 5000.0)
    hash2 = generate_invoice_sha256("27AAACG1234H1Z5", "ZOMATO-1", "INV-100", "2026-07-25", 5000.0)
    assert hash1 == hash2
    assert len(hash1) == 64

def test_gst_and_eway_validation():
    valid_gst = verify_gst_portal("27AAACG1234H1Z5")
    assert valid_gst["is_valid"] is True
    assert valid_gst["status"] == "GST Valid"

    invalid_gst = verify_gst_portal("INVALID_GSTIN")
    assert invalid_gst["is_valid"] is False

    valid_eway = validate_eway_bill("123456789012")
    assert valid_eway["is_valid"] is True
    assert valid_eway["status"] == "Valid"

def test_multi_bank_simulation_and_duplicate_prevention():
    ts = time.time_ns()
    email = f"fraud_tester_{ts}@zomato.com"
    user_payload = {
        "email": email,
        "password": "Password123!",
        "full_name": "Fraud Tester",
        "phone": f"987{str(ts)[-7:]}"
    }
    reg_res = client.post("/auth/register", json=user_payload)
    if reg_res.status_code == 200 and "access_token" in reg_res.json():
        token = reg_res.json()["access_token"]
    else:
        login_res = client.post("/auth/login", json={"email": email, "password": "Password123!"})
        token = login_res.json()["access_token"]

    headers = {"Authorization": f"Bearer {token}"}

    unique_inv = f"INV-DUP-{ts}"
    invoice_payload = {
        "gstin": "27AAACG1234H1Z5",
        "merchant_name": "Apex Express Ltd",
        "platform_id": "ZOMATO-PAT-999",
        "invoice_number": unique_inv,
        "invoice_date": "2026-07-25",
        "amount": 75000.0,
        "buyer_name": "Swiggy Ltd",
        "buyer_gstin": "27AAACS8888H1Z1",
        "submitting_bank": "State Bank of India"
    }

    # First Bank (State Bank of India) uploads invoice -> SUCCESS (200)
    upload_1 = client.post("/invoice/upload", json=invoice_payload, headers=headers)
    assert upload_1.status_code == 200
    res_1 = upload_1.json()
    assert res_1["is_duplicate"] is False
    assert len(res_1["sha256_hash"]) == 64

    # Second Bank (HDFC Bank) attempts to upload the exact same invoice -> REJECT (400)
    invoice_payload["submitting_bank"] = "HDFC Bank"
    upload_2 = client.post("/invoice/upload", json=invoice_payload, headers=headers)
    assert upload_2.status_code == 400
    err_detail = upload_2.json()["detail"]
    assert err_detail["error"] == "Duplicate Financing Detected"
    assert err_detail["previous_bank"] == "State Bank of India"

def test_fraud_check_api():
    ts = time.time_ns()
    email = f"fraud_checker_{ts}@zomato.com"
    user_payload = {
        "email": email,
        "password": "Password123!",
        "full_name": "Fraud Checker",
        "phone": f"988{str(ts)[-7:]}"
    }
    reg_res = client.post("/auth/register", json=user_payload)
    if reg_res.status_code == 200 and "access_token" in reg_res.json():
        token = reg_res.json()["access_token"]
    else:
        login_res = client.post("/auth/login", json={"email": email, "password": "Password123!"})
        token = login_res.json()["access_token"]

    headers = {"Authorization": f"Bearer {token}"}

    check_res = client.post("/fraud/check", json={
        "gstin": "27AAACG1234H1Z5",
        "platform_id": "ZOMATO-PAT-999",
        "invoice_number": f"INV-CHK-{ts}",
        "invoice_date": "2026-07-25",
        "amount": 25000.0,
        "bank_name": "ICICI Bank"
    }, headers=headers)

    assert check_res.status_code == 200
    data = check_res.json()
    assert "fraud_risk_level" in data
    assert "fraud_score" in data
    assert len(data["sha256_hash"]) == 64
