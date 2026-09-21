"""Agent 2: choose and execute read-only evidence tools on the live NitroCloud MCP."""

from __future__ import annotations

from typing import Any

from backend.llm.nitrochat_client import NitroChatClient
from backend.mcp.nitro_mcp_client import NitroMCPClient
from backend.schemas.research_models import ResearchInput, EvidenceBundle


TOOL_ARGUMENTS: dict[str, dict[str, Any]] = {
    "get_incident_summary": {"incident_id": "INC-2407-001"},
    "get_batch_history": {"batch_id": "B-2407-184"},
    "get_production_path": {"batch_id": "B-2407-184"},
    "get_queue_events": {"batch_id": "B-2407-184"},
    "get_machine_alerts": {"machine_id": "MCH-B-007", "time_range": "incident"},
    "get_maintenance_state": {"machine_id": "MCH-B-007"},
    "get_defect_records": {"batch_id": "B-2407-184"},
    "get_inspection_results": {"batch_id": "B-2407-184"},
    "get_supplier_lot_info": {"lot_id": "LOT-SUP-2407-88"},
    "get_material_constraints": {"material_type": "Bearing Steel"},
    "get_timeline": {"batch_id": "B-2407-184"},
    "get_causal_graph": {"batch_id": "B-2407-184"},
    "get_recommendations": {"batch_id": "B-2407-184"},
    "get_business_impact": {"batch_id": "B-2407-184"},
}

INTENT_TOOLS = {
    "show_evidence": ["get_incident_summary", "get_batch_history", "get_queue_events", "get_inspection_results", "get_timeline", "get_causal_graph"],
    "explain_exclusion": ["get_incident_summary", "get_queue_events", "get_machine_alerts", "get_maintenance_state", "get_causal_graph"],
    "compare_options": ["get_incident_summary", "get_queue_events", "get_machine_alerts", "get_inspection_results", "get_causal_graph"],
    "constraint_query": ["get_incident_summary", "get_supplier_lot_info", "get_material_constraints", "get_recommendations"],
    "generate_report": ["get_incident_summary", "get_timeline", "get_causal_graph", "get_recommendations", "get_business_impact"],
    "simulate": ["get_incident_summary", "get_batch_history", "get_queue_events"],
}

WORKBENCH_TOOLS = [
    "get_incident_summary",
    "get_timeline",
    "get_causal_graph",
    "get_recommendations",
    "get_business_impact",
]


class ResearchAgent:
    def __init__(self, llm: NitroChatClient | None = None) -> None:
        self.llm = llm or NitroChatClient()
        self.last_trace: dict[str, Any] = {}

    def retrieve(self, inp: ResearchInput) -> EvidenceBundle:
        fallback_tools = INTENT_TOOLS.get(inp.execution_plan.intent, INTENT_TOOLS["show_evidence"])
        call = self.llm.complete_json(
            agent="Research",
            system_prompt=(
                "Select the minimum read-only MCP tools needed to answer the request. "
                f"Allowed tools: {', '.join(TOOL_ARGUMENTS)}. Never select mutation tools. "
                "Return {\"tool_names\": [string], \"research_goal\": string}."
            ),
            payload={
                "query": inp.execution_plan.raw_query,
                "intent": inp.execution_plan.intent,
                "planned_servers": [value.value for value in inp.execution_plan.required_servers],
            },
        )
        selected = call.data.get("tool_names", [])
        if not isinstance(selected, list):
            selected = []
        selected_tool_names = [
            name for name in selected
            if isinstance(name, str) and name in TOOL_ARGUMENTS
        ][:8]
        used_safe_tool_selection = not call.live or not selected_tool_names
        tool_names = list(dict.fromkeys(WORKBENCH_TOOLS + selected_tool_names))
        if len(tool_names) < 2:
            tool_names = fallback_tools

        bundle = EvidenceBundle()
        try:
            with NitroMCPClient() as client:
                available = {tool.get("name") for tool in client.list_tools()}
                for name in tool_names:
                    if name not in available:
                        continue
                    args = dict(TOOL_ARGUMENTS[name])
                    if "incident_id" in args:
                        args["incident_id"] = inp.incident_id
                    if "batch_id" in args:
                        args["batch_id"] = inp.batch_id
                    value, trace = client.call_tool(name, args)
                    bundle.evidence_by_tool[name] = value
                    bundle.tool_trace.append(trace)
                    bundle.retrieval_sources.append(f"nitro-mcp:{name}")
        except Exception as exc:
            bundle.tool_trace.append({
                "id": "mcp-connection",
                "server": "NitroCloud MCP",
                "tool": "initialize",
                "status": "error",
                "durationMs": 0,
                "records": [],
                "error": str(exc),
            })

        bundle.batch_history = _as_dict(
            bundle.evidence_by_tool.get("get_batch_history")
            or bundle.evidence_by_tool.get("get_incident_summary")
        )
        bundle.machine_history = _as_dict(bundle.evidence_by_tool.get("get_maintenance_state"))
        bundle.quality_data = _as_dict(
            bundle.evidence_by_tool.get("get_inspection_results")
            or bundle.evidence_by_tool.get("get_defect_records")
        )
        bundle.causal_graph = _as_dict(bundle.evidence_by_tool.get("get_causal_graph"))
        bundle.timeline_events = _as_list(bundle.evidence_by_tool.get("get_timeline"))
        bundle.maintenance_logs = _as_list(bundle.evidence_by_tool.get("get_machine_alerts"))
        bundle.historical_incidents = _as_list(bundle.evidence_by_tool.get("get_recommendations"))
        bundle.constraints = {
            "material": bundle.evidence_by_tool.get("get_material_constraints", {}),
            "supplier": bundle.evidence_by_tool.get("get_supplier_lot_info", {}),
            "business_impact": bundle.evidence_by_tool.get("get_business_impact", {}),
        }
        has_required_evidence = all(
            name in bundle.evidence_by_tool
            for name in WORKBENCH_TOOLS
        )
        if not used_safe_tool_selection and has_required_evidence:
            status = "complete"
        elif has_required_evidence:
            status = "complete_with_safe_tool_selection"
        else:
            status = "fallback"
        self.last_trace = {
            "agent": "research",
            "status": status,
            "durationMs": call.latency_ms + sum(int(t.get("durationMs", 0)) for t in bundle.tool_trace),
            "model": call.model,
            "summary": str(call.data.get(
                "research_goal",
                (
                    f"Retrieved {len(bundle.retrieval_sources)} live MCP evidence sources "
                    "using the verified safe tool plan."
                ),
            )),
            "error": call.error,
            "attempts": call.attempts,
        }
        return bundle


def _as_dict(value: Any) -> dict[str, Any]:
    return value if isinstance(value, dict) else {"data": value} if value is not None else {}


def _as_list(value: Any) -> list[dict[str, Any]]:
    if isinstance(value, list):
        return [item for item in value if isinstance(item, dict)]
    if isinstance(value, dict):
        for key in ("events", "alerts", "recommendations", "items"):
            if isinstance(value.get(key), list):
                return [item for item in value[key] if isinstance(item, dict)]
    return []
