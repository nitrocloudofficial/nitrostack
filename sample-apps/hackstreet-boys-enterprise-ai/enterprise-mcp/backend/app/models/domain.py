from sqlalchemy import Column, String, Boolean, ForeignKey, Integer, DateTime, Text, JSON, Table, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import uuid

def generate_uuid():
    return str(uuid.uuid4())

# Many-to-Many associations
project_team = Table(
    'project_team',
    Base.metadata,
    Column('project_id', String, ForeignKey('projects.id')),
    Column('employee_id', String, ForeignKey('employees.id'))
)

meeting_participants = Table(
    'meeting_participants',
    Base.metadata,
    Column('meeting_id', String, ForeignKey('meetings.id')),
    Column('employee_id', String, ForeignKey('employees.id'))
)

class Role(Base):
    __tablename__ = "roles"
    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, unique=True, index=True)
    permissions = Column(JSON, default=list) # List of permission strings

class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True, default=generate_uuid)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_active = Column(Boolean, default=True)
    role_id = Column(String, ForeignKey("roles.id"))
    
    role = relationship("Role")

class Employee(Base):
    __tablename__ = "employees"
    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=True)
    name = Column(String, index=True)
    department = Column(String, index=True)
    job_title = Column(String)
    manager_id = Column(String, ForeignKey("employees.id"), nullable=True)

    manager = relationship("Employee", remote_side=[id])
    projects = relationship("Project", secondary=project_team, back_populates="team")

class Project(Base):
    __tablename__ = "projects"
    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, index=True)
    description = Column(Text)
    status = Column(String)
    owner_id = Column(String, ForeignKey("employees.id"))

    owner = relationship("Employee")
    team = relationship("Employee", secondary=project_team, back_populates="projects")

class Document(Base):
    __tablename__ = "documents"
    id = Column(String, primary_key=True, default=generate_uuid)
    title = Column(String, index=True)
    category = Column(String, index=True)
    content = Column(Text)
    source = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class Policy(Base):
    __tablename__ = "policies"
    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, index=True)
    content = Column(Text)
    version = Column(String)

class Meeting(Base):
    __tablename__ = "meetings"
    id = Column(String, primary_key=True, default=generate_uuid)
    title = Column(String)
    date = Column(DateTime(timezone=True))
    summary = Column(Text)

    participants = relationship("Employee", secondary=meeting_participants)
    action_items = relationship("MeetingActionItem", back_populates="meeting")

class MeetingActionItem(Base):
    __tablename__ = "meeting_action_items"
    id = Column(String, primary_key=True, default=generate_uuid)
    meeting_id = Column(String, ForeignKey("meetings.id"))
    description = Column(Text)
    assignee_id = Column(String, ForeignKey("employees.id"))
    status = Column(String, default="Pending")

    meeting = relationship("Meeting", back_populates="action_items")
    assignee = relationship("Employee")

class Incident(Base):
    __tablename__ = "incidents"
    id = Column(String, primary_key=True, default=generate_uuid)
    title = Column(String)
    description = Column(Text)
    severity = Column(String)
    status = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    resolved_at = Column(DateTime(timezone=True), nullable=True)

class Ticket(Base):
    __tablename__ = "tickets"
    id = Column(String, primary_key=True, default=generate_uuid)
    title = Column(String)
    description = Column(Text)
    priority = Column(String)
    status = Column(String, default="Open")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class ToolExecution(Base):
    __tablename__ = "tool_executions"
    id = Column(String, primary_key=True, default=generate_uuid)
    tool_name = Column(String, index=True)
    arguments = Column(JSON)
    result = Column(JSON, nullable=True)
    error = Column(Text, nullable=True)
    user_id = Column(String, ForeignKey("users.id"))
    executed_at = Column(DateTime(timezone=True), server_default=func.now())

class ConversationHistory(Base):
    __tablename__ = "conversation_history"
    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"))
    role = Column(String) # 'user', 'assistant', 'system'
    content = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
