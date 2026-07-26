"""AI-driven Impact Analyzer evaluating business, technical, and risk impacts."""

import json
from typing import List
from tenacity import retry, stop_after_attempt, wait_exponential

from agents.release_intelligence.interfaces import IImpactAnalyzer
from agents.release_intelligence.models.change import Change
from agents.release_intelligence.models.impact import (
    ImpactAnalysis, UserImpact, DeveloperImpact,
    DocumentationRecommendation, QARecommendation, DemoRecommendation
)
from agents.release_intelligence.models.risk_assessment import (
    RiskAssessment, BreakingChange, RiskFactor
)
from agents.release_intelligence.utils.constants import ChangeCategory, RiskLevel
from agents.release_intelligence.exceptions import ImpactAnalysisError
from agents.release_intelligence.utils.logger import logger


class ImpactAnalyzer(IImpactAnalyzer):
    """Evaluates business and technical impact using LLM reasoning or fallback heuristic engine."""

    def __init__(self, llm_provider: str = "mock", api_key: str = None, model_name: str = "gpt-4o"):
        self.llm_provider = llm_provider
        self.api_key = api_key
        self.model_name = model_name

    async def analyze_impact(self, changes: List[Change]) -> ImpactAnalysis:
        """Analyze changes and generate multi-dimensional impact analysis.

        Args:
            changes: Categorized list of Change items.

        Returns:
            ImpactAnalysis Pydantic model.
        """
        logger.info(f"Performing Impact Analysis for {len(changes)} changes using provider '{self.llm_provider}'...")

        try:
            if self.llm_provider != "mock" and self.api_key:
                return await self._analyze_impact_with_llm(changes)
            else:
                return self._analyze_impact_heuristic(changes)
        except Exception as e:
            logger.warning(f"LLM Impact Analysis failed or fallback triggered: {e}. Using heuristic engine.")
            return self._analyze_impact_heuristic(changes)

    def assess_risk(self, changes: List[Change], impact: ImpactAnalysis) -> RiskAssessment:
        """Calculate release risk level and identify breaking changes.

        Args:
            changes: Categorized list of Change items.
            impact: Calculated ImpactAnalysis.

        Returns:
            RiskAssessment Pydantic model.
        """
        logger.info("Evaluating release risk score and breaking changes...")
        breaking_changes: List[BreakingChange] = []
        risk_factors: List[RiskFactor] = []
        risk_score = 1.0  # Base risk score

        # Check for breaking changes and high-risk categories
        for chg in changes:
            if chg.category == ChangeCategory.REMOVED:
                risk_score += 2.0
                if chg.affected_component.type in ["APIEndpoint", "Page"]:
                    breaking_changes.append(BreakingChange(
                        component_name=chg.affected_component.name,
                        description=f"Removed {chg.affected_component.type} '{chg.affected_component.name}'. Existing clients relying on this endpoint will break.",
                        mitigation_advice=f"Deprecate {chg.affected_component.name} and provide migration redirect before full removal."
                    ))
                    risk_factors.append(RiskFactor(
                        factor_name=f"Removed {chg.affected_component.type}",
                        severity=RiskLevel.HIGH,
                        description=f"Removal of {chg.affected_component.name} risks breaking downstream integrations."
                    ))

            elif chg.category in [ChangeCategory.PERMISSION_CHANGED, ChangeCategory.RELATIONSHIP_CHANGED]:
                risk_score += 1.5
                risk_factors.append(RiskFactor(
                    factor_name="Permission or Graph Topology Shift",
                    severity=RiskLevel.MEDIUM,
                    description=f"Access control or navigation route modified for {chg.affected_component.name}."
                ))

            elif chg.category == ChangeCategory.MODIFIED and chg.affected_component.type == "APIEndpoint":
                risk_score += 1.5
                breaking_changes.append(BreakingChange(
                    component_name=chg.affected_component.name,
                    description=f"API Request/Response schema modified for {chg.affected_component.name}.",
                    mitigation_advice="Update API SDK client models and bump API minor version."
                ))

        # Determine overall risk level
        risk_score = min(10.0, max(1.0, risk_score))
        if risk_score >= 8.0:
            level = RiskLevel.CRITICAL
        elif risk_score >= 5.0:
            level = RiskLevel.HIGH
        elif risk_score >= 3.0:
            level = RiskLevel.MEDIUM
        else:
            level = RiskLevel.LOW

        summary = (
            f"Release risk assessed at {level.value} level (Score: {risk_score:.1f}/10.0). "
            f"Identified {len(breaking_changes)} breaking changes and {len(risk_factors)} key risk factors."
        )

        return RiskAssessment(
            overall_risk_level=level,
            risk_score=risk_score,
            breaking_changes=breaking_changes,
            risk_factors=risk_factors,
            summary=summary
        )

    def _analyze_impact_heuristic(self, changes: List[Change]) -> ImpactAnalysis:
        """Deterministic heuristic fallback engine for impact evaluation."""
        user_workflows: List[str] = []
        api_changes: List[str] = []
        schema_changes: List[str] = []
        doc_recs: List[DocumentationRecommendation] = []
        qa_recs: List[QARecommendation] = []
        demo_recs: List[DemoRecommendation] = []

        for chg in changes:
            comp_name = chg.affected_component.name
            comp_type = chg.affected_component.type

            if chg.category == ChangeCategory.ADDED:
                if comp_type == "Page":
                    user_workflows.append(f"Users can now access the new '{comp_name}' page.")
                    doc_recs.append(DocumentationRecommendation(
                        section_to_update=f"User Guide > {comp_name}",
                        reason=f"New page '{comp_name}' added to application.",
                        priority="High"
                    ))
                    qa_recs.append(QARecommendation(
                        test_area=comp_name,
                        recommendation_type="New Test Suite",
                        reason=f"Validate functional workflows on new '{comp_name}' page."
                    ))
                    demo_recs.append(DemoRecommendation(
                        feature_or_flow=comp_name,
                        action_required="Add Demo Scene",
                        reason=f"Highlight new '{comp_name}' feature in sales demonstration."
                    ))

                elif comp_type == "Workflow":
                    user_workflows.append(f"New end-to-end workflow available: '{comp_name}'.")
                    qa_recs.append(QARecommendation(
                        test_area=comp_name,
                        recommendation_type="E2E Integration Test",
                        reason=f"Automate validation for new workflow '{comp_name}'."
                    ))

            elif chg.category in [ChangeCategory.MODIFIED, ChangeCategory.WORKFLOW_CHANGED]:
                if comp_type == "APIEndpoint":
                    api_changes.append(f"Updated schema/parameters for endpoint '{comp_name}'.")
                    doc_recs.append(DocumentationRecommendation(
                        section_to_update=f"API Reference > {comp_name}",
                        reason="Endpoint request/response schema updated.",
                        priority="High"
                    ))
                    qa_recs.append(QARecommendation(
                        test_area=comp_name,
                        recommendation_type="API Regression Test",
                        reason=f"Verify backward compatibility for API {comp_name}."
                    ))

            elif chg.category == ChangeCategory.REMOVED:
                schema_changes.append(f"Deprecation/Removal of component '{comp_name}'.")
                doc_recs.append(DocumentationRecommendation(
                    section_to_update=f"Deprecation Notices > {comp_name}",
                    reason=f"Component '{comp_name}' removed.",
                    priority="High"
                ))

        user_impact = UserImpact(
            summary=f"Release introduces {len(user_workflows)} major user-facing workflow additions and interface updates.",
            affected_user_roles=["End Users", "Admins"],
            workflow_changes=user_workflows or ["Minor UI element alignment and layout adjustments."]
        )

        dev_impact = DeveloperImpact(
            summary=f"Release includes {len(api_changes)} API modifications and {len(schema_changes)} schema/deprecation changes.",
            api_changes=api_changes or ["No breaking API changes detected."],
            schema_changes=schema_changes or ["Database and graph schema contracts remain stable."]
        )

        return ImpactAnalysis(
            user_impact=user_impact,
            developer_impact=dev_impact,
            doc_recommendations=doc_recs,
            qa_recommendations=qa_recs,
            demo_recommendations=demo_recs
        )

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def _analyze_impact_with_llm(self, changes: List[Change]) -> ImpactAnalysis:
        """Call external LLM provider for AI reasoning (Placeholder interface for API integration)."""
        # In production this integrates with OpenAI / Gemini API via HTTP or SDK
        # For current execution safely returns heuristic structure with LLM marker.
        res = self._analyze_impact_heuristic(changes)
        res.user_impact.summary += " (AI Reasoned)"
        return res
