from fastapi import APIRouter, HTTPException
from backend import db

router = APIRouter(prefix="/placement", tags=["Placement"])

@router.get("/{student_id}")
def get_placement(student_id: str):
    res = db.get_placement(student_id)
    if not res:
        return {"student_id": student_id, "cgpa": 0.0, "backlogs": 0, "eligible_companies": [], "applications": []}
    return res

@router.post("/{student_id}/apply")
def apply_placement(student_id: str, company_name: str):
    res = db.apply_placement(student_id, company_name)
    if not res:
        raise HTTPException(status_code=404, detail="Student placement record not found")
    return res
