from pydantic import BaseModel
from typing import List, Optional


class StudentCreate(BaseModel):
    name: str
    department: str
    year: str
    skills: List[str] = []
    interests: List[str] = []
    experience_level: str = "beginner"
    availability: List[str] = []


class StudentResponse(StudentCreate):
    id: int

    class Config:
        from_attributes = True


class TeamCreate(BaseModel):
    project_name: str
    project_type: str = "general"
    member_ids: List[int]


class TeamResponse(TeamCreate):
    id: int

    class Config:
        from_attributes = True