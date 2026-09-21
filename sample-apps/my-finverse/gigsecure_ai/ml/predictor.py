import os
import joblib
import pandas as pd
import numpy as np

class UnderwritingPredictor:
    def __init__(self):
        model_path = os.path.join(os.path.dirname(__file__), "models", "underwriting_xgboost.joblib")
        self.loaded_model = None
        if os.path.exists(model_path):
            try:
                self.loaded_model = joblib.load(model_path)
            except Exception as e:
                print(f"Could not load ML joblib file ({e}), falling back to deterministic underwriting inference.")

    def predict(self, data: dict):
        avg_monthly_income = float(data.get("avg_monthly_income", 25000))
        income_stability = float(data.get("income_stability", 0.75))
        income_velocity = float(data.get("income_velocity", 5.0))
        working_hours = float(data.get("working_hours", 45))
        order_completion = float(data.get("order_completion", 0.95))
        platform_rating = float(data.get("platform_rating", 4.5))
        fuel_ratio = float(data.get("fuel_ratio", 0.25))
        expense_ratio = float(data.get("expense_ratio", 0.45))
        savings_ratio = float(data.get("savings_ratio", 0.15))
        gig_tenure_months = float(data.get("gig_tenure_months", 12))
        failed_autopays = float(data.get("failed_autopays", 0))

        if self.loaded_model:
            df = pd.DataFrame([{
                "avg_monthly_income": avg_monthly_income,
                "income_stability": income_stability,
                "income_velocity": income_velocity,
                "working_hours": working_hours,
                "order_completion": order_completion,
                "platform_rating": platform_rating,
                "fuel_ratio": fuel_ratio,
                "expense_ratio": expense_ratio,
                "savings_ratio": savings_ratio,
                "gig_tenure_months": gig_tenure_months,
                "failed_autopays": failed_autopays
            }])
            predicted_score = float(self.loaded_model["score_model"].predict(df)[0])
            predicted_loan = float(self.loaded_model["loan_model"].predict(df)[0])
        else:
            base_score = 420 + (avg_monthly_income / 75000) * 180 + (income_stability * 140) + (income_velocity * 1.5) \
                         + (savings_ratio * 120) + (platform_rating * 18) - (failed_autopays * 45) - (fuel_ratio * 50)
            predicted_score = float(max(300, min(850, base_score)))
            predicted_loan = float(max(5000, min(150000, round(avg_monthly_income * (predicted_score / 600.0) * 2.2, -3))))

        credit_score = int(round(predicted_score))
        recommended_loan = int(round(predicted_loan))

        if credit_score >= 750:
            risk_category = "Low Risk"
            interest_rate = 11.5
            max_tenure_months = 24
            default_prob = round(0.02 + (850 - credit_score) * 0.0003, 4)
        elif credit_score >= 650:
            risk_category = "Moderate Risk"
            interest_rate = 14.0
            max_tenure_months = 18
            default_prob = round(0.06 + (750 - credit_score) * 0.0008, 4)
        elif credit_score >= 570:
            risk_category = "High Risk"
            interest_rate = 17.5
            max_tenure_months = 12
            default_prob = round(0.15 + (650 - credit_score) * 0.0015, 4)
        else:
            risk_category = "Very High Risk"
            interest_rate = 22.0
            max_tenure_months = 6
            default_prob = round(0.35 + (570 - credit_score) * 0.002, 4)

        return {
            "credit_score": credit_score,
            "recommended_loan_amount": recommended_loan,
            "risk_category": risk_category,
            "interest_rate_annual": interest_rate,
            "max_tenure_months": max_tenure_months,
            "default_probability": default_prob,
            "underwriting_metrics": {
                "income_velocity_score": round(income_velocity, 2),
                "cashflow_stability_score": round(income_stability * 100, 1),
                "savings_burn_index": round((1 - savings_ratio) * 100, 1),
                "platform_performance_multiplier": round((order_completion * platform_rating / 5.0) * 100, 1)
            }
        }

predictor_instance = UnderwritingPredictor()
