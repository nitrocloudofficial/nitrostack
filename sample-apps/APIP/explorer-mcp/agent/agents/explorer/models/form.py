"""Pydantic models for forms and input fields."""

from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field


class FieldType(str, Enum):
    TEXT = "text"
    PASSWORD = "password"
    EMAIL = "email"
    NUMBER = "number"
    CHECKBOX = "checkbox"
    RADIO = "radio"
    SELECT = "select"
    TEXTAREA = "textarea"
    FILE = "file"
    DATE = "date"
    SUBMIT = "submit"
    OTHER = "other"


class FormField(BaseModel):
    """Input field specification inside a form."""

    field_id: str = Field(description="Unique field identifier")
    name: Optional[str] = Field(default=None, description="HTML name attribute")
    label: Optional[str] = Field(default=None, description="Associated label text")
    field_type: FieldType = Field(default=FieldType.TEXT, description="Input field type")
    css_selector: str = Field(description="CSS selector to interact with field")
    is_required: bool = Field(default=False, description="Whether field is required")
    options: List[str] = Field(default_factory=list, description="Options if select/dropdown or radio group")
    current_value: Optional[str] = Field(default=None, description="Current field value")
    placeholder: Optional[str] = Field(default=None, description="Placeholder text")
    validation_message: Optional[str] = Field(default=None, description="Validation message if triggered")


class FormModel(BaseModel):
    """Structured form representation on a page."""

    form_id: str = Field(description="Unique form identifier")
    name_or_id: Optional[str] = Field(default=None, description="HTML id or name attribute")
    css_selector: str = Field(description="Form container CSS selector")
    action_url: Optional[str] = Field(default=None, description="Form action endpoint URL")
    method: str = Field(default="POST", description="HTTP method e.g. GET, POST")
    fields: List[FormField] = Field(default_factory=list, description="Form fields")
    submit_button_selector: Optional[str] = Field(default=None, description="Submit button CSS selector")
    page_url: str = Field(description="URL page where form resides")
