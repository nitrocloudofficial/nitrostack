"""Unit tests for NavigationGraphBuilder, WorkflowDetector, and ErrorDetector."""

import pytest
from agents.explorer.analyzers.navigation_graph import NavigationGraphBuilder
from agents.explorer.analyzers.workflow_detector import WorkflowDetector
from agents.explorer.models.page import PageNode
from agents.explorer.models.action import ActionTarget, ActionType


def test_navigation_graph_builder():
    builder = NavigationGraphBuilder()
    page1 = PageNode(page_id="p1", url="http://localhost/home", title="Home")
    page2 = PageNode(page_id="p2", url="http://localhost/about", title="About")

    builder.add_page_node(page1)
    builder.add_page_node(page2)

    action = ActionTarget(action_type=ActionType.CLICK, css_selector="a#about")
    builder.add_transition_edge("p1", "p2", action, trigger_text="About Us")

    export = builder.export()
    assert export.total_nodes == 2
    assert export.total_edges == 1
    assert export.edges[0]["source"] == "p1"
    assert export.edges[0]["target"] == "p2"

    path = builder.get_shortest_path("p1", "p2")
    assert path == ["p1", "p2"]


def test_workflow_detector():
    detector = WorkflowDetector()
    action1 = ActionTarget(action_type=ActionType.CLICK, css_selector="button#start")
    action2 = ActionTarget(action_type=ActionType.TYPE, css_selector="input#name", value="Project X")

    detector.record_transition("http://localhost/dash", action1, "http://localhost/create")
    detector.record_transition("http://localhost/create", action2, "http://localhost/created")

    workflows = detector.get_detected_workflows()
    assert len(workflows) >= 1
    assert workflows[0].start_url == "http://localhost/dash"
    assert len(workflows[0].steps) >= 1
