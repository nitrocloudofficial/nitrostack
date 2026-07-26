"""Release Note models supporting multi-audience tailored release notes."""

from typing import List, Dict
from pydantic import BaseModel, Field
from agents.release_intelligence.utils.constants import TargetAudience


class ReleaseNoteSection(BaseModel):
    """Section header and bullet points within release notes."""
    heading: str = Field(description="Section title (e.g. New Features, Improvements, Bug Fixes)")
    bullet_points: List[str] = Field(default_factory=list, description="List of release note bullet points")


class ReleaseNote(BaseModel):
    """Release Notes tailored for a specific audience."""
    audience: TargetAudience = Field(description="Customer, Internal Engineering, Executive, Technical")
    title: str = Field(description="Title of release notes")
    version: str = Field(description="Release version identifier")
    summary: str = Field(description="High-level overview summary")
    sections: List[ReleaseNoteSection] = Field(default_factory=list, description="Categorized sections")
    raw_markdown: str = Field(description="Formatted Markdown string representation")


class MultiAudienceReleaseNotes(BaseModel):
    """Collection of Release Notes across all supported target audiences."""
    customer_notes: ReleaseNote
    internal_engineering_notes: ReleaseNote
    executive_summary_notes: ReleaseNote
    technical_notes: ReleaseNote

    def get_all(self) -> Dict[str, ReleaseNote]:
        """Return dictionary mapping audience string to ReleaseNote model."""
        return {
            TargetAudience.CUSTOMER.value: self.customer_notes,
            TargetAudience.INTERNAL_ENGINEERING.value: self.internal_engineering_notes,
            TargetAudience.EXECUTIVE.value: self.executive_summary_notes,
            TargetAudience.TECHNICAL.value: self.technical_notes,
        }
