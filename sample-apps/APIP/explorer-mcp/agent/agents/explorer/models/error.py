"""Pydantic models for error detection during exploration."""

from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field


class ErrorType(str, Enum):
    HTTP_404 = "http_404"
    HTTP_500 = "http_500"
    CONSOLE_ERROR = "console_error"
    BROKEN_BUTTON = "broken_button"
    VALIDATION_FAILURE = "validation_failure"
    MISSING_RESOURCE = "missing_resource"
    UNEXPECTED_DIALOG = "unexpected_dialog"
    ACTION_TIMEOUT = "action_timeout"


class ErrorRecord(BaseModel):
    """Captured error event observation."""

    error_id: str = Field(description="Unique error record identifier")
    error_type: ErrorType = Field(description="Categorized error type")
    message: str = Field(description="Error message or exception text")
    url: str = Field(description="URL where error occurred")
    selector: Optional[str] = Field(default=None, description="CSS selector involved if action-driven")
    screenshot_path: Optional[str] = Field(default=None, description="Path to error evidence screenshot")
    stack_trace: Optional[str] = Field(default=None, description="Console or JS stack trace if available")
    timestamp: str = Field(description="ISO timestamp of occurrence")
