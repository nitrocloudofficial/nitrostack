"""
Amazon E-Commerce Automated Test Suite over MCP
Tests automated browser exploration, UI performance, product catalog search, and checkout flow simulation for Amazon via MCP Agent System.
"""

import sys
import os
import json
import asyncio
import unittest

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from mcp_orchestrator_client import McpOrchestratorClient

class TestAmazonMcpSuite(unittest.TestCase):

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

    def test_amazon_e2e_flow(self):
        """Executes full automated Amazon exploration, QA verification, and documentation via MCP."""
        amazon_workflows = [
            {
                "tool_name": "explorer_record_session",
                "arguments": {"target_url": "https://www.amazon.com", "headless": True},
                "user_id": "Amazon_Test_Bot"
            },
            {
                "tool_name": "qa_run_tests",
                "arguments": {"target_app": "Amazon E-Commerce Store", "test_types": "cart,checkout,search,navigation"},
                "user_id": "QA_Lead"
            },
            {
                "tool_name": "codex_query_knowledge_graph",
                "arguments": {"query": "Amazon search indexing & product recommendations graph"},
                "user_id": "Codex_Dev"
            },
            {
                "tool_name": "docs_publish_documentation",
                "arguments": {"title": "Amazon E2E Test Report", "category": "testing"},
                "user_id": "QA_Docs"
            }
        ]

        print("\n==================================================================")
        print("     EXECUTING AMAZON AUTOMATED TEST SUITE OVER MCP               ")
        print("==================================================================")

        results = asyncio.run(self.client.run_client_workflow(amazon_workflows))

        print("\n---------------- AMAZON TEST RESULTS ----------------")
        print(f"Test Status         : {results['test_summary']}")
        print(f"Target Store        : https://www.amazon.com")
        print(f"MCP Tool Invocations: {len(results['executed_tool_calls'])}")
        
        for item in results["executed_tool_calls"]:
            print(f" -> [{item['tool']}] Job: {item['job_id']} => Result: {item['response']['status']}")

        # Assertions
        self.assertEqual(results["test_summary"], "PASSED")
        self.assertEqual(len(results["executed_tool_calls"]), 4)

        print("==================================================================")
        print(" [SUCCESS] AMAZON E2E AUTOMATED TEST PASSED ALL CHECKS!            ")
        print("==================================================================\n")

if __name__ == "__main__":
    unittest.main()
