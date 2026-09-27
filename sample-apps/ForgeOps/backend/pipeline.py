"""
4-Agent Pipeline — Chains Planner → Research → Analysis → Execution agents.
This is the main entry point for any engineering question.
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.schemas.shared_models import UIState
from backend.schemas.planner_models import PlannerInput
from backend.schemas.research_models import ResearchInput
from backend.schemas.analysis_models import AnalysisInput
from backend.schemas.execution_models import ExecutionInput, ExecutionOutput
from backend.agents.planner.planner import PlannerAgent
from backend.agents.research.research import ResearchAgent
from backend.agents.analysis.analysis import AnalysisAgent
from backend.agents.execution.execution import ExecutionAgent
from backend.database.audit_log import log_pipeline_run
from backend.config import FORGEOPS_MODEL
from backend.workbench import build_pipeline_workbench, evidence_refs_for_intent


def classify_pipeline_mode(agent_trace: list[dict]) -> str:
    statuses = [step.get("status") for step in agent_trace]
    if statuses and all(status == "complete" for status in statuses):
        return "live_nitrocloud"
    if statuses and all(
        status in {"complete", "complete_with_safe_tool_selection"}
        for status in statuses
    ):
        return "live_nitrocloud_with_safe_tool_selection"
    return "degraded_fallback"


def run_pipeline(
    user_query: str,
    incident_id: str = "INC-2407-001",
    batch_id: str = "B-2407-184",
    constraints: dict = None,
    ui_context: UIState = None,
) -> ExecutionOutput:
    """Full 4-agent pipeline: Planner → Research → Analysis → Execution."""
    ui_context = ui_context or UIState()
    constraints = constraints or {}

    # Agent 1 — Planner
    planner = PlannerAgent()
    plan = planner.plan(PlannerInput(
        user_query=user_query,
        incident_id=incident_id,
        batch_id=batch_id,
        ui_context=ui_context,
        constraints=constraints,
    ))

    # Agent 2 — Research
    researcher = ResearchAgent()
    evidence = researcher.retrieve(ResearchInput(
        execution_plan=plan,
        incident_id=incident_id,
        batch_id=batch_id,
    ))

    # Agent 3 — Analysis
    analyst = AnalysisAgent()
    analysis = analyst.analyze(AnalysisInput(
        evidence=evidence,
        plan=plan,
    ))

    # Agent 4 — Execution
    executor = ExecutionAgent()
    output = executor.execute(ExecutionInput(
        analysis=analysis,
        current_ui=ui_context,
        intent=plan.intent,
        raw_query=user_query,
    ))
    agent_trace = [
        planner.last_trace,
        researcher.last_trace,
        analyst.last_trace,
        executor.last_trace,
    ]
    output.agent_trace = agent_trace
    output.tool_trace = evidence.tool_trace + analyst.tool_trace
    output.evidence_refs = evidence_refs_for_intent(
        plan.intent,
        evidence,
        output.evidence_refs,
    )
    output.workbench_data = build_pipeline_workbench(evidence, analysis)
    output.pipeline_mode = classify_pipeline_mode(agent_trace)
    output.model = FORGEOPS_MODEL

    # Audit trail
    log_pipeline_run(
        query=user_query,
        intent=plan.intent,
        required_servers=[s.value for s in plan.required_servers],
        evidence_sources=evidence.retrieval_sources,
        conclusion=output.conclusion,
        confidence=output.confidence,
        evidence_refs=output.evidence_refs,
        assumptions=output.assumptions,
        ui_actions=[a.action for a in output.ui_actions],
    )

    return output


if __name__ == "__main__":
    # Quick demo of all 4 golden-path intents
    queries = [
        "Show me the evidence.",
        "Why was Machine 7 ruled out?",
        "Compare Option A vs Option B.",
        "We cannot change suppliers. What should we do?",
        "Generate a report for the plant manager.",
    ]
    for q in queries:
        print(f"\n{'='*60}")
        print(f"QUERY: {q}")
        result = run_pipeline(q)
        print(f"INTENT: {result.assistant_message[:120]}...")
        print(f"UI ACTIONS: {[a.action for a in result.ui_actions]}")
        print(f"CONFIDENCE: {result.confidence}")
