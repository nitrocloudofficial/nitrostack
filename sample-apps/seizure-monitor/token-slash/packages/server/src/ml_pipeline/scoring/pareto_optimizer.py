import os
import json
import numpy as np

class ParetoOptimizer:
    """
    Computes Pareto-Optimal Frontier across multi-objective criteria:
    - Maximize Expected Satisfaction
    - Maximize Capability Match
    - Minimize Total Request Cost
    - Minimize Latency
    - Minimize Retry Count
    """
    def __init__(self):
        pass

    def compute_pareto_frontier(self, candidate_results):
        """
        Filters non-dominated candidate AI models on the Pareto frontier.
        A candidate is Pareto-optimal if no other candidate is better in ALL objectives.
        """
        if not candidate_results:
            return []

        pareto_candidates = []
        for i, cand_a in enumerate(candidate_results):
            dominated = False
            for j, cand_b in enumerate(candidate_results):
                if i == j:
                    continue
                # B dominates A if B is >= in all good criteria and strictly > in at least one
                b_better_sat = cand_b["predictedSatisfaction"] >= cand_a["predictedSatisfaction"]
                b_better_fit = cand_b["capabilityFit"] >= cand_a["capabilityFit"]
                b_better_cost = cand_b["totalCostPerRequest"] <= cand_a["totalCostPerRequest"]
                b_better_lat = cand_b["predictedLatencySec"] <= cand_a["predictedLatencySec"]
                b_better_ret = cand_b["predictedRetries"] <= cand_a["predictedRetries"]

                b_strictly_better = (
                    cand_b["predictedSatisfaction"] > cand_a["predictedSatisfaction"] or
                    cand_b["capabilityFit"] > cand_a["capabilityFit"] or
                    cand_b["totalCostPerRequest"] < cand_a["totalCostPerRequest"] or
                    cand_b["predictedLatencySec"] < cand_a["predictedLatencySec"] or
                    cand_b["predictedRetries"] < cand_a["predictedRetries"]
                )

                if b_better_sat and b_better_fit and b_better_cost and b_better_lat and b_better_ret and b_strictly_better:
                    dominated = True
                    break

            cand_a_copy = dict(cand_a)
            cand_a_copy["isParetoOptimal"] = not dominated
            pareto_candidates.append(cand_a_copy)

        return pareto_candidates

if __name__ == "__main__":
    opt = ParetoOptimizer()
    cands = [
        {"model": "deepseek-v3", "predictedSatisfaction": 84.0, "capabilityFit": 89.5, "totalCostPerRequest": 0.000022, "predictedLatencySec": 1.0, "predictedRetries": 0.3},
        {"model": "gpt-4o-mini", "predictedSatisfaction": 77.5, "capabilityFit": 79.5, "totalCostPerRequest": 0.000043, "predictedLatencySec": 1.15, "predictedRetries": 0.37},
        {"model": "o3-mini", "predictedSatisfaction": 94.0, "capabilityFit": 97.5, "totalCostPerRequest": 0.000255, "predictedLatencySec": 2.31, "predictedRetries": 0.11}
    ]
    res = opt.compute_pareto_frontier(cands)
    print("[Pareto Optimizer] Execution test completed. Pareto candidates computed.")
