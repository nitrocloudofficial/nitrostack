"""Risk Assessment models for Release Intelligence Agent."""

from typing import List
from pydantic import BaseModel, Field
from agents.release_intelligence.utils.constants import RiskLevel


class BreakingChange(BaseModel):
    """Details regarding a breaking change in the release."""
    component_name: str = Field(description="Name of component with breaking change")
    description: str = Field(description="Explanation of breaking change")
    mitigation_advice: str = Field(description="Steps to adapt to or mitigate breaking change")


class RiskFactor(BaseModel):
    """Specific risk factor identified during change analysis."""
    factor_name: str = Field(description="Name of risk factor")
    severity: RiskLevel = Field(description="Low, Medium, High, Critical")
    description: str = Field(description="Explanation of risk factor")


class RiskAssessment(BaseModel):
    """Aggregate Release Risk Assessment model."""
    overall_risk_level: RiskLevel = Field(description="Overall release risk: Low, Medium, High, Critical")
    risk_score: float = Field(description="Numeric risk score between 0.0 and 10.0")
    breaking_changes: List[BreakingChange] = Field(default_factory=list, description="List of breaking changes")
    risk_factors: List[RiskFactor] = Field(default_factory=list, description="Identified risk factors")
    summary: str = Field(description="Executive risk summary")
