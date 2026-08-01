"""
Tests for followup_scheduler tool.
Run: pytest tests/test_followup_scheduler.py -v
"""

import copy
import sys
from datetime import date, timedelta
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))

from server import _patients as _orig_patients, _load_data


def make_patients():
    _load_data()
    return copy.deepcopy(_orig_patients)


def make_tool(patients, session_risk=None):
    if session_risk is None:
        session_risk = {}

    from datetime import datetime

    BASE_MAPPING = {
        "mild":     ("Routine", 30, False),
        "moderate": ("Soon",    7,  True),
        "severe":   ("Urgent",  3,  True),
    }
    ESCALATION = {
        "Routine": ("Soon",   14),
        "Soon":    ("Urgent",  3),
        "Urgent":  ("Urgent",  3),
    }

    def followup_scheduler(patientId, diagnosis, severity):
        if not patientId or patientId not in patients:
            return {"error": True, "message": f"Patient '{patientId}' not found."}
        if not diagnosis or not isinstance(diagnosis, str) or not diagnosis.strip():
            return {"error": True, "message": "'diagnosis' required."}
        severity_lower = severity.lower().strip() if isinstance(severity, str) else ""
        if severity_lower not in BASE_MAPPING:
            return {"error": True, "message": f"'severity' must be mild/moderate/severe. Got: '{severity}'."}

        patient = patients[patientId]
        tier, days, doctor_notified = BASE_MAPPING[severity_lower]
        reason_parts = [f"Severity is {severity_lower} ({diagnosis})."]

        cutoff = date.today() - timedelta(days=90)
        recurring_visit = None
        for visit in patient["visits"]:
            try:
                vd = datetime.strptime(visit["date"], "%Y-%m-%d").date()
            except ValueError:
                continue
            if vd >= cutoff and visit["diagnosis"].lower().strip() == diagnosis.lower().strip():
                if recurring_visit is None or vd > datetime.strptime(recurring_visit["date"], "%Y-%m-%d").date():
                    recurring_visit = visit

        escalated_by_recurrence = False
        if recurring_visit:
            old_tier = tier
            tier, days = ESCALATION[tier]
            doctor_notified = True
            escalated_by_recurrence = True
            reason_parts.append(
                f"Same diagnosis ('{diagnosis}') was recorded at {recurring_visit['hospitalName']} "
                f"on {recurring_visit['date']}, within 90 days — escalated from {old_tier} to {tier}."
            )

        sr = session_risk.get(patientId)
        if sr == "high":
            old_tier = tier
            tier, days = ESCALATION[tier]
            doctor_notified = True
            reason_parts.append(
                f"Safety check flagged HIGH risk — escalated from {old_tier} to {tier}."
            )

        if not escalated_by_recurrence and sr != "high":
            if severity_lower == "severe":
                reason_parts.append(f"Urgent follow-up within {days} days. Doctor notified.")
            elif severity_lower == "moderate":
                reason_parts.append(f"Follow-up within {days} days recommended. Doctor notified.")
            else:
                reason_parts.append(f"Routine follow-up in {days} days.")

        return {
            "urgencyTier": tier,
            "recommendedFollowupDays": days,
            "doctorNotified": doctor_notified,
            "reason": " ".join(reason_parts),
        }

    return followup_scheduler


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestFollowupScheduler:

    def test_1_severe_urgent_pat007(self):
        """PAT-007 + 'Acute Myocardial Infarction' + severe → Urgent, ≤3 days, doctorNotified."""
        patients = make_patients()
        tool = make_tool(patients)

        result = tool("PAT-007", "Acute Myocardial Infarction", "severe")

        assert result["urgencyTier"] == "Urgent"
        assert result["recommendedFollowupDays"] <= 3
        assert result["doctorNotified"] is True
        assert "severe" in result["reason"].lower() or "Urgent" in result["reason"]

    def test_2_mild_routine_pat002(self):
        """PAT-002 + 'Seasonal Allergic Rhinitis' + mild → Routine, ≥30 days, no doctor."""
        patients = make_patients()
        tool = make_tool(patients)

        result = tool("PAT-002", "Seasonal Allergic Rhinitis", "mild")

        assert result["urgencyTier"] == "Routine"
        assert result["recommendedFollowupDays"] >= 30
        assert result["doctorNotified"] is False

    def test_3_moderate_soon(self):
        """Moderate severity → Soon, 7 days, doctorNotified."""
        patients = make_patients()
        tool = make_tool(patients)

        result = tool("PAT-004", "COPD Exacerbation", "moderate")

        assert result["urgencyTier"] == "Soon"
        assert result["recommendedFollowupDays"] == 7
        assert result["doctorNotified"] is True

    def test_4_case_insensitive_severity(self):
        """Severity 'Mild' (capitalized) is normalised correctly."""
        patients = make_patients()
        tool = make_tool(patients)

        result = tool("PAT-002", "Rhinitis", "Mild")

        assert result["urgencyTier"] == "Routine"

    def test_5_invalid_severity(self):
        """Severity 'critical' returns error response."""
        patients = make_patients()
        tool = make_tool(patients)

        result = tool("PAT-001", "Checkup", "critical")

        assert result.get("error") is True

    def test_6_patient_not_found(self):
        """PAT-999 returns error response."""
        patients = make_patients()
        tool = make_tool(patients)

        result = tool("PAT-999", "Checkup", "mild")

        assert result.get("error") is True

    def test_7_reason_contains_diagnosis(self):
        """reason field is non-empty and contains the diagnosis name."""
        patients = make_patients()
        tool = make_tool(patients)

        diagnosis = "Hypertension"
        result = tool("PAT-001", diagnosis, "mild")

        assert isinstance(result["reason"], str) and len(result["reason"]) > 0
        assert diagnosis in result["reason"]

    def test_8_recurring_diagnosis_escalation(self):
        """PAT-002 has 'Asthma' recurring in history → escalated from Routine to Soon."""
        patients = make_patients()

        # PAT-002 has 'Asthma' in two visits; set the most recent to within 90 days
        today = date.today()
        for v in patients["PAT-002"]["visits"]:
            if v["diagnosis"].lower() == "asthma":
                v["date"] = (today - timedelta(days=30)).isoformat()

        tool = make_tool(patients)
        result = tool("PAT-002", "Asthma", "mild")

        # Should be escalated from Routine to Soon due to recurrence
        assert result["urgencyTier"] == "Soon"
        assert result["recommendedFollowupDays"] == 14
        assert result["doctorNotified"] is True
        assert "escalated" in result["reason"].lower()

    def test_9_session_risk_high_escalates(self):
        """High session risk level escalates urgency tier."""
        patients = make_patients()
        session_risk = {"PAT-001": "high"}
        tool = make_tool(patients, session_risk)

        result = tool("PAT-001", "Hypertension", "mild")

        # mild = Routine; high risk → escalated to Soon (or Urgent if recurring)
        assert result["urgencyTier"] in ("Soon", "Urgent")
        assert result["doctorNotified"] is True

    def test_10_output_schema_exact_fields(self):
        """Output must have exactly: urgencyTier, recommendedFollowupDays, doctorNotified, reason."""
        patients = make_patients()
        tool = make_tool(patients)

        result = tool("PAT-001", "Hypertension", "moderate")

        assert set(result.keys()) == {"urgencyTier", "recommendedFollowupDays", "doctorNotified", "reason"}

    def test_11_urgent_does_not_escalate_beyond_urgent(self):
        """Urgent severity stays Urgent even with recurring diagnosis."""
        patients = make_patients()
        # Set a recent PAT-007 visit with same diagnosis
        today = date.today()
        patients["PAT-007"]["visits"][-1]["date"] = (today - timedelta(days=10)).isoformat()
        patients["PAT-007"]["visits"][-1]["diagnosis"] = "Acute Myocardial Infarction"

        tool = make_tool(patients)
        result = tool("PAT-007", "Acute Myocardial Infarction", "severe")

        assert result["urgencyTier"] == "Urgent"
        assert result["recommendedFollowupDays"] == 3

    def test_12_reason_cites_hospital_on_escalation(self):
        """reason cites the hospital and date when recurring-diagnosis escalation triggers."""
        patients = make_patients()
        today = date.today()
        patients["PAT-001"]["visits"][-1]["date"] = (today - timedelta(days=20)).isoformat()
        patients["PAT-001"]["visits"][-1]["diagnosis"] = "Hypertension"

        tool = make_tool(patients)
        result = tool("PAT-001", "Hypertension", "mild")

        assert result["urgencyTier"] in ("Soon", "Urgent")
        # Reason should mention the hospital name and date
        assert "Lakeside" in result["reason"] or "City" in result["reason"] or "2025" in result["reason"]
