from fastapi import APIRouter, Depends, HTTPException
from app.schemas.workspace import (
    GenerateWorkspaceRequest, 
    GenerateWorkspaceResponse, 
    WorkspaceResponse, 
    ExportWorkspaceRequest, 
    ExportWorkspaceResponse
)
from app.workspace.service import WorkspaceService, get_workspace_service
from app.workspace.export import ExportService

router = APIRouter()

@router.post("/generate", response_model=GenerateWorkspaceResponse)
async def generate_workspace(
    request: GenerateWorkspaceRequest,
    service: WorkspaceService = Depends(get_workspace_service)
) -> GenerateWorkspaceResponse:
    """Generates a rich research workspace from a completed workflow run."""
    try:
        workspace_id = service.generate_from_run(request.run_id)
        return GenerateWorkspaceResponse(workspace_id=workspace_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/{workspace_id}", response_model=WorkspaceResponse)
async def get_workspace(
    workspace_id: str,
    service: WorkspaceService = Depends(get_workspace_service)
) -> WorkspaceResponse:
    """Retrieves a generated workspace."""
    workspace = service.get_workspace(workspace_id)
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return WorkspaceResponse(workspace=workspace)

@router.post("/export", response_model=ExportWorkspaceResponse)
async def export_workspace(
    request: ExportWorkspaceRequest,
    service: WorkspaceService = Depends(get_workspace_service)
) -> ExportWorkspaceResponse:
    """Exports a workspace to the requested format."""
    workspace = service.get_workspace(request.workspace_id)
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
        
    try:
        content = ExportService.export(workspace, request.format)
        return ExportWorkspaceResponse(content=content)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
