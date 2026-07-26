"""Pydantic models for application navigation graph structure."""

from typing import List, Dict, Any
from pydantic import BaseModel, Field
from agents.explorer.models.action import ActionType


class NavigationEdge(BaseModel):
    """Directed edge representing navigation transition between page nodes."""

    source_page_id: str = Field(description="Source PageNode ID")
    target_page_id: str = Field(description="Destination PageNode ID")
    action_type: ActionType = Field(description="Action causing transition")
    trigger_selector: str = Field(description="CSS selector of element that triggered transition")
    trigger_text: str = Field(default="", description="Text of element that triggered transition")
    weight: float = Field(default=1.0, description="Edge weight / transition cost")


class NavigationGraphExport(BaseModel):
    """Export structure of NetworkX directed graph."""

    nodes: List[Dict[str, Any]] = Field(default_factory=list, description="Node attributes list")
    edges: List[Dict[str, Any]] = Field(default_factory=list, description="Edge attributes list")
    total_nodes: int = Field(default=0)
    total_edges: int = Field(default=0)
