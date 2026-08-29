from sqlalchemy.orm import Session
from backend.schemas.domain_schemas import CreditEvaluationRequest, CreditScoreResponse
from backend.models.domain_models import CreditScore, GigProfile
from ml.predict import ml_predictor_instance
from datetime import datetime

class CreditService:
    def __init__(self, db: Session):
        self.db = db

    def evaluate_credit_score(self, user_id: int, req: CreditEvaluationRequest) -> CreditScoreResponse:
        gig_profile = self.db.query(GigProfile).filter(GigProfile.user_id == user_id).first()

        avg_monthly_income = req.daily_earnings * 26 if req.daily_earnings else (gig_profile.avg_monthly_income if gig_profile else 28000.0)
        fuel_expenses = req.fuel_expenses if req.fuel_expenses else (avg_monthly_income * 0.20)
        monthly_expenses = req.monthly_expenses if req.monthly_expenses else (avg_monthly_income * 0.45)
        savings = req.savings if req.savings else (avg_monthly_income * 0.15)
        avg_balance = req.average_balance if req.average_balance else (savings * 2.5)

        ml_input = {
            "daily_earnings": req.daily_earnings or 1000.0,
            "weekly_earnings": (req.daily_earnings or 1000.0) * 6.0,
            "monthly_earnings": avg_monthly_income,
            "working_hours": req.working_hours or 45.0,
            "completed_orders": req.completed_orders or 450,
            "platform_rating": req.ratings or 4.8,
            "fuel_expenses": fuel_expenses,
            "maintenance_cost": fuel_expenses * 0.25,
            "monthly_expenses": monthly_expenses,
            "savings": savings,
            "average_bank_balance": avg_balance,
            "upi_transactions": 120,
            "cash_transactions": 25,
            "loan_history": 1,
            "repayment_history": 0.95,
            "weekend_income": (req.daily_earnings or 1000.0) * 2.8,
            "festival_income": avg_monthly_income * 0.15
        }

        # Run XGBoost trained prediction
        pred_res = ml_predictor_instance.predict_underwriting(ml_input)

        credit_score_val = pred_res["credit_score"]
        eligible_loan = float(pred_res["eligible_loan"])
        risk_level = pred_res["risk_level"]
        interest_rate = float(pred_res["interest_rate"])
        recommended_daily = float(pred_res["recommended_daily_repayment"])
        confidence = float(pred_res["confidence"])

        # Save score record in DB
        cs_record = CreditScore(
            user_id=user_id,
            credit_score=credit_score_val,
            risk_category=risk_level,
            recommended_loan_amount=eligible_loan,
            interest_rate=interest_rate,
            default_probability=pred_res["default_probability"],
            cashflow_stability=round((savings / avg_monthly_income) * 100, 1),
            income_velocity=6.2,
            savings_burn_index=round((monthly_expenses / avg_monthly_income) * 100, 1),
            platform_rating_score=round(((req.ratings or 4.8) / 5.0) * 100, 1),
            evaluated_at=datetime.utcnow()
        )
        self.db.add(cs_record)
        self.db.commit()

        return CreditScoreResponse(
            credit_score=credit_score_val,
            risk_level=risk_level,
            eligible_loan=eligible_loan,
            recommended_daily_repayment=recommended_daily,
            confidence_score=confidence,
            interest_rate=interest_rate,
            max_tenure_months=pred_res["max_tenure_months"],
            underwriting_metrics={
                "repayment_capability_score": pred_res["repayment_capability_score"],
                "default_probability": pred_res["default_probability"],
                "top_influencing_factors": pred_res["top_influencing_factors"],
                "loan_products": pred_res["loan_recommendations"]["loan_products"]
            }
        )
