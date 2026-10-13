"""End-to-end pipeline tests for the five golden-path queries."""

import os
import sys
import unittest

os.environ["FORGEOPS_LIVE_AGENTS"] = "false"
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.agents.planner.planner import PlannerAgent, classify_intent
from backend.pipeline import classify_pipeline_mode, run_pipeline
from backend.schemas.planner_models import PlannerInput


class TestPlannerIntentClassification(unittest.TestCase):
    def test_supplier_freeze_is_extracted_as_constraint(self):
        plan = PlannerAgent().plan(
            PlannerInput(
                user_query=(
                    "Given the supplier freeze, what should the shift manager "
                    "do first?"
                ),
                incident_id="INC-2026-0725-014",
            )
        )
        self.assertTrue(plan.constraints["no_supplier_change"])

    def test_show_evidence_intent(self):
        self.assertEqual(classify_intent("Show me the evidence"), "show_evidence")

    def test_safe_tool_selection_is_not_fully_degraded(self):
        trace = [
            {"status": "complete"},
            {"status": "complete_with_safe_tool_selection"},
            {"status": "complete"},
            {"status": "complete"},
        ]
        self.assertEqual(
            classify_pipeline_mode(trace),
            "live_nitrocloud_with_safe_tool_selection",
        )

    def test_explain_exclusion_intent(self):
        self.assertEqual(
            classify_intent("Why was Machine 7 ruled out?"),
            "explain_exclusion",
        )

    def test_compare_intent(self):
        self.assertEqual(
            classify_intent("Compare Option A vs Option B"),
            "compare_options",
        )

    def test_constraint_intent(self):
        self.assertEqual(
            classify_intent(
                "We cannot change suppliers for a month. What should we do?"
            ),
            "constraint_query",
        )

    def test_report_intent(self):
        self.assertEqual(
            classify_intent("Generate a report for the plant manager"),
            "generate_report",
        )


class TestFullPipeline(unittest.TestCase):
    def test_show_evidence_pipeline(self):
        output = run_pipeline("Show me the evidence.")
        self.assertIsNotNone(output.conclusion)
        self.assertGreater(len(output.ui_actions), 0)
        self.assertGreater(output.confidence, 0)

    def test_explain_exclusion_pipeline(self):
        output = run_pipeline("Why was Machine 7 ruled out?")
        self.assertIn("Machine 7", output.conclusion)
        self.assertTrue(
            any(action.target_id == "machine_7" for action in output.ui_actions)
        )

    def test_compare_pipeline(self):
        output = run_pipeline("Compare Option A vs Option B.")
        self.assertGreater(len(output.ui_actions), 0)

    def test_constraint_pipeline(self):
        output = run_pipeline(
            "We cannot change suppliers. What should we do?",
            constraints={"no_supplier_change": True},
        )
        self.assertIsNotNone(output.conclusion)

    def test_report_pipeline(self):
        output = run_pipeline("Generate a report for the plant manager.")
        self.assertGreater(len(output.generated_reports), 0)
        self.assertIn("ForgeOps", output.generated_reports[0].markdown)


if __name__ == "__main__":
    unittest.main()
