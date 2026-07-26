"""Unit tests for GraphDiffEngine component."""

import unittest
from agents.release_intelligence.comparison import GraphDiffEngine
from agents.release_intelligence.models.knowledge_graph import KnowledgeGraphVersion, PageNode, WorkflowNode


class TestGraphDiffEngine(unittest.TestCase):
    """Test suite verifying deterministic GraphDiffEngine capabilities."""

    def setUp(self):
        self.engine = GraphDiffEngine()

    def test_compare_added_and_removed_pages(self):
        old_v = KnowledgeGraphVersion(
            version_id="1.0.0",
            pages=[PageNode(id="p1", title="Old Page", url_path="/old")]
        )
        new_v = KnowledgeGraphVersion(
            version_id="2.0.0",
            pages=[PageNode(id="p2", title="New Page", url_path="/new")]
        )

        diff = self.engine.compare(old_v, new_v)
        self.assertEqual(len(diff.added_pages), 1)
        self.assertEqual(len(diff.removed_pages), 1)
        self.assertIn("New Page", diff.added_pages[0])
        self.assertIn("Old Page", diff.removed_pages[0])

    def test_compare_workflow_changes(self):
        old_v = KnowledgeGraphVersion(
            version_id="1.0.0",
            workflows=[WorkflowNode(id="wf1", name="Checkout Flow", description="V1 Checkout")]
        )
        new_v = KnowledgeGraphVersion(
            version_id="2.0.0",
            workflows=[WorkflowNode(id="wf1", name="Checkout Flow", description="V2 Updated Checkout")]
        )

        diff = self.engine.compare(old_v, new_v)
        self.assertEqual(len(diff.modified_workflows), 1)
        self.assertEqual(diff.modified_workflows[0].entity_id, "wf1")


if __name__ == "__main__":
    unittest.main()
