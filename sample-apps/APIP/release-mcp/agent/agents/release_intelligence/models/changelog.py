"""Changelog models supporting multi-format rendering."""

from typing import List, Dict, Optional, Union
from pydantic import BaseModel, Field
from agents.release_intelligence.utils.constants import ChangelogFormat


class ChangelogEntry(BaseModel):
    """Single item entry in changelog."""
    category: str = Field(description="Added, Changed, Fixed, Removed, Deprecated")
    description: str = Field(description="Changelog text item")
    component_name: Optional[str] = Field(default=None, description="Affected component name")


class ChangelogSection(BaseModel):
    """Categorized section of changelog."""
    category: str = Field(description="Category header")
    entries: List[ChangelogEntry] = Field(default_factory=list, description="Entries under category")


class Changelog(BaseModel):
    """Complete Changelog model supporting multiple output formats."""
    version: str = Field(description="Release version identifier")
    sections: List[ChangelogSection] = Field(default_factory=list, description="Changelog sections")
    formatted_content: Dict[str, str] = Field(
        default_factory=dict,
        description="Map of format string (Markdown, JSON, Plain Text, HTML) to formatted content"
    )

    def get_format(self, format_type: Union[ChangelogFormat, str]) -> str:
        """Get formatted content string for specified format."""
        key = format_type.value if hasattr(format_type, "value") else str(format_type)
        return self.formatted_content.get(key, "")
