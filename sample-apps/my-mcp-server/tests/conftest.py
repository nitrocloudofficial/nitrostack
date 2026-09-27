import pytest
import json
import os

@pytest.fixture
def mock_assembly_queue():
    return [
        { "vin": "VIN-101", "model": "SUV-LX", "trim": "Luxury", "seat_type": "RED_LEATHER", "status": "QUEUED" },
        { "vin": "VIN-102", "model": "SEDAN-SE", "trim": "Standard", "seat_type": "BLACK_FABRIC", "status": "QUEUED" },
        { "vin": "VIN-103", "model": "SUV-LX", "trim": "Luxury", "seat_type": "RED_LEATHER", "status": "QUEUED" }
    ]

@pytest.fixture
def mock_inventory_jit():
    return {
        "RED_LEATHER": { "stock": 0, "supplier_eta": "14:00 IST", "shortage": True },
        "BLACK_FABRIC": { "stock": 50, "supplier_eta": "AVAILABLE", "shortage": False }
    }

@pytest.fixture
def mock_station_oee():
    return {
        "STATION_WELDING": { "availability": 0.95, "performance": 0.88, "quality": 0.99, "status": "RUNNING" },
        "STATION_PAINT": { "availability": 0.00, "performance": 0.00, "quality": 0.00, "status": "MAINTENANCE" }
    }
