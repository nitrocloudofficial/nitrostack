"""
Demo Agent Automated Test Suite over MCP
Tests Demo Agent video generation, 3D animation rendering, and Orchestrator integration over MCP.
"""

import sys
import os
import json
import asyncio
import unittest

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from mcp_orchestrator_client import McpOrchestratorClient

class TestDemoAgentSuite(unittest.TestCase):

    def setUp(self):
        self.server_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "mcp_agent_server.py"))
        self.client = McpOrchestratorClient(self.server_path)

    def tearDown(self):
        self.client.stop()
        db_path = "mcp_orchestrator_jobs.db"
        if os.path.exists(db_path):
            try:
                os.remove(db_path)
            except Exception:
                pass

    def test_demo_agent_mcp_workflow(self):
        """Executes Demo Agent tools via MCP Orchestrator Client."""
        demo_workflows = [
            {
                "tool_name": "demo_create_video_workflow",
                "arguments": {"workflow_title": "Amazon E-Commerce Showcase", "app_name": "Amazon", "render_3d": True},
                "user_id": "Demo_Director"
            },
            {
                "tool_name": "demo_render_animation",
                "arguments": {"html_template": "amazon.html", "frame_rate": 60},
                "user_id": "Animator_User"
            }
        ]

        print("\n==================================================================")
        print("         EXECUTING DEMO AGENT TEST SUITE OVER MCP                 ")
        print("==================================================================")

        results = asyncio.run(self.client.run_client_workflow(demo_workflows))

        print("\n---------------- DEMO AGENT TEST RESULTS ----------------")
        print(f"Test Status         : {results['test_summary']}")
        print(f"Discovered MCP Tools: {len(results['discovered_tools'])} tools")
        
        for item in results["executed_tool_calls"]:
            print(f" -> [{item['tool']}] Result: {item['response']}")

        # Assertions
        self.assertEqual(results["test_summary"], "PASSED")
        self.assertIn("demo_create_video_workflow", results["discovered_tools"])
        self.assertIn("demo_render_animation", results["discovered_tools"])
        self.assertEqual(len(results["executed_tool_calls"]), 2)

        print("==================================================================")
        print(" [SUCCESS] DEMO AGENT VERIFIED & ALL ASSERTIONS PASSED!           ")
        print("==================================================================\n")

if __name__ == "__main__":
    unittest.main()
