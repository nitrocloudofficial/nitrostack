"""
Shared Pydantic models — the interface contracts between all 4 agents.
These models are the single source of truth for data shapes across the pipeline.
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum


class AgentName(str, Enum):
    PLANNER = "planner"
    RESEARCH = "research"
    ANALYSIS = "analysis"
    EXECUTION = "execution"


class MCPServer(str, Enum):
    MES = "MES"
    MAINTENANCE = "Maintenance"
    QUALITY = "Quality"
    MATERIALS = "Materials"
    SIMULATION = "Simulation"
    ORCHESTRATOR = "Orchestrator"


class ChatMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class UIState(BaseModel):
    active_view: Optional[str] = None
    active_incident_id: Optional[str] = None
    active_batch_id: Optional[str] = None
    highlighted_nodes: List[str] = Field(default_factory=list)
    pinned_timestamp: Optional[str] = None


class Incident(BaseModel):
    incident_id: str
    batch_id: str
    plant: str
    line: str
    severity: str
    yield_baseline_pct: float
    yield_actual_pct: float
    status: str
    detected_at: str
