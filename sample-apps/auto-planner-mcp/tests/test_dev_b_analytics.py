import pytest
import json
import os
from teammates.dev_b.logic import (
    check_jis_inventory,
    calculate_station_oee,
    estimate_downtime_cost
)

# ---------------------------------------------------------------------------
# JIS Inventory Checks
# ---------------------------------------------------------------------------

def test_check_jis_inventory_available_part():
    """Verify JIS inventory returns available=True when stock > 0 and no shortage."""
    res = check_jis_inventory("BLACK_FABRIC", vin_sequence="VIN-102")
    assert res["part_number"] == "BLACK_FABRIC"
    assert res["stock"] == 50
    assert res["shortage"] is False
    assert res["available"] is True
    assert res["vin_sequence"] == "VIN-102"

def test_check_jis_inventory_shortage_part():
    """Verify JIS inventory returns available=False when part has a shortage."""
    res = check_jis_inventory("RED_LEATHER", vin_sequence="VIN-101")
    assert res["part_number"] == "RED_LEATHER"
    assert res["stock"] == 0
    assert res["shortage"] is True
    assert res["available"] is False
    assert res["supplier_eta"] == "14:00 IST"
    assert res["vin_sequence"] == "VIN-101"

def test_check_jis_inventory_unknown_part():
    """Verify JIS inventory fallback for unknown part numbers."""
    res = check_jis_inventory("YELLOW_VINYL")
    assert res["part_number"] == "YELLOW_VINYL"
    assert res["stock"] == 0
    assert res["supplier_eta"] is None
    assert res["shortage"] is True
    assert res["available"] is False
    assert res["vin_sequence"] is None

def test_check_jis_inventory_stock_with_shortage_flag(tmp_path, monkeypatch):
    """Verify available is False if stock > 0 but shortage flag is set True."""
    test_inv = {
        "CUSTOM_PART": {"stock": 10, "supplier_eta": "DELAYED", "shortage": True}
    }
    test_file = tmp_path / "inventory_jit.json"
    test_file.write_text(json.dumps(test_inv))
    
    import teammates.dev_b.logic as dev_b_logic
    monkeypatch.setattr(dev_b_logic, "DATA_DIR", str(tmp_path))
    
    res = dev_b_logic.check_jis_inventory("CUSTOM_PART")
    assert res["available"] is False


# ---------------------------------------------------------------------------
# Station OEE Analytics
# ---------------------------------------------------------------------------

def test_calculate_station_oee_running_station():
    """Verify OEE calculation: OEE = Availability * Performance * Quality * 100."""
    res = calculate_station_oee("STATION_WELDING")
    assert res["station_id"] == "STATION_WELDING"
    assert res["availability"] == 0.95
    assert res["performance"] == 0.88
    assert res["quality"] == 0.99
    # 0.95 * 0.88 * 0.99 = 0.82764 -> 82.76%
    assert res["oee_percent"] == 82.76
    assert res["status"] == "RUNNING"

def test_calculate_station_oee_maintenance_station():
    """Verify OEE calculation for station in MAINTENANCE (0% OEE)."""
    res = calculate_station_oee("STATION_PAINT")
    assert res["station_id"] == "STATION_PAINT"
    assert res["oee_percent"] == 0.0
    assert res["status"] == "MAINTENANCE"

def test_calculate_station_oee_unknown_station():
    """Verify fallback response for invalid/unknown station_id."""
    res = calculate_station_oee("STATION_NONEXISTENT")
    assert res["station_id"] == "STATION_NONEXISTENT"
    assert res["status"] == "NOT_FOUND"
    assert res["availability"] == 0
    assert res["performance"] == 0
    assert res["quality"] == 0
    assert res["oee_percent"] == 0


# ---------------------------------------------------------------------------
# Downtime Financial Cost Calculations
# ---------------------------------------------------------------------------

def test_estimate_downtime_cost_running_station():
    """Verify downtime cost is $0 for RUNNING stations."""
    res = estimate_downtime_cost("STATION_WELDING")
    assert res["station_id"] == "STATION_WELDING"
    assert res["status"] == "RUNNING"
    assert res["downtime_minutes"] == 0
    assert res["estimated_cost"] == 0

def test_estimate_downtime_cost_stopped_station():
    """Verify financial cost calculation for non-RUNNING station at $22,000/minute."""
    res = estimate_downtime_cost("STATION_PAINT")
    assert res["station_id"] == "STATION_PAINT"
    assert res["status"] == "MAINTENANCE"
    assert res["downtime_minutes"] == 60
    assert res["estimated_cost"] == 60 * 22000  # $1,320,000

def test_estimate_downtime_cost_unknown_station():
    """Verify downtime cost calculation fallback for invalid station_id."""
    res = estimate_downtime_cost("STATION_NONEXISTENT")
    assert res["station_id"] == "STATION_NONEXISTENT"
    assert res["status"] == "NOT_FOUND"
    assert res["downtime_minutes"] == 0
    assert res["estimated_cost"] == 0


# ---------------------------------------------------------------------------
# Schema Integrity Checks
# ---------------------------------------------------------------------------

def test_inventory_jit_schema_integrity():
    """Validate schema structure for inventory_jit.json."""
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    json_path = os.path.join(base_dir, "data", "inventory_jit.json")
    with open(json_path, "r") as f:
        inventory = json.load(f)
    
    assert isinstance(inventory, dict)
    required_keys = {"stock", "supplier_eta", "shortage"}
    for part, details in inventory.items():
        assert required_keys.issubset(details.keys()), f"Part {part} missing required schema keys"

def test_station_oee_schema_integrity():
    """Validate schema structure for station_oee.json."""
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    json_path = os.path.join(base_dir, "data", "station_oee.json")
    with open(json_path, "r") as f:
        stations = json.load(f)
    
    assert isinstance(stations, dict)
    required_keys = {"availability", "performance", "quality", "status"}
    for station_id, details in stations.items():
        assert required_keys.issubset(details.keys()), f"Station {station_id} missing required schema keys"
