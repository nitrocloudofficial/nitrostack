"""Unit tests for Pydantic data models."""

import pytest
from agents.explorer.models.element import UIElement, ElementType, BoundingBox
from agents.explorer.models.action import ActionTarget, ActionType, ActionResult
from agents.explorer.models.page import PageNode
from agents.explorer.models.form import FormModel, FormField, FieldType
from agents.explorer.models.navigation import NavigationGraphExport
from agents.explorer.models.exploration_result import ExplorationResult, ExplorationSummary


def test_ui_element_instantiation():
    elem = UIElement(
        element_id="elem_001",
        tag_name="button",
        element_type=ElementType.BUTTON,
        text="Submit",
        css_selector="button#submit",
        bounding_box=BoundingBox(x=10, y=20, width=100, height=30)
    )
    assert elem.element_id == "elem_001"
    assert elem.element_type == ElementType.BUTTON
    assert elem.bounding_box.width == 100


def test_action_target_and_result():
    action = ActionTarget(
        action_type=ActionType.CLICK,
        css_selector="button#submit",
        element_id="elem_001"
    )
    result = ActionResult(
        action=action,
        success=True,
        execution_time_ms=120.5,
        start_url="http://localhost/page1",
        end_url="http://localhost/page2",
        state_changed=True
    )
    assert result.success is True
    assert result.state_changed is True
    assert result.action.action_type == ActionType.CLICK


def test_form_model():
    field = FormField(
        field_id="f1",
        name="email",
        label="Email Address",
        field_type=FieldType.EMAIL,
        css_selector="input[type='email']",
        is_required=True
    )
    form = FormModel(
        form_id="form_01",
        css_selector="form#login",
        fields=[field],
        page_url="http://localhost/login"
    )
    assert form.form_id == "form_01"
    assert len(form.fields) == 1
    assert form.fields[0].is_required is True


def test_exploration_result_serialization():
    summary = ExplorationSummary(target_url="http://localhost", duration_seconds=5.0)
    graph = NavigationGraphExport()
    res = ExplorationResult(
        exploration_id="exp_test",
        timestamp="2026-07-25T16:00:00Z",
        summary=summary,
        navigation_graph=graph
    )
    json_data = res.model_dump_json()
    assert "exp_test" in json_data
    assert "target_url" in json_data
