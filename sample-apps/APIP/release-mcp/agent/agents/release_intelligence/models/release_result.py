"""Master ReleaseResult Pydantic model encapsulating all release intelligence outputs."""

from datetime import datetime, timezone
from typing import Dict, List, Any, Optional
from pydantic import BaseModel, Field

from agents.release_intelligence.models.graph_diff import GraphDiff
from agents.release_intelligence.models.change import Change
from agents.release_intelligence.models.impact import ImpactAnalysis
from agents.release_intelligence.models.release_note import MultiAudienceReleaseNotes
from agents.release_intelligence.models.changelog import Changelog
from agents.release_intelligence.models.risk_assessment import RiskAssessment
from agents.release_intelligence.models.release_summary import ReleaseSummary


class ValidationStatus(BaseModel):
    """Validation status result."""
    is_valid: bool = Field(description="True if validation passed cleanly")
    warnings: List[str] = Field(default_factory=list, description="Validation warnings")
    errors: List[str] = Field(default_factory=list, description="Validation error details")


class ReleaseResult(BaseModel):
    """Strongly typed master result produced by Release Intelligence Agent."""

    release_id: str = Field(description="Unique release result ID")
    old_version_id: str = Field(description="Base graph version ID")
    new_version_id: str = Field(description="Target graph version ID")
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), description="Generation timestamp")

    diff: GraphDiff = Field(description="Deterministic raw graph diff")
    changes: List[Change] = Field(default_factory=list, description="Categorized list of changes")

    impact_analysis: ImpactAnalysis = Field(description="AI-driven impact analysis")
    release_notes: MultiAudienceReleaseNotes = Field(description="Multi-audience release notes")
    changelog: Changelog = Field(description="Multi-format changelog")
    risk_assessment: RiskAssessment = Field(description="Release risk evaluation")
    release_summary: ReleaseSummary = Field(description="Feature and executive summary")

    validation_status: ValidationStatus = Field(description="Validation check results")
    published_files: Dict[str, str] = Field(default_factory=dict, description="Paths to published outputs")
