"""
Planner Agent — Nitro MCP Module
"""
import json
import asyncio
from mcp.server.fastmcp import FastMCP
from .engine import PlannerEngine

mcp = FastMCP("Invenio Planner Agent")
engine = PlannerEngine()

@mcp.tool()
async def execute_autonomous_research(query: str) -> str:
    """Execute the full multi-agent pipeline. Returns the final report string and prints state updates."""
    
    # We will iterate through the generator to get the states,
    # and eventually return the final status.
    # In a real UI, this would stream. For MCP, we'll collect the states.
    states = []
    
    async for state_json in engine.execute_pipeline(query):
        states.append(json.loads(state_json))
        
    final_state = states[-1]
    
    # Extract the final report if successful
    report_task = final_state.get("ReportAgent", {})
    if report_task.get("state") == "COMPLETED":
        return json.dumps({"status": "SUCCESS", "final_state": final_state})
    else:
        return json.dumps({"status": "FAILED", "final_state": final_state})

if __name__ == "__main__":
    mcp.run()
