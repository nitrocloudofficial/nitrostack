"""Models for Feature Summaries and Executive Summaries."""

from typing import List
from pydantic import BaseModel, Field


class FeatureSummary(BaseModel):
    """High-level summary of a new or significantly modified feature."""
    feature_name: str = Field(description="Name of feature")
    category: str = Field(description="New Feature, Major Enhancement, Refactor")
    summary: str = Field(description="Summary explanation")
    key_highlights: List[str] = Field(default_factory=list, description="Bullet point highlights")


class ReleaseSummary(BaseModel):
    """Overall release summary aggregation."""
    version_a: str
    version_b: str
    total_changes: int
    feature_summaries: List[FeatureSummary] = Field(default_factory=list)
    executive_overview: str
