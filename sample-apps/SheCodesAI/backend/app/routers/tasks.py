from fastapi import APIRouter, Depends, HTTPException
from app.models.schemas import TaskApprovalRequest
from app.mcp.plugin_manager import mcp_manager
from app.auth import get_current_user, UserSession

router = APIRouter(prefix="/api/v1/tasks", tags=["Human Approval & Tasks"])

@router.post("/approve")
async def approve_or_reject_task(req: TaskApprovalRequest, current_user: UserSession = Depends(get_current_user)):
    """
    Human Approval Gate: Approve, Reject, or Edit proposed task before MCP Execution.
    """
    if req.action == "reject":
        return {
            "status": "rejected",
            "task_id": req.task_id,
            "message": "Task rejected by human reviewer. No MCP action performed."
        }

    # If approved, route to MCP Plugin Manager
    mcp_result = await mcp_manager.execute_tool(
        tool_name="Jira",
        payload={"task_id": req.task_id, "action": req.action, "user": current_user.email}
    )

    return {
        "status": "approved",
        "task_id": req.task_id,
        "mcp_execution": mcp_result
    }
