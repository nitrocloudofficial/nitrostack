import os
import json
import threading
from datetime import datetime

# Resolve the absolute path to the data folder
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")

_locks = {}
_global_lock = threading.Lock()

def _get_lock(filename: str):
    with _global_lock:
        if filename not in _locks:
            _locks[filename] = threading.Lock()
        return _locks[filename]

def load_data(filename: str) -> list:
    path = os.path.join(DATA_DIR, filename)
    if not os.path.exists(path):
        return []
    lock = _get_lock(filename)
    with lock:
        try:
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return []

def save_data(filename: str, data: list):
    path = os.path.join(DATA_DIR, filename)
    os.makedirs(DATA_DIR, exist_ok=True)
    lock = _get_lock(filename)
    with lock:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)

# ==================== DOMAIN FUNCTIONS ====================

# 1. Students
def get_student(student_id: str):
    students = load_data("students.json")
    for s in students:
        if s["student_id"] == student_id:
            return s
    return None

# 2. Attendance
def get_attendance(student_id: str):
    records = load_data("attendance.json")
    return [r for r in records if r["student_id"] == student_id]

def update_attendance_record(student_id: str, course_code: str, classes_held: int, classes_attended: int):
    records = load_data("attendance.json")
    found = False
    for r in records:
        if r["student_id"] == student_id and r["course_code"] == course_code:
            r["classes_held"] = classes_held
            r["classes_attended"] = classes_attended
            r["percentage"] = round((classes_attended / classes_held) * 100, 2) if classes_held > 0 else 0.0
            found = True
            break
    if not found:
        records.append({
            "student_id": student_id,
            "course_code": course_code,
            "classes_held": classes_held,
            "classes_attended": classes_attended,
            "percentage": round((classes_attended / classes_held) * 100, 2) if classes_held > 0 else 0.0
        })
    save_data("attendance.json", records)

# 3. Timetable
def get_timetable(student_id: str = None):
    # If student is specified, get their enrolled courses from attendance and filter schedule
    schedule = load_data("timetable.json")
    if student_id:
        enrolled_courses = [r["course_code"] for r in get_attendance(student_id)]
        return [item for item in schedule if item["course_code"] in enrolled_courses]
    return schedule

def update_timetable_schedule(course_code: str, day: str, start_time: str, end_time: str, room: str, faculty: str = None):
    schedule = load_data("timetable.json")
    updated = False
    for item in schedule:
        if item["course_code"] == course_code and item["day"].lower() == day.lower():
            item["start_time"] = start_time
            item["end_time"] = end_time
            item["room"] = room
            if faculty:
                item["faculty"] = faculty
            updated = True
            break
    if not updated:
        schedule.append({
            "course_code": course_code,
            "day": day,
            "start_time": start_time,
            "end_time": end_time,
            "room": room,
            "faculty": faculty or "TBD"
        })
    save_data("timetable.json", schedule)
    return True

# 4. Complaints
def get_complaints(student_id: str = None):
    complaints = load_data("complaints.json")
    if student_id:
        return [c for c in complaints if c["student_id"] == student_id]
    return complaints

def file_complaint(student_id: str, category: str, description: str):
    complaints = load_data("complaints.json")
    new_id = f"C{7000 + len(complaints) + 1}"
    new_complaint = {
        "complaint_id": new_id,
        "student_id": student_id,
        "category": category,
        "description": description,
        "status": "Open",
        "filed_at": datetime.utcnow().isoformat() + "Z",
        "resolved_at": None
    }
    complaints.append(new_complaint)
    save_data("complaints.json", complaints)
    return new_complaint

def resolve_complaint(complaint_id: str):
    complaints = load_data("complaints.json")
    for c in complaints:
        if c["complaint_id"] == complaint_id:
            c["status"] = "Resolved"
            c["resolved_at"] = datetime.utcnow().isoformat() + "Z"
            save_data("complaints.json", complaints)
            return c
    return None

# 5. Hostel
def get_hostel(student_id: str):
    hostels = load_data("hostel.json")
    for h in hostels:
        if h["student_id"] == student_id:
            return h
    # Return default empty hostel card if not found
    return {"student_id": student_id, "room_no": "Unassigned", "dues": 0.0, "leave_requests": []}

def file_outpass_request(student_id: str, from_date: str, to_date: str, reason: str = "Personal Work"):
    hostels = load_data("hostel.json")
    found = False
    new_request = {
        "id": f"L{2000 + sum(len(h.get('leave_requests', [])) for h in hostels) + 1}",
        "from": from_date,
        "to": to_date,
        "reason": reason,
        "status": "Approved"  # Auto-approved if rules criteria met
    }
    for h in hostels:
        if h["student_id"] == student_id:
            if "leave_requests" not in h:
                h["leave_requests"] = []
            h["leave_requests"].append(new_request)
            found = True
            break
    if not found:
        hostels.append({
            "student_id": student_id,
            "room_no": "BH3-402",
            "dues": 0.0,
            "leave_requests": [new_request]
        })
    save_data("hostel.json", hostels)
    return new_request

# 6. Library
def get_library(student_id: str):
    records = load_data("library.json")
    return [r for r in records if r["student_id"] == student_id]

def issue_book(student_id: str, book_id: str, book_title: str, due_date: str):
    records = load_data("library.json")
    new_record = {
        "student_id": student_id,
        "book_id": book_id,
        "book_title": book_title,
        "issued_at": datetime.utcnow().strftime("%Y-%m-%d"),
        "due_at": due_date,
        "returned": False,
        "fine": 0.0
    }
    records.append(new_record)
    save_data("library.json", records)
    return new_record

def return_book(student_id: str, book_id: str):
    records = load_data("library.json")
    for r in records:
        if r["student_id"] == student_id and r["book_id"] == book_id and not r["returned"]:
            r["returned"] = True
            r["fine"] = 0.0  # Reset fine on return
            save_data("library.json", records)
            return r
    return None

# 7. Finance
def get_finance(student_id: str):
    finance = load_data("finance.json")
    return [f for f in finance if f["student_id"] == student_id]

def pay_finance_fees(student_id: str, fee_type: str, amount: float):
    finance = load_data("finance.json")
    for record in finance:
        if record["student_id"] == student_id and record["fee_type"].lower() == fee_type.lower():
            record["amount_paid"] += amount
            save_data("finance.json", finance)
            return record
    return None

# 8. Placements
def get_placement(student_id: str):
    placements = load_data("placements.json")
    for p in placements:
        if p["student_id"] == student_id:
            return p
    return None

def apply_placement(student_id: str, company_name: str):
    placements = load_data("placements.json")
    for p in placements:
        if p["student_id"] == student_id:
            if "applications" not in p:
                p["applications"] = []
            if company_name not in p["applications"]:
                p["applications"].append(company_name)
            save_data("placements.json", placements)
            return p
    return None

# 9. Events
def get_events():
    return load_data("events.json")

def register_event(student_id: str, event_id: str):
    events = load_data("events.json")
    for e in events:
        if e["event_id"] == event_id:
            if "registered_students" not in e:
                e["registered_students"] = []
            if student_id not in e["registered_students"]:
                e["registered_students"].append(student_id)
            save_data("events.json", events)
            return e
    return None

# 10. Profile
def get_profile(student_id: str):
    profiles = load_data("profile.json")
    for p in profiles:
        if p["student_id"] == student_id:
            return p
    return None

def update_profile(student_id: str, email: str = None, phone: str = None, address: str = None):
    profiles = load_data("profile.json")
    for p in profiles:
        if p["student_id"] == student_id:
            if email: p["email"] = email
            if phone: p["phone"] = phone
            if address: p["address"] = address
            save_data("profile.json", profiles)
            return p
    return None
