"""Pydantic models for UI elements extracted from the DOM."""

from enum import Enum
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field


class ElementType(str, Enum):
    BUTTON = "button"
    LINK = "link"
    INPUT = "input"
    SELECT = "select"
    TEXTAREA = "textarea"
    CHECKBOX = "checkbox"
    RADIO = "radio"
    TAB = "tab"
    MENU_ITEM = "menu_item"
    MODAL_DIALOG = "modal_dialog"
    FORM = "form"
    TABLE = "table"
    CARD = "card"
    DROPDOWN = "dropdown"
    FILE_UPLOAD = "file_upload"
    CUSTOM = "custom"


class BoundingBox(BaseModel):
    """Bounding box coordinates of element in viewport."""
    x: float = Field(description="X coordinate of top-left corner")
    y: float = Field(description="Y coordinate of top-left corner")
    width: float = Field(description="Element width")
    height: float = Field(description="Element height")


class UIElement(BaseModel):
    """Structured model representing an interactive or structural UI element."""

    element_id: str = Field(description="Unique deterministic identifier for element")
    tag_name: str = Field(description="HTML tag name e.g. button, a, input")
    element_type: ElementType = Field(default=ElementType.CUSTOM, description="Categorized element type")
    text: str = Field(default="", description="Visible text or innerText of element")
    css_selector: str = Field(description="Primary unique or stable CSS selector")
    xpath: Optional[str] = Field(default=None, description="XPath selector if available")
    attributes: Dict[str, str] = Field(default_factory=dict, description="Extracted HTML attributes e.g. name, type, href, aria-*")
    is_visible: bool = Field(default=True, description="Whether element is visible in DOM viewport")
    is_enabled: bool = Field(default=True, description="Whether element is enabled for interaction")
    bounding_box: Optional[BoundingBox] = Field(default=None, description="Viewport coordinates")
    parent_selector: Optional[str] = Field(default=None, description="Parent container selector")
    aria_label: Optional[str] = Field(default=None, description="Accessibility label")
    placeholder: Optional[str] = Field(default=None, description="Placeholder text for inputs")
    is_visited: bool = Field(default=False, description="Tracking flag for exploration planner")
