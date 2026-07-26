"""
health.py

Computes Knowledge, Decision, and Workflow Health scores for HELIX's
Cognitive Drift Engine.

Each health score is expressed as a float in the range [0.0, 1.0],
where 1.0 represents perfect health.
"""

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import List

from .metrics import GraphSnapshot, DecisionRecord, WorkflowRecord, clamp


@dataclass
class HealthScores:
    knowledge_health: float
    decision_health: float
    workflow_health: float
    timestamp: str


def calculate_knowledge_health(snapshot: GraphSnapshot) -> float:
    """
    Scores the integrity of the knowledge graph based on:
      - proportion of stale nodes (not updated within the freshness window)
      - proportion of nodes involved in unresolved contradictions
      - coverage: proportion of expected domains represented in the graph

    Contradictions are weighted most heavily, since conflicting knowledge
    is more damaging to decision quality than merely outdated knowledge.
    """
    if snapshot.total_nodes == 0:
        return 0.0

    stale_ratio = snapshot.stale_nodes / snapshot.total_nodes
    contradiction_ratio = snapshot.contradictory_nodes / snapshot.total_nodes
    coverage_ratio = snapshot.covered_domains / max(snapshot.expected_domains, 1)

    score = (
        0.35 * (1 - stale_ratio)
        + 0.45 * (1 - contradiction_ratio)
        + 0.20 * coverage_ratio
    )
    return round(clamp(score, 0.0, 1.0), 4)


def calculate_decision_health(decisions: List[DecisionRecord]) -> float:
    """
    Scores how well recent decisions align with stated organizational
    policy and precedent.
    """
    if not decisions:
        return 1.0  # No decisions to evaluate — treated as neutral/healthy

    aligned = sum(1 for d in decisions if d.aligned_with_policy)
    return round(clamp(aligned / len(decisions), 0.0, 1.0), 4)


def calculate_workflow_health(workflows: List[WorkflowRecord]) -> float:
    """
    Scores consistency of executed workflows against their defined
    expected pattern (e.g., correct step order, no skipped required steps).
    """
    if not workflows:
        return 1.0

    conformant = sum(1 for w in workflows if w.conforms_to_pattern)
    return round(clamp(conformant / len(workflows), 0.0, 1.0), 4)


def get_all_health_scores(
    snapshot: GraphSnapshot,
    decisions: List[DecisionRecord],
    workflows: List[WorkflowRecord],
) -> HealthScores:
    """Convenience aggregator returning all three health dimensions."""
    return HealthScores(
        knowledge_health=calculate_knowledge_health(snapshot),
        decision_health=calculate_decision_health(decisions),
        workflow_health=calculate_workflow_health(workflows),
        timestamp=datetime.now(timezone.utc).isoformat(),
    )
