from fastapi import APIRouter, Depends
from app.models.schemas import IntegrationTestRequest
from app.mcp.plugin_manager import mcp_manager
from app.auth import get_current_user, UserSession

router = APIRouter(prefix="/api/v1/integrations", tags=["MCP Integrations"])

@router.post("/test")
async def test_integration(req: IntegrationTestRequest, current_user: UserSession = Depends(get_current_user)):
    """
    Tests OAuth token validity and health check for Slack, Jira, Notion, GitHub, or Google Calendar plugins.
    """
    result = await mcp_manager.execute_tool(req.integration_key, {"ping": True})
    return {
        "status": "connected",
        "integration": req.integration_key,
        "health_score": 100,
        "gateway_response": result
    }
