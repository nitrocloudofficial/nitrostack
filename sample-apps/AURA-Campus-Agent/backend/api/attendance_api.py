from fastapi import APIRouter, HTTPException
from backend import db

router = APIRouter(prefix="/attendance", tags=["Attendance"])

@router.get("/{student_id}")
def get_attendance(student_id: str):
    records = db.get_attendance(student_id)
    if not records:
        return []
    return records

@router.post("/{student_id}/flag")
def flag_attendance(student_id: str, course_code: str):
    try:
        db.update_attendance_record(student_id, course_code, 40, 20)  # Simulates dropping attendance to trigger shortages
        return {"status": "Success", "message": f"Flagged attendance drops for {course_code}."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
