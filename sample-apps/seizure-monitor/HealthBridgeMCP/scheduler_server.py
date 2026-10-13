"""
HealthBridge Scheduler MCP Server
===================================
Dedicated appointment and workflow management server.

Tools (7):
  1. schedule_appointment       — Book a follow-up appointment
  2. get_upcoming_appointments  — List appointments within N days
  3. reschedule_appointment     — Move an appointment to a new date
  4. cancel_appointment         — Cancel and log reason
  5. get_doctor_schedule        — All appointments for a specific doctor
  6. get_overdue_followups      — Patients whose followupDate has passed with no new visit
  7. get_appointment            — Get details of a specific appointment

Resources:
  scheduler://appointments/today
  scheduler://appointments/{patientId}
  scheduler://overdue
  scheduler://doctors

Run:
  python scheduler_server.py          # stdio
  python scheduler_server.py --http   # SSE/HTTP on port 8081
"""

import json
import sys
import uuid
from datetime import date, datetime, timedelta
from pathlib import Path

from mcp.server.fastmcp import FastMCP

BASE_DIR = Path(__file__).parent
DATA_DIR = BASE_DIR / "data"

# ---------------------------------------------------------------------------
# In-memory stores
# ---------------------------------------------------------------------------

# appointments: appointmentId -> appointment_dict
_appointments: dict = {}

# patients index (loaded for validation and name resolution)
_patients: dict = {}

# doctors registry
_doctors: list = []
_doctors_by_id: dict = {}


def _load_data():
    global _patients, _doctors, _doctors_by_id

    patients_path = DATA_DIR / "patients.json"
    if patients_path.exists():
        with open(patients_path, encoding="utf-8") as f:
            _patients = {p["patientId"]: p for p in json.load(f)}

    doctors_path = DATA_DIR / "doctors.json"
    if doctors_path.exists():
        with open(doctors_path, encoding="utf-8") as f:
            data = json.load(f)
            _doctors = data.get("doctors", [])
            _doctors_by_id = {d["doctorId"]: d for d in _doctors}


_load_data()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _now_iso() -> str:
    return datetime.utcnow().isoformat(timespec="seconds") + "Z"

def _today() -> str:
    return date.today().isoformat()

def _get_patient_name(patient_id: str) -> str:
    return _patients.get(patient_id, {}).get("name", f"Unknown ({patient_id})")

HOSPITAL_NAMES = {
    "HOSP-A": "City General Hospital",
    "HOSP-B": "Sunrise Medical Centre",
    "HOSP-C": "Green Valley Clinic",
    "HOSP-D": "Lakeside Pharmacy & Hospital",
}


# ---------------------------------------------------------------------------
# FastMCP app
# ---------------------------------------------------------------------------

mcp = FastMCP(
    name="HealthBridge Scheduler MCP",
    instructions=(
        "HealthBridge Scheduler MCP manages patient appointments and follow-up scheduling. "
        "Tools: schedule_appointment, get_upcoming_appointments, reschedule_appointment, "
        "cancel_appointment, get_doctor_schedule, get_overdue_followups, get_appointment. "
        "Use this server to answer: 'who has appointments this week?', "
        "'book a follow-up for PAT-001', 'what is Dr. Menon's schedule?', "
        "'which patients are overdue for a follow-up?'"
    ),
)


# ---------------------------------------------------------------------------
# Resources
# ---------------------------------------------------------------------------

@mcp.resource("scheduler://appointments/today")
def appointments_today() -> str:
    today = _today()
    appts = [a for a in _appointments.values() if a["appointmentDate"] == today and a["status"] == "scheduled"]
    return json.dumps({"date": today, "count": len(appts), "appointments": sorted(appts, key=lambda a: a.get("time", "00:00"))}, indent=2)


@mcp.resource("scheduler://appointments/{patient_id}")
def appointments_for_patient(patient_id: str) -> str:
    appts = [a for a in _appointments.values() if a["patientId"] == patient_id]
    return json.dumps({"patientId": patient_id, "count": len(appts), "appointments": sorted(appts, key=lambda a: a["appointmentDate"])}, indent=2)


@mcp.resource("scheduler://overdue")
def overdue_appointments() -> str:
    today_d = date.today()
    overdue = [
        a for a in _appointments.values()
        if a["status"] == "scheduled" and datetime.strptime(a["appointmentDate"], "%Y-%m-%d").date() < today_d
    ]
    return json.dumps({"overdueCount": len(overdue), "appointments": sorted(overdue, key=lambda a: a["appointmentDate"])}, indent=2)


@mcp.resource("scheduler://doctors")
def all_doctors() -> str:
    return json.dumps({"totalDoctors": len(_doctors), "doctors": _doctors}, indent=2)


# ---------------------------------------------------------------------------
# Tools
# ---------------------------------------------------------------------------

@mcp.tool(
    name="schedule_appointment",
    description=(
        "Book a follow-up appointment for a patient with a specific doctor at a hospital. "
        "Returns the appointment ID and confirmation. "
        "Answers: 'schedule a follow-up for PAT-001 with Dr. Menon', "
        "'book an appointment at City General for patient Rahul Desai'."
    ),
)
def schedule_appointment(
    patient_id: str,
    doctor_id: str,
    appointment_date: str,
    hospital_id: str,
    reason: str,
    urgency_tier: str = "Routine",
    time_slot: str = "10:00",
    notes: str = "",
) -> dict:
    # Validate patient
    if patient_id not in _patients:
        return {"error": True, "message": f"Patient '{patient_id}' not found."}

    # Validate doctor
    doctor = _doctors_by_id.get(doctor_id)
    if not doctor:
        # Try name-based lookup
        matches = [d for d in _doctors if doctor_id.lower() in d["name"].lower()]
        if not matches:
            return {"error": True, "message": f"Doctor '{doctor_id}' not found. Use get_doctor_schedule to find valid doctor IDs."}
        if len(matches) > 1:
            return {"error": True, "message": "Multiple doctors matched.", "matches": [{"doctorId": d["doctorId"], "name": d["name"]} for d in matches]}
        doctor = matches[0]

    # Validate date
    try:
        appt_d = datetime.strptime(appointment_date, "%Y-%m-%d").date()
        if appt_d < date.today():
            return {"error": True, "message": f"Appointment date '{appointment_date}' is in the past."}
    except ValueError:
        return {"error": True, "message": f"'appointment_date' must be YYYY-MM-DD. Got: '{appointment_date}'."}

    # Check for duplicate appointment on same date
    existing = [
        a for a in _appointments.values()
        if a["patientId"] == patient_id and a["appointmentDate"] == appointment_date and a["status"] == "scheduled"
    ]
    if existing:
        return {"error": True, "message": f"Patient '{patient_id}' already has an appointment on {appointment_date}.", "existing": existing[0]}

    appt_id = f"APT-{str(uuid.uuid4())[:8].upper()}"
    hospital_name = HOSPITAL_NAMES.get(hospital_id, hospital_id)

    appointment = {
        "appointmentId": appt_id,
        "patientId": patient_id,
        "patientName": _get_patient_name(patient_id),
        "doctorId": doctor["doctorId"],
        "doctorName": doctor["name"],
        "specialty": doctor["specialty"],
        "hospitalId": hospital_id,
        "hospitalName": hospital_name,
        "appointmentDate": appointment_date,
        "time": time_slot,
        "reason": reason,
        "urgencyTier": urgency_tier,
        "notes": notes,
        "status": "scheduled",
        "createdAt": _now_iso(),
    }
    _appointments[appt_id] = appointment

    return {
        "success": True,
        "appointmentId": appt_id,
        "patientName": _get_patient_name(patient_id),
        "doctorName": doctor["name"],
        "hospitalName": hospital_name,
        "appointmentDate": appointment_date,
        "time": time_slot,
        "urgencyTier": urgency_tier,
        "status": "scheduled",
    }


@mcp.tool(
    name="get_upcoming_appointments",
    description=(
        "List all upcoming appointments within the next N days. "
        "Filter by hospital, doctor, or urgency tier. "
        "Answers: 'who has appointments this week?', 'what Urgent appointments are coming up?', "
        "'what appointments are scheduled at HOSP-A tomorrow?'"
    ),
)
def get_upcoming_appointments(
    days: int = 7,
    hospital_id: str | None = None,
    doctor_id: str | None = None,
    urgency_tier: str | None = None,
) -> dict:
    today_d = date.today()
    cutoff = today_d + timedelta(days=days)

    results = []
    for a in _appointments.values():
        if a["status"] != "scheduled":
            continue
        try:
            appt_d = datetime.strptime(a["appointmentDate"], "%Y-%m-%d").date()
        except ValueError:
            continue
        if not (today_d <= appt_d <= cutoff):
            continue
        if hospital_id and a.get("hospitalId", "").upper() != hospital_id.upper():
            continue
        if doctor_id and a.get("doctorId", "").upper() != doctor_id.upper():
            continue
        if urgency_tier and a.get("urgencyTier", "").lower() != urgency_tier.lower():
            continue
        results.append(a)

    results.sort(key=lambda a: (a["appointmentDate"], a.get("time", "00:00")))

    return {
        "queryWindowDays": days,
        "upcomingCount": len(results),
        "urgentCount": sum(1 for a in results if a.get("urgencyTier") == "Urgent"),
        "appointments": results,
    }


@mcp.tool(
    name="reschedule_appointment",
    description=(
        "Move an existing appointment to a new date (and optionally new time). "
        "The original appointment is cancelled and a new one is created. "
        "Answers: 'move PAT-001 appointment to next Monday', 'reschedule APT-XXXXXXXX to 2026-08-10'."
    ),
)
def reschedule_appointment(
    appointment_id: str,
    new_date: str,
    new_time: str = "10:00",
    reason: str = "Rescheduled by clinician",
) -> dict:
    appt = _appointments.get(appointment_id)
    if not appt:
        return {"error": True, "message": f"Appointment '{appointment_id}' not found."}
    if appt["status"] != "scheduled":
        return {"error": True, "message": f"Appointment '{appointment_id}' is already {appt['status']}."}

    try:
        new_d = datetime.strptime(new_date, "%Y-%m-%d").date()
        if new_d < date.today():
            return {"error": True, "message": f"New date '{new_date}' is in the past."}
    except ValueError:
        return {"error": True, "message": f"'new_date' must be YYYY-MM-DD. Got: '{new_date}'."}

    old_date = appt["appointmentDate"]
    appt["status"] = "rescheduled"
    appt["rescheduledAt"] = _now_iso()
    appt["rescheduleReason"] = reason

    new_appt_id = f"APT-{str(uuid.uuid4())[:8].upper()}"
    new_appt = {**appt, "appointmentId": new_appt_id, "appointmentDate": new_date, "time": new_time,
                "status": "scheduled", "createdAt": _now_iso(), "rescheduledFrom": appointment_id}
    del new_appt["rescheduledAt"]
    del new_appt["rescheduleReason"]
    _appointments[new_appt_id] = new_appt

    return {
        "success": True,
        "oldAppointmentId": appointment_id,
        "oldDate": old_date,
        "newAppointmentId": new_appt_id,
        "newDate": new_date,
        "newTime": new_time,
        "patientName": appt["patientName"],
        "doctorName": appt["doctorName"],
    }


@mcp.tool(
    name="cancel_appointment",
    description=(
        "Cancel an existing scheduled appointment. "
        "Records the cancellation reason and marks the appointment as cancelled. "
        "Answers: 'cancel appointment APT-XXXXXXXX', 'cancel PAT-001 appointment'."
    ),
)
def cancel_appointment(
    appointment_id: str | None = None,
    patient_id: str | None = None,
    reason: str = "Cancelled by request",
) -> dict:
    if appointment_id:
        appt = _appointments.get(appointment_id)
        if not appt:
            return {"error": True, "message": f"Appointment '{appointment_id}' not found."}
    elif patient_id:
        patient_appts = [a for a in _appointments.values() if a["patientId"] == patient_id and a["status"] == "scheduled"]
        if not patient_appts:
            return {"error": True, "message": f"No scheduled appointment found for patient '{patient_id}'."}
        appt = sorted(patient_appts, key=lambda a: a["appointmentDate"])[0]
        appointment_id = appt["appointmentId"]
    else:
        return {"error": True, "message": "Provide either 'appointment_id' or 'patient_id'."}

    if appt["status"] != "scheduled":
        return {"error": True, "message": f"Appointment '{appointment_id}' is already {appt['status']}."}

    appt["status"] = "cancelled"
    appt["cancelledAt"] = _now_iso()
    appt["cancellationReason"] = reason

    return {
        "success": True,
        "appointmentId": appointment_id,
        "patientName": appt["patientName"],
        "doctorName": appt["doctorName"],
        "wasScheduledFor": appt["appointmentDate"],
        "reason": reason,
    }


@mcp.tool(
    name="get_doctor_schedule",
    description=(
        "Get all upcoming appointments for a specific doctor. "
        "Search by doctor ID or name (partial, case-insensitive). "
        "Answers: 'what is Dr. Menon schedule this week?', 'how many patients does DOC-001 have?'"
    ),
)
def get_doctor_schedule(
    doctor_id: str | None = None,
    doctor_name: str | None = None,
    days: int = 30,
) -> dict:
    if not doctor_id and not doctor_name:
        return {"error": True, "message": "Provide either 'doctor_id' or 'doctor_name'."}

    doctor = None
    if doctor_id:
        doctor = _doctors_by_id.get(doctor_id)
    if not doctor and doctor_name:
        matches = [d for d in _doctors if doctor_name.lower() in d["name"].lower()]
        if len(matches) == 1:
            doctor = matches[0]
        elif len(matches) > 1:
            return {"error": True, "message": "Multiple doctors matched.", "matches": [{"doctorId": d["doctorId"], "name": d["name"]} for d in matches]}

    if not doctor:
        return {"error": True, "message": "Doctor not found."}

    cutoff = date.today() + timedelta(days=days)
    today_d = date.today()

    appts = [
        a for a in _appointments.values()
        if a.get("doctorId") == doctor["doctorId"] and a["status"] == "scheduled"
        and today_d <= datetime.strptime(a["appointmentDate"], "%Y-%m-%d").date() <= cutoff
    ]
    appts.sort(key=lambda a: (a["appointmentDate"], a.get("time", "00:00")))

    return {
        "doctor": doctor,
        "queryWindowDays": days,
        "upcomingAppointments": len(appts),
        "schedule": appts,
    }


@mcp.tool(
    name="get_overdue_followups",
    description=(
        "Find all patients whose scheduled follow-up date has passed but who have not had a new visit logged. "
        "This catches patients who 'fell through the cracks'. "
        "Answers: 'which patients missed their follow-up?', 'who is overdue for a visit?', "
        "'list all overdue Urgent follow-ups'."
    ),
)
def get_overdue_followups(urgency_tier: str | None = None) -> dict:
    today_d = date.today()
    overdue = []

    for a in _appointments.values():
        if a["status"] != "scheduled":
            continue
        try:
            appt_d = datetime.strptime(a["appointmentDate"], "%Y-%m-%d").date()
        except ValueError:
            continue
        if appt_d >= today_d:
            continue
        if urgency_tier and a.get("urgencyTier", "").lower() != urgency_tier.lower():
            continue

        # Check if patient has had a new visit since the appointment date
        patient = _patients.get(a["patientId"], {})
        visits_since = [
            v for v in patient.get("visits", [])
            if v.get("date", "") >= a["appointmentDate"]
        ]

        days_overdue = (today_d - appt_d).days
        overdue.append({
            **a,
            "daysOverdue": days_overdue,
            "hasNewVisitSinceDate": len(visits_since) > 0,
            "newVisitCount": len(visits_since),
        })

    overdue.sort(key=lambda a: a["appointmentDate"])

    return {
        "overdueCount": len(overdue),
        "withNewVisit": sum(1 for a in overdue if a["hasNewVisitSinceDate"]),
        "withoutNewVisit": sum(1 for a in overdue if not a["hasNewVisitSinceDate"]),
        "overdueAppointments": overdue,
    }


@mcp.tool(
    name="get_appointment",
    description=(
        "Retrieve details of a specific appointment by ID, "
        "or all appointments for a specific patient."
    ),
)
def get_appointment(
    appointment_id: str | None = None,
    patient_id: str | None = None,
) -> dict:
    if appointment_id:
        appt = _appointments.get(appointment_id)
        if not appt:
            return {"error": True, "message": f"Appointment '{appointment_id}' not found."}
        return appt
    if patient_id:
        appts = sorted(
            [a for a in _appointments.values() if a["patientId"] == patient_id],
            key=lambda a: a["appointmentDate"],
        )
        return {"patientId": patient_id, "count": len(appts), "appointments": appts}
    return {"error": True, "message": "Provide either 'appointment_id' or 'patient_id'."}


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    if "--http" in sys.argv:
        mcp.run(transport="sse")
    else:
        mcp.run(transport="stdio")
