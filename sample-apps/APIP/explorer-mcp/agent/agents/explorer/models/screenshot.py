"""Pydantic models for screenshot capture records."""

from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field


class ScreenshotType(str, Enum):
    FULL_PAGE = "full_page"
    ELEMENT = "element"
    BEFORE_ACTION = "before_action"
    AFTER_ACTION = "after_action"
    ERROR_STATE = "error_state"


class ScreenshotRecord(BaseModel):
    """Metadata record for a saved screenshot file."""

    screenshot_id: str = Field(description="Unique screenshot record identifier")
    file_path: str = Field(description="Relative or absolute path to screenshot file")
    screenshot_type: ScreenshotType = Field(description="Category of screenshot")
    url: str = Field(description="URL of page captured")
    selector: Optional[str] = Field(default=None, description="CSS selector if element screenshot")
    width: int = Field(default=1280, description="Image width in pixels")
    height: int = Field(default=800, description="Image height in pixels")
    timestamp: str = Field(description="ISO timestamp of capture")
