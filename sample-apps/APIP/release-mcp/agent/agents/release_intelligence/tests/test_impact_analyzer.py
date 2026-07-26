"""Unit tests for ImpactAnalyzer component."""

import unittest
import asyncio
from agents.release_intelligence.intelligence import ImpactAnalyzer
from agents.release_intelligence.models.change import Change, AffectedComponent
from agents.release_intelligence.utils.constants import ChangeCategory, RiskLevel


class TestImpactAnalyzer(unittest.TestCase):
    """Test suite verifying ImpactAnalyzer reasoning and risk evaluation."""

    def setUp(self):
        self.analyzer = ImpactAnalyzer(llm_provider="mock")

    def test_impact_analysis_heuristic(self):
        changes = [
            Change(
                id="CHG-001",
                category=ChangeCategory.ADDED,
                title="Page Added: Analytics Dashboard",
                description="Added new Analytics page.",
                affected_component=AffectedComponent(id="p_analytics", name="Analytics Dashboard", type="Page")
            )
        ]
        impact = asyncio.run(self.analyzer.analyze_impact(changes))
        self.assertIsNotNone(impact.user_impact)
        self.assertEqual(len(impact.doc_recommendations), 1)
        self.assertEqual(len(impact.qa_recommendations), 1)

    def test_risk_assessment_breaking_change(self):
        changes = [
            Change(
                id="CHG-001",
                category=ChangeCategory.REMOVED,
                title="API Removed: Legacy Login",
                description="Removed endpoint /api/v1/legacy_login",
                affected_component=AffectedComponent(id="api_leg", name="/api/v1/legacy_login", type="APIEndpoint")
            )
        ]
        impact = asyncio.run(self.analyzer.analyze_impact(changes))
        risk = self.analyzer.assess_risk(changes, impact)

        self.assertEqual(len(risk.breaking_changes), 1)
        self.assertGreaterEqual(risk.risk_score, 3.0)


if __name__ == "__main__":
    unittest.main()
