from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, List

from ..database import get_db
from ..models import Student
from ..schemas import StudentCreate, StudentResponse

router = APIRouter()


@router.post("/students", response_model=StudentResponse)
def create_student(student: StudentCreate, db: Session = Depends(get_db)):
    new_student = Student(**student.model_dump())
    db.add(new_student)
    db.commit()
    db.refresh(new_student)
    return new_student


@router.get("/students", response_model=List[StudentResponse])
def find_students(
    skill: Optional[str] = None,
    experience: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = db.query(Student)
    if experience:
        query = query.filter(Student.experience_level == experience)

    students = query.all()

    # Filter by skill in Python rather than a fragile JSON-column SQL cast
    # (SQLite JSON casting is unreliable across SQLAlchemy versions)
    if skill:
        skill_lower = skill.lower()
        students = [
            s for s in students
            if any(skill_lower in sk.lower() for sk in s.skills)
        ]

    return students


@router.get("/students/{student_id}", response_model=StudentResponse)
def get_student(student_id: int, db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return student