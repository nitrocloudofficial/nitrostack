from fastapi import APIRouter
from backend import db

router = APIRouter(prefix="/timetable", tags=["Timetable"])

@router.get("/")
def get_all_timetable():
    return db.get_timetable(None)

@router.get("/{student_id}")
def get_timetable(student_id: str):
    return db.get_timetable(student_id)
