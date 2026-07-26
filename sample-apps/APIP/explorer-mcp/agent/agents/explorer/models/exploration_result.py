"""Root aggregation Pydantic model for published exploration results."""

from typing import List, Dict, Any
from pydantic import BaseModel, Field
from agents.explorer.models.page import PageNode
from agents.explorer.models.element import UIElement
from agents.explorer.models.form import FormModel
from agents.explorer.models.navigation import NavigationGraphExport
from agents.explorer.models.workflow import WorkflowSequence
from agents.explorer.models.screenshot import ScreenshotRecord
from agents.explorer.models.error import ErrorRecord
from agents.explorer.models.network import NetworkRequest


class ExplorationSummary(BaseModel):
    """Statistical summary of exploration run."""
    target_url: str
    total_pages_discovered: int = 0
    total_elements_extracted: int = 0
    total_forms_found: int = 0
    total_workflows_detected: int = 0
    total_actions_executed: int = 0
    total_errors_detected: int = 0
    total_network_requests: int = 0
    total_screenshots_taken: int = 0
    duration_seconds: float = 0.0


class ExplorationResult(BaseModel):
    """Published output structure of Explorer Agent to be consumed by downstream ADIP agents."""

    exploration_id: str = Field(description="Unique run identifier")
    timestamp: str = Field(description="ISO timestamp of exploration completion")
    summary: ExplorationSummary = Field(description="Summary metrics")
    pages: List[PageNode] = Field(default_factory=list, description="All discovered page nodes")
    elements: List[UIElement] = Field(default_factory=list, description="All UI elements collected")
    forms: List[FormModel] = Field(default_factory=list, description="All forms analyzed")
    navigation_graph: NavigationGraphExport = Field(description="NetworkX graph structure export")
    workflows: List[WorkflowSequence] = Field(default_factory=list, description="Detected navigation workflows")
    screenshots: List[ScreenshotRecord] = Field(default_factory=list, description="Captured screenshots index")
    errors: List[ErrorRecord] = Field(default_factory=list, description="Detected errors & failures")
    network_requests: List[NetworkRequest] = Field(default_factory=list, description="Captured network activity")
