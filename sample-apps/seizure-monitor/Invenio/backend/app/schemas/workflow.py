from pydantic import BaseModel
from typing import List, Dict, Any
from app.workflow.models import WorkflowRun, WorkflowNodeState

class RunWorkflowRequest(BaseModel):
    query: str

class RunWorkflowResponse(BaseModel):
    run_id: str

class WorkflowStatusResponse(BaseModel):
    run: WorkflowRun
