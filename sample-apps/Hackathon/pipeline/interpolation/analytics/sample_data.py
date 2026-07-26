"""
sample_data.py

Mock data providers so the Cognitive Drift Engine API is runnable and
testable standalone, without a live knowledge graph / decision log /
workflow log backing it yet.

Replace each function body with a real query against your actual data
stores once they exist. Nothing outside this file should need to change
when you do that swap — health.py, drift.py, and score.py only depend on
the GraphSnapshot / DecisionRecord / WorkflowRecord shapes, not on how
they were produced.
"""

from typing import List

from .metrics import GraphSnapshot, DecisionRecord, WorkflowRecord
from .hybrid_drift import TelemetryItem


def current_snapshot() -> GraphSnapshot:
    return GraphSnapshot(
        total_nodes=1000,
        stale_nodes=0,
        contradictory_nodes=0,
        covered_domains=20,
        expected_domains=20,
    )



def baseline_snapshot() -> GraphSnapshot:
    return GraphSnapshot(
        total_nodes=950,
        stale_nodes=60,
        contradictory_nodes=25,
        covered_domains=17,
        expected_domains=20,
    )


def current_decisions() -> List[DecisionRecord]:
    return [
        DecisionRecord("d1", aligned_with_policy=True),
        DecisionRecord("d2", aligned_with_policy=True),
        DecisionRecord("d3", aligned_with_policy=True),
        DecisionRecord("d4", aligned_with_policy=True),
        DecisionRecord("d5", aligned_with_policy=True),
    ]


def baseline_decisions() -> List[DecisionRecord]:
    return [
        DecisionRecord("d0a", aligned_with_policy=True),
        DecisionRecord("d0b", aligned_with_policy=True),
        DecisionRecord("d0c", aligned_with_policy=True),
    ]


def current_workflows() -> List[WorkflowRecord]:
    return [
        WorkflowRecord("w1", conforms_to_pattern=True),
        WorkflowRecord("w2", conforms_to_pattern=True),
        WorkflowRecord("w3", conforms_to_pattern=True),
        WorkflowRecord("w4", conforms_to_pattern=True),
    ]



def baseline_workflows() -> List[WorkflowRecord]:
    return [
        WorkflowRecord("w0a", conforms_to_pattern=True),
        WorkflowRecord("w0b", conforms_to_pattern=True),
        WorkflowRecord("w0c", conforms_to_pattern=True),
        WorkflowRecord("w0d", conforms_to_pattern=True),
    ]


def current_telemetry() -> List[TelemetryItem]:
    """
    Raw telemetry text feeding Hybrid Drift Evaluation. Mixes:
      - a purely semantic drift case (no shared vocabulary with any
        policy rule text -- only the dense/concept layer should catch it)
      - a purely lexical/exact-trigger case (a literal AWS key --
        the sparse/regex layer should catch it deterministically)
      - a blended case (some lexical overlap AND a regex trigger)
      - a clean item that shouldn't drift against anything
    """
    return [
        TelemetryItem(
            telemetry_id="t1",
            source="slack#eng-infra",
            raw_text="honestly let's just skip the audit this quarter, nobody will notice",
        ),
        TelemetryItem(
            telemetry_id="t2",
            source="pr-comment#4821",
            raw_text="quick fix, pasting the new prod config here: AWS_SECRET_KEY=AKIAFAKEEXAMPLE1234",
        ),
        TelemetryItem(
            telemetry_id="t3",
            source="email#sales-thread",
            raw_text="told the client we could do 45% discount if they sign by Friday, hope that's fine",
        ),
        TelemetryItem(
            telemetry_id="t4",
            source="crm-note#88213",
            raw_text="exporting the full EU customer list with names and emails to our US analytics vendor tonight",
        ),
        TelemetryItem(
            telemetry_id="t5",
            source="slack#eng-infra",
            raw_text="deployed the weekly batch job, all tests green, no issues to report",
        ),
    ]
