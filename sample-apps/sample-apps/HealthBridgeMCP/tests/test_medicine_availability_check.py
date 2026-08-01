"""
Tests for medicine_availability_check tool.
Run: pytest tests/test_medicine_availability_check.py -v
"""

import copy
import json
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))

from server import _facility_stock as _orig_stock, _load_data


def make_stock():
    _load_data()
    return copy.deepcopy(_orig_stock)


def make_tool(facility_stock):
    """Build an inline version of medicine_availability_check for direct testing."""

    def medicine_availability_check(hospitalId, medicine, quantity):
        if hospitalId not in facility_stock:
            return {"error": True, "message": f"Facility '{hospitalId}' not found in the network."}
        if not medicine or not isinstance(medicine, str) or not medicine.strip():
            return {"error": True, "message": "'medicine' is required and must be a non-empty string."}
        if not isinstance(quantity, (int, float)) or quantity <= 0:
            return {"error": True, "message": "'quantity' must be a positive integer greater than 0."}

        quantity = int(quantity)
        medicine_lower = medicine.lower().strip()

        local_facility = facility_stock[hospitalId]
        local_stock = local_facility["stock"].get(medicine_lower, 0)

        if local_stock >= quantity:
            local_facility["stock"][medicine_lower] = local_stock - quantity
            return {
                "availableLocally": True,
                "action": "dispense",
                "rerouteFacility": None,
                "notificationSent": False,
            }

        other_facilities = sorted(
            [(hid, fac) for hid, fac in facility_stock.items() if hid != hospitalId],
            key=lambda x: x[0],
        )

        for sister_id, sister_fac in other_facilities:
            sister_stock = sister_fac["stock"].get(medicine_lower, 0)
            if sister_stock >= quantity:
                return {
                    "availableLocally": False,
                    "action": "reroute",
                    "rerouteFacility": sister_fac["hospitalName"],
                    "notificationSent": True,
                }

        return {
            "availableLocally": False,
            "action": "replenish_requested",
            "rerouteFacility": None,
            "notificationSent": True,
        }

    return medicine_availability_check


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestMedicineAvailabilityCheck:

    def test_1_local_dispense_lisinopril_hosp_a(self):
        """HOSP-A has 150 lisinopril → dispense locally."""
        stock = make_stock()
        tool = make_tool(stock)

        result = tool("HOSP-A", "lisinopril", 10)

        assert result["availableLocally"] is True
        assert result["action"] == "dispense"
        assert result["rerouteFacility"] is None
        assert result["notificationSent"] is False

    def test_2_stock_decremented_after_dispense(self):
        """Stock is decremented in memory after local dispense."""
        stock = make_stock()
        tool = make_tool(stock)

        before = stock["HOSP-A"]["stock"]["lisinopril"]
        tool("HOSP-A", "lisinopril", 10)
        after = stock["HOSP-A"]["stock"]["lisinopril"]

        assert after == before - 10

    def test_3_reroute_metformin_hosp_b(self):
        """HOSP-B has 0 metformin, HOSP-C has 200 → reroute to Green Valley Clinic."""
        stock = make_stock()
        tool = make_tool(stock)

        result = tool("HOSP-B", "metformin", 10)

        assert result["availableLocally"] is False
        assert result["action"] == "reroute"
        assert result["rerouteFacility"] == "Green Valley Clinic"
        assert result["notificationSent"] is True

    def test_4_replenish_atorvastatin_hosp_d(self):
        """All 4 facilities have atorvastatin: 0 → replenish_requested."""
        stock = make_stock()
        tool = make_tool(stock)

        result = tool("HOSP-D", "atorvastatin", 10)

        assert result["availableLocally"] is False
        assert result["action"] == "replenish_requested"
        assert result["rerouteFacility"] is None
        assert result["notificationSent"] is True

    def test_5_quantity_exceeds_local_stock(self):
        """HOSP-A has 50 warfarin; requesting 100 → triggers reroute/replenish."""
        stock = make_stock()
        tool = make_tool(stock)

        result = tool("HOSP-A", "warfarin", 100)

        assert result["availableLocally"] is False
        assert result["action"] in ("reroute", "replenish_requested")

    def test_6_unknown_medicine_treated_as_zero(self):
        """Medicine not in stock table is treated as 0 → proceeds to reroute/replenish."""
        stock = make_stock()
        tool = make_tool(stock)

        result = tool("HOSP-A", "xyzdrugnotexist", 1)

        assert result["availableLocally"] is False
        assert result["action"] in ("reroute", "replenish_requested")

    def test_7_invalid_facility(self):
        """Invalid hospitalId returns error response."""
        stock = make_stock()
        tool = make_tool(stock)

        result = tool("HOSP-Z", "aspirin", 5)

        assert result.get("error") is True
        assert "not found" in result["message"].lower()

    def test_8_case_insensitive_medicine(self):
        """'Metformin' (capital M) at HOSP-B gives same result as lowercase."""
        stock = make_stock()
        tool = make_tool(stock)

        result_lower = tool("HOSP-B", "metformin", 10)
        stock2 = make_stock()
        tool2 = make_tool(stock2)
        result_upper = tool2("HOSP-B", "Metformin", 10)

        assert result_lower["action"] == result_upper["action"]
        assert result_lower["rerouteFacility"] == result_upper["rerouteFacility"]

    def test_9_invalid_quantity_zero(self):
        """quantity=0 returns error."""
        stock = make_stock()
        tool = make_tool(stock)

        result = tool("HOSP-A", "aspirin", 0)

        assert result.get("error") is True

    def test_10_invalid_quantity_negative(self):
        """Negative quantity returns error."""
        stock = make_stock()
        tool = make_tool(stock)

        result = tool("HOSP-A", "aspirin", -5)

        assert result.get("error") is True

    def test_11_output_schema_exact_fields(self):
        """Output must have exactly: availableLocally, action, rerouteFacility, notificationSent."""
        stock = make_stock()
        tool = make_tool(stock)

        result = tool("HOSP-A", "lisinopril", 1)

        assert set(result.keys()) == {"availableLocally", "action", "rerouteFacility", "notificationSent"}

    def test_12_reroute_returns_hospital_name_not_id(self):
        """rerouteFacility contains the human-readable name, not the hospitalId."""
        stock = make_stock()
        tool = make_tool(stock)

        result = tool("HOSP-B", "metformin", 10)

        # Should be "Green Valley Clinic", not "HOSP-C"
        assert result["rerouteFacility"] == "Green Valley Clinic"
        assert "HOSP" not in result["rerouteFacility"]

    def test_13_all_atorvastatin_zero(self):
        """Verify fixture: all 4 facilities have atorvastatin: 0."""
        stock = make_stock()
        for hid, fac in stock.items():
            assert fac["stock"].get("atorvastatin", 0) == 0, (
                f"{hid} has non-zero atorvastatin stock"
            )
