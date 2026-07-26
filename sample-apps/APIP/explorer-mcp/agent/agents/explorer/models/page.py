"""Pydantic models for web pages and page metadata."""

from typing import List, Optional, Dict
from pydantic import BaseModel, Field
from agents.explorer.models.element import UIElement


class PageMetadata(BaseModel):
    """Page-level metadata observations."""
    meta_description: Optional[str] = Field(default=None)
    og_title: Optional[str] = Field(default=None)
    charset: Optional[str] = Field(default=None)
    content_length: Optional[int] = Field(default=None)
    headings: List[str] = Field(default_factory=list, description="Extracted h1, h2, h3 texts")


class PageNode(BaseModel):
    """Page node representing a single URL/state in the navigation graph."""

    page_id: str = Field(description="Unique deterministic ID based on normalized URL/hash")
    url: str = Field(description="Normalized page URL")
    title: str = Field(default="", description="HTML page title")
    depth: int = Field(default=0, description="Exploration depth from entrypoint")
    visit_count: int = Field(default=1, description="Number of times visited")
    elements: List[UIElement] = Field(default_factory=list, description="UI elements discovered on page")
    forms_count: int = Field(default=0, description="Count of forms on page")
    tables_count: int = Field(default=0, description="Count of tables on page")
    screenshot_path: Optional[str] = Field(default=None, description="Path to full-page screenshot")
    metadata: PageMetadata = Field(default_factory=PageMetadata)
    is_authenticated: bool = Field(default=False, description="Whether page is within authenticated session")
