from sqlalchemy import Column, Integer, String, JSON
from .database import Base


class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    department = Column(String, nullable=False)
    year = Column(String, nullable=False)
    skills = Column(JSON, default=list)          # e.g. ["Python", "React"]
    interests = Column(JSON, default=list)        # e.g. ["AI", "Healthcare"]
    experience_level = Column(String, default="beginner")  # beginner | intermediate | advanced
    availability = Column(JSON, default=list)      # e.g. ["weekends"]


class Team(Base):
    __tablename__ = "teams"

    id = Column(Integer, primary_key=True, index=True)
    project_name = Column(String, nullable=False)
    project_type = Column(String, default="general")
    member_ids = Column(JSON, default=list)