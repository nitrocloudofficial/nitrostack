from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from backend import db

router = APIRouter(prefix="/library", tags=["Library"])

class IssueBookPayload(BaseModel):
    book_id: str
    book_title: str
    due_date: str

@router.get("/{student_id}")
def get_library(student_id: str):
    return db.get_library(student_id)

@router.post("/{student_id}/issue")
def issue_book(student_id: str, payload: IssueBookPayload):
    try:
        return db.issue_book(student_id, payload.book_id, payload.book_title, payload.due_date)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{student_id}/return/{book_id}")
def return_book(student_id: str, book_id: str):
    res = db.return_book(student_id, book_id)
    if not res:
        raise HTTPException(status_code=404, detail="Active book loan not found")
    return res
