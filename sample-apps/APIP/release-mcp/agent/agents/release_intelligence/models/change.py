"""Categorized Change models produced by Change Analyzer."""

from typing import Optional, Dict, Any
from pydantic import BaseModel, Field
from agents.release_intelligence.utils.constants import ChangeCategory


class AffectedComponent(BaseModel):
    """Component or entity affected by a change."""
    id: str
    name: str
    type: str  # Page, Workflow, Form, UIElement, APIEndpoint, Permission, Relationship


class Change(BaseModel):
    """Structured representation of a single categorized change."""
    id: str = Field(description="Unique change identifier (e.g. CHG-001)")
    category: ChangeCategory = Field(description="Added, Modified, Removed, Renamed, Moved, Deprecated, etc.")
    title: str = Field(description="Human-readable summary of the change")
    description: str = Field(description="Detailed explanation of what changed")
    affected_component: AffectedComponent = Field(description="Target entity affected")
    old_value: Optional[Any] = Field(default=None, description="Previous value or configuration")
    new_value: Optional[Any] = Field(default=None, description="New value or configuration")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional context metadata")
