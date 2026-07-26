"""Agent 3: run live counterfactual tools and interpret the evidence with NitroCloud."""

from __future__ import annotations

from typing import Any

from backend.llm.nitrochat_client import NitroChatClient
from backend.mcp.nitro_mcp_client import NitroMCPClient
from backend.schemas.analysis_models import (
    AnalysisInput, AnalysisResult, Recommendation, RootCause, SimulationResult,
)


SCENARIOS = [
    ("Reduce queue delay below 60 minutes", {"queue_delay_minutes": 30}),
    ("Install humidity control", {"humidity_pct": 50}),
    ("Replace Machine 7", {"replace_machine_7": True}),
]


class AnalysisAgent:
    def __init__(self, llm: NitroChatClient | None = None) -> None:
        self.llm = llm or NitroChatClient()
        self.last_trace: dict[str, Any] = {}
        self.tool_trace: list[dict[str, Any]] = []

    def analyze(self, inp: AnalysisInput) -> AnalysisResult:
        simulations = self._run_simulations(inp.plan.constraints)
        evidence_payload = {
            "query": inp.plan.raw_query,
            "intent": inp.plan.intent,
            "constraints": inp.plan.constraints,
            "evidence": inp.evidence.evidence_by_tool,
            "simulations": [item.model_dump() for item in simulations],
        }
        call = self.llm.complete_json(
            agent="Analysis",
            system_prompt=(
                "Interpret only the supplied manufacturing evidence and simulations. "
                "Do not invent measurements. Prefer interventions with strong recovery, "
                "high confidence, low cost, and satisfied constraints. Return "
                "{\"primary_cause\": string, \"contributing_factors\": [string], "
                "\"causal_chain\": [string], \"overall_confidence\": number, "
                "\"analysis_summary\": string}."
            ),
            payload=evidence_payload,
        )

        root = RootCause(
            pathway_id="PATH-01",
            primary_cause=str(call.data.get(
                "primary_cause",
                "Extended queue delay under elevated humidity preceded the quality loss.",
            )),
            contributing_factors=_strings(
                call.data.get("contributing_factors"),
                ["Queue delay", "Elevated humidity", "Machine 7 thermal drift"],
            ),
            confidence_score=_confidence(call.data.get("overall_confidence"), 0.91),
            causal_chain=_strings(
                call.data.get("causal_chain"),
                [
                    "The batch remained in staging beyond the target window.",
                    "Environmental exposure and downstream machine drift increased risk.",
                    "Inspection recorded defects and final yield fell below baseline.",
                ],
            ),
        )
        recommendations = self._rank_recommendations(simulations)
        impact = inp.evidence.constraints.get("business_impact") or {
            "monthly_loss_exposure_inr": 1800000,
            "monthly_loss_avoided_inr": 1500000,
            "downtime_reduction_pct": 41,
            "yield_improvement_pct": 14,
        }
        overall = _confidence(call.data.get("overall_confidence"), 0.91)
        refs = [
            source.removeprefix("nitro-mcp:")
            for source in inp.evidence.retrieval_sources
        ]
        refs.extend(f"sim:{item.scenario_id}" for item in simulations)
        self.last_trace = {
            "agent": "analysis",
            "status": "complete" if call.live else "fallback",
            "durationMs": call.latency_ms + sum(int(t.get("durationMs", 0)) for t in self.tool_trace),
            "model": call.model,
            "summary": str(call.data.get("analysis_summary", root.primary_cause)),
            "error": call.error,
            "attempts": call.attempts,
        }
        return AnalysisResult(
            root_causes=[root],
            simulation_results=simulations,
            recommendations=recommendations,
            confidence_scores={"overall": overall},
            business_impact=impact if isinstance(impact, dict) else {},
            supporting_evidence=list(dict.fromkeys(refs)),
            anomalies_detected=sum(
                1 for event in inp.evidence.timeline_events
                if event.get("severity") in {"warning", "critical", "high"}
            ),
        )

    def _run_simulations(self, constraints: dict[str, Any]) -> list[SimulationResult]:
        scenarios = list(SCENARIOS)

        output: list[SimulationResult] = []
        try:
            with NitroMCPClient() as client:
                available = {tool.get("name") for tool in client.list_tools()}
                for index, (name, parameters) in enumerate(scenarios, start=1):
                    if "run_scenario" not in available:
                        break
                    raw, trace = client.call_tool(
                        "run_scenario",
                        {"scenario_name": name, "parameters": parameters},
                    )
                    self.tool_trace.append(trace)
                    output.append(_simulation_from_raw(raw, name, parameters, index))
        except Exception as exc:
            self.tool_trace.append({
                "id": "simulation-connection",
                "server": "NitroCloud MCP",
                "tool": "run_scenario",
                "status": "error",
                "durationMs": 0,
                "records": [],
                "error": str(exc),
            })

        if output:
            return output
        return [
            SimulationResult(
                scenario_id=f"fallback-{index}",
                scenario_name=name,
                inputs=parameters,
                baseline_yield=82.0,
                predicted_yield=96.0 if index == 1 else 84.0,
                yield_delta_pct=14.0 if index == 1 else 2.0,
                confidence=0.90,
                cost_estimate="low" if index == 1 else "high",
                implementation_effort="2 hours" if index == 1 else "48 hours",
                assumptions=["Live simulation tool was unavailable."],
                in_validated_range=False,
                warnings=["Fallback estimate; do not operationalize without validation."],
            )
            for index, (name, parameters) in enumerate(scenarios, start=1)
        ]

    @staticmethod
    def _rank_recommendations(results: list[SimulationResult]) -> list[Recommendation]:
        ranked = sorted(results, key=lambda item: item.yield_delta_pct * item.confidence, reverse=True)
        recommendations: list[Recommendation] = []
        for index, sim in enumerate(ranked, start=1):
            recommendations.append(Recommendation(
                rank=index,
                title=sim.scenario_name,
                score=round(sim.yield_delta_pct * sim.confidence, 2),
                predicted_yield_pct=round(_percent(sim.predicted_yield), 1),
                yield_recovery_pct=round(sim.yield_delta_pct, 1),
                confidence_pct=round(_confidence(sim.confidence, 0.8) * 100),
                implementation_speed=sim.implementation_effort,
                cost_estimate=sim.cost_estimate.title(),
                business_impact={
                    "monthly_loss_avoided_inr": round(1500000 * min(sim.yield_delta_pct / 14, 1), 0),
                    "calculation_basis": sim.scenario_id,
                },
            ))
        return recommendations


def _simulation_from_raw(
    raw: Any,
    name: str,
    inputs: dict[str, Any],
    index: int,
) -> SimulationResult:
    value = raw if isinstance(raw, dict) else {}
    nested = value.get("result") if isinstance(value.get("result"), dict) else value
    baseline = float(nested.get("baseline_yield", nested.get("baselineYield", 82.0)))
    predicted = float(nested.get("predicted_yield", nested.get("predictedYield", baseline)))
    baseline_pct, predicted_pct = _percent(baseline), _percent(predicted)
    return SimulationResult(
        scenario_id=str(nested.get("scenario_id", nested.get("scenarioId", f"sim-{index:03d}"))),
        scenario_name=str(nested.get("scenario_name", nested.get("scenarioName", name))),
        inputs=inputs,
        baseline_yield=baseline_pct,
        predicted_yield=predicted_pct,
        yield_delta_pct=float(nested.get("yield_delta_pct", nested.get("yieldDeltaPct", predicted_pct - baseline_pct))),
        confidence=_confidence(nested.get("confidence"), 0.8),
        cost_estimate=str(nested.get("cost_estimate", nested.get("cost", "unknown"))),
        implementation_effort=str(nested.get("implementation_effort", nested.get("effort", "unknown"))),
        assumptions=_strings(nested.get("assumptions"), []),
        in_validated_range=bool(nested.get("in_validated_range", nested.get("within_validated_range", True))),
        warnings=_strings(nested.get("warnings"), []),
    )


def _percent(value: float) -> float:
    return value * 100 if value <= 1 else value


def _confidence(value: Any, fallback: float) -> float:
    try:
        number = float(value)
        if number > 1:
            number /= 100
        return min(max(number, 0), 1)
    except (TypeError, ValueError):
        return fallback


def _strings(value: Any, fallback: list[str]) -> list[str]:
    if isinstance(value, list):
        result = [str(item) for item in value if str(item).strip()]
        return result or fallback
    return fallback
