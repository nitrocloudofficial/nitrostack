"""Pydantic model representing deterministic graph differences between two graph versions."""

from typing import Dict, List, Any
from pydantic import BaseModel, Field


class EntityDelta(BaseModel):
    """Delta details for a single entity modification."""
    entity_id: str
    entity_type: str  # Page, Workflow, Form, UIElement, API, Relationship, Permission
    name: str
    changes: Dict[str, Any] = Field(default_factory=dict)  # Field level diffs


class GraphDiff(BaseModel):
    """Structured graph comparison result produced deterministically by Diff Engine."""
    old_version_id: str
    new_version_id: str

    added_pages: List[str] = Field(default_factory=list)
    removed_pages: List[str] = Field(default_factory=list)
    modified_pages: List[EntityDelta] = Field(default_factory=list)
    renamed_pages: List[Dict[str, str]] = Field(default_factory=list)
    moved_pages: List[Dict[str, str]] = Field(default_factory=list)

    added_workflows: List[str] = Field(default_factory=list)
    removed_workflows: List[str] = Field(default_factory=list)
    modified_workflows: List[EntityDelta] = Field(default_factory=list)

    added_forms: List[str] = Field(default_factory=list)
    removed_forms: List[str] = Field(default_factory=list)
    modified_forms: List[EntityDelta] = Field(default_factory=list)

    ui_element_changes: List[EntityDelta] = Field(default_factory=list)
    navigation_changes: List[Dict[str, Any]] = Field(default_factory=list)
    api_changes: List[EntityDelta] = Field(default_factory=list)
    relationship_changes: List[Dict[str, Any]] = Field(default_factory=list)
    permission_changes: List[EntityDelta] = Field(default_factory=list)

    @property
    def total_changes_count(self) -> int:
        """Calculate total number of individual entity changes detected."""
        return (
            len(self.added_pages) + len(self.removed_pages) + len(self.modified_pages) +
            len(self.renamed_pages) + len(self.moved_pages) +
            len(self.added_workflows) + len(self.removed_workflows) + len(self.modified_workflows) +
            len(self.added_forms) + len(self.removed_forms) + len(self.modified_forms) +
            len(self.ui_element_changes) + len(self.navigation_changes) +
            len(self.api_changes) + len(self.relationship_changes) + len(self.permission_changes)
        )
