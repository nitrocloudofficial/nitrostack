import pytest
import json
import os
from teammates.dev_a.logic import get_assembly_sequence, resequence_build_plan

def test_get_assembly_sequence_success():
    """Verify get_assembly_sequence returns queue data with correct shift and line IDs."""
    shift_id = "SHIFT-A"
    line_id = "LINE-01"
    res = get_assembly_sequence(shift_id, line_id)
    
    assert res["shift"] == shift_id
    assert res["line"] == line_id
    assert isinstance(res["active_queue"], list)
    assert len(res["active_queue"]) > 0

def test_resequence_build_plan_part_shortage(tmp_path, monkeypatch):
    """Verify builds with missing options are shifted to the rear, preserving available order."""
    delay_reason = "RED_LEATHER material shortage"
    missing_option = "RED_LEATHER"
    
    res = resequence_build_plan(delay_reason, missing_option)
    
    assert res["reason"] == delay_reason
    new_seq = res["new_sequence"]
    
    # Non-RED_LEATHER should be at the front
    assert new_seq[0]["seat_type"] == "BLACK_FABRIC"
    assert new_seq[0]["vin"] == "VIN-102"
    
    # RED_LEATHER items should be at the end
    assert new_seq[1]["seat_type"] == "RED_LEATHER"
    assert new_seq[2]["seat_type"] == "RED_LEATHER"
    assert [c["vin"] for c in new_seq] == ["VIN-102", "VIN-101", "VIN-103"]

def test_resequence_build_plan_no_matching_shortage():
    """Verify queue sequence remains identical when missing_option doesn't match any car."""
    delay_reason = "NAV_SYSTEM shortage"
    missing_option = "NAV_SYSTEM"
    
    res = resequence_build_plan(delay_reason, missing_option)
    new_seq = res["new_sequence"]
    
    assert len(new_seq) == 3
    assert [c["vin"] for c in new_seq] == ["VIN-101", "VIN-102", "VIN-103"]

def test_resequence_build_plan_all_items_missing_option(tmp_path, monkeypatch):
    """Verify queue order when all vehicles have the missing option."""
    test_queue = [
        {"vin": "VIN-201", "seat_type": "RED_LEATHER"},
        {"vin": "VIN-202", "seat_type": "RED_LEATHER"}
    ]
    test_file = tmp_path / "assembly_queue.json"
    test_file.write_text(json.dumps(test_queue))
    
    import teammates.dev_a.logic as dev_a_logic
    monkeypatch.setattr(dev_a_logic, "DATA_DIR", str(tmp_path))
    
    res = dev_a_logic.resequence_build_plan("Shortage", "RED_LEATHER")
    assert [c["vin"] for c in res["new_sequence"]] == ["VIN-201", "VIN-202"]

def test_resequence_build_plan_empty_queue(tmp_path, monkeypatch):
    """Verify resequencing handles an empty queue gracefully."""
    test_file = tmp_path / "assembly_queue.json"
    test_file.write_text(json.dumps([]))
    
    import teammates.dev_a.logic as dev_a_logic
    monkeypatch.setattr(dev_a_logic, "DATA_DIR", str(tmp_path))
    
    res = dev_a_logic.resequence_build_plan("No work", "RED_LEATHER")
    assert res["new_sequence"] == []

def test_resequence_build_plan_missing_seat_type_key(tmp_path, monkeypatch):
    """Verify handling when vehicles in queue lack the seat_type key."""
    test_queue = [
        {"vin": "VIN-301"},
        {"vin": "VIN-302", "seat_type": "RED_LEATHER"}
    ]
    test_file = tmp_path / "assembly_queue.json"
    test_file.write_text(json.dumps(test_queue))
    
    import teammates.dev_a.logic as dev_a_logic
    monkeypatch.setattr(dev_a_logic, "DATA_DIR", str(tmp_path))
    
    res = dev_a_logic.resequence_build_plan("Shortage", "RED_LEATHER")
    # VIN-301 missing seat_type (car.get("seat_type") -> None != RED_LEATHER), so stays in available
    assert res["new_sequence"][0]["vin"] == "VIN-301"
    assert res["new_sequence"][1]["vin"] == "VIN-302"

def test_assembly_queue_schema_integrity():
    """Validate JSON schema integrity of assembly_queue.json."""
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    json_path = os.path.join(base_dir, "data", "assembly_queue.json")
    with open(json_path, "r") as f:
        queue = json.load(f)
    
    assert isinstance(queue, list)
    required_keys = {"vin", "model", "trim", "seat_type", "status"}
    for item in queue:
        assert required_keys.issubset(item.keys()), f"Item {item} is missing required schema keys"
