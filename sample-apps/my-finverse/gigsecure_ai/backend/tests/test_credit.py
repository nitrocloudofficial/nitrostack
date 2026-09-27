from ml.predictor import predictor_instance

def test_ml_credit_underwriting():
    sample_data = {
        "avg_monthly_income": 35000,
        "income_stability": 0.85,
        "income_velocity": 8.0,
        "working_hours": 48,
        "order_completion": 0.98,
        "platform_rating": 4.9,
        "fuel_ratio": 0.18,
        "expense_ratio": 0.40,
        "savings_ratio": 0.20,
        "gig_tenure_months": 24,
        "failed_autopays": 0
    }
    result = predictor_instance.predict(sample_data)
    assert "credit_score" in result
    assert 300 <= result["credit_score"] <= 850
    assert result["recommended_loan_amount"] > 0
    assert result["risk_category"] in ["Low Risk", "Moderate Risk", "High Risk", "Very High Risk"]
