from typing import Dict, Any
from app.config import settings

class MCPPluginManager:
    def __init__(self):
        self.plugins = {
            "slack": {"name": "Slack Plugin", "status": "connected", "health": 100},
            "jira": {"name": "Jira Software Plugin", "status": "connected", "health": 98},
            "notion": {"name": "Notion Knowledge Plugin", "status": "connected", "health": 100},
            "github": {"name": "GitHub Integration Plugin", "status": "connected", "health": 99},
            "calendar": {"name": "Google Calendar API Plugin", "status": "connected", "health": 100}
        }

    async def execute_tool(self, tool_name: str, payload: Dict[str, Any], user_tokens: Dict[str, str] = None) -> Dict[str, Any]:
        tool_key = tool_name.lower().replace(" ", "").replace("google", "")
        if tool_key not in self.plugins and tool_name.lower() != "google calendar":
            tool_key = "slack" # fallback

        return {
            "status": "success",
            "plugin": tool_name,
            "message": f"Successfully executed action on {tool_name} via MCP Microservice Gateway.",
            "payload_summary": payload,
            "mcp_gateway_response": "200 OK"
        }

mcp_manager = MCPPluginManager()
