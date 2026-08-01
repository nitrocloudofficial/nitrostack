"""
HealthBridge Analytics MCP Server
=====================================
Dedicated read-only analytics and trend analysis server.

Tools (6):
  1. trend_analysis         — Is a diagnosis trending up/down at a hospital over time?
  2. readmission_risk       — Patients with same diagnosis at 2+ hospitals (high readmission risk)
  3. prescription_patterns  — Most common drug co-prescription combinations in the network
  4. hospital_comparison    — Side-by-side statistics per hospital
  5. allergy_prevalence     — Which allergies are most common, by hospital
  6. test_utilization       — Most ordered tests per hospital (over-utilization detection)

Resources:
  analytics://summary
  analytics://hospitals/comparison
  analytics://risk/readmission

Run:
  python analytics_server.py          # stdio
  python analytics_server.py --http   # SSE/HTTP on port 8083
"""

import json
import sys
from collections import Counter, defaultdict
from datetime import date, datetime, timedelta
from pathlib import Path

from mcp.server.fastmcp import FastMCP

BASE_DIR = Path(__file__).parent
DATA_DIR = BASE_DIR / "data"

# ---------------------------------------------------------------------------
# Data loading (read-only)
# ---------------------------------------------------------------------------

_patients: dict = {}
_drug_interactions: dict = {}


def _load_data():
    global _patients, _drug_interactions

    patients_path = DATA_DIR / "patients.json"
    with open(patients_path, encoding="utf-8") as f:
        _patients = {p["patientId"]: p for p in json.load(f)}

    interactions_path = DATA_DIR / "drug_interactions.json"
    with open(interactions_path, encoding="utf-8") as f:
        data = json.load(f)
        for item in data.get("drugInteractions", []):
            key = frozenset([item["drug1"].lower(), item["drug2"].lower()])
            _drug_interactions[key] = item


_load_data()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _now_iso() -> str:
    return datetime.utcnow().isoformat(timespec="seconds") + "Z"


def _get_all_visits():
    """Flatten all visits from all patients."""
    visits = []
    for p in _patients.values():
        for v in p["visits"]:
            visits.append({"patient": p, "visit": v})
    return visits


# ---------------------------------------------------------------------------
# FastMCP app
# ---------------------------------------------------------------------------

mcp = FastMCP(
    name="HealthBridge Analytics MCP",
    instructions=(
        "HealthBridge Analytics MCP provides read-only trend analysis and population health insights. "
        "Tools: trend_analysis, readmission_risk, prescription_patterns, hospital_comparison, "
        "allergy_prevalence, test_utilization. "
        "Use this server to answer: 'is Hypertension trending up at City General?', "
        "'which patients are at high readmission risk?', 'what is the most common drug combination?', "
        "'compare visit volumes across all hospitals', 'which tests are over-ordered?'"
    ),
)


# ---------------------------------------------------------------------------
# Resources
# ---------------------------------------------------------------------------

@mcp.resource("analytics://summary")
def analytics_summary() -> str:
    total = len(_patients)
    total_visits = sum(len(p["visits"]) for p in _patients.values())
    diag_counts: Counter = Counter()
    for p in _patients.values():
        for v in p["visits"]:
            diag_counts[v["diagnosis"]] += 1

    return json.dumps({
        "totalPatients": total,
        "totalVisits": total_visits,
        "avgVisitsPerPatient": round(total_visits / total, 2) if total else 0,
        "uniqueDiagnoses": len(diag_counts),
        "topDiagnoses": diag_counts.most_common(10),
    }, indent=2)


@mcp.resource("analytics://hospitals/comparison")
def hospitals_comparison() -> str:
    hosp_data: dict = defaultdict(lambda: {
        "visitCount": 0, "patientCount": set(), "diagnoses": Counter(), "medicines": Counter()
    })
    for p in _patients.values():
        for v in p["visits"]:
            hid = v["hospitalId"]
            hosp_data[hid]["visitCount"] += 1
            hosp_data[hid]["patientCount"].add(p["patientId"])
            hosp_data[hid]["diagnoses"][v["diagnosis"]] += 1
            for m in v.get("prescribedMedicines", []):
                hosp_data[hid]["medicines"][m["name"].lower()] += 1

    result = {}
    for hid, data in hosp_data.items():
        result[hid] = {
            "visitCount": data["visitCount"],
            "uniquePatients": len(data["patientCount"]),
            "topDiagnosis": data["diagnoses"].most_common(1)[0] if data["diagnoses"] else None,
            "topMedicine": data["medicines"].most_common(1)[0] if data["medicines"] else None,
        }
    return json.dumps(result, indent=2)


@mcp.resource("analytics://risk/readmission")
def readmission_risk_resource() -> str:
    cutoff = date.today() - timedelta(days=90)
    at_risk = []
    for p in _patients.values():
        recent_hospitals = set()
        for v in p["visits"]:
            try:
                vd = datetime.strptime(v["date"], "%Y-%m-%d").date()
            except ValueError:
                continue
            if vd >= cutoff:
                recent_hospitals.add(v["hospitalId"])
        if len(recent_hospitals) > 1:
            at_risk.append({
                "patientId": p["patientId"],
                "name": p["name"],
                "hospitalsVisitedLast90Days": list(recent_hospitals),
                "visitCount": len(p["visits"]),
            })
    return json.dumps({"atRiskCount": len(at_risk), "patients": at_risk}, indent=2)


# ---------------------------------------------------------------------------
# Tools
# ---------------------------------------------------------------------------

@mcp.tool(
    name="trend_analysis",
    description=(
        "Analyse whether a specific diagnosis is trending up or down at a hospital (or network-wide) over time. "
        "Compares visit counts across configurable time periods. "
        "Answers: 'is Hypertension trending up at City General this year?', "
        "'has Diabetes increased across the network in the last 6 months?', "
        "'show me the monthly trend for Pneumonia at HOSP-B'."
    ),
)
def trend_analysis(
    diagnosis: str,
    hospital_id: str | None = None,
    period_months: int = 6,
) -> dict:
    if not diagnosis or not diagnosis.strip():
        return {"error": True, "message": "'diagnosis' is required."}

    diag_lower = diagnosis.lower().strip()
    today_d = date.today()
    monthly_counts: dict = defaultdict(int)
    matching_visits = []

    for p in _patients.values():
        for v in p["visits"]:
            if hospital_id and v["hospitalId"].upper() != hospital_id.upper():
                continue
            if diag_lower not in v["diagnosis"].lower():
                continue
            try:
                vd = datetime.strptime(v["date"], "%Y-%m-%d").date()
            except ValueError:
                continue
            month_key = vd.strftime("%Y-%m")
            monthly_counts[month_key] += 1
            matching_visits.append({"date": v["date"], "hospital": v["hospitalName"], "patientId": p["patientId"]})

    if not monthly_counts:
        return {"diagnosis": diagnosis, "hospitalId": hospital_id, "message": "No matching visits found.", "trend": "unknown"}

    # Build sorted monthly series
    sorted_months = sorted(monthly_counts.keys())
    series = [{"month": m, "count": monthly_counts[m]} for m in sorted_months]

    # Compute trend direction using last 2 periods vs prior 2 periods
    counts = [monthly_counts[m] for m in sorted_months]
    if len(counts) >= 4:
        recent_avg = sum(counts[-2:]) / 2
        prior_avg = sum(counts[-4:-2]) / 2
        pct_change = ((recent_avg - prior_avg) / prior_avg * 100) if prior_avg > 0 else 0
        trend = "increasing" if pct_change > 10 else "decreasing" if pct_change < -10 else "stable"
    elif len(counts) >= 2:
        pct_change = ((counts[-1] - counts[0]) / counts[0] * 100) if counts[0] > 0 else 0
        trend = "increasing" if pct_change > 10 else "decreasing" if pct_change < -10 else "stable"
    else:
        pct_change = 0
        trend = "insufficient_data"

    return {
        "diagnosis": diagnosis,
        "hospitalId": hospital_id,
        "totalMatchingVisits": len(matching_visits),
        "trend": trend,
        "percentageChange": round(pct_change, 1),
        "monthlySeries": series,
        "peakMonth": max(monthly_counts, key=monthly_counts.get),
        "generatedAt": _now_iso(),
    }


@mcp.tool(
    name="readmission_risk",
    description=(
        "Identify patients at high readmission risk — those who have been admitted to multiple hospitals "
        "for the same diagnosis within a configurable time window. "
        "These are patients who 'hospital-hop' and may be receiving fragmented care. "
        "Answers: 'which patients are at high readmission risk?', "
        "'who has visited more than 2 hospitals in the last 90 days?', "
        "'find patients with recurring Hypertension across hospitals'."
    ),
)
def readmission_risk(
    window_days: int = 90,
    min_hospitals: int = 2,
    diagnosis_filter: str | None = None,
) -> dict:
    cutoff = date.today() - timedelta(days=window_days)
    at_risk = []

    for p in _patients.values():
        recent_visits = []
        for v in p["visits"]:
            try:
                vd = datetime.strptime(v["date"], "%Y-%m-%d").date()
            except ValueError:
                continue
            if vd < cutoff:
                continue
            if diagnosis_filter and diagnosis_filter.lower() not in v["diagnosis"].lower():
                continue
            recent_visits.append(v)

        hospital_ids = {v["hospitalId"] for v in recent_visits}
        if len(hospital_ids) < min_hospitals:
            continue

        # Diagnoses seen recently
        recent_diagnoses = Counter(v["diagnosis"] for v in recent_visits)

        at_risk.append({
            "patientId": p["patientId"],
            "name": p["name"],
            "dateOfBirth": p["dateOfBirth"],
            "knownAllergies": p["knownAllergies"],
            "hospitalsVisitedInWindow": list(hospital_ids),
            "hospitalCount": len(hospital_ids),
            "visitsInWindow": len(recent_visits),
            "topDiagnosisInWindow": recent_diagnoses.most_common(1)[0] if recent_diagnoses else None,
            "riskScore": len(hospital_ids) * len(recent_visits),  # simple heuristic
        })

    at_risk.sort(key=lambda r: -r["riskScore"])

    return {
        "windowDays": window_days,
        "minHospitals": min_hospitals,
        "diagnosisFilter": diagnosis_filter,
        "atRiskCount": len(at_risk),
        "patients": at_risk,
        "generatedAt": _now_iso(),
    }


@mcp.tool(
    name="prescription_patterns",
    description=(
        "Analyse the most common drug co-prescription combinations across the network. "
        "Identifies which drugs are most frequently prescribed together. "
        "Can also detect potentially risky common combinations. "
        "Answers: 'what is the most common drug combination?', "
        "'which drugs are most often prescribed together at HOSP-A?', "
        "'are any common prescription pairs known to interact?'"
    ),
)
def prescription_patterns(
    hospital_id: str | None = None,
    top_n: int = 20,
    flag_interactions: bool = True,
) -> dict:
    pair_counts: Counter = Counter()
    single_counts: Counter = Counter()
    all_visits = _get_all_visits()

    for entry in all_visits:
        v = entry["visit"]
        if hospital_id and v["hospitalId"].upper() != hospital_id.upper():
            continue
        meds = [m["name"].lower() for m in v.get("prescribedMedicines", [])]
        for m in meds:
            single_counts[m] += 1
        for i in range(len(meds)):
            for j in range(i + 1, len(meds)):
                pair = tuple(sorted([meds[i], meds[j]]))
                pair_counts[pair] += 1

    top_pairs = pair_counts.most_common(top_n)
    flagged_pairs = []

    if flag_interactions:
        for pair, count in top_pairs:
            key = frozenset(pair)
            interaction = _drug_interactions.get(key)
            if interaction:
                flagged_pairs.append({
                    "drugs": list(pair),
                    "prescribedTogether": count,
                    "interactionSeverity": interaction.get("severity", "unknown"),
                    "interactionDetail": interaction["detail"],
                })

    return {
        "hospitalId": hospital_id,
        "topSingleMedicines": single_counts.most_common(10),
        "topCoPrescribedPairs": [{"drugs": list(p), "count": c} for p, c in top_pairs],
        "flaggedInteractingPairs": flagged_pairs,
        "generatedAt": _now_iso(),
    }


@mcp.tool(
    name="hospital_comparison",
    description=(
        "Side-by-side statistics for all 4 hospitals. "
        "Compares: visit volumes, unique patients, top diagnoses, top medicines, "
        "average visits per patient, and allergy rates. "
        "Answers: 'which hospital has the most visits?', 'compare all hospitals', "
        "'which hospital has the highest allergy rate?', 'what is the busiest hospital?'"
    ),
)
def hospital_comparison() -> dict:
    hosp_stats: dict = {}

    for p in _patients.values():
        for v in p["visits"]:
            hid = v["hospitalId"]
            hname = v["hospitalName"]
            if hid not in hosp_stats:
                hosp_stats[hid] = {
                    "hospitalId": hid,
                    "hospitalName": hname,
                    "visitCount": 0,
                    "patientIds": set(),
                    "diagnoses": Counter(),
                    "medicines": Counter(),
                    "tests": Counter(),
                    "allergiesDocumented": 0,
                }
            s = hosp_stats[hid]
            s["visitCount"] += 1
            s["patientIds"].add(p["patientId"])
            s["diagnoses"][v["diagnosis"]] += 1
            for m in v.get("prescribedMedicines", []):
                s["medicines"][m["name"].lower()] += 1
            for t in v.get("testsOrdered", []):
                s["tests"][t.lower()] += 1
            s["allergiesDocumented"] += len(v.get("allergiesNoted", []))

    result = []
    for hid, s in hosp_stats.items():
        unique_patients = len(s["patientIds"])
        result.append({
            "hospitalId": hid,
            "hospitalName": s["hospitalName"],
            "totalVisits": s["visitCount"],
            "uniquePatients": unique_patients,
            "avgVisitsPerPatient": round(s["visitCount"] / unique_patients, 2) if unique_patients else 0,
            "allergiesDocumented": s["allergiesDocumented"],
            "uniqueDiagnoses": len(s["diagnoses"]),
            "topDiagnoses": s["diagnoses"].most_common(5),
            "topMedicines": s["medicines"].most_common(5),
            "topTests": s["tests"].most_common(5),
        })

    result.sort(key=lambda r: -r["totalVisits"])

    return {
        "comparisonGeneratedAt": _now_iso(),
        "totalHospitals": len(result),
        "busiestHospital": result[0]["hospitalName"] if result else None,
        "hospitals": result,
    }


@mcp.tool(
    name="allergy_prevalence",
    description=(
        "Analyse allergy prevalence across the network or a specific hospital. "
        "Shows which allergies are most common and how they vary between hospitals. "
        "Answers: 'which allergy is most common across the network?', "
        "'what percentage of patients have penicillin allergy?', "
        "'compare allergy rates between hospitals'."
    ),
)
def allergy_prevalence(hospital_id: str | None = None) -> dict:
    allergy_global: Counter = Counter()
    allergy_by_hospital: dict = defaultdict(Counter)
    patients_with_allergy: set = set()
    total_patients = len(_patients)

    for p in _patients.values():
        for allergy in p.get("knownAllergies", []):
            al = allergy.lower().strip()
            allergy_global[al] += 1
            patients_with_allergy.add(p["patientId"])
            for v in p["visits"]:
                allergy_by_hospital[v["hospitalId"]][al] += 1

    if hospital_id:
        hid = hospital_id.upper()
        hosp_counter = allergy_by_hospital.get(hid, Counter())
        return {
            "hospitalId": hid,
            "topAllergies": [{"allergy": k, "count": v} for k, v in hosp_counter.most_common(10)],
            "generatedAt": _now_iso(),
        }

    top_allergies = []
    for allergy, count in allergy_global.most_common(15):
        top_allergies.append({
            "allergy": allergy,
            "affectedPatients": count,
            "prevalencePercent": round(count / total_patients * 100, 1) if total_patients else 0,
            "byHospital": {hid: allergy_by_hospital[hid].get(allergy, 0) for hid in allergy_by_hospital},
        })

    return {
        "totalPatients": total_patients,
        "patientsWithAnyAllergy": len(patients_with_allergy),
        "allergyPrevalencePercent": round(len(patients_with_allergy) / total_patients * 100, 1) if total_patients else 0,
        "topAllergies": top_allergies,
        "generatedAt": _now_iso(),
    }


@mcp.tool(
    name="test_utilization",
    description=(
        "Analyse which diagnostic tests are most frequently ordered, per hospital and network-wide. "
        "Detects potential over-utilization — tests ordered far more than the network average. "
        "Answers: 'which tests are over-ordered at HOSP-B?', "
        "'what is the most ordered test across the network?', "
        "'is CBC being over-ordered at City General?'"
    ),
)
def test_utilization(
    hospital_id: str | None = None,
    top_n: int = 15,
) -> dict:
    test_global: Counter = Counter()
    test_by_hospital: dict = defaultdict(Counter)
    total_visits_global = 0
    visits_by_hospital: Counter = Counter()

    for p in _patients.values():
        for v in p["visits"]:
            hid = v["hospitalId"]
            total_visits_global += 1
            visits_by_hospital[hid] += 1
            for test in v.get("testsOrdered", []):
                t = test.lower().strip()
                test_global[t] += 1
                test_by_hospital[hid][t] += 1

    if hospital_id:
        hid = hospital_id.upper()
        hosp_tests = test_by_hospital.get(hid, Counter())
        hosp_visits = visits_by_hospital.get(hid, 1)
        results = []
        for test, count in hosp_tests.most_common(top_n):
            global_count = test_global.get(test, 0)
            global_rate = global_count / total_visits_global if total_visits_global else 0
            hosp_rate = count / hosp_visits
            over_utilization = hosp_rate / global_rate if global_rate > 0 else None
            results.append({
                "test": test,
                "countAtHospital": count,
                "rateAtHospital": round(hosp_rate, 3),
                "networkRate": round(global_rate, 3),
                "overUtilizationRatio": round(over_utilization, 2) if over_utilization else None,
                "flag": "over-utilized" if over_utilization and over_utilization > 1.5 else "normal",
            })
        return {"hospitalId": hid, "visitsAnalysed": hosp_visits, "tests": results, "generatedAt": _now_iso()}

    # Network-wide
    results = []
    for test, count in test_global.most_common(top_n):
        results.append({
            "test": test,
            "totalOrders": count,
            "ratePerVisit": round(count / total_visits_global, 3) if total_visits_global else 0,
            "byHospital": {hid: test_by_hospital[hid].get(test, 0) for hid in test_by_hospital},
        })

    return {
        "totalVisitsAnalysed": total_visits_global,
        "topTests": results,
        "generatedAt": _now_iso(),
    }


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    if "--http" in sys.argv:
        mcp.run(transport="sse")
    else:
        mcp.run(transport="stdio")
