from pydantic import BaseModel, Field
from typing import Literal, Dict, Any, List, Optional
import datetime
import uuid

WorkflowStatus = Literal['pending', 'running', 'completed', 'failed']
LogLevel = Literal['info', 'warning', 'error', 'success']

class ExecutionLog(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: str = Field(default_factory=lambda: datetime.datetime.now(datetime.timezone.utc).isoformat())
    level: LogLevel
    message: str
    node_id: str

class WorkflowNodeState(BaseModel):
    id: str
    type: str
    label: str
    status: WorkflowStatus = 'pending'
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    execution_ms: Optional[int] = None
    confidence: Optional[float] = None
    error: Optional[str] = None
    inputs: Dict[str, Any] = Field(default_factory=dict)
    outputs: Dict[str, Any] = Field(default_factory=dict)

class WorkflowRun(BaseModel):
    id: str
    query: str
    status: WorkflowStatus = 'pending'
    start_time: str = Field(default_factory=lambda: datetime.datetime.now(datetime.timezone.utc).isoformat())
    end_time: Optional[str] = None
    nodes: List[WorkflowNodeState] = Field(default_factory=list)
    logs: List[ExecutionLog] = Field(default_factory=list)
    summary: Optional[Dict[str, Any]] = None
    state_snapshot: Dict[str, Any] = Field(default_factory=dict)
