"""Unit tests for VersionLoader component."""

import unittest
from agents.release_intelligence.loaders import VersionLoader
from agents.release_intelligence.models.knowledge_graph import KnowledgeGraphVersion
from agents.release_intelligence.exceptions import VersionLoadError


class TestVersionLoader(unittest.TestCase):
    """Test suite verifying VersionLoader functionality."""

    def setUp(self):
        self.loader = VersionLoader()

    def test_load_valid_dict(self):
        data = {
            "version_id": "1.0.0",
            "product_name": "Test App",
            "pages": [{"id": "p1", "title": "Home", "url_path": "/"}],
            "workflows": [],
            "forms": [],
            "api_endpoints": [],
            "relationships": [],
            "permissions": []
        }
        graph = self.loader.load_graph(data)
        self.assertIsInstance(graph, KnowledgeGraphVersion)
        self.assertEqual(graph.version_id, "1.0.0")
        self.assertEqual(len(graph.pages), 1)

    def test_load_invalid_schema_raises_error(self):
        invalid_data = {"product_name": "Missing version_id"}
        with self.assertRaises(VersionLoadError):
            self.loader.load_graph(invalid_data)


if __name__ == "__main__":
    unittest.main()
