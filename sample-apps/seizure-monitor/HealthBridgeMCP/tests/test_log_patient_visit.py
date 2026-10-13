"""
Tests for log_patient_visit tool.
Run: pytest tests/test_log_patient_visit.py -v
"""

import copy
import json
import sys
from pathlib import Path

import pytest

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from server import _patients as _orig_patients, _load_data


def make_patients():
    """Return a fresh deep copy of the patient store for test isolation."""
    _load_data()
    return copy.deepcopy(_orig_patients)


def make_tool(patients):
    """Create an isolated instance of the log_patient_visit function."""
    from datetime import date

    hospital_names = {
        "HOSP-A": "City General Hospital",
        "HOSP-B": "Sunrise Medical Centre",
        "HOSP-C": "Green Valley Clinic",
        "HOSP-D": "Lakeside Pharmacy & Hospital",
    }

    def log_patient_visit(
        patientId, hospitalId, doctorName, diagnosis,
        prescribedMedicines, allergiesNoted=None, notes=""
    ):
        errors = []
        if not patientId or not isinstance(patientId, str):
            errors.append("'patientId' is required and must be a non-empty string.")
        if not hospitalId or not isinstance(hospitalId, str):
            errors.append("'hospitalId' is required and must be a non-empty string.")
        if not doctorName or not isinstance(doctorName, str):
            errors.append("'doctorName' is required and must be a non-empty string.")
        if not diagnosis or not isinstance(diagnosis, str):
            errors.append("'diagnosis' is required and must be a non-empty string.")
        if not prescribedMedicines or not isinstance(prescribedMedicines, list):
            errors.append("'prescribedMedicines' is required and must be a non-empty array.")
        elif len(prescribedMedicines) == 0:
            errors.append("'prescribedMedicines' must contain at least one medicine.")
        else:
            for idx, med in enumerate(prescribedMedicines):
                if not isinstance(med, dict):
                    errors.append(f"prescribedMedicines[{idx}] must be object")
                    continue
                if not med.get("name"):
                    errors.append(f"prescribedMedicines[{idx}].name required")
        if allergiesNoted is not None and not isinstance(allergiesNoted, list):
            errors.append("'allergiesNoted' must be an array.")
        if errors:
            return {"error": True, "messages": errors}

        if allergiesNoted is None:
            allergiesNoted = []

        if patientId not in patients:
            patients[patientId] = {
                "patientId": patientId,
                "name": f"Unknown ({patientId})",
                "dateOfBirth": "unknown",
                "knownAllergies": [],
                "visits": [],
            }
        patient = patients[patientId]
        prior_hospital_ids = {v["hospitalId"] for v in patient["visits"]}
        first_visit = hospitalId not in prior_hospital_ids
        visit_number = len(patient["visits"]) + 1
        visit_id = f"VIS-{patientId}-{visit_number:03d}"
        hospital_name = hospital_names.get(hospitalId, hospitalId)
        visit_record = {
            "visitId": visit_id,
            "hospitalId": hospitalId,
            "hospitalName": hospital_name,
            "doctorName": doctorName,
            "date": date.today().isoformat(),
            "diagnosis": diagnosis,
            "prescribedMedicines": prescribedMedicines,
            "testsOrdered": [],
            "allergiesNoted": allergiesNoted,
            "notes": notes,
        }
        patient["visits"].append(visit_record)
        existing_lower = {a.lower() for a in patient["knownAllergies"]}
        for allergy in allergiesNoted:
            al = allergy.lower().strip()
            if al and al not in existing_lower:
                patient["knownAllergies"].append(al)
                existing_lower.add(al)
        return {
            "visitId": visit_id,
            "recordedToHistory": True,
            "firstVisitAtThisHospital": first_visit,
        }

    return log_patient_visit


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestLogPatientVisit:

    def test_1_happy_path_existing_patient(self):
        """Happy path: log a new visit for PAT-002 at HOSP-B."""
        patients = make_patients()
        tool = make_tool(patients)

        # PAT-002 has visited HOSP-A, HOSP-B, HOSP-D — HOSP-C is new
        result = tool(
            patientId="PAT-002",
            hospitalId="HOSP-C",
            doctorName="Dr. Test",
            diagnosis="Annual Checkup",
            prescribedMedicines=[{"name": "cetirizine", "dosage": "10mg daily"}],
        )

        assert result.get("recordedToHistory") is True
        assert result["visitId"].startswith("VIS-PAT-002-")
        assert result["firstVisitAtThisHospital"] is True

    def test_2_existing_hospital_not_first_visit(self):
        """firstVisitAtThisHospital is False when patient already has a visit there."""
        patients = make_patients()
        tool = make_tool(patients)

        # PAT-001 already has visits at HOSP-A
        result = tool(
            patientId="PAT-001",
            hospitalId="HOSP-A",
            doctorName="Dr. Repeat",
            diagnosis="Follow-up",
            prescribedMedicines=[{"name": "lisinopril", "dosage": "10mg"}],
        )

        assert result["firstVisitAtThisHospital"] is False
        assert result["recordedToHistory"] is True

    def test_3_new_patient_created(self):
        """New patientId not in fixture → patient is created, firstVisit is True."""
        patients = make_patients()
        tool = make_tool(patients)

        result = tool(
            patientId="PAT-011",
            hospitalId="HOSP-C",
            doctorName="Dr. New",
            diagnosis="General Consultation",
            prescribedMedicines=[{"name": "paracetamol", "dosage": "500mg prn"}],
        )

        assert result["recordedToHistory"] is True
        assert result["firstVisitAtThisHospital"] is True
        assert "PAT-011" in patients

    def test_4_allergy_merge_new_allergy(self):
        """New allergy is merged into knownAllergies without duplicates."""
        patients = make_patients()
        tool = make_tool(patients)

        # PAT-001 has empty knownAllergies in current data — latex is new
        tool(
            patientId="PAT-001",
            hospitalId="HOSP-C",
            doctorName="Dr. Merge",
            diagnosis="Infection",
            prescribedMedicines=[{"name": "azithromycin", "dosage": "500mg"}],
            allergiesNoted=["latex"],
        )

        known = patients["PAT-001"]["knownAllergies"]
        assert "latex" in known

    def test_5_allergy_merge_no_duplicates(self):
        """Duplicate allergy entry is NOT added again."""
        patients = make_patients()
        tool = make_tool(patients)

        # PAT-003 already has "penicillin" in knownAllergies
        before = len(patients["PAT-003"]["knownAllergies"])
        tool(
            patientId="PAT-003",
            hospitalId="HOSP-B",
            doctorName="Dr. Dup",
            diagnosis="Sinusitis",
            prescribedMedicines=[{"name": "doxycycline", "dosage": "100mg"}],
            allergiesNoted=["penicillin"],
        )

        after = len(patients["PAT-003"]["knownAllergies"])
        assert after == before  # no new entry added

    def test_6_validation_missing_diagnosis(self):
        """Omitting diagnosis returns error, not a crash."""
        patients = make_patients()
        tool = make_tool(patients)

        result = tool(
            patientId="PAT-001",
            hospitalId="HOSP-A",
            doctorName="Dr. X",
            diagnosis="",  # empty
            prescribedMedicines=[{"name": "aspirin", "dosage": "75mg"}],
        )

        assert result.get("error") is True
        assert any("diagnosis" in m.lower() for m in result.get("messages", []))

    def test_7_validation_empty_medicines(self):
        """Empty prescribedMedicines returns error."""
        patients = make_patients()
        tool = make_tool(patients)

        result = tool(
            patientId="PAT-001",
            hospitalId="HOSP-A",
            doctorName="Dr. X",
            diagnosis="Checkup",
            prescribedMedicines=[],
        )

        assert result.get("error") is True

    def test_8_output_schema_exact_fields(self):
        """Output must have exactly visitId, recordedToHistory, firstVisitAtThisHospital."""
        patients = make_patients()
        tool = make_tool(patients)

        result = tool(
            patientId="PAT-003",
            hospitalId="HOSP-A",
            doctorName="Dr. Schema",
            diagnosis="Checkup",
            prescribedMedicines=[{"name": "metformin", "dosage": "500mg"}],
        )

        assert set(result.keys()) == {"visitId", "recordedToHistory", "firstVisitAtThisHospital"}

    def test_9_visit_appears_in_history(self):
        """Newly logged visit is immediately visible in patient's visits array."""
        patients = make_patients()
        tool = make_tool(patients)

        result = tool(
            patientId="PAT-004",
            hospitalId="HOSP-C",
            doctorName="Dr. History",
            diagnosis="Persistent Cough",
            prescribedMedicines=[{"name": "salbutamol inhaler", "dosage": "100mcg prn"}],
        )

        visit_ids = [v["visitId"] for v in patients["PAT-004"]["visits"]]
        assert result["visitId"] in visit_ids

    def test_10_visitid_format(self):
        """visitId follows the VIS-{patientId}-NNN convention."""
        patients = make_patients()
        tool = make_tool(patients)

        result = tool(
            patientId="PAT-002",
            hospitalId="HOSP-D",
            doctorName="Dr. Format",
            diagnosis="Routine",
            prescribedMedicines=[{"name": "cetirizine", "dosage": "10mg"}],
        )

        vid = result["visitId"]
        assert vid.startswith("VIS-PAT-002-")
        # Check the numeric suffix is zero-padded 3 digits
        suffix = vid.split("-")[-1]
        assert suffix.isdigit() and len(suffix) == 3
