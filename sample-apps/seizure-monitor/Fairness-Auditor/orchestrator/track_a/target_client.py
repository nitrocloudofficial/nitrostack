"""Real MCP client for A's evaluate_loan_application tool.

This module is a STUB until Hour 3 — agent1_auditor.py currently imports
mock_target.mock_evaluate_loan_application as call_target.

At Hour 3:
  1. Pull feat/target-agent.
  2. Confirm A's MCP launch command (TARGET_MCP_COMMAND / TARGET_MCP_ARGS in .env).
  3. Verify the real tool's response shape; update the structuredContent parsing
     below if needed.
  4. In agent1_auditor.py swap:
       from .mock_target import mock_evaluate_loan_application as call_target
     to:
       from .target_client import call_target

The official ``mcp`` package (pinned <2) is used — no NitroStack required.
"""
import os

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

TARGET_MCP_COMMAND: str = os.getenv("TARGET_MCP_COMMAND", "node")
TARGET_MCP_ARGS: list[str] = os.getenv(
    "TARGET_MCP_ARGS", "../target-service/dist/main.js"
).split()


async def call_target(application: dict) -> dict:
    """Issue a single evaluate_loan_application call to A's MCP tool.

    Args:
        application: Full applicant dict passed as tool arguments.

    Returns:
        Dict matching A's tool response shape:
        { "approved": bool, "score": float, "expression": str }

    Notes:
        - Opens a fresh stdio session per call.  In production you'd want a
          long-lived session, but for the sweep's budget sizes this is fine.
        - Fix the structuredContent parsing once A's real tool is confirmed
          at Hour 3.
    """
    server_params = StdioServerParameters(
        command=TARGET_MCP_COMMAND, args=TARGET_MCP_ARGS
    )
    async with stdio_client(server_params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            result = await session.call_tool(
                "evaluate_loan_application", arguments=application
            )
            if getattr(result, "structuredContent", None):
                return result.structuredContent
            # Fallback placeholder — fix parsing once A's tool is real (Hour 3)
            return application
