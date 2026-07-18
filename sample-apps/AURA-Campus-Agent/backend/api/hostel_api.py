from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from backend import db

router = APIRouter(prefix="/hostel", tags=["Hostel"])

class OutpassCreate(BaseModel):
    from_date: str
    to_date: str
    reason: str

@router.get("/{student_id}")
def get_hostel(student_id: str):
    return db.get_hostel(student_id)

@router.post("/{student_id}/leave")
def file_leave(student_id: str, payload: OutpassCreate):
    try:
        return db.file_outpass_request(student_id, payload.from_date, payload.to_date, payload.reason)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
