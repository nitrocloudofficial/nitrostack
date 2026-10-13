from enum import Enum
from typing import Dict, Any, Optional
from pydantic import BaseModel
import time

class AgentState(str, Enum):
    QUEUED = "QUEUED"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    RETRYING = "RETRYING"

class TaskContext(BaseModel):
    agent_name: str
    state: AgentState = AgentState.QUEUED
    start_time: Optional[float] = None
    end_time: Optional[float] = None
    artifact: Any = None
    error: Optional[str] = None
    
    @property
    def execution_time(self) -> float:
        if self.start_time and self.end_time:
            return self.end_time - self.start_time
        elif self.start_time:
            return time.time() - self.start_time
        return 0.0

class PlannerContext(BaseModel):
    query: str
    tasks: Dict[str, TaskContext] = {}
