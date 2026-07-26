"""
drift.py

Detects Knowledge, Workflow, and Decision Drift for HELIX's Cognitive
Drift Engine by comparing a current snapshot/log window against an
established baseline.

Drift values are expressed as signed floats:
  - 0.0 means no drift from baseline
  - positive values mean the "bad" indicator ratio has risen relative to
    baseline (things are getting worse)
  - negative values mean the "bad" indicator ratio has fallen relative to
    baseline (things are improving)
"""

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import List

from .metrics import GraphSnapshot, DecisionRecord, WorkflowRecord


@dataclass
class DriftSignals:
    knowledge_drift: float
    workflow_drift: float
    decision_drift: float
    window_days: int
    timestamp: str


def calculate_knowledge_drift(current: GraphSnapshot, baseline: GraphSnapshot) -> float:
    """
    Compares current knowledge graph health indicators against baseline.
    A rising contradiction/staleness ratio relative to baseline indicates
    positive (bad) drift.
    """
    if baseline.total_nodes == 0 or current.total_nodes == 0:
        return 0.0

    current_bad_ratio = (
        current.contradictory_nodes + current.stale_nodes
    ) / current.total_nodes
    baseline_bad_ratio = (
        baseline.contradictory_nodes + baseline.stale_nodes
    ) / baseline.total_nodes

    return round(current_bad_ratio - baseline_bad_ratio, 4)


def calculate_workflow_drift(
    current: List[WorkflowRecord], baseline: List[WorkflowRecord]
) -> float:
    """
    Compares the proportion of non-conformant workflow executions in the
    current window against the baseline window.
    """
    def non_conformance_ratio(records: List[WorkflowRecord]) -> float:
        if not records:
            return 0.0
        non_conformant = sum(1 for r in records if not r.conforms_to_pattern)
        return non_conformant / len(records)

    return round(non_conformance_ratio(current) - non_conformance_ratio(baseline), 4)


def calculate_decision_drift(
    current: List[DecisionRecord], baseline: List[DecisionRecord]
) -> float:
    """
    Compares the proportion of policy-misaligned decisions in the current
    window against the baseline window.
    """
    def misalignment_ratio(records: List[DecisionRecord]) -> float:
        if not records:
            return 0.0
        misaligned = sum(1 for r in records if not r.aligned_with_policy)
        return misaligned / len(records)

    return round(misalignment_ratio(current) - misalignment_ratio(baseline), 4)


def get_all_drift_signals(
    current_snapshot: GraphSnapshot,
    baseline_snapshot: GraphSnapshot,
    current_decisions: List[DecisionRecord],
    baseline_decisions: List[DecisionRecord],
    current_workflows: List[WorkflowRecord],
    baseline_workflows: List[WorkflowRecord],
    window_days: int = 30,
) -> DriftSignals:
    """Convenience aggregator returning all three drift dimensions."""
    return DriftSignals(
        knowledge_drift=calculate_knowledge_drift(current_snapshot, baseline_snapshot),
        workflow_drift=calculate_workflow_drift(current_workflows, baseline_workflows),
        decision_drift=calculate_decision_drift(current_decisions, baseline_decisions),
        window_days=window_days,
        timestamp=datetime.now(timezone.utc).isoformat(),
    )
