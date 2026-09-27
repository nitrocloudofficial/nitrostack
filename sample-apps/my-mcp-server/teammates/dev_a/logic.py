import json
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA_DIR = os.path.join(BASE_DIR, "data")

def get_assembly_sequence(shift_id: str, line_id: str) -> dict:
    with open(os.path.join(DATA_DIR, "assembly_queue.json"), "r") as f:
        queue = json.load(f)
    return {"shift": shift_id, "line": line_id, "active_queue": queue}

def resequence_build_plan(delay_reason: str, missing_option: str) -> dict:
    with open(os.path.join(DATA_DIR, "assembly_queue.json"), "r") as f:
        queue = json.load(f)
    
    available = [car for car in queue if car.get("seat_type") != missing_option]
    delayed = [car for car in queue if car.get("seat_type") == missing_option]
    
    return {"reason": delay_reason, "new_sequence": available + delayed } 
