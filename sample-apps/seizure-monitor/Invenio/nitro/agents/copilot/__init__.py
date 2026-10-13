"""
Copilot Agent — Nitro MCP Module
"""
import json
from mcp.server.fastmcp import FastMCP
from .engine import CopilotEngine
from .models import CopilotRequest, CopilotContext

mcp = FastMCP("Invenio Copilot Agent")
engine = CopilotEngine()

@mcp.tool()
async def ask_copilot(query: str, context_json: str, packages_json: str) -> str:
    """Query the Copilot using the active UI context and backend artifacts."""
    ctx_dict = json.loads(context_json)
    pkgs_dict = json.loads(packages_json)
    
    context = CopilotContext(**ctx_dict)
    request = CopilotRequest(query=query, context=context, packages=pkgs_dict)
    
    response = engine.process(request)
    return response.model_dump_json()

if __name__ == "__main__":
    mcp.run()
