import json
import os

# Root folder (auto-planner-mcp)
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))

DATA_DIR = os.path.join(ROOT_DIR, "data")


def load_json(filename):
    """Load a JSON file from the data directory."""
    with open(os.path.join(DATA_DIR, filename), "r") as file:
        return json.load(file)


def check_jis_inventory(part_number, vin_sequence=None):
    """
    Check whether the requested JIS part is available.
    """

    inventory = load_json("inventory_jit.json")

    if part_number not in inventory:
        return {
            "part_number": part_number,
            "stock": 0,
            "supplier_eta": None,
            "shortage": True,
            "available": False,
            "vin_sequence": vin_sequence
        }

    part = inventory[part_number]

    return {
        "part_number": part_number,
        "stock": part["stock"],
        "supplier_eta": part["supplier_eta"],
        "shortage": part["shortage"],
        "available": part["stock"] > 0 and not part["shortage"],
        "vin_sequence": vin_sequence
    }


def calculate_station_oee(station_id):
    """
    Calculate Overall Equipment Effectiveness (OEE)
    """

    stations = load_json("station_oee.json")

    if station_id not in stations:
        return {
            "station_id": station_id,
            "availability": 0,
            "performance": 0,
            "quality": 0,
            "oee_percent": 0,
            "status": "NOT_FOUND"
        }

    station = stations[station_id]

    availability = station["availability"]
    performance = station["performance"]
    quality = station["quality"]

    oee = availability * performance * quality

    return {
        "station_id": station_id,
        "availability": availability,
        "performance": performance,
        "quality": quality,
        "oee_percent": round(oee * 100, 2),
        "status": station["status"]
    }


def estimate_downtime_cost(stopped_station_id):
    """
    Estimate downtime cost.
    Assumes every non-running station costs $22,000 per minute.
    """

    stations = load_json("station_oee.json")

    if stopped_station_id not in stations:
        return {
            "station_id": stopped_station_id,
            "status": "NOT_FOUND",
            "downtime_minutes": 0,
            "estimated_cost": 0
        }

    station = stations[stopped_station_id]

    if station["status"] == "RUNNING":
        downtime_minutes = 0
    else:
        downtime_minutes = 60

    estimated_cost = downtime_minutes * 22000

    return {
        "station_id": stopped_station_id,
        "status": station["status"],
        "downtime_minutes": downtime_minutes,
        "estimated_cost": estimated_cost
    }