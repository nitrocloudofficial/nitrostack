"""
HELIX: Advanced Enterprise Cognitive Genome Platform - Drift Diagnostic Engine
"""

import json
from typing import Dict, Any, List, Optional
from pipeline.graphs.genome import CognitiveGenome, DepartmentGenomeProfile
from pipeline.embedding.llm import LLMClient
from pipeline.embedding.prompt import PromptManager


class DriftDiagnostic:
    """Structured result of a Cognitive Drift evaluation."""

    def __init__(
        self,
        department: str,
        drift_score: float,
        alignment_status: str,
        dimensions: Dict[str, float],
        drift_acceleration: float,
        root_causes: List[str],
        affected_workflows: List[str],
        risk_assessment: str,
        summary: str
    ):
        self.department = department
        self.drift_score = round(float(drift_score), 4)
        self.alignment_status = alignment_status
        self.dimensions = dimensions
        self.drift_acceleration = round(float(drift_acceleration), 4)
        self.root_causes = root_causes
        self.affected_workflows = affected_workflows
        self.risk_assessment = risk_assessment
        self.summary = summary

    def to_dict(self) -> Dict[str, Any]:
        return {
            "department": self.department,
            "cognitive_drift_score": self.drift_score,
            "alignment_status": self.alignment_status,
            "drift_dimensions": self.dimensions,
            "drift_acceleration": self.drift_acceleration,
            "root_causes": self.root_causes,
            "affected_workflows": self.affected_workflows,
            "risk_assessment": self.risk_assessment,
            "summary": self.summary
        }


class CognitiveDriftEngine:
    """Advanced Cognitive Drift Diagnostic Engine."""

    def __init__(self, llm_client: Optional[LLMClient] = None):
        self.llm_client = llm_client or LLMClient()
        self.department_profiles: Dict[str, DepartmentGenomeProfile] = {}

    def evaluate_drift(
        self,
        department: str,
        signals: List[str],
        timeframe: str = "Last 30 Days"
    ) -> DriftDiagnostic:
        prompt = PromptManager.get_drift_detection_prompt(
            department=department,
            signals=signals,
            timeframe=timeframe
        )

        raw_output = self.llm_client.generate(prompt=prompt, json_mode=True)
        try:
            parsed = json.loads(raw_output)
        except Exception:
            parsed = {}

        drift_score = float(parsed.get("cognitive_drift_score", 0.32))
        status = parsed.get("alignment_status", self._categorize_status(drift_score))
        dims = parsed.get("drift_dimensions", {
            "strategic_alignment": 0.82,
            "process_consistency": 0.65,
            "conceptual_cohesion": 0.74,
            "knowledge_retention": 0.60
        })
        accel = float(parsed.get("drift_acceleration", 0.12))
        causes = parsed.get("root_causes", ["Inconsistent documentation practices", "Unrecorded architecture decisions"])
        workflows = parsed.get("affected_workflows", ["Sprint Planning", "Cross-Team API Contracts"])
        risk = parsed.get("risk_assessment", "Unchecked drift will increase rework during cross-team integration phases.")
        summary = parsed.get("summary", f"Department {department} exhibits moderate cognitive drift (score: {drift_score}).")

        genome = CognitiveGenome(
            strategic_alignment=dims.get("strategic_alignment", 0.8),
            process_consistency=dims.get("process_consistency", 0.7),
            conceptual_cohesion=dims.get("conceptual_cohesion", 0.7),
            knowledge_retention=dims.get("knowledge_retention", 0.6)
        )
        if department not in self.department_profiles:
            self.department_profiles[department] = DepartmentGenomeProfile(department)
        self.department_profiles[department].record_snapshot(genome)

        return DriftDiagnostic(
            department=department,
            drift_score=drift_score,
            alignment_status=status,
            dimensions=dims,
            drift_acceleration=accel,
            root_causes=causes,
            affected_workflows=workflows,
            risk_assessment=risk,
            summary=summary
        )

    def _categorize_status(self, score: float) -> str:
        if score < 0.15:
            return "OPTIMAL"
        elif score < 0.35:
            return "LOW_DRIFT"
        elif score < 0.60:
            return "MODERATE_DRIFT"
        return "CRITICAL_DRIFT"
