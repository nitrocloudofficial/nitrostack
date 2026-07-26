"""Integration tests for ReleaseIntelligenceAgent orchestrator."""

import unittest
import asyncio
from tempfile import TemporaryDirectory
from pathlib import Path

from agents.release_intelligence import ReleaseIntelligenceAgent
from agents.release_intelligence.models.knowledge_graph import KnowledgeGraphVersion, PageNode


class TestReleaseIntelligenceAgent(unittest.TestCase):
    """Integration test suite executing full agent pipeline."""

    def test_full_pipeline_execution(self):
        v1 = KnowledgeGraphVersion(
            version_id="1.0.0",
            pages=[PageNode(id="p1", title="Dashboard", url_path="/dashboard")]
        )
        v2 = KnowledgeGraphVersion(
            version_id="1.1.0",
            pages=[
                PageNode(id="p1", title="Dashboard", url_path="/dashboard"),
                PageNode(id="p2", title="Reports", url_path="/reports")
            ]
        )

        with TemporaryDirectory() as tmp_dir:
            agent = ReleaseIntelligenceAgent()
            result = asyncio.run(agent.run(v1, v2, output_dir=Path(tmp_dir)))

            self.assertEqual(result.old_version_id, "1.0.0")
            self.assertEqual(result.new_version_id, "1.1.0")
            self.assertTrue(result.validation_status.is_valid)
            self.assertGreaterEqual(len(result.changes), 1)
            self.assertIn("master_json", result.published_files)


if __name__ == "__main__":
    unittest.main()
