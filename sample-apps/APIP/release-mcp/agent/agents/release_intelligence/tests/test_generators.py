"""Unit tests for ReleaseNotesGenerator and ChangelogGenerator components."""

import unittest
from agents.release_intelligence.intelligence import ReleaseNotesGenerator, ChangelogGenerator, ImpactAnalyzer
from agents.release_intelligence.models.change import Change, AffectedComponent
from agents.release_intelligence.utils.constants import ChangeCategory, TargetAudience, ChangelogFormat


class TestGenerators(unittest.TestCase):
    """Test suite verifying Release Notes and Changelog generation."""

    def setUp(self):
        self.rel_gen = ReleaseNotesGenerator()
        self.cl_gen = ChangelogGenerator()
        self.impact_analyzer = ImpactAnalyzer(llm_provider="mock")
        self.changes = [
            Change(
                id="CHG-001",
                category=ChangeCategory.ADDED,
                title="Page Added: Billing Settings",
                description="New billing page.",
                affected_component=AffectedComponent(id="p_bill", name="Billing Settings", type="Page")
            )
        ]

    def test_release_notes_generation(self):
        impact = self.impact_analyzer._analyze_impact_heuristic(self.changes)
        multi_notes = self.rel_gen.generate(self.changes, impact, version="2.0.0")

        self.assertIsNotNone(multi_notes.customer_notes)
        self.assertIsNotNone(multi_notes.internal_engineering_notes)
        self.assertEqual(multi_notes.customer_notes.audience, TargetAudience.CUSTOMER)

    def test_changelog_generation(self):
        changelog = self.cl_gen.generate(self.changes, version="2.0.0")
        self.assertEqual(changelog.version, "2.0.0")
        md = changelog.get_format(ChangelogFormat.MARKDOWN)
        self.assertIn("Billing Settings", md)


if __name__ == "__main__":
    unittest.main()
