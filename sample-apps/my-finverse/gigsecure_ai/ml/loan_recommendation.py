class LoanRecommendationEngine:
    @staticmethod
    def generate_recommendations(monthly_income: float, repayment_score: float, risk_level: str) -> dict:
        monthly_income = float(max(5000.0, monthly_income))
        score = float(max(0.0, min(100.0, repayment_score)))

        if risk_level == "LOW":
            max_loan = round(monthly_income * 2.5, -3)
            base_interest = 11.5
            max_tenure = 24
        elif risk_level == "MEDIUM":
            max_loan = round(monthly_income * 1.8, -3)
            base_interest = 13.5
            max_tenure = 18
        elif risk_level == "HIGH":
            max_loan = round(monthly_income * 1.2, -3)
            base_interest = 16.5
            max_tenure = 12
        else:
            max_loan = round(monthly_income * 0.6, -3)
            base_interest = 21.0
            max_tenure = 6

        eligible_loan_amount = float(max(5000.0, min(150000.0, max_loan)))

        # Recommended Daily Repayment (180 days cycle assumption)
        total_repayable = eligible_loan_amount * (1.0 + (base_interest / 100.0) * (max_tenure / 12.0))
        recommended_daily_repayment = float(round(total_repayable / (max_tenure * 30.0), 2))

        products = [
            {
                "product_type": "Emergency Loan",
                "max_amount": min(15000.0, eligible_loan_amount),
                "tenure_months": 3,
                "interest_rate": round(base_interest - 1.0, 1),
                "daily_repayment": round((min(15000.0, eligible_loan_amount) * 1.03) / 90.0, 2),
                "purpose": "Fuel, Emergency Vehicle Repair, Instant Cash"
            },
            {
                "product_type": "Working Capital Loan",
                "max_amount": eligible_loan_amount,
                "tenure_months": min(12, max_tenure),
                "interest_rate": base_interest,
                "daily_repayment": recommended_daily_repayment,
                "purpose": "Monthly Operational Reserve & Insurance Premium"
            },
            {
                "product_type": "Business Expansion Loan",
                "max_amount": min(150000.0, round(eligible_loan_amount * 1.4, -3)),
                "tenure_months": max_tenure,
                "interest_rate": round(base_interest + 1.5, 1),
                "daily_repayment": round((min(150000.0, round(eligible_loan_amount * 1.4, -3)) * 1.15) / (max_tenure * 30.0), 2),
                "purpose": "EV Bike Purchase, Fleet Scaling, Multi-Platform Registration"
            }
        ]

        return {
            "eligible_loan_amount": eligible_loan_amount,
            "interest_rate": base_interest,
            "recommended_daily_repayment": recommended_daily_repayment,
            "maximum_loan_period_months": max_tenure,
            "loan_category": "Tier-1 Cash-Flow Underwritten Facility" if score >= 70 else "Tier-2 Micro-Credit Line",
            "emergency_loan_eligibility": eligible_loan_amount >= 5000.0,
            "working_capital_loan_eligibility": eligible_loan_amount >= 15000.0,
            "business_expansion_loan_eligibility": eligible_loan_amount >= 40000.0,
            "loan_products": products
        }
