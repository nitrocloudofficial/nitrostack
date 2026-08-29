"""
Research Agent Pydantic Models — Agent 2 interface contract.
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from backend.schemas.planner_models import ExecutionPlan


class ResearchInput(BaseModel):
    execution_plan: ExecutionPlan
    incident_id: str = "INC-2407-001"
    batch_id: str = "B-2407-184"


class SensorReading(BaseModel):
    reading_id: str
    timestamp: str
    humidity_pct: float
    temperature_c: float
    queue_delay_minutes: float
    cycle_time_seconds: float
    source: str
    record_id: str


class EvidenceBundle(BaseModel):
    batch_history: Dict[str, Any] = Field(default_factory=dict)
    machine_history: Dict[str, Any] = Field(default_factory=dict)
    sensor_readings: List[Dict[str, Any]] = Field(default_factory=list)
    quality_data: Dict[str, Any] = Field(default_factory=dict)
    maintenance_logs: List[Dict[str, Any]] = Field(default_factory=list)
    historical_incidents: List[Dict[str, Any]] = Field(default_factory=list)
    causal_graph: Dict[str, Any] = Field(default_factory=dict)
    timeline_events: List[Dict[str, Any]] = Field(default_factory=list)
    constraints: Dict[str, Any] = Field(default_factory=dict)
    retrieval_sources: List[str] = Field(default_factory=list)
    evidence_by_tool: Dict[str, Any] = Field(default_factory=dict)
    tool_trace: List[Dict[str, Any]] = Field(default_factory=list)
