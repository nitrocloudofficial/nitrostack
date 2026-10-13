import os
import sys

# Ensure package imports work cleanly from root or script directory
base_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(os.path.abspath(os.path.join(base_dir, "..", "..", "..")))

try:
    from packages.server.src.ml_pipeline.predictor.inference_engine import TokenSlashInferenceEngine
except ImportError:
    from inference_engine import TokenSlashInferenceEngine

def run_test(prompt_text=None, current_model="gpt-4o"):
    if not prompt_text:
        prompt_text = "Write a Python script to parse a 10GB CSV file using multiprocessing and pandas."

    engine = TokenSlashInferenceEngine()
    result = engine.predict_recommendation(prompt_text=prompt_text, current_model=current_model)

    print("\n================ TOKENSLASH RECOMMENDATION ================")
    print(f"Prompt Tested:     '{prompt_text}'")
    print(f"Recommended Model: {result['recommendedModel']} ({result['provider']})")
    print(f"TokenSlash Score:    {result['tokenslashScore']}/100")
    print(f"Confidence:        {result['confidenceScore'] * 100:.1f}%")
    print(f"Expected Sat:      {result['expectedSatisfaction']}%")
    print(f"Expected Latency:  {result['expectedLatencySec']} sec")
    print(f"Estimated Cost:    ${result['estimatedCost']:.6f}")
    print(f"Monthly Savings:   ${result['projectedMonthlySavings']:.2f}")
    print(f"Reasoning:         {result['reasoning']}")
    print("==========================================================\n")

if __name__ == "__main__":
    prompt_input = sys.argv[1] if len(sys.argv) > 1 else None
    run_test(prompt_input)
