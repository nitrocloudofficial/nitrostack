"""Build frontend workbench snapshots from live NitroCloud MCP records."""

from __future__ import annotations

from typing import Any

from backend.mcp.nitro_mcp_client import NitroMCPClient
from backend.schemas.analysis_models import AnalysisResult
from backend.schemas.research_models import EvidenceBundle


BASE_TOOL_CALLS: tuple[tuple[str, dict[str, Any]], ...] = (
    ("get_incident_summary", {"incident_id": "INC-2407-001"}),
    ("get_timeline", {"batch_id": "B-2407-184"}),
    ("get_causal_graph", {"batch_id": "B-2407-184"}),
    ("get_recommendations", {"batch_id": "B-2407-184"}),
    ("get_business_impact", {"batch_id": "B-2407-184"}),
)

SCENARIO_CALLS: tuple[tuple[str, dict[str, Any]], ...] = (
    ("Reduce queue delay below 60 minutes", {"queue_delay_minutes": 45}),
    ("Install humidity control", {"humidity_pct": 50}),
    ("Replace Machine 7", {"replace_machine_7": True}),
)


def load_live_workbench(
    incident_id: str = "INC-2407-001",
    batch_id: str = "B-2407-184",
) -> dict[str, Any]:
    """Retrieve the current incident workspace directly from the deployed MCP."""
    records: dict[str, Any] = {}
    simulations: list[Any] = []
    trace: list[dict[str, Any]] = []
    errors: list[str] = []

    try:
        with NitroMCPClient() as client:
            available = {tool.get("name") for tool in client.list_tools()}
            for name, default_args in BASE_TOOL_CALLS:
                if name not in available:
                    errors.append(f"{name} is not available")
                    continue
                args = dict(default_args)
                if "incident_id" in args:
                    args["incident_id"] = incident_id
                if "batch_id" in args:
                    args["batch_id"] = batch_id
                value, step = client.call_tool(name, args)
                records[name] = value
                trace.append(step)

            if "run_scenario" in available:
                for scenario_name, parameters in SCENARIO_CALLS:
                    value, step = client.call_tool(
                        "run_scenario",
                        {"scenario_name": scenario_name, "parameters": parameters},
                    )
                    simulations.append(value)
                    trace.append(step)
    except Exception as exc:
        errors.append(str(exc))

    required = {name for name, _ in BASE_TOOL_CALLS}
    live = required.issubset(records) and all(
        step.get("status") == "complete" for step in trace
    )
    return {
        "source": "nitrocloud_mcp" if live else "degraded_fallback",
        "live": live,
        "incident": records.get("get_incident_summary", {}),
        "timeline": records.get("get_timeline", {}),
        "graph": records.get("get_causal_graph", {}),
        "recommendations": records.get("get_recommendations", {}),
        "business_impact": records.get("get_business_impact", {}),
        "simulations": simulations,
        "root_causes": [],
        "tool_trace": trace,
        "errors": errors,
    }


def build_pipeline_workbench(
    evidence: EvidenceBundle,
    analysis: AnalysisResult,
) -> dict[str, Any]:
    """Combine MCP records with the current agent analysis for the frontend."""
    records = evidence.evidence_by_tool
    raw_recommendations = _items(
        records.get("get_recommendations"),
        "recommendations",
    )
    recommendations: list[dict[str, Any]] = []
    for index, recommendation in enumerate(analysis.recommendations):
        raw = raw_recommendations[index] if index < len(raw_recommendations) else {}
        impact = recommendation.business_impact
        recommendations.append({
            "rank": recommendation.rank,
            "action": recommendation.title,
            "confidence": recommendation.confidence_pct / 100,
            "predicted_yield": recommendation.predicted_yield_pct,
            "cost": recommendation.cost_estimate,
            "cost_inr": raw.get("cost_inr", 0),
            "implementation": recommendation.implementation_speed,
            "impact": raw.get(
                "impact",
                "High" if recommendation.yield_recovery_pct >= 10 else "Low",
            ),
            "risk": raw.get("risk", "Low" if recommendation.rank == 1 else "Medium"),
            "evidence_refs": raw.get(
                "evidence_refs",
                [f"sim:{recommendation.business_impact.get('calculation_basis', recommendation.rank)}"],
            ),
            "description": raw.get(
                "description",
                f"Agent-ranked intervention with {recommendation.yield_recovery_pct:.1f} yield points of predicted recovery.",
            ),
            "savings_per_week_inr": raw.get(
                "savings_per_week_inr",
                round(float(impact.get("monthly_loss_avoided_inr", 0)) / 4),
            ),
            "agent_score": recommendation.score,
        })

    required = {
        "get_incident_summary",
        "get_timeline",
        "get_causal_graph",
        "get_recommendations",
        "get_business_impact",
    }
    return {
        "source": "nitrocloud_agents_and_mcp",
        "live": required.issubset(records),
        "incident": records.get("get_incident_summary", {}),
        "timeline": records.get("get_timeline", {}),
        "graph": records.get("get_causal_graph", {}),
        "recommendations": {"recommendations": recommendations},
        "business_impact": records.get(
            "get_business_impact",
            analysis.business_impact,
        ),
        "simulations": [
            simulation.model_dump() for simulation in analysis.simulation_results
        ],
        "root_causes": [
            root.model_dump() for root in analysis.root_causes
        ],
        "tool_trace": evidence.tool_trace,
        "errors": [],
    }


def evidence_refs_for_intent(
    intent: str,
    evidence: EvidenceBundle,
    fallback: list[str],
) -> list[str]:
    """Return UI-addressable timeline, graph, and simulation references."""
    recommendations = _items(
        evidence.evidence_by_tool.get("get_recommendations"),
        "recommendations",
    )
    if not recommendations:
        return fallback

    indexes = {
        "explain_exclusion": [2],
        "compare_options": list(range(len(recommendations))),
    }.get(intent, [0])
    refs: list[str] = []
    for index in indexes:
        if index >= len(recommendations):
            continue
        value = recommendations[index].get("evidence_refs", [])
        if isinstance(value, list):
            refs.extend(str(item) for item in value)
    return list(dict.fromkeys(refs)) or fallback


def _items(value: Any, key: str) -> list[dict[str, Any]]:
    if isinstance(value, dict) and isinstance(value.get(key), list):
        return [item for item in value[key] if isinstance(item, dict)]
    return []
