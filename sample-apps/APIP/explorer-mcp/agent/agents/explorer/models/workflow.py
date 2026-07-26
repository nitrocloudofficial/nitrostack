"""Pydantic models for detected multi-step navigation workflows."""

from typing import List, Optional
from pydantic import BaseModel, Field
from agents.explorer.models.action import ActionTarget


class WorkflowStep(BaseModel):
    """Step inside an end-to-end user workflow sequence."""

    step_number: int = Field(description="Step index 1..N")
    page_url: str = Field(description="URL where step occurred")
    action: ActionTarget = Field(description="Action executed at this step")
    description: str = Field(default="", description="Human readable description of step")
    result_page_url: Optional[str] = Field(default=None, description="URL after step execution")


class WorkflowSequence(BaseModel):
    """Detected user workflow (e.g. login, create project, submit form)."""

    workflow_id: str = Field(description="Unique workflow identifier")
    name: str = Field(description="Workflow name/summary e.g. 'Dashboard -> Create Project -> Save'")
    start_url: str = Field(description="Workflow entry URL")
    end_url: str = Field(description="Workflow termination URL")
    steps: List[WorkflowStep] = Field(default_factory=list, description="Ordered list of steps")
    is_completed: bool = Field(default=True, description="Whether sequence reached terminal page")
