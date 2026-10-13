import os
import sys

# Ensure root import path is loaded
root_dir = os.path.dirname(os.path.abspath(__file__))
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

from packages.server.src.ml_pipeline.predictor.inference_engine import TokenSlashInferenceEngine

def main():
    # Prompt input (from CLI argument or fallback default)
    if len(sys.argv) > 1:
        user_prompt = " ".join(sys.argv[1:])
    else:
        user_prompt = "Refactor this React component step by step using Next.js Server Actions and Zod validation."

    print("\n[TokenSlash] Initializing ML Usage Intelligence Engine...")
    engine = TokenSlashInferenceEngine()

    # Predict optimal AI model recommendation
    result = engine.predict_recommendation(
        prompt_text=user_prompt,
        current_model="gpt-4o"
    )

    # Print results
    print("\n========================================================")
    print("              TOKENSLASH ML RECOMMENDATION SUMMARY         ")
    print("========================================================")
    print(f"PROMPT TESTED:             '{user_prompt}'")
    print(f"RECOMMENDED MODEL:         {result['recommendedModel']} ({result['provider']})")
    print(f"TOKENSLASH SCORE:            {result['tokenslashScore']}/100")
    print(f"CONFIDENCE SCORE:          {result['confidenceScore'] * 100:.1f}%")
    print(f"EXPECTED SATISFACTION:     {result['expectedSatisfaction']}%")
    print(f"EXPECTED LATENCY:          {result['expectedLatencySec']} seconds")
    print(f"EXPECTED RETRIES:          {result['expectedRetries']} retries")
    print(f"ESTIMATED COST:            ${result['estimatedCost']:.6f}")
    print(f"PROJECTED MONTHLY SAVINGS: ${result['projectedMonthlySavings']:.2f}")
    print("--------------------------------------------------------")
    print(f"DECISION REASONING:\n{result['reasoning']}")
    print("========================================================\n")

if __name__ == "__main__":
    main()
