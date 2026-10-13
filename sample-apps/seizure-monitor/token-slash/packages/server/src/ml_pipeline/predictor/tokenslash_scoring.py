import os
import json
import numpy as np

def calculate_promptiq_score(
    predicted_satisfaction,
    predicted_retries,
    predicted_latency,
    estimated_cost,
    hidden_retry_cost,
    model_capability_fit,
    estimated_tokens=50,
    weights=None,
    business_constraints=None,
    mode="balanced"
):
    """
    Mathematically rigorous multi-objective PromptIQ Score engine with dynamic cost normalizer.
    
    Formula:
      TotalCost = Cost + HiddenRetryCost
      NormSat   = Satisfaction / 100
      NormFit   = CapabilityFit / 100
      NormCost  = min(1.0, TotalCost / DynamicRefCost)
      NormLat   = min(1.0, Latency / 10.0)
      NormRetry = min(1.0, Retries / 3.0)
      
      Score = 100 * (w_sat * NormSat + w_fit * NormFit - w_cost * NormCost - w_lat * NormLat - w_retry * NormRetry) - Penalties
    """
    # Dynamic mode weights
    mode_weights = {
        "balanced": {
            "w_satisfaction": 0.35,
            "w_capability_fit": 0.25,
            "w_cost": 0.25,
            "w_latency": 0.10,
            "w_retry": 0.05
        },
        "low_cost": {
            "w_satisfaction": 0.25,
            "w_capability_fit": 0.15,
            "w_cost": 0.45,
            "w_latency": 0.10,
            "w_retry": 0.05
        },
        "high_quality": {
            "w_satisfaction": 0.45,
            "w_capability_fit": 0.35,
            "w_cost": 0.10,
            "w_latency": 0.05,
            "w_retry": 0.05
        },
        "low_latency": {
            "w_satisfaction": 0.30,
            "w_capability_fit": 0.20,
            "w_cost": 0.15,
            "w_latency": 0.30,
            "w_retry": 0.05
        }
    }

    w = weights or mode_weights.get(mode, mode_weights["balanced"])
    bc = business_constraints or {}

    total_cost = estimated_cost + hidden_retry_cost
    norm_sat = max(0.0, min(1.0, predicted_satisfaction / 100.0))
    norm_fit = max(0.0, min(1.0, model_capability_fit / 100.0))

    # Dynamic Token-Based Cost Reference (Prevents cost compression & enables simple query routing)
    # Simple query (~20 tokens): Ref Cost ~$0.0003 -> $0.0015 prompt produces heavy cost penalty.
    # Complex query (~500 tokens): Ref Cost ~$0.005 -> higher tier models justified.
    dynamic_ref_cost = max(0.0001, (estimated_tokens / 1_000_000.0) * 8.0 + 0.0002)
    norm_cost = min(1.0, total_cost / dynamic_ref_cost)
    norm_lat = min(1.0, predicted_latency / 10.0)
    norm_retry = min(1.0, predicted_retries / 3.0)

    # Multi-objective calculation
    w_sum = (
        w["w_satisfaction"] * norm_sat +
        w["w_capability_fit"] * norm_fit -
        w["w_cost"] * norm_cost -
        w["w_latency"] * norm_lat -
        w["w_retry"] * norm_retry
    )

    total_w = sum(w.values())
    raw_score = (w_sum / max(0.01, total_w)) * 100.0

    # Business Constraint Penalties
    penalty = 0.0
    if bc.get("maxCostPerRequest") and total_cost > bc["maxCostPerRequest"]:
        penalty += 25.0
    if bc.get("maxLatencySec") and predicted_latency > bc["maxLatencySec"]:
        penalty += 20.0
    if bc.get("minQualityThreshold") and model_capability_fit < bc["minQualityThreshold"]:
        penalty += 30.0

    final_score = max(0.0, min(100.0, raw_score - penalty))
    return round(final_score, 2)
