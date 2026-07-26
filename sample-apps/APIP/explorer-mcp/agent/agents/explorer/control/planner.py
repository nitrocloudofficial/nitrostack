"""Exploration Planner managing action selection, queuing, prioritization, loop prevention, and failure recovery."""

from typing import List, Optional, Set
from agents.explorer.config import ExplorerConfig
from agents.explorer.control.state import StateManager
from agents.explorer.models.action import ActionTarget, ActionType, ActionResult
from agents.explorer.models.element import UIElement, ElementType
from agents.explorer.models.page import PageNode
from agents.explorer.interfaces import AbstractPlanner
from agents.explorer.utils.helpers import is_same_domain, normalize_url
from agents.explorer.utils.logger import get_logger

logger = get_logger()


class ExplorationPlanner(AbstractPlanner):
    """Controls exploration strategy, prioritizes unexplored interactive UI elements, prevents loops, and recovers from failures."""

    def __init__(self, config: ExplorerConfig, state_manager: StateManager):
        self.config = config
        self.state = state_manager
        self._action_attempts: dict[str, int] = {}
        self._failed_selectors: Set[str] = set()

    def plan_next_action(
        self, current_page: PageNode, available_elements: List[UIElement]
    ) -> Optional[ActionTarget]:
        """Decide next action to execute based on current state and element priorities."""
        if self.state.total_actions_performed >= self.config.max_actions:
            logger.info(f"Max action limit reached ({self.config.max_actions}). Halting planning.")
            return None

        if current_page.depth > self.config.max_depth:
            logger.info(f"Page depth limit ({self.config.max_depth}) exceeded for {current_page.url}. Backtracking.")
            return self._plan_backtrack_or_queue()

        # Filter candidates: visible, enabled, not previously visited, not repeatedly failed
        candidates = [
            e for e in available_elements
            if e.is_visible
            and e.is_enabled
            and not self.state.is_element_visited(e.element_id)
            and e.css_selector not in self._failed_selectors
        ]

        if not candidates:
            logger.info(f"No unvisited candidates on page {current_page.url}. Checking pending queue...")
            return self._plan_backtrack_or_queue()

        # Prioritize candidates: Links/Buttons > Selects > Inputs > Others
        def priority_key(elem: UIElement) -> int:
            if elem.element_type == ElementType.LINK:
                # Prioritize internal links
                href = elem.attributes.get("href", "")
                if href and is_same_domain(self.config.target_url, href):
                    return 0
                return 4
            elif elem.element_type == ElementType.BUTTON:
                return 1
            elif elem.element_type in (ElementType.SELECT, ElementType.CHECKBOX, ElementType.RADIO):
                return 2
            elif elem.element_type == ElementType.INPUT:
                return 3
            return 5

        candidates.sort(key=priority_key)
        selected_elem = candidates[0]

        # Determine action type
        action_type = ActionType.CLICK
        val = None

        if selected_elem.element_type == ElementType.INPUT:
            if selected_elem.attributes.get("type") == "checkbox":
                action_type = ActionType.CHECK
            elif selected_elem.attributes.get("type") == "file":
                action_type = ActionType.UPLOAD_FILE
            else:
                action_type = ActionType.TYPE
                val = "Test Input"
        elif selected_elem.element_type == ElementType.SELECT:
            action_type = ActionType.SELECT_OPTION
            val = selected_elem.attributes.get("value") or "1"

        return ActionTarget(
            action_type=action_type,
            css_selector=selected_elem.css_selector,
            xpath=selected_elem.xpath,
            value=val,
            element_id=selected_elem.element_id
        )

    def _plan_backtrack_or_queue(self) -> Optional[ActionTarget]:
        if self.state.pending_urls:
            next_url = self.state.pending_urls.pop(0)
            logger.info(f"Planner dequeued next target URL: {next_url}")
            return ActionTarget(
                action_type=ActionType.NAVIGATE,
                css_selector="body",
                value=next_url
            )
        return None

    def mark_completed(self, action: ActionTarget, result: ActionResult) -> None:
        """Mark action as completed and update state tracking."""
        self.state.total_actions_performed += 1
        if action.element_id:
            self.state.mark_element_visited(action.element_id)

        # Discover new links to add to pending queue
        if result.end_url and is_same_domain(self.config.target_url, result.end_url):
            self.state.add_pending_url(result.end_url)

        logger.debug(f"Action marked completed: {action.action_type.value} on {action.css_selector}")

    def mark_failed(self, action: ActionTarget, error: str) -> None:
        """Mark action as failed, increment attempt count, and apply backoff/quarantine."""
        self.state.total_actions_performed += 1
        key = action.css_selector
        self._action_attempts[key] = self._action_attempts.get(key, 0) + 1

        if self._action_attempts[key] >= 2:
            self._failed_selectors.add(key)
            logger.warning(f"Quarantining failing selector after {self._action_attempts[key]} attempts: {key}")

    def has_remaining_work(self) -> bool:
        """Check whether there are pending actions or queued URLs."""
        if self.state.total_actions_performed >= self.config.max_actions:
            return False
        return len(self.state.pending_urls) > 0 or len(self.state.visited_urls) < self.config.max_page_visits
