from fastapi import APIRouter, HTTPException
from backend import db

router = APIRouter(prefix="/events", tags=["Events"])

@router.get("/")
def get_events():
    return db.get_events()

@router.post("/{student_id}/register/{event_id}")
def register_event(student_id: str, event_id: str):
    res = db.register_event(student_id, event_id)
    if not res:
        raise HTTPException(status_code=404, detail="Event not found")
    return res
