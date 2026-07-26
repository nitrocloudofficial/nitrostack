"""Models package for Explorer Agent."""

from agents.explorer.models.element import UIElement, ElementType, BoundingBox
from agents.explorer.models.action import ActionTarget, ActionResult, ActionType
from agents.explorer.models.page import PageNode, PageMetadata
from agents.explorer.models.form import FormField, FormModel, FieldType
from agents.explorer.models.navigation import NavigationEdge, NavigationGraphExport
from agents.explorer.models.workflow import WorkflowStep, WorkflowSequence
from agents.explorer.models.network import NetworkRequest, NetworkResponse
from agents.explorer.models.error import ErrorRecord, ErrorType
from agents.explorer.models.screenshot import ScreenshotRecord, ScreenshotType
from agents.explorer.models.exploration_result import ExplorationResult, ExplorationSummary

__all__ = [
    "UIElement", "ElementType", "BoundingBox",
    "ActionTarget", "ActionResult", "ActionType",
    "PageNode", "PageMetadata",
    "FormField", "FormModel", "FieldType",
    "NavigationEdge", "NavigationGraphExport",
    "WorkflowStep", "WorkflowSequence",
    "NetworkRequest", "NetworkResponse",
    "ErrorRecord", "ErrorType",
    "ScreenshotRecord", "ScreenshotType",
    "ExplorationResult", "ExplorationSummary",
]
