import os
import json

class PromptIQUtilityEngine:
    def __init__(self, profiles_path=None):
        if profiles_path is None:
            base_dir = os.path.dirname(os.path.abspath(__file__))
            profiles_path = os.path.join(base_dir, "business_profiles.json")
        
        self.profiles = {}
        if os.path.exists(profiles_path):
            with open(profiles_path, "r", encoding="utf-8") as f:
                self.profiles = json.load(f).get("profiles", {})

    def evaluate_utility_score(self, cand_data, prompt_tokens=100, mode="balanced", business_constraints=None):
        """
        Evaluates dynamic multi-objective PromptIQ Utility Score for a candidate model.
        """
        weights = self.profiles.get(mode, self.profiles.get("balanced", {
            "w_satisfaction": 0.35, "w_capability_fit": 0.25, "w_cost": 0.25, "w_latency": 0.10, "w_retry": 0.05
        }))

        pred_sat = cand_data.get("predictedSatisfaction", 85.0)
        cap_fit = cand_data.get("capabilityFit", 85.0)
        total_cost = cand_data.get("totalCostPerRequest", 0.0001)
        pred_lat = cand_data.get("predictedLatencySec", 2.0)
        pred_ret = cand_data.get("predictedRetries", 0.2)

        norm_sat = max(0.0, min(1.0, pred_sat / 100.0))
        norm_fit = max(0.0, min(1.0, cap_fit / 100.0))

        # Dynamic token-based reference cost
        ref_cost = max(0.0001, (prompt_tokens / 1_000_000.0) * 8.0 + 0.0002)
        norm_cost = min(1.0, total_cost / ref_cost)
        norm_lat = min(1.0, pred_lat / 10.0)
        norm_retry = min(1.0, pred_ret / 3.0)

        w_sum = (
            weights["w_satisfaction"] * norm_sat +
            weights["w_capability_fit"] * norm_fit -
            weights["w_cost"] * norm_cost -
            weights["w_latency"] * norm_lat -
            weights["w_retry"] * norm_retry
        )

        total_w = sum([v for k, v in weights.items() if k.startswith("w_")])
        raw_score = (w_sum / max(0.01, total_w)) * 100.0

        # Business Constraint Penalties
        bc = business_constraints or {}
        penalty = 0.0
        if bc.get("maxCostPerRequest") and total_cost > bc["maxCostPerRequest"]:
            penalty += 25.0
        if bc.get("maxLatencySec") and pred_lat > bc["maxLatencySec"]:
            penalty += 20.0
        if bc.get("minQualityThreshold") and cap_fit < bc["minQualityThreshold"]:
            penalty += 30.0

        final_score = max(0.0, min(100.0, raw_score - penalty))
        return round(final_score, 2)

if __name__ == "__main__":
    engine = PromptIQUtilityEngine()
    score = engine.evaluate_utility_score({"predictedSatisfaction": 90, "capabilityFit": 92, "totalCostPerRequest": 0.00005, "predictedLatencySec": 1.2, "predictedRetries": 0.1})
    print("[Utility Engine] Evaluation score test output:", score)
