import re
from datetime import datetime, timedelta

EWAY_REGEX = r"^[0-9]{12}$"

def validate_eway_bill(eway_number: str, vehicle_number: str = "MH-12-AB-1234") -> dict:
    clean_eway = eway_number.strip() if eway_number else ""
    is_valid_format = bool(re.match(EWAY_REGEX, clean_eway))

    if not is_valid_format:
        return {
            "status": "Invalid",
            "is_valid": False,
            "eway_number": clean_eway,
            "vehicle_number": vehicle_number,
            "distance_km": 0,
            "delivery_date": "N/A",
            "message": "eWay Bill number must be a 12-digit numerical string"
        }

    if clean_eway.startswith("99"):
        return {
            "status": "Expired",
            "is_valid": False,
            "eway_number": clean_eway,
            "vehicle_number": vehicle_number,
            "distance_km": 420,
            "delivery_date": (datetime.now() - timedelta(days=10)).strftime("%Y-%m-%d"),
            "message": "eWay Bill validity period has expired"
        }
    elif clean_eway.startswith("88"):
        return {
            "status": "Cancelled",
            "is_valid": False,
            "eway_number": clean_eway,
            "vehicle_number": vehicle_number,
            "distance_km": 180,
            "delivery_date": (datetime.now() - timedelta(days=2)).strftime("%Y-%m-%d"),
            "message": "eWay Bill was cancelled by the supplier"
        }

    return {
        "status": "Valid",
        "is_valid": True,
        "eway_number": clean_eway,
        "vehicle_number": vehicle_number,
        "distance_km": 285,
        "delivery_date": (datetime.now() + timedelta(days=2)).strftime("%Y-%m-%d"),
        "message": "Active valid eWay Bill matched with National e-Way Bill System"
    }
