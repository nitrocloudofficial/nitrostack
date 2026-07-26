"""Abstract Base Classes and Protocol interfaces for Explorer Agent components."""

from abc import ABC, abstractmethod
from typing import List, Optional, Dict, Any
from agents.explorer.models.action import ActionTarget, ActionResult
from agents.explorer.models.element import UIElement
from agents.explorer.models.page import PageNode
from agents.explorer.models.form import FormModel
from agents.explorer.models.workflow import WorkflowSequence
from agents.explorer.models.error import ErrorRecord
from agents.explorer.models.screenshot import ScreenshotRecord, ScreenshotType
from agents.explorer.models.network import NetworkRequest
from agents.explorer.models.exploration_result import ExplorationResult


class AbstractPlanner(ABC):
    """Abstract interface for exploration planner."""

    @abstractmethod
    def plan_next_action(self, current_page: PageNode, available_elements: List[UIElement]) -> Optional[ActionTarget]:
        """Decide the next action to execute based on current state."""
        pass

    @abstractmethod
    def mark_completed(self, action: ActionTarget, result: ActionResult) -> None:
        """Mark action as completed successfully."""
        pass

    @abstractmethod
    def mark_failed(self, action: ActionTarget, error: str) -> None:
        """Mark action as failed."""
        pass

    @abstractmethod
    def has_remaining_work(self) -> bool:
        """Check whether there are still unexplored targets in queue."""
        pass


class AbstractActionExecutor(ABC):
    """Abstract interface for executing actions in browser."""

    @abstractmethod
    async def execute(self, action: ActionTarget) -> ActionResult:
        """Execute action on active page."""
        pass


class AbstractDOMAnalyzer(ABC):
    """Abstract interface for analyzing page DOM."""

    @abstractmethod
    async def extract_page_node(self, page_url: str) -> PageNode:
        """Analyze active page and return PageNode with extracted UI elements."""
        pass


class AbstractVisionAnalyzer(ABC):
    """Interface for visual AI analysis (extension point for multimodal vision models)."""

    @abstractmethod
    async def analyze_visuals(self, image_path: str) -> Dict[str, Any]:
        """Analyze page screenshot for visual icons, charts, grouping, unlabeled controls."""
        pass


class AbstractFormAnalyzer(ABC):
    """Interface for form analysis."""

    @abstractmethod
    async def extract_forms(self, page_url: str) -> List[FormModel]:
        """Extract all form structures and fields from active page."""
        pass


class AbstractWorkflowDetector(ABC):
    """Interface for workflow sequence detection."""

    @abstractmethod
    def record_transition(self, from_url: str, action: ActionTarget, to_url: str) -> None:
        """Record state transition for workflow tracking."""
        pass

    @abstractmethod
    def get_detected_workflows(self) -> List[WorkflowSequence]:
        """Return list of recognized multi-step workflows."""
        pass


class AbstractErrorDetector(ABC):
    """Interface for error detection."""

    @abstractmethod
    def record_console_error(self, message: str, location: Optional[str] = None) -> None:
        """Record console error."""
        pass

    @abstractmethod
    def record_http_error(self, url: str, status_code: int, message: str) -> None:
        """Record HTTP 4xx/5xx error."""
        pass

    @abstractmethod
    def get_errors(self) -> List[ErrorRecord]:
        """Return captured error records."""
        pass


class AbstractScreenshotRecorder(ABC):
    """Interface for screenshot capturing."""

    @abstractmethod
    async def capture(
        self, screenshot_type: ScreenshotType, url: str, selector: Optional[str] = None
    ) -> ScreenshotRecord:
        """Capture screenshot and save to disk."""
        pass


class AbstractNetworkMonitor(ABC):
    """Interface for network monitoring."""

    @abstractmethod
    def get_network_requests(self) -> List[NetworkRequest]:
        """Return captured network requests."""
        pass


class AbstractResultPublisher(ABC):
    """Interface for publishing exploration results."""

    @abstractmethod
    async def publish(self, result: ExplorationResult) -> str:
        """Publish ExplorationResult to storage/destination and return locator."""
        pass
