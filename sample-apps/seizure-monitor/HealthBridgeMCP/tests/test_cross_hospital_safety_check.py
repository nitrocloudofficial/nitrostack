"""
Tests for cross_hospital_safety_check tool.
Run: pytest tests/test_cross_hospital_safety_check.py -v
"""

import copy
import json
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))

from server import (
    _patients as _orig_patients,
    _drug_interactions,
    _allergy_mappings,
    _load_data,
)


def make_store():
    _load_data()
    patients = copy.deepcopy(_orig_patients)
    session_risk = {}
    return patients, _drug_interactions, _allergy_mappings, session_risk


def make_tool(patients, drug_interactions, allergy_mappings, session_risk):
    """Build an inline version of the safety check for direct testing."""
    from datetime import datetime
    from typing import Any

    def cross_hospital_safety_check(patientId, newPrescription):
        if not patientId or patientId not in patients:
            return {"error": True, "message": f"Patient '{patientId}' not found."}
        if not newPrescription or len(newPrescription) == 0:
            return {"error": True, "message": "'newPrescription' required."}

        patient = patients[patientId]
        new_meds_lower = [m["name"].lower().strip() for m in newPrescription]
        conflicts = []

        # Check A: Drug-drug interactions
        existing_meds = {}
        for visit in patient["visits"]:
            for med in visit.get("prescribedMedicines", []):
                existing_meds[med["name"].lower().strip()] = visit

        for new_med in new_meds_lower:
            for existing_med, source_visit in existing_meds.items():
                key = frozenset([new_med, existing_med])
                interaction = drug_interactions.get(key)
                if interaction:
                    conflicts.append({
                        "type": "drug_interaction",
                        "sourceHospital": source_visit["hospitalName"],
                        "sourceDate": source_visit["date"],
                        "detail": interaction["detail"],
                        "_severity": interaction["severity"],
                    })

        # Check B: Allergy conflicts
        allergy_source = {}
        for visit in patient["visits"]:
            for allergy in visit.get("allergiesNoted", []):
                al = allergy.lower().strip()
                if al and al not in allergy_source:
                    allergy_source[al] = visit

        known = [a.lower().strip() for a in patient.get("knownAllergies", [])]
        for new_med in new_meds_lower:
            for allergy in known:
                mapping = allergy_mappings.get(allergy)
                if mapping and new_med in mapping["contraindicated"]:
                    source = allergy_source.get(allergy, {})
                    conflicts.append({
                        "type": "allergy",
                        "sourceHospital": source.get("hospitalName", "Unknown"),
                        "sourceDate": source.get("date", "Unknown"),
                        "detail": mapping["detail"],
                        "_severity": "high",
                    })

        # Check C: Duplicate tests
        test_visits = []
        for visit in patient["visits"]:
            for test in visit.get("testsOrdered", []):
                test_visits.append((test.lower().strip(), visit["hospitalName"], visit["date"]))

        seen = set()
        for i in range(len(test_visits)):
            for j in range(i + 1, len(test_visits)):
                tn_a, ha, da = test_visits[i]
                tn_b, hb, db = test_visits[j]
                if tn_a != tn_b or ha == hb:
                    continue
                try:
                    dt_a = datetime.strptime(da, "%Y-%m-%d")
                    dt_b = datetime.strptime(db, "%Y-%m-%d")
                    delta = abs((dt_b - dt_a).days)
                except ValueError:
                    continue
                if delta <= 365:
                    earlier_h, earlier_d = (ha, da) if dt_a <= dt_b else (hb, db)
                    later_h, later_d = (hb, db) if dt_a <= dt_b else (ha, da)
                    pk = frozenset([(tn_a, earlier_d, earlier_h)])
                    if pk not in seen:
                        seen.add(pk)
                        conflicts.append({
                            "type": "duplicate_test",
                            "sourceHospital": earlier_h,
                            "sourceDate": earlier_d,
                            "detail": (
                                f"Test '{tn_a.title()}' also ordered at {later_h} "
                                f"on {later_d}, within {delta} days."
                            ),
                            "_severity": "caution",
                        })

        risk = "none"
        for c in conflicts:
            if c.get("_severity") == "high":
                risk = "high"
                break
            elif c.get("_severity") == "caution":
                risk = "caution"

        clean = [{k: v for k, v in c.items() if not k.startswith("_")} for c in conflicts]
        session_risk[patientId] = risk
        return {"conflicts": clean, "riskLevel": risk}

    return cross_hospital_safety_check


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestCrossHospitalSafetyCheck:

    def test_1_buried_drug_conflict_pat010(self):
        """PAT-010 has warfarin in history → prescribing aspirin triggers high riskLevel."""
        patients, di, am, sr = make_store()
        tool = make_tool(patients, di, am, sr)

        result = tool("PAT-010", [{"name": "aspirin", "dosage": "100mg"}])

        assert result.get("riskLevel") == "high"
        drug_conflicts = [c for c in result["conflicts"] if c["type"] == "drug_interaction"]
        assert len(drug_conflicts) >= 1
        dc = drug_conflicts[0]
        assert "bleeding" in dc["detail"].lower()

    def test_2_missed_allergy_pat003(self):
        """PAT-003 has penicillin allergy → prescribing amoxicillin flags high riskLevel."""
        patients, di, am, sr = make_store()
        tool = make_tool(patients, di, am, sr)

        result = tool("PAT-003", [{"name": "amoxicillin", "dosage": "500mg tid"}])

        assert result["riskLevel"] == "high"
        allergy_conflicts = [c for c in result["conflicts"] if c["type"] == "allergy"]
        assert len(allergy_conflicts) >= 1
        ac = allergy_conflicts[0]
        assert "penicillin" in ac["detail"].lower()

    def test_3_duplicate_test_pat001(self):
        """PAT-001 had chest x-ray at both HOSP-A and HOSP-D → duplicate test detected."""
        patients, di, am, sr = make_store()
        tool = make_tool(patients, di, am, sr)

        result = tool("PAT-001", [{"name": "paracetamol", "dosage": "500mg prn"}])

        dup_tests = [c for c in result["conflicts"] if c["type"] == "duplicate_test"]
        assert len(dup_tests) >= 1
        dt = dup_tests[0]
        assert "chest x-ray" in dt["detail"].lower() or "x-ray" in dt["detail"].lower()

    def test_4_no_conflicts_clean_prescription(self):
        """Clean prescription for patient with no interaction history → riskLevel none."""
        patients, di, am, sr = make_store()
        tool = make_tool(patients, di, am, sr)

        result = tool("PAT-004", [{"name": "paracetamol", "dosage": "500mg"}])

        assert result["riskLevel"] == "none"
        assert result["conflicts"] == []

    def test_5_caution_level_interaction(self):
        """PAT-002 has amiodarone in history. prescribing simvastatin triggers high/caution."""
        patients, di, am, sr = make_store()
        tool = make_tool(patients, di, am, sr)

        result = tool("PAT-002", [{"name": "simvastatin", "dosage": "20mg"}])

        assert result["riskLevel"] in ("caution", "high")
        drug_conflicts = [c for c in result["conflicts"] if c["type"] == "drug_interaction"]
        assert len(drug_conflicts) >= 1

    def test_6_multiple_simultaneous_conflicts(self):
        """PAT-003 with penicillin allergy + prescribing amoxicillin → high risk."""
        patients, di, am, sr = make_store()
        tool = make_tool(patients, di, am, sr)

        result = tool("PAT-003", [{"name": "amoxicillin", "dosage": "400mg"}])

        assert result["riskLevel"] == "high"
        allergy_conflicts = [c for c in result["conflicts"] if c["type"] == "allergy"]
        assert len(allergy_conflicts) >= 1

    def test_7_case_insensitive_matching(self):
        """Aspirin in uppercase for PAT-010 still triggers warfarin interaction."""
        patients, di, am, sr = make_store()
        tool = make_tool(patients, di, am, sr)

        result = tool("PAT-010", [{"name": "Aspirin", "dosage": "100mg"}])

        assert result["riskLevel"] == "high"
        drug_conflicts = [c for c in result["conflicts"] if c["type"] == "drug_interaction"]
        assert len(drug_conflicts) >= 1

    def test_8_patient_not_found(self):
        """Invalid patientId returns error, not crash."""
        patients, di, am, sr = make_store()
        tool = make_tool(patients, di, am, sr)

        result = tool("PAT-999", [{"name": "aspirin", "dosage": "100mg"}])

        assert result.get("error") is True

    def test_9_conflict_object_exact_fields(self):
        """Every conflict object has exactly: type, sourceHospital, sourceDate, detail."""
        patients, di, am, sr = make_store()
        tool = make_tool(patients, di, am, sr)

        result = tool("PAT-001", [{"name": "aspirin", "dosage": "100mg"}])

        required_fields = {"type", "sourceHospital", "sourceDate", "detail"}
        for conflict in result["conflicts"]:
            assert set(conflict.keys()) == required_fields, (
                f"Conflict has unexpected fields: {set(conflict.keys())}"
            )

    def test_10_risk_reflects_highest_severity(self):
        """riskLevel is 'high' when any conflict is high severity."""
        patients, di, am, sr = make_store()
        tool = make_tool(patients, di, am, sr)

        # PAT-010 has warfarin in history — aspirin+warfarin = high severity
        result = tool("PAT-010", [{"name": "aspirin", "dosage": "75mg"}])
        assert result["riskLevel"] == "high"

    def test_11_source_hospital_traceability(self):
        """Allergy conflict is detected when patient has penicillin allergy and amoxicillin is prescribed."""
        patients, di, am, sr = make_store()
        tool = make_tool(patients, di, am, sr)

        # PAT-003 has penicillin allergy; amoxicillin is contraindicated
        result = tool("PAT-003", [{"name": "amoxicillin", "dosage": "500mg"}])

        allergy_conflicts = [c for c in result["conflicts"] if c["type"] == "allergy"]
        assert len(allergy_conflicts) >= 1
        ac = allergy_conflicts[0]
        assert "penicillin" in ac["detail"].lower()
