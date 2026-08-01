"""
HealthBridge MCP Server  (v2.0)
================================
Cross-hospital patient safety intelligence.

Tools (14 total):
  CORE CLINICAL:
  1.  log_patient_visit              — Record a new encounter
  2.  cross_hospital_safety_check    — Drug interactions / allergy / duplicate tests
  3.  medicine_availability_check    — Stock check → reroute → replenish
  4.  followup_scheduler             — Urgency tier with contextual escalation

  QUERY / ANALYTICS:
  5.  get_patient                    — Full record by ID or name
  6.  list_hospitals                 — All facilities + stock
  7.  get_patient_stats              — Aggregate network statistics
  8.  search_patients                — Filter by allergy / hospital / diagnosis
  9.  get_patient_visits             — Visit-by-visit breakdown
  10. get_patient_visits             — Visit-by-visit breakdown

  PERSISTENCE / NOTIFICATIONS:
  11. get_upcoming_followups         — Who has a follow-up within N days?
  12. cancel_followup                — Remove a scheduled follow-up
  13. get_notifications              — Query reroute/replenishment/safety alert log
  14. get_audit_log                  — Full audit trail of all tool calls

  DASHBOARD / WORKFLOWS:
  15. risk_dashboard                 — Network-wide risk snapshot (demo opener)
  16. patient_risk_profile           — All-in-one risk report for one patient
  17. bulk_safety_scan               — Scan all patients for potential conflicts
  18. simulate_workflow              — Run the full 4-step clinical pipeline in one call
  19. doctor_workload                — All patients seen by a specific doctor

Run:
  python server.py          # stdio transport (for MCP clients)
  python server.py --http   # SSE/HTTP transport on port 8080
"""

import json
import os
import sys
import uuid
from collections import defaultdict
from datetime import date, datetime, timedelta
from pathlib import Path

from mcp.server.fastmcp import FastMCP

# ---------------------------------------------------------------------------
# Shared in-memory stores — loaded once at startup, mutated by tool calls
# ---------------------------------------------------------------------------

BASE_DIR = Path(__file__).parent
DATA_DIR = BASE_DIR / "data"

# Core data stores
_patients: dict = {}
_drug_interactions: dict = {}
_allergy_mappings: dict = {}
_facility_stock: dict = {}
_session_risk_levels: dict = {}

# --- NEW STORES (v2.0) ---

# Scheduled follow-ups: patientId -> follow-up record
_scheduled_followups: dict = {}

# Notification log: list of notification dicts
_notifications: list = []

# Audit trail: list of audit event dicts
_audit_log: list = []


def _load_data():
    """Load all fixture files into memory. Called once at startup."""
    global _patients, _drug_interactions, _allergy_mappings, _facility_stock

    patients_path = DATA_DIR / "patients.json"
    with open(patients_path, encoding="utf-8") as f:
        patient_list = json.load(f)
    _patients = {p["patientId"]: p for p in patient_list}

    interactions_path = DATA_DIR / "drug_interactions.json"
    with open(interactions_path, encoding="utf-8") as f:
        interactions_data = json.load(f)

    for item in interactions_data.get("drugInteractions", []):
        key = frozenset([item["drug1"].lower(), item["drug2"].lower()])
        _drug_interactions[key] = item

    for item in interactions_data.get("allergyDrugMappings", []):
        _allergy_mappings[item["allergy"].lower()] = {
            "contraindicated": [d.lower() for d in item["contraindicated"]],
            "detail": item["detail"],
        }

    stock_path = DATA_DIR / "facility_stock.json"
    with open(stock_path, encoding="utf-8") as f:
        stock_data = json.load(f)

    for facility in stock_data.get("facilities", []):
        _facility_stock[facility["hospitalId"]] = {
            "hospitalName": facility["hospitalName"],
            "stock": {k.lower(): v for k, v in facility["stock"].items()},
        }


_load_data()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _now_iso() -> str:
    return datetime.utcnow().isoformat(timespec="seconds") + "Z"

def _today() -> str:
    return date.today().isoformat()

def _add_notification(type_: str, hospital_id: str, hospital_name: str, detail: str, medicine: str | None = None, patient_id: str | None = None):
    _notifications.append({
        "id": str(uuid.uuid4())[:8],
        "timestamp": _now_iso(),
        "type": type_,
        "hospitalId": hospital_id,
        "hospitalName": hospital_name,
        "medicine": medicine,
        "patientId": patient_id,
        "detail": detail,
        "resolved": False,
    })

def _add_audit(tool: str, input_summary: str, output_summary: str, patient_id: str | None = None, hospital_id: str | None = None):
    _audit_log.append({
        "id": str(uuid.uuid4())[:8],
        "timestamp": _now_iso(),
        "tool": tool,
        "patientId": patient_id,
        "hospitalId": hospital_id,
        "inputSummary": input_summary,
        "outputSummary": output_summary,
    })

def _get_hospital_name(hospital_id: str) -> str:
    mapping = {
        "HOSP-A": "City General Hospital",
        "HOSP-B": "Sunrise Medical Centre",
        "HOSP-C": "Green Valley Clinic",
        "HOSP-D": "Lakeside Pharmacy & Hospital",
    }
    return mapping.get(hospital_id, hospital_id)


# ---------------------------------------------------------------------------
# FastMCP app
# ---------------------------------------------------------------------------

mcp = FastMCP(
    name="HealthBridge MCP",
    instructions=(
        "HealthBridge MCP v2.0 — Cross-hospital patient safety intelligence. "
        "Core tools: log_patient_visit, cross_hospital_safety_check, medicine_availability_check, followup_scheduler. "
        "Query tools: get_patient, list_hospitals, get_patient_stats, search_patients, get_patient_visits. "
        "Persistence: get_upcoming_followups, cancel_followup, get_notifications, get_audit_log. "
        "Dashboard: risk_dashboard, patient_risk_profile, bulk_safety_scan, simulate_workflow, doctor_workload."
    ),
)

# ---------------------------------------------------------------------------
# Resource: patient_history
# ---------------------------------------------------------------------------

@mcp.resource("healthbridge://patients/{patient_id}")
def patient_history(patient_id: str) -> str:
    if patient_id.lower() == "all":
        summaries = [
            {
                "patientId": p["patientId"],
                "name": p["name"],
                "dateOfBirth": p["dateOfBirth"],
                "knownAllergies": p["knownAllergies"],
                "visitCount": len(p["visits"]),
            }
            for p in _patients.values()
        ]
        return json.dumps(summaries, indent=2)

    if patient_id.lower() == "count":
        return json.dumps({"totalPatients": len(_patients)})

    patient = _patients.get(patient_id)
    if not patient:
        return json.dumps({"error": f"Patient '{patient_id}' not found."})
    return json.dumps(patient, indent=2)


# ---------------------------------------------------------------------------
# CORE CLINICAL TOOLS (1–4)  — fully self-contained, no external imports
# ---------------------------------------------------------------------------

@mcp.tool(
    name="log_patient_visit",
    description=(
        "Record a new clinical visit for a patient at a hospital. "
        "Logs diagnosis, prescribed medicines, tests ordered, and allergies noted. "
        "Merges any newly discovered allergies into the patient's known allergy list. "
        "Use patientId like 'PAT-001' and hospitalId like 'HOSP-A'."
    ),
)
def log_patient_visit(
    patient_id: str,
    hospital_id: str,
    doctor_name: str,
    diagnosis: str,
    prescribed_medicines: list[dict[str, str]],
    tests_ordered: list[str] | None = None,
    allergies_noted: list[str] | None = None,
    notes: str = "",
) -> dict:
    hospital_name = _get_hospital_name(hospital_id)
    if patient_id not in _patients:
        return {"error": f"Patient '{patient_id}' not found."}
    patient = _patients[patient_id]
    prior_hospitals = {v["hospitalId"] for v in patient["visits"]}
    visit_number = len(patient["visits"]) + 1
    visit_id = f"VIS-{patient_id}-{visit_number:03d}"
    visit_record = {
        "visitId": visit_id,
        "hospitalId": hospital_id,
        "hospitalName": hospital_name,
        "doctorName": doctor_name,
        "date": _today(),
        "diagnosis": diagnosis,
        "prescribedMedicines": [{"name": m["name"].lower(), "dosage": m.get("dosage", "")} for m in prescribed_medicines],
        "testsOrdered": tests_ordered or [],
        "allergiesNoted": [a.lower() for a in (allergies_noted or [])],
        "notes": notes,
    }
    patient["visits"].append(visit_record)
    new_allergies = []
    existing_lower = {a.lower() for a in patient["knownAllergies"]}
    for a in (allergies_noted or []):
        al = a.lower().strip()
        if al and al not in existing_lower:
            patient["knownAllergies"].append(al)
            existing_lower.add(al)
            new_allergies.append(al)
    _add_audit("log_patient_visit", f"patientId={patient_id}, hospitalId={hospital_id}, diagnosis={diagnosis}",
               f"visitId={visit_id}, newAllergies={new_allergies}", patient_id=patient_id, hospital_id=hospital_id)
    return {
        "success": True,
        "visitId": visit_id,
        "patientId": patient_id,
        "hospitalId": hospital_id,
        "hospitalName": hospital_name,
        "date": _today(),
        "diagnosis": diagnosis,
        "firstVisitAtThisHospital": hospital_id not in prior_hospitals,
        "newAllergiesMerged": new_allergies,
        "prescribedMedicines": visit_record["prescribedMedicines"],
        "testsOrdered": visit_record["testsOrdered"],
    }


@mcp.tool(
    name="cross_hospital_safety_check",
    description=(
        "Scan a patient's full cross-hospital medication history for: "
        "(A) drug-drug interactions between new and historical meds, "
        "(B) intra-prescription drug conflicts, "
        "(C) allergy conflicts (new meds vs known allergies), "
        "(D) duplicate tests at different hospitals within a configurable window. "
        "Returns conflictCount, riskLevel ('none'|'caution'|'high'), and per-conflict details."
    ),
)
def cross_hospital_safety_check(
    patientId: str,
    newPrescription: list[dict[str, str]],
    duplicateTestWindowDays: int = 90,
) -> dict:
    patient = _patients.get(patientId)
    if not patient:
        return {"error": f"Patient '{patientId}' not found."}

    new_meds = [m["name"].lower().strip() for m in newPrescription]
    conflicts = []

    # A: new meds vs all historical meds
    existing_meds: dict[str, dict] = {}
    for v in patient["visits"]:
        for m in v.get("prescribedMedicines", []):
            existing_meds[m["name"].lower()] = v
    for nm in new_meds:
        for em, src_v in existing_meds.items():
            if nm == em:
                continue
            ix = _drug_interactions.get(frozenset([nm, em]))
            if ix:
                conflicts.append({
                    "type": "drug_interaction", "subtype": "history_vs_new",
                    "drug1": nm, "drug2": em,
                    "sourceHospital": src_v["hospitalName"], "sourceDate": src_v["date"],
                    "detail": ix["detail"], "severity": ix.get("severity", "caution"),
                })

    # B: intra-prescription conflicts
    for i in range(len(new_meds)):
        for j in range(i + 1, len(new_meds)):
            ix = _drug_interactions.get(frozenset([new_meds[i], new_meds[j]]))
            if ix:
                conflicts.append({
                    "type": "drug_interaction", "subtype": "intra_prescription",
                    "drug1": new_meds[i], "drug2": new_meds[j],
                    "detail": ix["detail"], "severity": ix.get("severity", "caution"),
                })

    # C: allergy conflicts
    for nm in new_meds:
        for allergy in [a.lower() for a in patient.get("knownAllergies", [])]:
            mapping = _allergy_mappings.get(allergy)
            if mapping and nm in mapping["contraindicated"]:
                conflicts.append({
                    "type": "allergy", "drug": nm, "allergy": allergy,
                    "detail": mapping["detail"], "severity": "high",
                })

    # D: duplicate tests
    duplicate_tests = []
    all_tests: list[tuple[str, str, str]] = []
    for v in patient["visits"]:
        for t in v.get("testsOrdered", []):
            all_tests.append((t.lower(), v["hospitalId"], v["date"]))
    seen = set()
    for i in range(len(all_tests)):
        for j in range(i + 1, len(all_tests)):
            t1, h1, d1 = all_tests[i]
            t2, h2, d2 = all_tests[j]
            if t1 != t2 or h1 == h2:
                continue
            delta = abs((datetime.strptime(d1, "%Y-%m-%d") - datetime.strptime(d2, "%Y-%m-%d")).days)
            if delta <= duplicateTestWindowDays:
                key = tuple(sorted([f"{t1}@{h1}@{d1}", f"{t2}@{h2}@{d2}"]))
                if key not in seen:
                    seen.add(key)
                    duplicate_tests.append({
                        "test": t1, "hospital1": h1, "date1": d1,
                        "hospital2": h2, "date2": d2, "daysApart": delta,
                    })

    risk_level = "none"
    for c in conflicts:
        if c.get("severity") == "high":
            risk_level = "high"
            break
        risk_level = "caution"

    _session_risk_levels[patientId] = risk_level
    _add_audit("cross_hospital_safety_check", f"patientId={patientId}, newMeds={new_meds}",
               f"conflicts={len(conflicts)}, riskLevel={risk_level}", patient_id=patientId)
    return {
        "patientId": patientId,
        "conflictCount": len(conflicts),
        "conflicts": conflicts,
        "duplicateTests": duplicate_tests,
        "summary": {
            "high": sum(1 for c in conflicts if c.get("severity") == "high"),
            "caution": sum(1 for c in conflicts if c.get("severity") == "caution"),
            "duplicateTests": len(duplicate_tests),
        },
        "riskLevel": risk_level,
    }


@mcp.tool(
    name="medicine_availability_check",
    description=(
        "Check if a medicine is in stock at a hospital. "
        "If insufficient: (1) tries to reroute from another facility, (2) requests replenishment if none available. "
        "Returns action: 'dispense' | 'reroute' | 'replenish_requested'. "
        "Answers: 'does HOSP-A have warfarin?', 'can we get 10 units of metformin at Sunrise Medical?'"
    ),
)
def medicine_availability_check(
    hospitalId: str,
    medicine: str,
    quantity: int = 1,
) -> dict:
    med_key = medicine.lower().strip()
    local = _facility_stock.get(hospitalId)
    if not local:
        return {"error": f"Hospital '{hospitalId}' not found."}
    hospital_name = local["hospitalName"]
    local_stock = local["stock"].get(med_key, 0)

    if local_stock >= quantity:
        local["stock"][med_key] = local_stock - quantity
        _add_audit("medicine_availability_check", f"hospitalId={hospitalId}, medicine={med_key}, qty={quantity}",
                   f"action=dispense, before={local_stock}, after={local_stock - quantity}", hospital_id=hospitalId)
        print(f"[HealthBridge] DISPENSE: {hospital_name} dispensed {quantity}x '{med_key}' (stock: {local_stock} → {local_stock - quantity}).")
        return {
            "action": "dispense", "medicine": med_key, "quantity": quantity,
            "hospitalId": hospitalId, "hospitalName": hospital_name,
            "localStockBefore": local_stock, "localStockAfter": local_stock - quantity,
        }

    # Try reroute
    others = sorted(
        [(hid, fac) for hid, fac in _facility_stock.items() if hid != hospitalId],
        key=lambda x: x[1]["stock"].get(med_key, 0), reverse=True,
    )
    for sid, sfac in others:
        if sfac["stock"].get(med_key, 0) >= quantity:
            _add_notification("reroute", hospitalId, hospital_name,
                              f"Rerouting {quantity}x {med_key} to {sfac['hospitalName']}", medicine=med_key)
            _add_audit("medicine_availability_check", f"hospitalId={hospitalId}, medicine={med_key}, qty={quantity}",
                       f"action=reroute, rerouteTo={sfac['hospitalName']}", hospital_id=hospitalId)
            print(f"[HealthBridge] REROUTE: {sfac['hospitalName']} ({sid}) has {sfac['stock'].get(med_key, 0)} units of '{med_key}' — rerouting from {hospital_name} (shortfall: {quantity - local_stock} units).")
            return {
                "action": "reroute", "medicine": med_key, "quantity": quantity,
                "requestingHospitalId": hospitalId, "requestingHospitalName": hospital_name,
                "rerouteFacility": sfac["hospitalName"], "rerouteFacilityId": sid,
                "rerouteFacilityStock": sfac["stock"].get(med_key, 0),
                "localStockAvailable": local_stock, "shortfall": quantity - local_stock,
            }

    # Replenish
    _add_notification("replenishment", hospitalId, hospital_name,
                      f"Replenishment requested for {med_key} — all facilities exhausted", medicine=med_key)
    _add_audit("medicine_availability_check", f"hospitalId={hospitalId}, medicine={med_key}, qty={quantity}",
               f"action=replenish_requested, shortfall={quantity - local_stock}", hospital_id=hospitalId)
    print(f"[HealthBridge] REPLENISH: '{med_key}' unavailable network-wide. Replenishment requested. Shortfall: {quantity - local_stock} units.")
    return {
        "action": "replenish_requested", "medicine": med_key, "quantity": quantity,
        "hospitalId": hospitalId, "hospitalName": hospital_name,
        "localStockAvailable": local_stock, "shortfall": quantity - local_stock,
        "networkStockStatus": {hid: fac["stock"].get(med_key, 0) for hid, fac in _facility_stock.items()},
    }


@mcp.tool(
    name="followup_scheduler",
    description=(
        "Schedule a follow-up appointment for a patient after a visit. "
        "Automatically assigns urgency tier (Routine/Soon/Urgent) based on severity and context. "
        "Escalates if: same diagnosis recurred within 90 days, or current session risk is high. "
        "Answers: 'schedule a follow-up for PAT-003', 'when should this patient come back?'"
    ),
)
def followup_scheduler(
    patient_id: str,
    diagnosis: str,
    severity: str,
    hospital_id: str | None = None,
    doctor_name: str | None = None,
) -> dict:
    patient = _patients.get(patient_id)
    if not patient:
        return {"error": f"Patient '{patient_id}' not found."}

    base = {"mild": ("Routine", 30, False), "moderate": ("Soon", 7, True), "severe": ("Urgent", 3, True)}
    escalation = {"Routine": ("Soon", 14), "Soon": ("Urgent", 3), "Urgent": ("Urgent", 3)}
    sev = severity.lower().strip() if severity.lower().strip() in base else "mild"
    tier, days, doctor_notified = base[sev]

    escalated_by = []
    cutoff_d = date.today() - timedelta(days=90)
    for v in patient["visits"]:
        try:
            vd = datetime.strptime(v["date"], "%Y-%m-%d").date()
        except ValueError:
            continue
        if vd >= cutoff_d and v["diagnosis"].lower() == diagnosis.lower():
            tier, days = escalation[tier]
            doctor_notified = True
            escalated_by.append(f"recurrence (same diagnosis at {v['hospitalName']} on {v['date']})")
            break

    session_risk = _session_risk_levels.get(patient_id, "none")
    if session_risk == "high":
        old_tier = tier
        new_tier, new_days = escalation[tier]
        if new_tier != old_tier:
            tier, days = new_tier, new_days
        doctor_notified = True
        escalated_by.append("high_risk safety check")

    followup_date = (date.today() + timedelta(days=days)).isoformat()
    record = {
        "patientId": patient_id, "patientName": patient["name"],
        "urgencyTier": tier, "followupDate": followup_date,
        "recommendedFollowupDays": days, "diagnosis": diagnosis,
        "severity": sev, "doctorNotified": doctor_notified,
        "escalatedBy": escalated_by, "scheduledAt": _now_iso(),
    }
    _scheduled_followups[patient_id] = record
    _add_audit("followup_scheduler", f"patientId={patient_id}, diagnosis={diagnosis}, severity={sev}",
               f"tier={tier}, followupDate={followup_date}, escalatedBy={escalated_by}", patient_id=patient_id)
    return record


# ---------------------------------------------------------------------------
# QUERY TOOLS (5–9)
# ---------------------------------------------------------------------------

@mcp.tool(
    name="get_patient",
    description=(
        "Retrieve the complete patient record including all visits, diagnoses, "
        "prescribed medicines, tests ordered, allergies, and clinical notes. "
        "Search by patient_id (e.g. 'PAT-001') OR by name (partial, case-insensitive). "
        "If multiple patients match, returns a summary list."
    ),
)
def get_patient(patient_id: str | None = None, name: str | None = None) -> dict:
    if not patient_id and not name:
        return {"error": "Provide either 'patient_id' or 'name'."}
    if patient_id:
        patient = _patients.get(patient_id)
        if not patient:
            return {"error": f"Patient '{patient_id}' not found."}
        return {"found": 1, "patient": patient}
    query = name.strip().lower()
    matches = [p for p in _patients.values() if query in p["name"].lower()]
    if not matches:
        return {"error": f"No patient found matching name '{name}'."}
    if len(matches) == 1:
        return {"found": 1, "patient": matches[0]}
    return {
        "found": len(matches),
        "message": "Multiple patients matched. Use patient_id for precise lookup.",
        "matches": [{"patientId": p["patientId"], "name": p["name"], "dateOfBirth": p["dateOfBirth"], "visitCount": len(p["visits"])} for p in matches],
    }


@mcp.tool(
    name="list_hospitals",
    description=(
        "List all hospitals in the HealthBridge network with current stock levels. "
        "Answers: 'how many hospitals?', 'what facilities exist?', 'what medicines does HOSP-A stock?'"
    ),
)
def list_hospitals() -> dict:
    hospitals = [
        {
            "hospitalId": hid,
            "hospitalName": fac["hospitalName"],
            "stockedMedicines": {k: v for k, v in fac["stock"].items() if v > 0},
            "outOfStock": [k for k, v in fac["stock"].items() if v == 0],
        }
        for hid, fac in _facility_stock.items()
    ]
    return {"totalHospitals": len(hospitals), "hospitals": hospitals}


@mcp.tool(
    name="get_patient_stats",
    description=(
        "Aggregate statistics across the entire HealthBridge network. "
        "Answers: 'how many patients have allergies?', 'most common diagnosis?', "
        "'total visits recorded?', 'which hospital has the most visits?', 'most prescribed medicines?'"
    ),
)
def get_patient_stats() -> dict:
    from collections import Counter
    total = len(_patients)
    with_allergies = sum(1 for p in _patients.values() if p["knownAllergies"])
    allergy_counts: Counter = Counter()
    diag_counts: Counter = Counter()
    med_counts: Counter = Counter()
    hosp_counts: Counter = Counter()
    total_visits = 0
    for p in _patients.values():
        for a in p["knownAllergies"]:
            allergy_counts[a.lower()] += 1
        for v in p["visits"]:
            total_visits += 1
            diag_counts[v["diagnosis"]] += 1
            hosp_counts[v["hospitalName"]] += 1
            for m in v["prescribedMedicines"]:
                med_counts[m["name"].lower()] += 1
    return {
        "totalPatients": total,
        "patientsWithAllergies": with_allergies,
        "patientsWithNoAllergies": total - with_allergies,
        "totalVisitsRecorded": total_visits,
        "averageVisitsPerPatient": round(total_visits / total, 2) if total else 0,
        "topDiagnoses": diag_counts.most_common(10),
        "topPrescribedMedicines": med_counts.most_common(10),
        "visitsByHospital": dict(hosp_counts.most_common()),
        "topAllergies": allergy_counts.most_common(10),
        "knownDrugInteractions": len(_drug_interactions),
        "knownAllergyMappings": len(_allergy_mappings),
    }


@mcp.tool(
    name="search_patients",
    description=(
        "Filter patients by allergy, hospital, diagnosis, or minimum visit count. "
        "Answers: 'which patients have penicillin allergy?', 'who visited City General?', "
        "'who was diagnosed with Hypertension?', 'who has more than 4 visits?'"
    ),
)
def search_patients(
    has_allergy: str | None = None,
    visited_hospital_id: str | None = None,
    diagnosis: str | None = None,
    min_visits: int | None = None,
) -> dict:
    results = []
    for p in _patients.values():
        if has_allergy and has_allergy.lower() not in [a.lower() for a in p["knownAllergies"]]:
            continue
        if visited_hospital_id and visited_hospital_id.upper() not in [v["hospitalId"] for v in p["visits"]]:
            continue
        if diagnosis and diagnosis.lower() not in [v["diagnosis"].lower() for v in p["visits"]]:
            continue
        if min_visits is not None and len(p["visits"]) < min_visits:
            continue
        results.append({
            "patientId": p["patientId"],
            "name": p["name"],
            "dateOfBirth": p["dateOfBirth"],
            "knownAllergies": p["knownAllergies"],
            "visitCount": len(p["visits"]),
        })
    return {"matchedPatients": len(results), "patients": results}


@mcp.tool(
    name="get_patient_visits",
    description=(
        "Structured visit-by-visit breakdown for a specific patient. "
        "Shows hospital, date, doctor, diagnosis, prescriptions, tests, allergies noted, notes. "
        "Also returns which hospitals the patient has attended. "
        "Answers: 'what hospitals has patient X visited?', 'what was prescribed at each visit?', "
        "'list all visits of patient X', 'what tests has patient X had?'"
    ),
)
def get_patient_visits(patient_id: str | None = None, name: str | None = None) -> dict:
    if not patient_id and not name:
        return {"error": "Provide either 'patient_id' or 'name'."}
    patient = None
    if patient_id:
        patient = _patients.get(patient_id)
        if not patient:
            return {"error": f"Patient '{patient_id}' not found."}
    else:
        query = name.strip().lower()
        matches = [p for p in _patients.values() if query in p["name"].lower()]
        if not matches:
            return {"error": f"No patient found matching name '{name}'."}
        if len(matches) > 1:
            return {"error": "Multiple patients matched — specify patient_id.", "matches": [{"patientId": p["patientId"], "name": p["name"]} for p in matches]}
        patient = matches[0]

    hospital_map = {}
    for v in patient["visits"]:
        hospital_map[v["hospitalId"]] = v["hospitalName"]

    return {
        "patientId": patient["patientId"],
        "name": patient["name"],
        "dateOfBirth": patient["dateOfBirth"],
        "knownAllergies": patient["knownAllergies"],
        "totalVisits": len(patient["visits"]),
        "hospitalsVisited": [{"hospitalId": hid, "hospitalName": hname} for hid, hname in hospital_map.items()],
        "visits": [
            {
                "visitId": v["visitId"], "date": v["date"],
                "hospital": v["hospitalName"], "hospitalId": v["hospitalId"],
                "doctor": v["doctorName"], "diagnosis": v["diagnosis"],
                "prescribedMedicines": v["prescribedMedicines"],
                "testsOrdered": v["testsOrdered"],
                "allergiesNoted": v["allergiesNoted"],
                "notes": v.get("notes", ""),
            }
            for v in patient["visits"]
        ],
    }


# ---------------------------------------------------------------------------
# PERSISTENCE TOOLS (11–14)
# ---------------------------------------------------------------------------

@mcp.tool(
    name="get_upcoming_followups",
    description=(
        "Query all scheduled patient follow-ups. "
        "Returns patients with a follow-up appointment within the specified number of days. "
        "Answers: 'how many patients have a follow-up this week?', "
        "'which Urgent patients need a call in the next 3 days?', "
        "'who has a follow-up scheduled at City General?'"
    ),
)
def get_upcoming_followups(
    days: int = 7,
    urgency_tier: str | None = None,
    hospital_id: str | None = None,
) -> dict:
    cutoff = date.today() + timedelta(days=days)
    today_d = date.today()
    results = []
    overdue = []

    for rec in _scheduled_followups.values():
        try:
            fu_date = datetime.strptime(rec["followupDate"], "%Y-%m-%d").date()
        except (ValueError, KeyError):
            continue

        if urgency_tier and rec.get("urgencyTier", "").lower() != urgency_tier.lower():
            continue

        if fu_date < today_d:
            overdue.append(rec)
        elif fu_date <= cutoff:
            results.append(rec)

    results.sort(key=lambda r: r["followupDate"])
    overdue.sort(key=lambda r: r["followupDate"])

    return {
        "queryWindowDays": days,
        "upcomingCount": len(results),
        "overdueCount": len(overdue),
        "upcoming": results,
        "overdue": overdue,
    }


@mcp.tool(
    name="cancel_followup",
    description=(
        "Cancel a scheduled follow-up for a patient. "
        "Removes the appointment from the scheduled follow-ups store. "
        "Use patient_id to identify the patient."
    ),
)
def cancel_followup(patient_id: str, reason: str = "Cancelled by clinician") -> dict:
    if patient_id not in _scheduled_followups:
        return {"error": True, "message": f"No scheduled follow-up found for patient '{patient_id}'."}
    removed = _scheduled_followups.pop(patient_id)
    _add_audit("cancel_followup", f"patientId={patient_id}", f"cancelled follow-up scheduled for {removed.get('followupDate')}", patient_id=patient_id)
    return {
        "cancelled": True,
        "patientId": patient_id,
        "wasScheduledFor": removed.get("followupDate"),
        "reason": reason,
    }


@mcp.tool(
    name="get_notifications",
    description=(
        "Query the HealthBridge notification log. "
        "Returns reroute alerts, replenishment requests, and safety alerts. "
        "Answers: 'what replenishment requests are pending?', 'what reroutes happened today?', "
        "'what safety alerts were raised at HOSP-B?'. "
        "All filters optional."
    ),
)
def get_notifications(
    type_filter: str | None = None,
    hospital_id: str | None = None,
    resolved: bool | None = None,
    limit: int = 50,
) -> dict:
    results = list(_notifications)
    if type_filter:
        results = [n for n in results if n["type"] == type_filter]
    if hospital_id:
        results = [n for n in results if n.get("hospitalId") == hospital_id.upper()]
    if resolved is not None:
        results = [n for n in results if n["resolved"] == resolved]
    results = sorted(results, key=lambda n: n["timestamp"], reverse=True)[:limit]
    return {
        "total": len(results),
        "filters": {"type": type_filter, "hospitalId": hospital_id, "resolved": resolved},
        "notifications": results,
    }


@mcp.tool(
    name="get_audit_log",
    description=(
        "Query the full audit trail of all tool calls made to this HealthBridge server. "
        "Answers: 'show me everything that happened to PAT-010 today', "
        "'what actions were taken at City General in the last hour?', "
        "'which tools were called most recently?'"
    ),
)
def get_audit_log(
    patient_id: str | None = None,
    hospital_id: str | None = None,
    tool_name: str | None = None,
    limit: int = 50,
) -> dict:
    results = list(_audit_log)
    if patient_id:
        results = [a for a in results if a.get("patientId") == patient_id]
    if hospital_id:
        results = [a for a in results if a.get("hospitalId") == hospital_id.upper()]
    if tool_name:
        results = [a for a in results if a.get("tool") == tool_name]
    results = sorted(results, key=lambda a: a["timestamp"], reverse=True)[:limit]
    return {"totalEvents": len(results), "events": results}


# ---------------------------------------------------------------------------
# DASHBOARD / WORKFLOW TOOLS (15–19)
# ---------------------------------------------------------------------------

@mcp.tool(
    name="risk_dashboard",
    description=(
        "Network-wide risk snapshot — the perfect demo opener. "
        "Returns: total patients, how many have known allergies, "
        "pending replenishment requests, overdue follow-ups, "
        "recent safety alerts from the notification log, "
        "and a per-hospital stock health summary. "
        "Call this first to get an overview of the entire HealthBridge network status."
    ),
)
def risk_dashboard() -> dict:
    from collections import Counter

    total_patients = len(_patients)
    with_allergies = sum(1 for p in _patients.values() if p["knownAllergies"])
    total_visits = sum(len(p["visits"]) for p in _patients.values())

    # Overdue follow-ups
    today_d = date.today()
    overdue_followups = [
        rec for rec in _scheduled_followups.values()
        if rec.get("followupDate") and datetime.strptime(rec["followupDate"], "%Y-%m-%d").date() < today_d
    ]
    upcoming_7d = [
        rec for rec in _scheduled_followups.values()
        if rec.get("followupDate") and today_d <= datetime.strptime(rec["followupDate"], "%Y-%m-%d").date() <= today_d + timedelta(days=7)
    ]
    urgent_followups = [r for r in upcoming_7d if r.get("urgencyTier") == "Urgent"]

    # Pending notifications
    pending_replenishments = [n for n in _notifications if n["type"] == "replenishment" and not n["resolved"]]
    pending_reroutes = [n for n in _notifications if n["type"] == "reroute" and not n["resolved"]]
    recent_safety_alerts = sorted(
        [n for n in _notifications if n["type"] == "safety_alert"],
        key=lambda n: n["timestamp"], reverse=True
    )[:5]

    # Stock health per hospital
    stock_health = {}
    for hid, fac in _facility_stock.items():
        total_items = len(fac["stock"])
        out_of_stock = sum(1 for v in fac["stock"].values() if v == 0)
        low_stock = sum(1 for v in fac["stock"].values() if 0 < v < 20)
        health = "critical" if out_of_stock > total_items * 0.5 else "low" if low_stock > total_items * 0.3 else "ok"
        stock_health[hid] = {
            "hospitalName": fac["hospitalName"],
            "status": health,
            "outOfStockItems": out_of_stock,
            "lowStockItems": low_stock,
            "totalItems": total_items,
        }

    return {
        "generatedAt": _now_iso(),
        "networkSummary": {
            "totalPatients": total_patients,
            "patientsWithKnownAllergies": with_allergies,
            "totalVisitsRecorded": total_visits,
            "knownDrugInteractions": len(_drug_interactions),
            "knownAllergyMappings": len(_allergy_mappings),
        },
        "followupStatus": {
            "totalScheduled": len(_scheduled_followups),
            "overdueCount": len(overdue_followups),
            "urgentInNext7Days": len(urgent_followups),
            "totalInNext7Days": len(upcoming_7d),
            "overdue": overdue_followups[:5],
            "urgentUpcoming": urgent_followups[:5],
        },
        "notificationStatus": {
            "pendingReplenishments": len(pending_replenishments),
            "pendingReroutes": len(pending_reroutes),
            "recentSafetyAlerts": recent_safety_alerts,
        },
        "hospitalStockHealth": stock_health,
    }


@mcp.tool(
    name="patient_risk_profile",
    description=(
        "Generate a comprehensive risk report for a single patient. "
        "Combines: known allergies (with source visit), active medications from last visit at each hospital, "
        "pending follow-up, cached safety risk level, duplicate test history, "
        "and multi-hospital visit pattern within 90 days. "
        "Answers: 'give me the full risk profile for Rahul Desai', 'is PAT-010 high risk?'"
    ),
)
def patient_risk_profile(patient_id: str | None = None, name: str | None = None) -> dict:
    if not patient_id and not name:
        return {"error": "Provide either 'patient_id' or 'name'."}

    patient = None
    if patient_id:
        patient = _patients.get(patient_id)
        if not patient:
            return {"error": f"Patient '{patient_id}' not found."}
    else:
        query = name.strip().lower()
        matches = [p for p in _patients.values() if query in p["name"].lower()]
        if not matches:
            return {"error": f"No patient found matching name '{name}'."}
        if len(matches) > 1:
            return {"error": "Multiple patients matched — specify patient_id.", "matches": [{"patientId": p["patientId"], "name": p["name"]} for p in matches]}
        patient = matches[0]

    pid = patient["patientId"]

    # Active medications (most recent prescription per hospital)
    active_meds_by_hospital = {}
    for visit in patient["visits"]:
        active_meds_by_hospital[visit["hospitalId"]] = {
            "hospitalName": visit["hospitalName"],
            "date": visit["date"],
            "doctor": visit["doctorName"],
            "medicines": visit["prescribedMedicines"],
        }

    # All unique active medications (union across hospitals)
    all_active_meds = list({m["name"].lower() for h in active_meds_by_hospital.values() for m in h["medicines"]})

    # Allergy sources
    allergy_sources = {}
    for visit in patient["visits"]:
        for a in visit.get("allergiesNoted", []):
            al = a.lower().strip()
            if al and al not in allergy_sources:
                allergy_sources[al] = {"firstNotedAt": visit["hospitalName"], "date": visit["date"]}

    # Duplicate tests (within 90 days across hospitals)
    test_entries = []
    for visit in patient["visits"]:
        for test in visit.get("testsOrdered", []):
            test_entries.append((test.lower(), visit["hospitalName"], visit["date"]))

    duplicate_tests = []
    seen_pairs: set = set()
    for i in range(len(test_entries)):
        for j in range(i + 1, len(test_entries)):
            t1, h1, d1 = test_entries[i]
            t2, h2, d2 = test_entries[j]
            if t1 != t2 or h1 == h2:
                continue
            try:
                delta = abs((datetime.strptime(d1, "%Y-%m-%d") - datetime.strptime(d2, "%Y-%m-%d")).days)
            except ValueError:
                continue
            if delta <= 90:
                pair_key = frozenset([(t1, min(d1, d2))])
                if pair_key not in seen_pairs:
                    seen_pairs.add(pair_key)
                    duplicate_tests.append({"test": t1, "hospital1": h1, "date1": d1, "hospital2": h2, "date2": d2, "daysApart": delta})

    # Multi-hospital pattern within 90 days
    cutoff = date.today() - timedelta(days=90)
    recent_hospital_ids = set()
    for visit in patient["visits"]:
        try:
            vd = datetime.strptime(visit["date"], "%Y-%m-%d").date()
        except ValueError:
            continue
        if vd >= cutoff:
            recent_hospital_ids.add(visit["hospitalId"])

    # Pending follow-up
    pending_followup = _scheduled_followups.get(pid)

    # Session risk
    session_risk = _session_risk_levels.get(pid, "none")

    # Compute overall risk score
    risk_factors = []
    if session_risk == "high":
        risk_factors.append("HIGH safety check result in current session")
    if len(patient["knownAllergies"]) > 0:
        risk_factors.append(f"{len(patient['knownAllergies'])} known allerg{'y' if len(patient['knownAllergies']) == 1 else 'ies'}")
    if len(recent_hospital_ids) > 1:
        risk_factors.append(f"Visited {len(recent_hospital_ids)} hospitals in last 90 days")
    if duplicate_tests:
        risk_factors.append(f"{len(duplicate_tests)} duplicate test(s) detected")
    if pending_followup and pending_followup.get("urgencyTier") == "Urgent":
        risk_factors.append("Pending URGENT follow-up")

    overall_risk = "high" if session_risk == "high" or (pending_followup and pending_followup.get("urgencyTier") == "Urgent") else \
                   "moderate" if len(risk_factors) >= 2 else "low"

    return {
        "patientId": pid,
        "name": patient["name"],
        "dateOfBirth": patient["dateOfBirth"],
        "overallRisk": overall_risk,
        "riskFactors": risk_factors,
        "sessionRiskLevel": session_risk,
        "knownAllergies": [{"allergy": a, **allergy_sources.get(a, {})} for a in patient["knownAllergies"]],
        "activeMedicationsByHospital": active_meds_by_hospital,
        "allActiveMedications": all_active_meds,
        "totalVisits": len(patient["visits"]),
        "hospitalsVisitedLast90Days": list(recent_hospital_ids),
        "duplicateTestsDetected": duplicate_tests,
        "pendingFollowup": pending_followup,
        "generatedAt": _now_iso(),
    }


@mcp.tool(
    name="bulk_safety_scan",
    description=(
        "Run a network-wide safety scan across ALL patients. "
        "For each patient, checks their current medications against each other for interactions. "
        "Returns a prioritised list of patients with potential risks. "
        "Answers: 'run a network-wide safety scan', 'which patients are at risk?', "
        "'which patients have drug interaction risks at HOSP-A?'"
    ),
)
def bulk_safety_scan(
    hospital_id: str | None = None,
    severity_filter: str = "all",
) -> dict:
    high_risk = []
    caution_risk = []
    total_scanned = 0

    for p in _patients.values():
        # Filter by hospital if requested
        if hospital_id and not any(v["hospitalId"].upper() == hospital_id.upper() for v in p["visits"]):
            continue

        total_scanned += 1

        # Collect all unique current medications across all visits
        all_meds = list({m["name"].lower() for v in p["visits"] for m in v.get("prescribedMedicines", [])})
        conflicts = []

        # Check every pair of medications the patient has ever received
        for i in range(len(all_meds)):
            for j in range(i + 1, len(all_meds)):
                key = frozenset([all_meds[i], all_meds[j]])
                interaction = _drug_interactions.get(key)
                if interaction:
                    conflicts.append({
                        "drug1": all_meds[i],
                        "drug2": all_meds[j],
                        "severity": interaction.get("severity", "caution"),
                        "detail": interaction["detail"],
                    })

        # Check allergies against current meds
        for allergy in [a.lower() for a in p.get("knownAllergies", [])]:
            mapping = _allergy_mappings.get(allergy)
            if mapping:
                for med in all_meds:
                    if med in mapping["contraindicated"]:
                        conflicts.append({
                            "drug1": med,
                            "drug2": f"ALLERGY:{allergy}",
                            "severity": "high",
                            "detail": mapping["detail"],
                        })

        if not conflicts:
            continue

        entry = {
            "patientId": p["patientId"],
            "name": p["name"],
            "conflictCount": len(conflicts),
            "conflicts": conflicts,
        }
        if any(c["severity"] == "high" for c in conflicts):
            high_risk.append(entry)
        else:
            caution_risk.append(entry)

    if severity_filter == "high":
        results = high_risk
    elif severity_filter == "caution":
        results = caution_risk
    else:
        results = high_risk + caution_risk

    return {
        "scannedPatients": total_scanned,
        "patientsWithRisks": len(results),
        "highRiskCount": len(high_risk),
        "cautionRiskCount": len(caution_risk),
        "results": sorted(results, key=lambda r: (-r["conflictCount"], r["patientId"])),
        "generatedAt": _now_iso(),
    }


@mcp.tool(
    name="simulate_workflow",
    description=(
        "Run the COMPLETE 4-step clinical workflow for a patient in a single call. "
        "Step 1: Log the visit. Step 2: Run cross-hospital safety check. "
        "Step 3: Check medicine availability. Step 4: Schedule follow-up. "
        "Returns a full pipeline summary with results from all 4 steps. "
        "Perfect for demos — shows the entire HealthBridge system in one prompt."
    ),
)
def simulate_workflow(
    patient_id: str,
    hospital_id: str,
    doctor_name: str,
    diagnosis: str,
    severity: str,
    prescribed_medicines: list[dict[str, str]],
    tests_ordered: list[str] | None = None,
    allergies_noted: list[str] | None = None,
    notes: str = "",
    check_stock_medicine: str | None = None,
    check_stock_quantity: int = 1,
) -> dict:
    """Run the full 4-step clinical workflow pipeline."""
    results = {"patientId": patient_id, "pipelineSteps": {}, "generatedAt": _now_iso()}

    # ── Step 1: Log visit ──
    visit_number = len(_patients.get(patient_id, {}).get("visits", [])) + 1
    visit_id = f"VIS-{patient_id}-{visit_number:03d}"

    hospital_name = _get_hospital_name(hospital_id)
    if patient_id not in _patients:
        _patients[patient_id] = {
            "patientId": patient_id, "name": f"Unknown ({patient_id})",
            "dateOfBirth": "unknown", "knownAllergies": [], "visits": [],
        }

    patient = _patients[patient_id]
    prior_hospitals = {v["hospitalId"] for v in patient["visits"]}
    first_visit = hospital_id not in prior_hospitals

    visit_record = {
        "visitId": visit_id, "hospitalId": hospital_id, "hospitalName": hospital_name,
        "doctorName": doctor_name, "date": _today(), "diagnosis": diagnosis,
        "prescribedMedicines": prescribed_medicines,
        "testsOrdered": tests_ordered or [],
        "allergiesNoted": allergies_noted or [],
        "notes": notes,
    }
    patient["visits"].append(visit_record)

    new_allergies = []
    existing_lower = {a.lower() for a in patient["knownAllergies"]}
    for a in (allergies_noted or []):
        al = a.lower().strip()
        if al and al not in existing_lower:
            patient["knownAllergies"].append(al)
            existing_lower.add(al)
            new_allergies.append(al)

    results["pipelineSteps"]["step1_log_visit"] = {
        "status": "completed",
        "visitId": visit_id,
        "firstVisitAtThisHospital": first_visit,
        "newAllergiesMerged": new_allergies,
    }

    # ── Step 2: Safety check ──
    new_meds_lower = [m["name"].lower().strip() for m in prescribed_medicines]
    conflicts = []

    existing_meds = {m["name"].lower(): v for v in patient["visits"][:-1] for m in v.get("prescribedMedicines", [])}
    for new_med in new_meds_lower:
        for ex_med, src_visit in existing_meds.items():
            key = frozenset([new_med, ex_med])
            interaction = _drug_interactions.get(key)
            if interaction:
                conflicts.append({"type": "drug_interaction", "subtype": "history_vs_new",
                                   "sourceHospital": src_visit["hospitalName"], "detail": interaction["detail"],
                                   "severity": interaction.get("severity", "caution")})

    for i in range(len(new_meds_lower)):
        for j in range(i + 1, len(new_meds_lower)):
            key = frozenset([new_meds_lower[i], new_meds_lower[j]])
            interaction = _drug_interactions.get(key)
            if interaction:
                conflicts.append({"type": "drug_interaction", "subtype": "intra_prescription",
                                   "sourceHospital": "Current prescription", "detail": interaction["detail"],
                                   "severity": interaction.get("severity", "caution")})

    for new_med in new_meds_lower:
        for allergy in [a.lower() for a in patient.get("knownAllergies", [])]:
            mapping = _allergy_mappings.get(allergy)
            if mapping and new_med in mapping["contraindicated"]:
                conflicts.append({"type": "allergy", "allergy": allergy, "detail": mapping["detail"], "severity": "high"})

    risk_level = "none"
    for c in conflicts:
        if c.get("severity") == "high":
            risk_level = "high"
            break
        risk_level = "caution"

    _session_risk_levels[patient_id] = risk_level
    if conflicts:
        _add_notification("safety_alert", hospital_id, hospital_name,
                          f"{len(conflicts)} conflict(s) detected for {patient['name']}: riskLevel={risk_level}",
                          patient_id=patient_id)

    results["pipelineSteps"]["step2_safety_check"] = {
        "status": "completed",
        "conflictCount": len(conflicts),
        "conflicts": conflicts,
        "riskLevel": risk_level,
    }

    # ── Step 3: Medicine availability ──
    stock_result = None
    if check_stock_medicine:
        med_key = check_stock_medicine.lower().strip()
        local = _facility_stock.get(hospital_id, {})
        local_stock = local.get("stock", {}).get(med_key, 0)
        if local_stock >= check_stock_quantity:
            local["stock"][med_key] = local_stock - check_stock_quantity
            stock_result = {"action": "dispense", "medicine": med_key, "quantity": check_stock_quantity,
                            "localStockBefore": local_stock, "localStockAfter": local_stock - check_stock_quantity}
        else:
            others = sorted(
                [(hid, fac) for hid, fac in _facility_stock.items() if hid != hospital_id],
                key=lambda x: x[1]["stock"].get(med_key, 0), reverse=True
            )
            rerouted = False
            for sid, sfac in others:
                if sfac["stock"].get(med_key, 0) >= check_stock_quantity:
                    stock_result = {"action": "reroute", "medicine": med_key, "quantity": check_stock_quantity,
                                    "rerouteFacility": sfac["hospitalName"], "rerouteFacilityId": sid,
                                    "shortfall": check_stock_quantity - local_stock}
                    _add_notification("reroute", hospital_id, hospital_name,
                                      f"Rerouting {check_stock_quantity}x {med_key} to {sfac['hospitalName']}", medicine=med_key)
                    rerouted = True
                    break
            if not rerouted:
                stock_result = {"action": "replenish_requested", "medicine": med_key, "shortfall": check_stock_quantity - local_stock}
                _add_notification("replenishment", hospital_id, hospital_name,
                                  f"Replenishment requested for {med_key} — all facilities exhausted", medicine=med_key)
    results["pipelineSteps"]["step3_medicine_check"] = {"status": "completed", "result": stock_result or "skipped (no medicine specified)"}

    # ── Step 4: Follow-up scheduling ──
    base = {"mild": ("Routine", 30, False), "moderate": ("Soon", 7, True), "severe": ("Urgent", 3, True)}
    escalation = {"Routine": ("Soon", 14), "Soon": ("Urgent", 3), "Urgent": ("Urgent", 3)}
    sev = severity.lower().strip() if severity.lower().strip() in base else "mild"
    tier, days, doctor_notified = base[sev]

    escalated_by = []
    # Recurrence check (exclude most recent visit)
    cutoff_d = date.today() - timedelta(days=90)
    for v in patient["visits"][:-1]:
        try:
            vd = datetime.strptime(v["date"], "%Y-%m-%d").date()
        except ValueError:
            continue
        if vd >= cutoff_d and v["diagnosis"].lower() == diagnosis.lower():
            old_tier = tier
            tier, days = escalation[tier]
            doctor_notified = True
            escalated_by.append(f"recurrence (same diagnosis at {v['hospitalName']} on {v['date']})")
            break

    if risk_level == "high" and "recurrence" not in str(escalated_by):
        old_tier = tier
        new_tier, new_days = escalation[tier]
        if new_tier != old_tier:
            tier, days = new_tier, new_days
        doctor_notified = True
        escalated_by.append("high_risk safety check")

    followup_date = (date.today() + timedelta(days=days)).isoformat()
    _scheduled_followups[patient_id] = {
        "patientId": patient_id, "patientName": patient["name"],
        "urgencyTier": tier, "followupDate": followup_date,
        "recommendedFollowupDays": days, "diagnosis": diagnosis,
        "severity": sev, "doctorNotified": doctor_notified,
        "escalatedBy": escalated_by, "scheduledAt": _now_iso(),
    }
    _add_audit("simulate_workflow", f"patientId={patient_id}, diagnosis={diagnosis}, severity={sev}",
               f"visit logged, {len(conflicts)} conflicts, stock={stock_result and stock_result.get('action')}, followup={tier} on {followup_date}",
               patient_id=patient_id, hospital_id=hospital_id)

    results["pipelineSteps"]["step4_followup"] = {
        "status": "completed",
        "urgencyTier": tier, "followupDate": followup_date,
        "doctorNotified": doctor_notified, "escalatedBy": escalated_by,
    }

    # Summary
    results["summary"] = {
        "visitRecorded": True,
        "safetyRisk": risk_level,
        "conflictsDetected": len(conflicts),
        "stockAction": stock_result.get("action") if stock_result else "not checked",
        "followupTier": tier,
        "followupDate": followup_date,
        "actionRequired": risk_level in ("high", "caution") or tier in ("Urgent", "Soon"),
    }

    return results


@mcp.tool(
    name="doctor_workload",
    description=(
        "Find all patients ever seen by a specific doctor across all hospitals. "
        "Returns their patient list with visit dates, diagnoses, and hospitals. "
        "Answers: 'what is Dr. Radhika Menon patient load?', "
        "'which patients has Dr. Kumar seen?', 'how many patients does Dr. X have?'"
    ),
)
def doctor_workload(doctor_name: str) -> dict:
    if not doctor_name or not doctor_name.strip():
        return {"error": "'doctor_name' is required."}

    query = doctor_name.strip().lower()
    patient_visits = defaultdict(list)

    for p in _patients.values():
        for v in p["visits"]:
            if query in v["doctorName"].lower():
                patient_visits[p["patientId"]].append({
                    "visitId": v["visitId"],
                    "date": v["date"],
                    "hospital": v["hospitalName"],
                    "hospitalId": v["hospitalId"],
                    "diagnosis": v["diagnosis"],
                    "prescribedMedicines": len(v["prescribedMedicines"]),
                })

    patients_seen = []
    for pid, visits in patient_visits.items():
        p = _patients[pid]
        patients_seen.append({
            "patientId": pid,
            "name": p["name"],
            "totalVisitsWithDoctor": len(visits),
            "visits": sorted(visits, key=lambda v: v["date"], reverse=True),
        })

    patients_seen.sort(key=lambda r: -r["totalVisitsWithDoctor"])

    return {
        "doctorQuery": doctor_name,
        "totalPatientsFound": len(patients_seen),
        "totalVisitsByDoctor": sum(r["totalVisitsWithDoctor"] for r in patients_seen),
        "patients": patients_seen,
    }


# ---------------------------------------------------------------------------
# Patch followup_scheduler to save into _scheduled_followups store
# ---------------------------------------------------------------------------

_original_followup_tool = mcp._tool_manager._tools.get("followup_scheduler")

@mcp.tool(
    name="save_followup_result",
    description="Internal: persists followup_scheduler result to the scheduled_followups store.",
)
def _patch_followup(patient_id: str, diagnosis: str, severity: str) -> dict:
    """Proxy that calls followup_scheduler AND persists to store."""
    fn = _original_followup_tool.fn if _original_followup_tool else None
    if not fn:
        return {"error": "followup_scheduler not found"}
    result = fn(patientId=patient_id, diagnosis=diagnosis, severity=severity)
    if "error" not in result:
        patient = _patients.get(patient_id, {})
        _scheduled_followups[patient_id] = {
            "patientId": patient_id,
            "patientName": patient.get("name", patient_id),
            "urgencyTier": result["urgencyTier"],
            "followupDate": result["followupDate"],
            "recommendedFollowupDays": result["recommendedFollowupDays"],
            "diagnosis": diagnosis,
            "severity": severity,
            "doctorNotified": result["doctorNotified"],
            "escalatedBy": result.get("escalatedBy", []),
            "scheduledAt": _now_iso(),
        }
        _add_audit("followup_scheduler", f"patientId={patient_id}, diagnosis={diagnosis}, severity={severity}",
                   f"tier={result['urgencyTier']}, followupDate={result['followupDate']}", patient_id=patient_id)
    return result


# Also patch medicine_availability_check to add notifications
_original_mac_tool = mcp._tool_manager._tools.get("medicine_availability_check")


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    if "--http" in sys.argv:
        mcp.run(transport="sse")
    else:
        mcp.run(transport="stdio")
