"""
predict_failure.py

This is the backend logic for the Maintenance Agent's `predict_failure` MCP tool.
It reads a machine's live sensor block from ../state.json and scores it with the
RandomForest model trained on the REAL AI4I 2020 dataset (see train_model.py).

Why this matters for the demo:
  Your crisis scenario JSON files control WHEN and HOW DRAMATICALLY a machine's
  numbers change (deterministic, rehearsable, judge-proof timing). This script
  is what makes the diagnosis itself a genuine model inference rather than a
  hardcoded string — the confidence score you show on screen is real.

Usage (CLI, for testing):
  python3 predict_failure.py M12

Usage (as a module, for your MCP server / Express backend):
  from predict_failure import predict_failure
  result = predict_failure("M12")
  # -> {"machine": "M12", "failure_probability": 0.91, "risk_level": "critical",
  #     "likely_cause": "...", "top_factors": [...]}

Wire this into your MCP tool handler for `predict_failure(machine_id)` so the
Maintenance Agent calls this function and returns its JSON result to the LLM,
which then narrates the reasoning (e.g. "Bearing failure likely, confidence 91%").
"""

import json
import os
import joblib

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATE_PATH = os.path.join(BASE_DIR, "..", "state.json")
MODEL_PATH = os.path.join(BASE_DIR, "failure_model.pkl")
ENCODER_PATH = os.path.join(BASE_DIR, "type_encoder.pkl")

_model = None
_encoder = None


def _load_model():
    global _model, _encoder
    if _model is None:
        _model = joblib.load(MODEL_PATH)
        _encoder = joblib.load(ENCODER_PATH)
    return _model, _encoder


def _risk_level(prob):
    if prob >= 0.75:
        return "critical"
    if prob >= 0.40:
        return "elevated"
    if prob >= 0.15:
        return "watch"
    return "normal"


def _likely_cause(sensors, prob):
    """Lightweight rule-of-thumb explanation layered on top of the model's
    probability, using the same physical relationships AI4I is built on.
    This is just for human-readable narration — the probability itself
    comes from the trained model, not from these rules."""
    torque = sensors["torque_nm"]
    tool_wear = sensors["tool_wear_min"]
    rpm = sensors["rotational_speed_rpm"]
    process_temp = sensors["process_temperature_k"]
    air_temp = sensors["air_temperature_k"]

    if prob < 0.15:
        return "No significant failure signature detected."

    overstrain_score = torque * tool_wear
    heat_dissipation_delta = process_temp - air_temp

    if overstrain_score > 11000:
        return "Overstrain pattern (high torque sustained with high tool wear) — consistent with bearing/mechanical failure."
    if heat_dissipation_delta < 8.6 and rpm < 1380:
        return "Heat dissipation pattern (low speed, poor temperature differential) — consistent with cooling or lubrication failure."
    if rpm < 1350 and torque > 55:
        return "Power/torque imbalance — consistent with motor or drivetrain strain."
    return "Elevated failure risk detected; pattern doesn't map cleanly to a single known mode — recommend manual inspection."


def predict_failure(machine_id):
    with open(STATE_PATH) as f:
        state = json.load(f)

    machine = state["machines"].get(machine_id)
    if machine is None:
        raise ValueError(f"Unknown machine_id: {machine_id}")
    if "sensors" not in machine:
        raise ValueError(f"Machine {machine_id} has no 'sensors' block in state.json")

    sensors = machine["sensors"]
    model, encoder = _load_model()

    type_encoded = encoder.transform([sensors["type"]])[0]
    features = [[
        type_encoded,
        sensors["air_temperature_k"],
        sensors["process_temperature_k"],
        sensors["rotational_speed_rpm"],
        sensors["torque_nm"],
        sensors["tool_wear_min"],
    ]]

    prob = float(model.predict_proba(features)[0][1])

    return {
        "machine": machine_id,
        "machine_name": machine.get("name"),
        "failure_probability": round(prob, 4),
        "confidence_pct": round(prob * 100, 1),
        "risk_level": _risk_level(prob),
        "likely_cause": _likely_cause(sensors, prob),
        "model_source": "RandomForest trained on AI4I 2020 (UCI ML Repository, 10,000 real industrial samples)",
        "input_sensors": sensors,
    }


if __name__ == "__main__":
    import sys
    machine_id = sys.argv[1] if len(sys.argv) > 1 else "M12"
    result = predict_failure(machine_id)
    print(json.dumps(result, indent=2))
