"""Pydantic models for browser actions and action execution results."""

from enum import Enum
from typing import Optional, Any, Dict
from pydantic import BaseModel, Field


class ActionType(str, Enum):
    CLICK = "click"
    DOUBLE_CLICK = "double_click"
    HOVER = "hover"
    SCROLL = "scroll"
    TYPE = "type"
    SELECT_OPTION = "select_option"
    CHECK = "check"
    UNCHECK = "uncheck"
    UPLOAD_FILE = "upload_file"
    DOWNLOAD = "download"
    NAVIGATE = "navigate"
    WAIT = "wait"


class ActionTarget(BaseModel):
    """Specification of target UI element and parameters for an action."""

    action_type: ActionType = Field(description="Action to execute")
    css_selector: str = Field(description="Target element CSS selector")
    xpath: Optional[str] = Field(default=None, description="XPath selector fallback")
    value: Optional[str] = Field(default=None, description="Text value to type, option to select, or filepath to upload")
    element_id: Optional[str] = Field(default=None, description="UIElement ID if bound")


class ActionResult(BaseModel):
    """Result of executing an action on the page."""

    action: ActionTarget = Field(description="Target action attempted")
    success: bool = Field(description="Whether interaction succeeded")
    error_message: Optional[str] = Field(default=None, description="Error detail if failed")
    execution_time_ms: float = Field(description="Execution latency in milliseconds")
    start_url: str = Field(description="URL before action")
    end_url: str = Field(description="URL after action")
    screenshot_before: Optional[str] = Field(default=None, description="Filename of pre-action screenshot")
    screenshot_after: Optional[str] = Field(default=None, description="Filename of post-action screenshot")
    state_changed: bool = Field(default=False, description="Whether URL or DOM changed significantly")
