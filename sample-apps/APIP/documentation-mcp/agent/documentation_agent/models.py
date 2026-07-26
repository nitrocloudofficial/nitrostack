"""Pydantic models for Product Knowledge Graph and documentation output."""

from pydantic import BaseModel, Field


class Page(BaseModel):
    id: str
    title: str
    url: str | None = None
    description: str | None = None
    order: int = 0


class Feature(BaseModel):
    id: str
    name: str
    description: str | None = None
    page_id: str | None = None


class WorkflowStep(BaseModel):
    id: str
    title: str
    instruction: str
    page_id: str | None = None
    order: int = 0
    screenshot_id: str | None = None


class Workflow(BaseModel):
    id: str
    name: str
    description: str | None = None
    steps: list[WorkflowStep] = Field(default_factory=list)
    order: int = 0
    changed: bool = True


class Relationship(BaseModel):
    source_id: str
    target_id: str
    type: str


class Screenshot(BaseModel):
    id: str
    path: str
    workflow_id: str | None = None
    step_id: str | None = None
    caption: str | None = None


class ProductKnowledgeGraph(BaseModel):
    pages: list[Page] = Field(default_factory=list)
    features: list[Feature] = Field(default_factory=list)
    workflows: list[Workflow] = Field(default_factory=list)
    relationships: list[Relationship] = Field(default_factory=list)
    screenshots: list[Screenshot] = Field(default_factory=list)
    version: str = "unreleased"


class PlanSection(BaseModel):
    title: str
    workflow_ids: list[str] = Field(default_factory=list)


class DocumentPlan(BaseModel):
    user_guide_sections: list[PlanSection]
    faq_topics: list[str]
    release_note_workflow_ids: list[str]


class ScreenshotMapping(BaseModel):
    step_id: str
    image_path: str | None = None
    caption: str | None = None


class GeneratedDocuments(BaseModel):
    user_guide: str = ""
    faq: str = ""
    release_notes: str = ""


class ValidationReport(BaseModel):
    valid: bool
    missing_headings: list[str] = Field(default_factory=list)
    duplicate_headings: list[str] = Field(default_factory=list)
    broken_screenshots: list[str] = Field(default_factory=list)
    empty_sections: list[str] = Field(default_factory=list)
    grammar_score: float | None = None

class PublishResult(BaseModel):
    files: dict[str, str]