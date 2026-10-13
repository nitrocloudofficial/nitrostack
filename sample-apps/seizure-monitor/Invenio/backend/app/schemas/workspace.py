from pydantic import BaseModel
from typing import List, Dict, Any
from app.workspace.models import WorkspaceSession, ExportFormat

class GenerateWorkspaceRequest(BaseModel):
    run_id: str

class GenerateWorkspaceResponse(BaseModel):
    workspace_id: str

class WorkspaceResponse(BaseModel):
    workspace: WorkspaceSession

class ExportWorkspaceRequest(BaseModel):
    workspace_id: str
    format: ExportFormat

class ExportWorkspaceResponse(BaseModel):
    content: str
