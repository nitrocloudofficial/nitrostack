"""
HELIX: Advanced Enterprise Cognitive Genome Platform - Genome Profile Module
"""

import time
from typing import Dict, Any, List, Optional


class CognitiveGenome:
    """Models the 4-Vector Enterprise Cognitive Genome profile."""

    def __init__(
        self,
        strategic_alignment: float = 1.0,
        process_consistency: float = 1.0,
        conceptual_cohesion: float = 1.0,
        knowledge_retention: float = 1.0
    ):
        self.strategic_alignment = max(0.0, min(1.0, float(strategic_alignment)))
        self.process_consistency = max(0.0, min(1.0, float(process_consistency)))
        self.conceptual_cohesion = max(0.0, min(1.0, float(conceptual_cohesion)))
        self.knowledge_retention = max(0.0, min(1.0, float(knowledge_retention)))

    def to_vector(self) -> List[float]:
        return [
            self.strategic_alignment,
            self.process_consistency,
            self.conceptual_cohesion,
            self.knowledge_retention
        ]

    def compute_composite_alignment(self) -> float:
        weights = [0.30, 0.25, 0.25, 0.20]
        vec = self.to_vector()
        return round(sum(w * v for w, v in zip(weights, vec)), 4)

    def compute_drift_score(self) -> float:
        return round(1.0 - self.compute_composite_alignment(), 4)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "strategic_alignment": self.strategic_alignment,
            "process_consistency": self.process_consistency,
            "conceptual_cohesion": self.conceptual_cohesion,
            "knowledge_retention": self.knowledge_retention,
            "composite_alignment": self.compute_composite_alignment(),
            "drift_score": self.compute_drift_score()
        }


class DepartmentGenomeProfile:
    """Department-level Cognitive Genome profile including baseline vectors."""

    def __init__(
        self,
        department: str,
        baseline_genome: Optional[CognitiveGenome] = None,
        current_genome: Optional[CognitiveGenome] = None
    ):
        self.department = department
        self.baseline_genome = baseline_genome or CognitiveGenome(1.0, 1.0, 1.0, 1.0)
        self.current_genome = current_genome or CognitiveGenome(0.85, 0.72, 0.78, 0.70)
        self.history: List[Dict[str, Any]] = []
        self.last_updated = int(time.time())

    def record_snapshot(self, genome: CognitiveGenome):
        self.current_genome = genome
        self.last_updated = int(time.time())
        self.history.append({
            "timestamp": self.last_updated,
            "genome": genome.to_dict()
        })

    def get_drift_velocity(self) -> float:
        if len(self.history) < 2:
            return 0.0
        first_drift = self.history[0]["genome"]["drift_score"]
        latest_drift = self.history[-1]["genome"]["drift_score"]
        return round(latest_drift - first_drift, 4)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "department": self.department,
            "baseline_genome": self.baseline_genome.to_dict(),
            "current_genome": self.current_genome.to_dict(),
            "drift_velocity": self.get_drift_velocity(),
            "snapshot_count": len(self.history),
            "last_updated": self.last_updated
        }
