"""
metrics.py

Shared data structures and statistical utilities used by health.py and
drift.py. This module owns the definition of what a "snapshot" or "log
record" looks like, decoupled from wherever that data actually comes
from (graph DB, event store, etc.).
"""

from dataclasses import dataclass


def clamp(value: float, lower: float, upper: float) -> float:
    """Clamp a value into the inclusive range [lower, upper]."""
    return max(lower, min(upper, value))


@dataclass
class GraphSnapshot:
    """
    A point-in-time summary of the enterprise knowledge graph.

    Replace with a real query against your graph store in production
    (e.g., Neo4j, a triple store, or your custom knowledge graph layer).
    """
    total_nodes: int
    stale_nodes: int
    contradictory_nodes: int
    covered_domains: int
    expected_domains: int


@dataclass
class DecisionRecord:
    """A single logged organizational decision."""
    decision_id: str
    aligned_with_policy: bool


@dataclass
class WorkflowRecord:
    """A single logged workflow execution."""
    workflow_id: str
    conforms_to_pattern: bool
