"""Unit tests for ChangeAnalyzer component."""

import unittest
from agents.release_intelligence.comparison import ChangeAnalyzer
from agents.release_intelligence.models.graph_diff import GraphDiff, EntityDelta
from agents.release_intelligence.utils.constants import ChangeCategory


class TestChangeAnalyzer(unittest.TestCase):
    """Test suite verifying ChangeAnalyzer categorization logic."""

    def setUp(self):
        self.analyzer = ChangeAnalyzer()

    def test_analyze_changes(self):
        diff = GraphDiff(
            old_version_id="1.0.0",
            new_version_id="2.0.0",
            added_pages=["Settings Page (/settings)"],
            added_workflows=["Setup Wizard"]
        )

        changes = self.analyzer.analyze_changes(diff)
        self.assertEqual(len(changes), 2)
        self.assertEqual(changes[0].category, ChangeCategory.ADDED)
        self.assertEqual(changes[1].category, ChangeCategory.ADDED)


if __name__ == "__main__":
    unittest.main()
