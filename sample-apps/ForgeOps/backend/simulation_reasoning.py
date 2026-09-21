"""Parameter-sensitive reasoning for ForgeOps what-if simulations.

The deployed MCP remains the source of the incident baseline and scenario
identity. This layer reconciles that evidence with the exact controls selected
in the frontend so stale preset responses can never contradict the UI.
"""

from __future__ import annotations

from typing import Any


BASELINE_YIELD = 82.0
OBSERVED_QUEUE_DELAY = 198.0
OBSERVED_HUMIDITY = 68.5


def _number(values: dict[str, Any], key: str, fallback: float) -> float:
    value = values.get(key, fallback)
    try:
        return float(value)
    except (TypeError, ValueError):
        return fallback


def _clamp(value: float, minimum: float, maximum: float) -> float:
    return max(minimum, min(maximum, value))


def _range_warnings(queue: float, humidity: float, temperature: float) -> list[str]:
    warnings: list[str] = []
    if not 0 <= queue <= 240:
        warnings.append("Queue delay is outside the validated 0–240 minute range.")
    if not 30 <= humidity <= 75:
        warnings.append("Humidity is outside the validated 30–75% RH range.")
    if not 18 <= temperature <= 32:
        warnings.append("Temperature is outside the validated 18–32°C range.")
    return warnings


def reconcile_simulation(
    scenario_name: str,
    inputs: dict[str, Any],
    constraints: dict[str, Any],
    mcp_result: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Return a coherent result grounded in the selected scenario and inputs."""

    name = scenario_name.lower()
    queue = _number(inputs, "queue_delay_minutes", OBSERVED_QUEUE_DELAY)
    humidity = _number(inputs, "humidity_pct", OBSERVED_HUMIDITY)
    temperature = _number(inputs, "temperature_c", 31.4)
    warnings = _range_warnings(queue, humidity, temperature)
    in_range = not warnings
    supplier_freeze = bool(constraints.get("no_supplier_change", False))
    constraint_text = str(constraints.get("constraint_text", "")).strip()

    scenario_id = "sim_001"
    display_name = "Incident baseline"
    predicted = BASELINE_YIELD
    confidence = 0.95
    cost = "None"
    effort = "None"
    assumptions = ["All observed conditions held constant."]
    reasoning = "No intervention is applied, so the incident yield remains at 82%."

    if "queue" in name or "delay" in name or "014" in name:
        scenario_id = "sim_014"
        display_name = f"Reduce queue delay to {queue:.0f} min"
        recovery = 14 * _clamp(
            (OBSERVED_QUEUE_DELAY - queue) / (OBSERVED_QUEUE_DELAY - 45),
            0,
            1,
        )
        credited_recovery = recovery if in_range else recovery * 0.5
        predicted = BASELINE_YIELD + credited_recovery
        confidence = 0.96 - min(0.18, abs(queue - 45) / 850)
        cost = "Low · ₹15k"
        effort = "Easy · scheduling adjustment"
        assumptions = [
            f"Queue delay is reduced from 198 to {queue:.0f} minutes.",
            f"Humidity is held at {humidity:g}% RH.",
            "Machine 7 condition is held constant.",
        ]
        reasoning = (
            f"Queue delay is the strongest controllable cause (89% influence). "
            f"Moving it from 198 to {queue:.0f} minutes recovers "
            f"{credited_recovery:.1f} yield points; the estimate does not credit a "
            "Machine 7 replacement."
        )
        if queue >= 60:
            warnings.append(
                f"Queue delay remains above the <60 minute target, so recovery is only {credited_recovery:.1f} points."
            )

    elif "humidity" in name or "hvac" in name or "016" in name:
        scenario_id = "sim_016"
        display_name = f"Control humidity at {humidity:g}% RH"
        recovery = 14 * _clamp(
            (OBSERVED_HUMIDITY - humidity) / (OBSERVED_HUMIDITY - 50),
            0,
            1,
        )
        credited_recovery = recovery if in_range else recovery * 0.5
        predicted = BASELINE_YIELD + credited_recovery
        confidence = 0.94 - min(0.18, abs(humidity - 50) / 140)
        cost = "High · ₹8.5L"
        effort = "Medium · HVAC installation, 1–2 weeks"
        assumptions = [
            f"Humidity is maintained at {humidity:g}% RH.",
            f"Queue delay remains at {queue:.0f} minutes.",
            "Machine 7 condition is held constant.",
        ]
        reasoning = (
            f"Humidity exceeded the 60% storage ceiling during the incident. "
            f"Controlling it from 68.5% to {humidity:g}% RH recovers "
            f"{credited_recovery:.1f} yield points while queue and machine conditions "
            "remain unchanged."
        )
        if humidity >= 55:
            warnings.append(
                f"Humidity remains above the <55% RH target, so recovery is only {credited_recovery:.1f} points."
            )

    elif "machine" in name or "grinder" in name or "015" in name:
        scenario_id = "sim_015"
        display_name = "Replace / overhaul Machine 7"
        predicted = 84.0
        confidence = 0.61
        cost = "High · ₹12L"
        effort = "Disruptive · 2–3 days downtime"
        assumptions = [
            f"Queue delay remains at {queue:.0f} minutes.",
            f"Humidity remains at {humidity:g}% RH.",
            "The replacement machine is fully operational.",
        ]
        reasoning = (
            "Machine 7 has a vibration alert, but its causal influence is only "
            "18%. Replacement recovers 2.0 yield points because the dominant "
            "queue-delay and humidity conditions remain."
        )
        warnings.append(
            "Machine replacement alone leaves the dominant queue-delay factor unchanged."
        )

    if not in_range:
        confidence = min(confidence, 0.55)
        warnings.insert(
            0,
            "One or more inputs are outside the validated operating range; treat this estimate as directional only.",
        )

    predicted = round(_clamp(predicted, 70, 99), 1)
    confidence = round(_clamp(confidence, 0.2, 0.99), 2)
    interval_width = round(1.5 + (1 - confidence) * 8, 1)
    if supplier_freeze:
        assumptions.append("Supplier changes remain frozen for 30 days.")
    if constraint_text:
        assumptions.append(f"Operator constraint applied: {constraint_text}")

    mcp_result = mcp_result or {}
    return {
        **mcp_result,
        "scenario_id": scenario_id,
        "scenario_name": display_name,
        "inputs": {
            "queue_delay_minutes": queue,
            "humidity_pct": humidity,
            "temperature_c": temperature,
            "replace_machine_7": bool(inputs.get("replace_machine_7", False)),
        },
        "baseline_yield": BASELINE_YIELD,
        "predicted_yield": predicted,
        "confidence": confidence,
        "confidence_interval": [
            round(max(0, predicted - interval_width), 1),
            round(min(100, predicted + interval_width), 1),
        ],
        "cost_estimate": cost,
        "implementation_effort": effort,
        "assumptions": assumptions,
        "in_validated_range": in_range,
        "within_validated_range": in_range,
        "warnings": warnings,
        "warning": warnings[0] if warnings else None,
        "reasoning": reasoning,
        "model_version": "forgeops-sim-v1.1",
    }
