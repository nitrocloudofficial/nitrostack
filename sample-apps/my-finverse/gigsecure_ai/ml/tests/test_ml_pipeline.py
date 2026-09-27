import sys
import os
import pytest

# Ensure ml package directory is in sys.path for test execution
ml_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if ml_dir not in sys.path:
    sys.path.insert(0, ml_dir)

from data_generation import generate_gig_worker_dataset
from feature_engineering import FeatureEngineer
from risk_classifier import RiskClassifier
from loan_recommendation import LoanRecommendationEngine
from predict import ml_predictor_instance

def test_data_generation():
    df = generate_gig_worker_dataset(100)
    assert len(df) == 100
    assert "daily_earnings" in df.columns
    assert "repayment_capability_score" in df.columns
    assert df["repayment_capability_score"].min() >= 0
    assert df["repayment_capability_score"].max() <= 100

def test_feature_engineering():
    df = generate_gig_worker_dataset(50)
    fe = FeatureEngineer()
    X = fe.fit_transform(df)
    assert X.shape[0] == 50
    assert X.shape[1] == len(fe.feature_columns)

def test_risk_classifier():
    res_low = RiskClassifier.classify_risk(82.0)
    assert res_low["risk_level"] == "LOW"
    assert res_low["confidence_score"] > 80.0

    res_high = RiskClassifier.classify_risk(35.0)
    assert res_high["risk_level"] == "VERY HIGH"

def test_loan_recommendations():
    rec = LoanRecommendationEngine.generate_recommendations(35000, 80.0, "LOW")
    assert rec["eligible_loan_amount"] > 0
    assert len(rec["loan_products"]) == 3

def test_ml_prediction_pipeline():
    sample_input = {
        "daily_earnings": 1400.0,
        "working_hours": 48.0,
        "platform_rating": 4.9,
        "fuel_expenses": 4200.0,
        "monthly_expenses": 12000.0,
        "savings": 6000.0
    }
    result = ml_predictor_instance.predict_underwriting(sample_input)
    assert "repayment_capability_score" in result
    assert "credit_score" in result
    assert 300 <= result["credit_score"] <= 850
    assert result["risk_level"] in ["LOW", "MEDIUM", "HIGH", "VERY HIGH"]
    assert "top_influencing_factors" in result
