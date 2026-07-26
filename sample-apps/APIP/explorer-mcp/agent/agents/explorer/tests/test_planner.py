"""Unit tests for ExplorationPlanner and StateManager."""

import pytest
from agents.explorer.config import ExplorerConfig
from agents.explorer.control.state import StateManager
from agents.explorer.control.planner import ExplorationPlanner
from agents.explorer.models.element import UIElement, ElementType
from agents.explorer.models.page import PageNode
from agents.explorer.models.action import ActionTarget, ActionType, ActionResult


def test_state_manager_visited_tracking():
    state = StateManager(base_url="http://localhost:8000")
    assert state.is_url_visited("http://localhost:8000") is False

    state.mark_url_visited("http://localhost:8000")
    assert state.is_url_visited("http://localhost:8000") is True

    state.mark_element_visited("elem_101")
    assert state.is_element_visited("elem_101") is True


def test_planner_candidate_selection():
    config = ExplorerConfig(target_url="http://localhost:8000", max_actions=10)
    state = StateManager(base_url=config.target_url)
    planner = ExplorationPlanner(config, state)

    elem1 = UIElement(
        element_id="e1",
        tag_name="button",
        element_type=ElementType.BUTTON,
        text="Click Me",
        css_selector="button#btn1"
    )
    elem2 = UIElement(
        element_id="e2",
        tag_name="a",
        element_type=ElementType.LINK,
        text="Go Home",
        css_selector="a#link1",
        attributes={"href": "http://localhost:8000/home"}
    )

    page = PageNode(
        page_id="p1",
        url="http://localhost:8000",
        elements=[elem1, elem2]
    )

    action = planner.plan_next_action(page, [elem1, elem2])
    assert action is not None
    assert action.action_type == ActionType.CLICK
    # Priority puts internal link or button first
    assert action.element_id in ("e1", "e2")


def test_planner_quarantine_on_failure():
    config = ExplorerConfig(target_url="http://localhost:8000", max_actions=10)
    state = StateManager(base_url=config.target_url)
    planner = ExplorationPlanner(config, state)

    action = ActionTarget(action_type=ActionType.CLICK, css_selector="button#broken", element_id="e_broken")
    
    planner.mark_failed(action, "Element not interactable")
    planner.mark_failed(action, "Element not interactable")

    # Should quarantine
    assert "button#broken" in planner._failed_selectors
