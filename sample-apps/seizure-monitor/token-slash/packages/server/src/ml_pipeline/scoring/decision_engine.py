import os
import json

try:
    from .pareto_optimizer import ParetoOptimizer
    from .utility_engine import PromptIQUtilityEngine
    from .cost_optimizer import CostOptimizer
except (ImportError, ValueError):
    import sys
    base_dir = os.path.dirname(os.path.abspath(__file__))
    if base_dir not in sys.path:
        sys.path.append(base_dir)
    from pareto_optimizer import ParetoOptimizer
    from utility_engine import PromptIQUtilityEngine
    from cost_optimizer import CostOptimizer

class PromptIQDecisionEngine:
    def __init__(self):
        self.pareto_opt = ParetoOptimizer()
        self.utility_eng = PromptIQUtilityEngine()
        self.cost_opt = CostOptimizer()

    def make_recommendation(self, candidate_results, prompt_text="", mode="balanced", business_constraints=None):
        """
        Executes end-to-end multi-objective decision optimization:
        1. Calculates Pareto Frontier across candidates
        2. Evaluates dynamic utility score per candidate
        3. Ranks candidates and generates explainable AI decision reasoning
        """
        if not candidate_results:
            raise ValueError("Candidate results list cannot be empty.")

        prompt_tokens = int(len(prompt_text.split()) * 1.35) + 10

        # Step 1: Pareto frontier calculation
        pareto_candidates = self.pareto_opt.compute_pareto_frontier(candidate_results)

        # Step 2: Utility Scoring
        scored_candidates = []
        for cand in pareto_candidates:
            cand_copy = dict(cand)
            score = self.utility_eng.evaluate_utility_score(
                cand_copy,
                prompt_tokens=prompt_tokens,
                mode=mode,
                business_constraints=business_constraints
            )
            cand_copy["promptiqScore"] = score
            scored_candidates.append(cand_copy)

        # Step 3: Rank candidates by PromptIQ Score descending
        scored_candidates.sort(key=lambda x: x["promptiqScore"], reverse=True)
        winner = scored_candidates[0]
        runner_up = scored_candidates[1] if len(scored_candidates) > 1 else winner

        # Explainability reasoning synthesis
        reasoning = (
            f"PromptIQ Decision Engine selected {winner['model']} ({winner['provider']}) "
            f"with a top score of {winner['promptiqScore']}/100. "
            f"It delivers {winner['predictedSatisfaction']}% predicted satisfaction, "
            f"{winner['predictedLatencySec']}s response time, and ${winner['totalCostPerRequest']:.6f} per request cost. "
            f"Runner up {runner_up['model']} was rejected due to cost/utility trade-off."
        )

        trace = {
            "winner": winner["model"],
            "provider": winner["provider"],
            "promptiqScore": winner["promptiqScore"],
            "mode": mode,
            "reasoning": reasoning,
            "top5Candidates": scored_candidates[:5]
        }

        # Export decision trace
        base_dir = os.path.dirname(os.path.abspath(__file__))
        with open(os.path.join(base_dir, "decision_trace.json"), "w", encoding="utf-8") as f:
            json.dump(trace, f, indent=2)

        return trace

if __name__ == "__main__":
    eng = PromptIQDecisionEngine()
    cands = [
        {"model": "deepseek-v3", "provider": "DeepSeek", "predictedSatisfaction": 84.0, "capabilityFit": 89.5, "totalCostPerRequest": 0.000022, "predictedLatencySec": 1.0, "predictedRetries": 0.3},
        {"model": "o3-mini", "provider": "OpenAI", "predictedSatisfaction": 94.0, "capabilityFit": 97.5, "totalCostPerRequest": 0.000255, "predictedLatencySec": 2.31, "predictedRetries": 0.11}
    ]
    res = eng.make_recommendation(cands, prompt_text="What is the capital of France?")
    print("[Decision Engine] Execution test successful! Winner:", res["winner"])
