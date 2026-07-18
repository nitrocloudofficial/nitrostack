from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from backend import db

router = APIRouter(prefix="/complaints", tags=["Complaints"])

class ComplaintCreate(BaseModel):
    category: str
    description: str

@router.get("/{student_id}")
def get_complaints(student_id: str):
    return db.get_complaints(student_id)

@router.post("/{student_id}")
def file_complaint(student_id: str, payload: ComplaintCreate):
    try:
        return db.file_complaint(student_id, payload.category, payload.description)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{complaint_id}/resolve")
def resolve_complaint(complaint_id: str):
    res = db.resolve_complaint(complaint_id)
    if not res:
        raise HTTPException(status_code=404, detail="Complaint not found")
    return res
