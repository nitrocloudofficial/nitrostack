"""
HELIX: Advanced Enterprise Cognitive Genome Platform - Anti-Drift Recommendation Engine
"""

import json
from typing import Dict, Any, List, Optional
from pipeline.embedding.llm import LLMClient
from pipeline.embedding.prompt import PromptManager


class RealignmentActionPlan:
    """Represents a structured Anti-Drift Realignment Action Plan."""

    def __init__(
        self,
        department: str,
        drift_score: float,
        target_alignment_score: float,
        executive_summary: str,
        recommendations: List[Dict[str, Any]]
    ):
        self.department = department
        self.drift_score = round(float(drift_score), 4)
        self.target_alignment_score = round(float(target_alignment_score), 4)
        self.executive_summary = executive_summary
        self.recommendations = recommendations

    def to_dict(self) -> Dict[str, Any]:
        return {
            "department": self.department,
            "drift_score": self.drift_score,
            "target_alignment_score": self.target_alignment_score,
            "executive_summary": self.executive_summary,
            "recommendation_count": len(self.recommendations),
            "recommendations": self.recommendations
        }


class AntiDriftRecommendationEngine:
    """Generates actionable, prioritized anti-drift recommendations."""

    def __init__(self, llm_client: Optional[LLMClient] = None):
        self.llm_client = llm_client or LLMClient()

    def generate_plan(
        self,
        department: str,
        drift_score: float,
        issues: List[str],
        context_docs: Optional[List[Dict[str, Any]]] = None
    ) -> RealignmentActionPlan:
        context_str = ""
        if context_docs:
            context_str = "\n".join([d.get("content", str(d)) for d in context_docs])

        prompt = PromptManager.get_recommendation_prompt(
            department=department,
            drift_score=drift_score,
            issues=issues,
            context=context_str
        )

        raw_output = self.llm_client.generate(prompt=prompt, json_mode=True)
        try:
            parsed = json.loads(raw_output)
        except Exception:
            parsed = {}

        summary = parsed.get("executive_summary", f"Anti-drift strategy initiated for {department}.")
        target_score = float(parsed.get("target_alignment_score", max(0.05, drift_score - 0.20)))
        recs = parsed.get("recommendations", [
            {
                "id": "RAP-01",
                "category": "STRATEGIC_REALIGNMENT",
                "priority": "HIGH",
                "title": "Establish Architectural Review Checkpoints",
                "description": "Enforce mandatory Architecture Decision Records (ADRs).",
                "expected_impact": "Reduce conceptual drift by 40%.",
                "effort_level": "LOW",
                "estimated_roi_weeks": 3
            }
        ])

        return RealignmentActionPlan(
            department=department,
            drift_score=drift_score,
            target_alignment_score=target_score,
            executive_summary=summary,
            recommendations=recs
        )
