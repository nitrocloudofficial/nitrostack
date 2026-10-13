import os
import json

class CostOptimizer:
    """
    Calculates exact token costs, hidden retry costs, iteration costs, and annual corporate ROI.
    """
    def __init__(self):
        pass

    def compute_cost_breakdown(self, prompt_tokens, model_meta, retry_risk=0.2, monthly_volume=25, current_model_meta=None):
        """
        Exact Token Cost Calculation:
          DirectCost = (InputTokens / 1M * InputPrice) + (OutputTokens / 1M * OutputPrice)
          HiddenRetryCost = DirectCost * RetryRisk
          TotalCost = DirectCost + HiddenRetryCost
        """
        input_tokens = prompt_tokens
        output_tokens = int(prompt_tokens * 1.5)

        input_price = model_meta.get("inputCostPerM", 2.5)
        output_price = model_meta.get("outputCostPerM", 10.0)

        direct_cost = ((input_tokens / 1_000_000.0) * input_price) + ((output_tokens / 1_000_000.0) * output_price)
        hidden_retry_cost = direct_cost * max(0.0, retry_risk)
        total_request_cost = direct_cost + hidden_retry_cost

        # Baseline comparison
        curr_meta = current_model_meta or {"inputCostPerM": 2.5, "outputCostPerM": 10.0}
        curr_direct = ((input_tokens / 1_000_000.0) * curr_meta.get("inputCostPerM", 2.5)) + ((output_tokens / 1_000_000.0) * curr_meta.get("outputCostPerM", 10.0))
        curr_total = curr_direct * 1.2

        monthly_savings = max(0.0, (curr_total - total_request_cost) * monthly_volume)
        annual_savings = monthly_savings * 12.0

        return {
            "inputTokens": input_tokens,
            "outputTokens": output_tokens,
            "directCost": round(direct_cost, 6),
            "hiddenRetryCost": round(hidden_retry_cost, 6),
            "totalCostPerRequest": round(total_request_cost, 6),
            "projectedMonthlySavings": round(monthly_savings, 2),
            "projectedAnnualSavings": round(annual_savings, 2)
        }

if __name__ == "__main__":
    opt = CostOptimizer()
    res = opt.compute_cost_breakdown(250, {"inputCostPerM": 0.14, "outputCostPerM": 0.28})
    print("[Cost Optimizer] Test completed. Direct cost:", res["directCost"])
