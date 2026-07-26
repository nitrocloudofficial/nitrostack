"""
Planner Agent Pydantic Models — Agent 1 interface contract.
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from backend.schemas.shared_models import AgentName, MCPServer, ChatMessage, UIState


class Task(BaseModel):
    task_id: str
    name: str
    description: str
    order: int
    required_server: Optional[MCPServer] = None


class PlannerInput(BaseModel):
    user_query: str
    conversation_history: List[ChatMessage] = Field(default_factory=list)
    incident_id: Optional[str] = "INC-2407-001"
    batch_id: Optional[str] = "B-2407-184"
    ui_context: UIState = Field(default_factory=UIState)
    constraints: Dict[str, Any] = Field(default_factory=dict)


class ExecutionPlan(BaseModel):
    intent: str
    tasks: List[Task]
    required_agents: List[AgentName]
    required_servers: List[MCPServer]
    expected_outputs: List[str]
    execution_order: List[int]
    constraints: Dict[str, Any] = Field(default_factory=dict)
    raw_query: str = ""
