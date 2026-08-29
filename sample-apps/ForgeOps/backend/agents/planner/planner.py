"""
Agent 1 — Planner Agent
Converts natural language input into a deterministic execution plan.
Intent classification → task breakdown → agent/server routing.
No analysis, no manufacturing facts — pure planning.
"""

import re
from backend.schemas.shared_models import AgentName, MCPServer
from backend.schemas.planner_models import PlannerInput, ExecutionPlan, Task
from backend.llm.nitrochat_client import NitroChatClient

# Intent classification rules — keywords map to intent types
INTENT_PATTERNS = {
    "show_evidence": [r"show.*evidence", r"what happened", r"explain.*factor", r"why.*elevated", r"timeline"],
    "explain_exclusion": [r"why.*ruled out", r"why not machine", r"machine.*cause", r"explain.*machine"],
    "compare_options": [r"compare", r"option [ab]", r"vs\.?", r"versus", r"which.*better", r"difference"],
    "constraint_query": [r"cannot change", r"can't change", r"no supplier", r"constraint", r"what.*should we do"],
    "generate_report": [r"report", r"generate.*report", r"plant manager", r"executive.*summary"],
    "simulate": [r"simulate", r"what if", r"what-if", r"if.*reduce", r"scenario"],
}

INTENT_TO_AGENTS: dict[str, list[AgentName]] = {
    "show_evidence":     [AgentName.RESEARCH, AgentName.ANALYSIS, AgentName.EXECUTION],
    "explain_exclusion": [AgentName.RESEARCH, AgentName.ANALYSIS, AgentName.EXECUTION],
    "compare_options":   [AgentName.RESEARCH, AgentName.ANALYSIS, AgentName.EXECUTION],
    "constraint_query":  [AgentName.RESEARCH, AgentName.ANALYSIS, AgentName.EXECUTION],
    "generate_report":   [AgentName.RESEARCH, AgentName.ANALYSIS, AgentName.EXECUTION],
    "simulate":          [AgentName.RESEARCH, AgentName.ANALYSIS, AgentName.EXECUTION],
}

INTENT_TO_SERVERS: dict[str, list[MCPServer]] = {
    "show_evidence":     [MCPServer.MES, MCPServer.QUALITY, MCPServer.ORCHESTRATOR],
    "explain_exclusion": [MCPServer.MES, MCPServer.MAINTENANCE, MCPServer.SIMULATION, MCPServer.ORCHESTRATOR],
    "compare_options":   [MCPServer.MES, MCPServer.MAINTENANCE, MCPServer.QUALITY, MCPServer.SIMULATION],
    "constraint_query":  [MCPServer.MATERIALS, MCPServer.SIMULATION, MCPServer.ORCHESTRATOR],
    "generate_report":   [MCPServer.ORCHESTRATOR, MCPServer.SIMULATION],
    "simulate":          [MCPServer.SIMULATION, MCPServer.MES],
}

INTENT_TO_TASKS: dict[str, list[dict]] = {
    "show_evidence": [
        {"name": "retrieve_batch", "description": "Get batch and production timeline from MES", "server": MCPServer.MES},
        {"name": "retrieve_quality", "description": "Get quality defect and inspection records", "server": MCPServer.QUALITY},
        {"name": "correlate_evidence", "description": "Run anomaly correlation and root cause analysis", "server": None},
    ],
    "explain_exclusion": [
        {"name": "retrieve_batch", "description": "Get batch and production timeline", "server": MCPServer.MES},
        {"name": "retrieve_machine_history", "description": "Get Machine 7 maintenance alerts", "server": MCPServer.MAINTENANCE},
        {"name": "run_counterfactual", "description": "Run Machine 7 replacement simulation", "server": MCPServer.SIMULATION},
        {"name": "compare_results", "description": "Compare Machine 7 vs queue delay causal impact", "server": None},
    ],
    "compare_options": [
        {"name": "retrieve_batch", "description": "Get batch history", "server": MCPServer.MES},
        {"name": "retrieve_quality", "description": "Get quality outcomes", "server": MCPServer.QUALITY},
        {"name": "retrieve_machine_history", "description": "Get maintenance logs", "server": MCPServer.MAINTENANCE},
        {"name": "run_simulation", "description": "Run scenarios for option A and B", "server": MCPServer.SIMULATION},
        {"name": "compare_results", "description": "Rank options by effectiveness, cost, and confidence", "server": None},
    ],
    "constraint_query": [
        {"name": "retrieve_constraints", "description": "Get supplier/material constraints from ERP", "server": MCPServer.MATERIALS},
        {"name": "run_simulation", "description": "Run constrained scenarios (no supplier change)", "server": MCPServer.SIMULATION},
        {"name": "rank_feasible", "description": "Rank feasible options respecting constraints", "server": None},
    ],
    "generate_report": [
        {"name": "retrieve_incident", "description": "Get full incident summary", "server": MCPServer.ORCHESTRATOR},
        {"name": "retrieve_recommendations", "description": "Get ranked recommendations", "server": MCPServer.ORCHESTRATOR},
        {"name": "generate_report", "description": "Generate executive and engineer reports", "server": None},
    ],
    "simulate": [
        {"name": "retrieve_batch", "description": "Get batch baseline data", "server": MCPServer.MES},
        {"name": "run_simulation", "description": "Run what-if scenario", "server": MCPServer.SIMULATION},
        {"name": "interpret_result", "description": "Interpret and present simulation result", "server": None},
    ],
}


def classify_intent(query: str) -> str:
    """Rules-based fallback used when the NitroCloud model is unavailable."""
    q = query.lower()
    for intent, patterns in INTENT_PATTERNS.items():
        for pattern in patterns:
            if re.search(pattern, q):
                return intent
    return "show_evidence"


class PlannerAgent:
    """
    Agent 1 — Planner Agent
    Input: PlannerInput (user query, conversation history, UI context)
    Output: ExecutionPlan (intent, tasks, agents, servers, execution order)
    """

    def __init__(self, llm: NitroChatClient | None = None) -> None:
        self.llm = llm or NitroChatClient()
        self.last_trace: dict = {}

    def plan(self, inp: PlannerInput) -> ExecutionPlan:
        fallback_intent = classify_intent(inp.user_query)
        call = self.llm.complete_json(
            agent="Planner",
            system_prompt=(
                "Classify the manufacturing request and create a short investigation plan. "
                "Allowed intents: show_evidence, explain_exclusion, compare_options, "
                "constraint_query, generate_report, simulate. Do not invent evidence. "
                "Extract explicit operational constraints from the user's words. "
                "Return {\"intent\": string, \"rationale\": string, "
                "\"constraints\": {\"no_supplier_change\": boolean, "
                "\"supplier_freeze\": boolean}}."
            ),
            payload={
                "query": inp.user_query,
                "incident_id": inp.incident_id,
                "batch_id": inp.batch_id,
                "constraints": inp.constraints,
            },
        )
        candidate = str(call.data.get("intent", ""))
        intent = candidate if candidate in INTENT_TO_TASKS else fallback_intent
        constraints = dict(inp.constraints)
        model_constraints = call.data.get("constraints", {})
        if isinstance(model_constraints, dict):
            for key in ("no_supplier_change", "supplier_freeze"):
                if isinstance(model_constraints.get(key), bool):
                    constraints[key] = model_constraints[key]
        normalized_query = inp.user_query.lower()
        if (
            "supplier freeze" in normalized_query
            or "cannot change supplier" in normalized_query
            or "can't change supplier" in normalized_query
        ):
            constraints["no_supplier_change"] = True
            constraints["supplier_freeze"] = True
        self.last_trace = {
            "agent": "planner",
            "status": "complete" if call.live else "fallback",
            "durationMs": call.latency_ms,
            "model": call.model,
            "summary": str(call.data.get("rationale", "Rule-based plan used.")),
            "error": call.error,
            "attempts": call.attempts,
        }
        task_specs = INTENT_TO_TASKS.get(intent, INTENT_TO_TASKS["show_evidence"])

        tasks = [
            Task(
                task_id=f"task_{i+1:02d}",
                name=spec["name"],
                description=spec["description"],
                order=i + 1,
                required_server=spec.get("server"),
            )
            for i, spec in enumerate(task_specs)
        ]

        return ExecutionPlan(
            intent=intent,
            tasks=tasks,
            required_agents=INTENT_TO_AGENTS.get(intent, [AgentName.RESEARCH, AgentName.ANALYSIS, AgentName.EXECUTION]),
            required_servers=INTENT_TO_SERVERS.get(intent, [MCPServer.ORCHESTRATOR]),
            expected_outputs=["conclusion", "evidence_refs", "ui_actions", "confidence"],
            execution_order=list(range(1, len(tasks) + 1)),
            constraints=constraints,
            raw_query=inp.user_query,
        )
