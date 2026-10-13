from fastapi import APIRouter, Depends, HTTPException
from app.schemas.workflow import RunWorkflowRequest, RunWorkflowResponse, WorkflowStatusResponse
from app.workflow.service import WorkflowService, get_workflow_service

router = APIRouter()

@router.post("/run", response_model=RunWorkflowResponse)
async def run_workflow(
    request: RunWorkflowRequest,
    service: WorkflowService = Depends(get_workflow_service)
) -> RunWorkflowResponse:
    """Starts an asynchronous research workflow."""
    run_id = service.start_workflow(request.query)
    return RunWorkflowResponse(run_id=run_id)

@router.get("/status/{run_id}", response_model=WorkflowStatusResponse)
async def get_workflow_status(
    run_id: str,
    service: WorkflowService = Depends(get_workflow_service)
) -> WorkflowStatusResponse:
    """Retrieves the real-time status and logs of a workflow run."""
    run = service.get_run(run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Workflow run not found")
        
    return WorkflowStatusResponse(run=run)
