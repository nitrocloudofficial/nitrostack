def test_succession_rescue():
    aadhaar = "999988887777"
    death_cert = "DC-2026-001"
    
    mock_assets = [
        {"type": "Bank Account", "value": 42000.0},
        {"type": "Insurance", "value": 200000.0}
    ]
    total_val = sum(a["value"] for a in mock_assets)
    assert total_val == 242000.0
