from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from backend import db

router = APIRouter(prefix="/profile", tags=["Profile"])

class ProfileUpdate(BaseModel):
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None

@router.get("/{student_id}")
def get_profile(student_id: str):
    student = db.get_student(student_id)
    profile = db.get_profile(student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return {**student, **(profile or {})}

@router.put("/{student_id}")
def update_profile(student_id: str, payload: ProfileUpdate):
    res = db.update_profile(student_id, payload.email, payload.phone, payload.address)
    if not res:
        raise HTTPException(status_code=404, detail="Student profile not found")
    return res
