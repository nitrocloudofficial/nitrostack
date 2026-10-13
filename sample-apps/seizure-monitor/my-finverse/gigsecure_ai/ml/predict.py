import os
import sys
import numpy as np
import pandas as pd

# Add ml directory to sys.path if not present
ml_dir = os.path.dirname(os.path.abspath(__file__))
if ml_dir not in sys.path:
    sys.path.insert(0, ml_dir)

try:
    from ml.feature_engineering import FeatureEngineer
    from ml.risk_classifier import RiskClassifier
    from ml.loan_recommendation import LoanRecommendationEngine
    from ml.model_utils import load_model
except ModuleNotFoundError:
    from feature_engineering import FeatureEngineer
    from risk_classifier import RiskClassifier
    from loan_recommendation import LoanRecommendationEngine
    from model_utils import load_model

class MLUnderwritingPredictor:
    def __init__(self):
        base_dir = os.path.dirname(__file__)
        self.model_path = os.path.join(base_dir, "models", "xgb_credit_model.pkl")
        self.fe = FeatureEngineer()
        self.payload = None
        self.model = None

        if os.path.exists(self.model_path):
            try:
                self.payload = load_model(self.model_path)
                self.model = self.payload["model"]
                if "scaler" in self.payload:
                    self.fe.scaler = self.payload["scaler"]
            except Exception as e:
                print(f"Could not load ML model pickle ({e}), running rule fallback.")

    def predict_underwriting(self, input_data: dict) -> dict:
        df = pd.DataFrame([input_data])

        monthly_income = float(input_data.get("monthly_earnings", input_data.get("daily_earnings", 1000.0) * 26.0))
        daily_earnings = float(input_data.get("daily_earnings", 1000.0))
        working_hours = float(input_data.get("working_hours", 45.0))
        ratings = float(input_data.get("ratings", input_data.get("platform_rating", 4.5)))

        if self.model is not None and hasattr(self.fe.scaler, "mean_"):
            X_scaled = self.fe.transform(df)
            raw_score = float(self.model.predict(X_scaled)[0])
        else:
            # Mathematical rule fallback if model scaler not fitted yet
            raw_score = 45.0 + (monthly_income / 60000.0) * 30.0 + (ratings / 5.0) * 15.0 - (float(input_data.get("fuel_expenses", 4000.0)) / monthly_income) * 15.0

        repayment_capability_score = float(max(10.0, min(99.0, round(raw_score, 1))))
        credit_score = int(round(300 + (repayment_capability_score / 100.0) * 550))

        # Risk Classification
        risk_info = RiskClassifier.classify_risk(repayment_capability_score)
        risk_level = risk_info["risk_level"]
        confidence = risk_info["confidence_score"]
        default_prob = risk_info["default_probability"]

        # Loan Product Recommendation Engine
        loan_info = LoanRecommendationEngine.generate_recommendations(monthly_income, repayment_capability_score, risk_level)

        # Top Influencing Feature Drivers
        engineered_row = self.fe.create_features(df).iloc[0]
        top_factors = [
            {
                "feature": "Cash Flow Stability",
                "impact": "POSITIVE" if engineered_row["cash_flow_stability"] > 1.2 else "NEUTRAL",
                "score_weight": f"{round(engineered_row['cash_flow_stability'] * 20, 1)} pts"
            },
            {
                "feature": "Savings Ratio",
                "impact": "POSITIVE" if engineered_row["savings_ratio"] > 0.15 else "NEGATIVE",
                "score_weight": f"{round(engineered_row['savings_ratio'] * 100, 1)}%"
            },
            {
                "feature": "Fuel Expense Ratio",
                "impact": "NEGATIVE" if engineered_row["fuel_expense_ratio"] > 0.25 else "POSITIVE",
                "score_weight": f"{round(engineered_row['fuel_expense_ratio'] * 100, 1)}%"
            },
            {
                "feature": "Platform Rating Performance",
                "impact": "POSITIVE" if ratings >= 4.5 else "NEUTRAL",
                "score_weight": f"{ratings} / 5.0"
            }
        ]

        return {
            "repayment_capability_score": repayment_capability_score,
            "credit_score": credit_score,
            "risk_level": risk_level,
            "default_probability": default_prob,
            "eligible_loan": loan_info["eligible_loan_amount"],
            "recommended_daily_repayment": loan_info["recommended_daily_repayment"],
            "confidence": confidence,
            "interest_rate": loan_info["interest_rate"],
            "max_tenure_months": loan_info["maximum_loan_period_months"],
            "top_influencing_factors": top_factors,
            "loan_recommendations": loan_info
        }

ml_predictor_instance = MLUnderwritingPredictor()
