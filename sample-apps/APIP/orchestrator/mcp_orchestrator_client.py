"""
MCP Orchestrator Client
Client for Orchestrator Agent connecting to the MCP Server to discover and invoke tools across all agent branches.
"""

import sys
import os
import json
import asyncio
from typing import Dict, Any, List

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from agents.orchestrator.agent import OrchestratorAgent

class McpOrchestratorClient:
    def __init__(self, server_script_path: str):
        self.server_script_path = server_script_path
        self.orchestrator = OrchestratorAgent(db_path="mcp_orchestrator_jobs.db", custom_limits={"demo": 2})

    async def run_client_workflow(self, test_workflows: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Connects to MCP Server via stdio, discovers tools, and executes workflows."""
        server_params = StdioServerParameters(
            command=sys.executable,
            args=[self.server_script_path],
            env=os.environ.copy()
        )

        results = {
            "discovered_tools": [],
            "executed_tool_calls": [],
            "orchestrator_workflows": [],
            "test_summary": "FAILED"
        }

        async with stdio_client(server_params) as (read, write):
            async with ClientSession(read, write) as session:
                # 1. Initialize MCP Client-Server handshake
                await session.initialize()
                print("[MCP CLIENT] Connected & initialized MCP Session successfully.")

                # 2. Discover available tools on MCP Server
                tools_response = await session.list_tools()
                discovered_tools = [tool.name for tool in tools_response.tools]
                results["discovered_tools"] = discovered_tools
                print(f"[MCP CLIENT] Discovered {len(discovered_tools)} MCP Tools: {discovered_tools}")

                # 3. Process test workflows through Orchestrator & invoke MCP Agent Tools
                for wf in test_workflows:
                    tool_name = wf["tool_name"]
                    arguments = wf.get("arguments", {})
                    
                    # Submit workflow to local Orchestrator queue
                    job_id = self.orchestrator.submit_workflow(
                        {"goal": f"Execute MCP Tool: {tool_name}"},
                        user_id=wf.get("user_id", "mcp_client_user"),
                        priority=wf.get("priority", 1)
                    )
                    results["orchestrator_workflows"].append({"job_id": job_id, "tool": tool_name})

                    print(f"[MCP CLIENT] Calling tool '{tool_name}' via MCP...")
                    call_res = await session.call_tool(tool_name, arguments=arguments)
                    
                    # Extract content output
                    content_str = "".join([c.text for c in call_res.content if hasattr(c, 'text')])
                    parsed_res = json.loads(content_str) if content_str.startswith("{") else content_str

                    results["executed_tool_calls"].append({
                        "job_id": job_id,
                        "tool": tool_name,
                        "response": parsed_res
                    })
                    print(f" -> Response from {tool_name}: {parsed_res}")

                results["test_summary"] = "PASSED"
                return results

    def stop(self):
        self.orchestrator.stop()
