import os

os.environ["XGBOOST_LOG_LEVEL"] = "1"
os.environ["XGBOOST_VERBOSITY"] = "0"

import sys
import json
import pickle
import numpy as np
import warnings

warnings.filterwarnings('ignore')

try:
    import xgboost
except ImportError:
    pass

try:
    import lightgbm
except ImportError:
    pass

try:
    from ..features.feature_extractor import PromptIQFeatureExtractor
    from ..dataset.fetch_public_datasets import get_official_pricing_data, get_ai_benchmark_scores
    from .tokenslash_scoring import calculate_promptiq_score
except (ImportError, ValueError):
    import sys
    base_dir = os.path.dirname(os.path.abspath(__file__))
    sys.path.append(os.path.abspath(os.path.join(base_dir, "..")))
    from features.feature_extractor import PromptIQFeatureExtractor
    from dataset.fetch_public_datasets import get_official_pricing_data, get_ai_benchmark_scores
    try:
        from predictor.tokenslash_scoring import calculate_promptiq_score
    except ImportError:
        from tokenslash_scoring import calculate_promptiq_score

class PromptIQInferenceEngine:
    def __init__(self, models_dir=None):
        if models_dir is None:
            models_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "models")
        
        self.models_dir = models_dir
        self.extractor = PromptIQFeatureExtractor()
        self.pricing = get_official_pricing_data()
        self.benchmarks = get_ai_benchmark_scores()
        
        self.m1_sat = self._load_pickle("model1_satisfaction.pkl")
        self.m2_ret = self._load_pickle("model2_retries.pkl")
        self.m3_lat = self._load_pickle("model3_latency.pkl")
        self.meta_model = self._load_pickle("promptiq_meta_model.pkl")

    def _load_pickle(self, filename):
        path = os.path.join(self.models_dir, filename)
        if os.path.exists(path):
            try:
                with open(path, "rb") as f:
                    return pickle.load(f)
            except Exception as e:
                print(f"Notice: Loading fallback for {filename} ({e})")
                return None
        return None

    def predict_recommendation(self, prompt_text, user_entries=None, current_model="gpt-4o", business_constraints=None, mode="balanced"):
        """
        Runs complete multi-model prediction across all candidate AI models.
        Returns top recommendation, score, confidence, savings, and decision explanation.
        """
        pf = self.extractor.extract_prompt_features(prompt_text)
        phf = self.extractor.extract_phrase_features(prompt_text)
        uhf = self.extractor.extract_user_history_features(user_entries or [])

        task_type = "code_generation" if pf["codeDensity"] > 0.1 else (
            "mathematical_reasoning" if pf["mathDensity"] > 0.1 else (
            "summarization" if pf["summarizationDensity"] > 0.1 else (
            "translation" if pf["translationDensity"] > 0.1 else (
            "creative_writing" if pf["creativeDensity"] > 0.1 else "general_reasoning"
        ))
        )
        )

        all_candidate_results = []
        monthly_volume = uhf.get("monthlyVolume", 25)

        current_pricing = self.pricing.get(current_model, self.pricing["gpt-4o"])
        curr_cost = ((pf["estTokens"] / 1_000_000.0) * current_pricing["inputCostPerM"]) + \
                    (((pf["estTokens"] * 1.5) / 1_000_000.0) * current_pricing["outputCostPerM"])

        for model_name, m_meta in self.pricing.items():
            b_meta = self.benchmarks.get(model_name, {})
            mf = self.extractor.extract_model_features(m_meta, b_meta)

            row = {}
            row.update(pf)
            row.update(phf)
            row.update(uhf)
            row.update(mf)

            vec = np.array([[row[k] for k in row.keys()]], dtype=np.float32)

            # Capability fit score
            cap_fit = mf["codingScore"] if task_type == "code_generation" else (
                mf["mathScore"] if task_type == "mathematical_reasoning" else (
                mf["writingScore"] if task_type == "creative_writing" else mf["reasoningScore"]
            )
            )

            # Predict targets using MoE Models
            if self.m1_sat:
                pred_sat = float(self.m1_sat.predict(vec)[0])
            else:
                pred_sat = float(min(98.0, max(50.0, cap_fit - (pf["complexityScore"] * 1.2))))

            if self.m2_ret:
                pred_ret = float(self.m2_ret.predict(vec)[0])
            else:
                pred_ret = float(max(0.0, min(2.5, (pf["complexityScore"] / 3.0) - (cap_fit / 50.0) + 0.8)))

            if self.m3_lat:
                pred_lat = float(self.m3_lat.predict(vec)[0])
            else:
                pred_lat = float(max(0.6, min(10.0, m_meta["avgLatencySec"] + (pf["wordCount"] / 120.0))))

            # Sanitization bounds
            pred_sat = max(10.0, min(100.0, pred_sat))
            pred_ret = max(0.0, min(3.0, pred_ret))
            pred_lat = max(0.4, min(15.0, pred_lat))

            # Per-request direct & hidden retry cost calculation
            est_cost = ((pf["estTokens"] / 1_000_000.0) * m_meta["inputCostPerM"]) + \
                       (((pf["estTokens"] * 1.5) / 1_000_000.0) * m_meta["outputCostPerM"])
            
            hidden_retry_cost = est_cost * pred_ret
            total_cost_per_req = est_cost + hidden_retry_cost

            # Multi-objective Utility Score
            score = calculate_promptiq_score(
                pred_sat, pred_ret, pred_lat, est_cost, hidden_retry_cost, cap_fit,
                estimated_tokens=pf["estTokens"],
                business_constraints=business_constraints,
                mode=mode
            )

            # Monthly projected savings vs current model
            monthly_savings = max(0.0, (curr_cost - total_cost_per_req) * monthly_volume)

            all_candidate_results.append({
                "model": model_name,
                "provider": m_meta["provider"],
                "promptiqScore": score,
                "predictedSatisfaction": round(pred_sat, 1),
                "predictedRetries": round(pred_ret, 2),
                "predictedLatencySec": round(pred_lat, 2),
                "estimatedCost": round(est_cost, 6),
                "hiddenRetryCost": round(hidden_retry_cost, 6),
                "totalCostPerRequest": round(total_cost_per_req, 6),
                "projectedMonthlySavings": round(monthly_savings, 2),
                "capabilityFit": cap_fit
            })

        # Rank candidate AI models by PromptIQ Score descending
        all_candidate_results.sort(key=lambda x: x["promptiqScore"], reverse=True)
        winner = all_candidate_results[0]

        # Generate Explainable AI decision explanation
        explanation = (
            f"PromptIQ ML Intelligence Engine selected {winner['model']} ({winner['provider']}) "
            f"with a top PromptIQ Score of {winner['promptiqScore']}/100. "
            f"It achieves {winner['predictedSatisfaction']}% predicted user satisfaction, "
            f"a low retry risk of {winner['predictedRetries']} retries, and {winner['predictedLatencySec']}s response time. "
            f"Switching from {current_model} yields projected monthly savings of ${winner['projectedMonthlySavings']:.2f}."
        )

        return {
            "recommendedModel": winner["model"],
            "provider": winner["provider"],
            "promptiqScore": winner["promptiqScore"],
            "confidenceScore": round(min(0.99, 0.85 + (winner["promptiqScore"] / 1000.0)), 2),
            "estimatedCost": winner["estimatedCost"],
            "hiddenRetryCost": winner["hiddenRetryCost"],
            "expectedSatisfaction": winner["predictedSatisfaction"],
            "expectedRetries": winner["predictedRetries"],
            "expectedLatencySec": winner["predictedLatencySec"],
            "projectedMonthlySavings": winner["projectedMonthlySavings"],
            "reasoning": explanation,
            "allCandidatesRanked": all_candidate_results
        }

if __name__ == "__main__":
    if len(sys.argv) > 1:
        prompt_text = sys.argv[1]
        current_model = sys.argv[2] if len(sys.argv) > 2 else "gpt-4o"
        mode = sys.argv[3] if len(sys.argv) > 3 else "balanced"
        engine = PromptIQInferenceEngine()
        result = engine.predict_recommendation(prompt_text, current_model=current_model, mode=mode)
        print(json.dumps(result))
    else:
        engine = PromptIQInferenceEngine()
        test_prompt = "Refactor this React component step by step using Next.js Server Actions and Zod schema validation."
        result = engine.predict_recommendation(test_prompt)
        print("\n--- PromptIQ ML Inference Test Output ---")
        print(json.dumps(result, indent=2))
