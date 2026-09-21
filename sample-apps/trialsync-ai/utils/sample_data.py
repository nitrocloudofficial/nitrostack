import random
import re
import datetime

_DEFAULT_PROFILE = {
    "name": "Jane Doe",
    "age": 54,
    "condition": "Non-Small Cell Lung Cancer (NSCLC)",
    "stage": "IV",
    "biomarkers": ["EGFR+", "PD-L1 > 50%"],
    "medications": ["Metformin", "Lisinopril"],
    "location": "Chicago, IL",
    "distance_willing_to_travel": 50,
}

_KNOWN_CONDITIONS = [
    ("NSCLC", "Non-Small Cell Lung Cancer (NSCLC)"),
    ("non-small cell lung cancer", "Non-Small Cell Lung Cancer (NSCLC)"),
    ("lung cancer", "Non-Small Cell Lung Cancer (NSCLC)"),
    ("breast cancer", "Breast Cancer"),
    ("prostate cancer", "Prostate Cancer"),
    ("melanoma", "Melanoma"),
    ("diabetes", "Type 2 Diabetes"),
    ("colorectal cancer", "Colorectal Cancer"),
]

_BIOMARKER_PATTERNS = [
    r"\bEGFR\s*\+?", r"\bALK\s*\+?", r"\bKRAS\s*\+?", r"\bHER2\s*\+?",
    r"\bBRCA1\b", r"\bBRCA2\b", r"\bPD-?L1\s*(?:>|<|=)?\s*\d{0,3}%?",
]


def _read_uploaded_file(uploaded_file):
    """Best-effort text extraction from a Streamlit UploadedFile (PDF or TXT)."""
    if uploaded_file is None:
        return ""
    try:
        name = getattr(uploaded_file, "name", "") or ""
        raw = uploaded_file.getvalue()
        if name.lower().endswith(".pdf"):
            try:
                from pypdf import PdfReader
                import io
                reader = PdfReader(io.BytesIO(raw))
                return "\n".join((page.extract_text() or "") for page in reader.pages)
            except Exception:
                return ""
        return raw.decode("utf-8", errors="ignore")
    except Exception:
        return ""


def mock_extract_profile(manual_text=None, uploaded_file=None):
    """Heuristic 'AI extraction' over whatever text is actually available
    (typed notes and/or an uploaded PDF/TXT). Falls back to the demo
    default only for fields it can't find, so the UI still has something
    to show while the real extraction pipeline is being built."""
    text = "\n".join(t for t in [_read_uploaded_file(uploaded_file), manual_text or ""] if t).strip()

    if not text:
        return dict(_DEFAULT_PROFILE)

    profile = dict(_DEFAULT_PROFILE)

    name_match = re.search(
        r"(?:patient\s*name|patient|name)\s*[:\-]\s*([A-Z][a-zA-Z.'-]+(?:\s+[A-Z][a-zA-Z.'-]+){0,3})",
        text, re.IGNORECASE,
    )
    if name_match:
        profile["name"] = name_match.group(1).strip()

    age_match = re.search(r"\b(\d{1,3})\s*(?:yo|y/o|years?[\s-]*old)\b", text, re.IGNORECASE) \
        or re.search(r"\bAge\s*[:\-]?\s*(\d{1,3})\b", text, re.IGNORECASE) \
        or re.search(r"\b(\d{1,3})\s*[MFmf]\b", text)
    if age_match:
        profile["age"] = int(age_match.group(1))

    for needle, label in _KNOWN_CONDITIONS:
        if needle.lower() in text.lower():
            profile["condition"] = label
            break

    stage_match = re.search(r"\bstage\s*(I{1,3}V?|IV|[1-4])\b", text, re.IGNORECASE)
    if stage_match:
        profile["stage"] = stage_match.group(1).upper()

    biomarkers = []
    for pat in _BIOMARKER_PATTERNS:
        for m in re.findall(pat, text, re.IGNORECASE):
            m = re.sub(r"\s+", "", m).upper()
            if m not in biomarkers:
                biomarkers.append(m)
    if biomarkers:
        profile["biomarkers"] = biomarkers

    meds_match = re.search(
        r"(?:current\s*)?medications?\s*[:\-]\s*(.+)", text, re.IGNORECASE,
    )
    if meds_match:
        meds_line = meds_match.group(1).splitlines()[0]
        meds = [m.strip() for m in re.split(r",|;", meds_line) if m.strip()]
        if meds:
            profile["medications"] = meds

    location_match = re.search(
        r"(?:location|city|address)\s*[:\-]\s*([A-Za-z .'-]+,\s*[A-Za-z]{2,})", text, re.IGNORECASE,
    )
    if location_match:
        profile["location"] = location_match.group(1).strip()

    return profile

def mock_search_trials(profile):
    return [
        {"nct_id": "NCT04561234", "title": "Targeted Therapy for EGFR+ NSCLC", "phase": "Phase 3", "distance": "12 miles"},
        {"nct_id": "NCT09876543", "title": "Immunotherapy Combination Study", "phase": "Phase 2", "distance": "45 miles"},
        {"nct_id": "NCT01122334", "title": "Late-stage Lung Cancer Novel Compound", "phase": "Phase 1", "distance": "8 miles"}
    ]

def mock_check_eligibility(profile, trials):
    return [
        {"criteria": "Age >= 18", "status": "Met", "details": "Patient is 54."},
        {"criteria": "EGFR Mutation", "status": "Met", "details": "Confirmed EGFR+ in notes."},
        {"criteria": "No prior immunotherapy", "status": "Excluded", "details": "Patient received Pembrolizumab in 2023."},
        {"criteria": "Liver Function", "status": "Met", "details": "ALT/AST within normal limits."}
    ]

def mock_calculate_risk(distance, freq, complexity):
    # Logic: Higher distance/freq/complexity = Higher Risk
    score = (distance / 150) * 0.3 + (freq / 10) * 0.4 + (complexity / 2.0) * 0.3
    if score > 0.7: return {"level": "High", "color": "red", "score": score, "drivers": ["High travel burden", "Complex protocol"]}
    if score > 0.4: return {"level": "Medium", "color": "orange", "score": score, "drivers": ["Frequent site visits"]}
    return {"level": "Low", "color": "green", "score": score, "drivers": ["Manageable schedule"]}

def mock_rank_trials(eligibility_results):
    return ["NCT04561234", "NCT01122334", "NCT09876543"]

def mock_recommend(ranking, eligibility_results):
    return {
        "top_pick": "NCT04561234",
        "reasoning": "Highest molecular match for EGFR+ profile and closest to patient location.",
        "confidence": 0.94
    }

def mock_generate_journey(recommendation):
    return [
        {"step": "Screening", "duration": "2 weeks", "status": "Complete"},
        {"step": "Baseline Scans", "duration": "1 week", "status": "In Progress"},
        {"step": "Treatment Phase 1", "duration": "12 weeks", "status": "Pending"},
        {"step": "Follow-up", "duration": "24 weeks", "status": "Pending"}
    ]

def mock_generate_appointments(journey):
    return [
        {"id": 1, "task": "Blood Work", "date": "2024-06-01", "status": "Confirmed"},
        {"id": 2, "task": "CT Scan", "date": "2024-06-08", "status": "Confirmed"},
        {"id": 3, "task": "Oncology Review", "date": "2024-06-15", "status": "Pending"}
    ]

def mock_log_symptom(existing, symptom, severity, date):
    existing.append({"symptom": symptom, "severity": severity, "date": date})
    return existing

def mock_get_alerts(symptom_log):
    severe = [s for s in symptom_log if s['severity'] == "High"]
    if severe:
        return [{"type": "Urgent", "msg": f"Severe {severe[0]['symptom']} reported. Contact PI immediately."}]
    return []

def mock_handle_missed(appointments, appointment_id):
    for appt in appointments:
        if appt['id'] == appointment_id:
            appt['date'] = (datetime.date.today() + datetime.timedelta(days=7)).strftime("%Y-%m-%d")
            appt['status'] = "Rescheduled"
    return appointments

def mock_summarize(all_patients):
    return "Across 124 active patients, the primary bottleneck is Phase 2 travel requirements."

def mock_aggregate(all_patients):
    return {"total_patients": 124, "active_trials": 12, "completion_rate": 88, "risk_alerts": 5}