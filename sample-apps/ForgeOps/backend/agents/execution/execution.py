"""
Agent 4 — Execution Agent
Presents results and controls the workbench.
Never performs reasoning — uses AnalysisResult only.
Generates UI actions, reports, assistant messages.
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))

from backend.schemas.analysis_models import AnalysisResult
from backend.schemas.execution_models import (
    ExecutionInput, ExecutionOutput, UIAction, GeneratedReport, Notification,
)
from backend.llm.nitrochat_client import NitroChatClient

INTENT_UI_ACTIONS: dict[str, list[dict]] = {
    "show_evidence": [
        {"action": "OPEN_TIMELINE", "target_id": None},
        {"action": "HIGHLIGHT_NODE", "target_id": "humidity"},
        {"action": "HIGHLIGHT_NODE", "target_id": "queue_delay"},
        {"action": "OPEN_GRAPH", "target_id": None},
    ],
    "explain_exclusion": [
        {"action": "OPEN_GRAPH", "target_id": None},
        {"action": "HIGHLIGHT_NODE", "target_id": "machine_7"},
        {"action": "HIGHLIGHT_NODE", "target_id": "queue_delay"},
        {"action": "OPEN_SIMULATION", "target_id": "sim_compare"},
    ],
    "compare_options": [
        {"action": "OPEN_SIMULATION", "target_id": None},
        {"action": "OPEN_COMPARISON_VIEW", "target_id": None},
        {"action": "HIGHLIGHT_NODE", "target_id": "queue_delay"},
    ],
    "constraint_query": [
        {"action": "OPEN_SIMULATION", "target_id": None},
        {"action": "OPEN_RECOMMENDATIONS", "target_id": None},
        {"action": "HIGHLIGHT_NODE", "target_id": "queue_delay"},
    ],
    "generate_report": [
        {"action": "OPEN_REPORT_PANEL", "target_id": None},
    ],
    "simulate": [
        {"action": "OPEN_SIMULATION", "target_id": None},
        {"action": "SHOW_SCENARIO_RESULT", "target_id": None},
    ],
}

INTENT_CONCLUSIONS: dict[str, str] = {
    "show_evidence": "Queue delay has the strongest causal influence ({yield}% predicted yield recovery with reduced delay below 60 minutes).",
    "explain_exclusion": "Machine 7 appeared in 81% of failed batches, but counterfactual simulation shows that reducing queue delay alone restores yield to 96%. Machine 7 replacement alone improves yield by only 2 points.",
    "compare_options": "Reduce queue delay first — it matches humidity control yield at a fraction of the cost and can be deployed in ~2 hours.",
    "constraint_query": "With supplier change frozen for 30 days, the best feasible action is reducing queue delay below 60 minutes — predicted yield: {yield}%, confidence: {confidence}%.",
    "generate_report": "The plant-manager decision brief is ready for review. It packages the incident, evidence chain, scenarios, recommendation, impact, and approval record.",
    "simulate": "Simulation result: reducing queue delay below 60 minutes increases predicted yield from 82% to {yield}% (confidence: {confidence}%).",
}


def _format_conclusion(template: str, top_rec) -> str:
    if top_rec:
        return (
            template
            .replace("{yield}", str(top_rec.predicted_yield_pct))
            .replace("{confidence}", str(top_rec.confidence_pct))
        )
    return template


class ExecutionAgent:
    """
    Agent 4 — Execution Agent
    Input: ExecutionInput (AnalysisResult + UIState + intent)
    Output: ExecutionOutput (assistant message + UI actions + reports + notifications)
    """

    def __init__(self, llm: NitroChatClient | None = None) -> None:
        self.llm = llm or NitroChatClient()
        self.last_trace: dict = {}

    def execute(self, inp: ExecutionInput) -> ExecutionOutput:
        analysis = inp.analysis
        intent = inp.intent

        top_rec = analysis.recommendations[0] if analysis.recommendations else None
        top_sim = analysis.simulation_results[0] if analysis.simulation_results else None

        # Generate conclusion
        conclusion_template = INTENT_CONCLUSIONS.get(intent, INTENT_CONCLUSIONS["show_evidence"])
        conclusion = _format_conclusion(conclusion_template, top_rec)
        call = self.llm.complete_json(
            agent="Execution",
            system_prompt=(
                "Present the supplied analysis as a concise, professional decision. "
                "Never claim an operational action was executed. Reports and notifications "
                "are drafts requiring human approval. Return {\"conclusion\": string, "
                "\"effect\": string, \"assumptions\": [string], "
                "\"actions_available\": [\"open_evidence\"|\"run_comparison\"|\"generate_report\"]}."
            ),
            payload={
                "query": inp.raw_query,
                "intent": intent,
                "analysis": analysis.model_dump(),
            },
        )
        if isinstance(call.data.get("conclusion"), str):
            conclusion = call.data["conclusion"].strip() or conclusion

        # Build UI actions
        raw_actions = INTENT_UI_ACTIONS.get(intent, INTENT_UI_ACTIONS["show_evidence"])
        ui_actions = [UIAction(action=a["action"], target_id=a.get("target_id")) for a in raw_actions]

        # Confidence
        confidence = analysis.confidence_scores.get("overall", 0.91)

        # Assumptions
        assumptions = top_sim.assumptions if top_sim else ["Machine 7 condition held constant", "No supplier change within 30 days"]
        if isinstance(call.data.get("assumptions"), list):
            assumptions = [str(item) for item in call.data["assumptions"] if str(item).strip()] or assumptions

        # Evidence refs
        evidence_refs = analysis.supporting_evidence

        # Reports (only for generate_report intent)
        reports = []
        if intent == "generate_report":
            reports = [
                GeneratedReport(
                    report_type="manager_executive",
                    markdown=self._generate_manager_markdown(analysis),
                    html=None,
                )
            ]

        # Notifications
        notifications = []
        if intent == "generate_report" and top_rec:
            notifications.append(Notification(
                recipient="Plant Operations Manager",
                subject=f"ForgeOps Decision Brief — Incident INC-2407-001",
                body=f"Recommended action: {top_rec.title}. Predicted yield: {top_rec.predicted_yield_pct}%.",
                requires_approval=True,
            ))

        # Tool trace (static audit trail for demo)
        tool_trace = [
            {"server": "MES", "tool": "get_queue_events", "status": "complete", "durationMs": 124},
            {"server": "Quality", "tool": "get_inspection_results", "status": "complete", "durationMs": 96},
            {"server": "Maintenance", "tool": "get_machine_alerts", "status": "complete", "durationMs": 108},
            {"server": "Simulation", "tool": "compare_scenarios", "status": "complete", "durationMs": 342},
        ]

        allowed_actions = {"open_evidence", "run_comparison", "generate_report"}
        model_actions = call.data.get("actions_available", [])
        actions_available = [str(item) for item in model_actions if str(item) in allowed_actions]
        if not actions_available:
            actions_available = ["open_evidence", "run_comparison", "generate_report"]
        effect = str(call.data.get(
            "effect",
            "The recommendation is evidence-backed and remains subject to human approval before plant action.",
        ))
        self.last_trace = {
            "agent": "execution",
            "status": "complete" if call.live else "fallback",
            "durationMs": call.latency_ms,
            "model": call.model,
            "summary": "Prepared the user-facing decision and approval-safe actions.",
            "error": call.error,
            "attempts": call.attempts,
        }
        return ExecutionOutput(
            assistant_message=conclusion,
            conclusion=conclusion,
            effect=effect,
            confidence=confidence,
            evidence_refs=evidence_refs,
            assumptions=assumptions,
            ui_actions=ui_actions,
            generated_reports=reports,
            notifications=notifications,
            actions_available=actions_available,
            tool_trace=tool_trace,
        )

    def _generate_manager_markdown(self, analysis: AnalysisResult) -> str:
        top_rec = analysis.recommendations[0] if analysis.recommendations else None
        impact = analysis.business_impact

        md = f"""# ForgeOps Executive Decision Brief

**Incident**: INC-2407-001 — Yield Degradation Batch B-2407-184
**Plant**: Plant Alpha - Detroit | **Line**: Assembly Line 3
**Yield Delta**: 96.0% → 82.0% (−14 percentage points)

---

## Root Cause
{analysis.root_causes[0].primary_cause if analysis.root_causes else 'Under analysis'}

**Causal Pathway** (Confidence: {int(analysis.root_causes[0].confidence_score * 100) if analysis.root_causes else 0}%):
"""
        if analysis.root_causes:
            for step in analysis.root_causes[0].causal_chain:
                md += f"1. {step}\n"

        md += f"""
---

## Recommended Action
**{top_rec.title if top_rec else 'Reduce queue delay'}**
- Predicted Yield: **{top_rec.predicted_yield_pct if top_rec else 96.0}%**
- Confidence: **{top_rec.confidence_pct if top_rec else 96}%**
- Cost: {top_rec.cost_estimate if top_rec else 'Low'} | Speed: {top_rec.implementation_speed if top_rec else '~2 hours'}

## Business Impact
- Monthly Loss Avoided: ₹{impact.get('monthly_loss_avoided_inr', 1500000):,.0f}
- Downtime Reduction: {impact.get('downtime_reduction_pct', 41)}%
- Yield Recovery: +{impact.get('yield_improvement_pct', 14)} percentage points

## Decision Record
- [ ] **Approved By**: Plant Operations Manager
- **Timestamp**: _(pending approval)_
- **Follow-up Owner**: Lead Maintenance & Dispatch Engineer
"""
        return md
