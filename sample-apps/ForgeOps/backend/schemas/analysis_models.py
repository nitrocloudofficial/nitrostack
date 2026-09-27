"""
Analysis Agent Pydantic Models — Agent 3 interface contract.
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from backend.schemas.planner_models import ExecutionPlan
from backend.schemas.research_models import EvidenceBundle


class RootCause(BaseModel):
    pathway_id: str
    primary_cause: str
    contributing_factors: List[str]
    confidence_score: float
    causal_chain: List[str]


class SimulationResult(BaseModel):
    scenario_id: str
    scenario_name: str
    inputs: Dict[str, Any]
    baseline_yield: float
    predicted_yield: float
    yield_delta_pct: float
    confidence: float
    cost_estimate: str
    implementation_effort: str
    assumptions: List[str]
    in_validated_range: bool
    warnings: List[str] = Field(default_factory=list)


class Recommendation(BaseModel):
    rank: int
    title: str
    score: float
    predicted_yield_pct: float
    yield_recovery_pct: float
    confidence_pct: int
    implementation_speed: str
    cost_estimate: str
    business_impact: Dict[str, Any]


class AnalysisInput(BaseModel):
    evidence: EvidenceBundle
    plan: ExecutionPlan


class AnalysisResult(BaseModel):
    root_causes: List[RootCause]
    simulation_results: List[SimulationResult]
    recommendations: List[Recommendation]
    confidence_scores: Dict[str, float]
    business_impact: Dict[str, Any]
    supporting_evidence: List[str]
    anomalies_detected: int
