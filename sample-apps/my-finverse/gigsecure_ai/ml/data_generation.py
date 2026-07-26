import numpy as np
import pandas as pd
import random
import os

def generate_gig_worker_dataset(n_samples=10000, output_path=None):
    np.random.seed(42)
    random.seed(42)

    platforms = ['Zomato', 'Swiggy', 'Uber', 'Ola', 'Urban Company', 'Blinkit', 'Zepto', 'Porter']
    locations = ['Mumbai', 'Delhi NCR', 'Bengaluru', 'Hyderabad', 'Chennai', 'Pune', 'Kolkata', 'Ahmedabad']

    data = []
    for i in range(1, n_samples + 1):
        worker_id = f"GIG-{100000 + i}"
        platform = random.choice(platforms)
        location = random.choice(locations)

        years_of_experience = round(float(np.random.uniform(0.5, 8.0)), 1)
        days_active = int(min(365 * 4, years_of_experience * 300 + random.randint(-30, 30)))

        # Income generation
        base_daily = np.random.normal(1100, 350)
        daily_earnings = float(max(400, min(3500, base_daily)))
        
        working_hours = float(np.random.normal(46, 8))
        working_hours = max(18.0, min(75.0, round(working_hours, 1)))

        completed_orders = int(working_hours * np.random.uniform(8, 14))

        weekly_earnings = float(round(daily_earnings * np.random.uniform(5.5, 6.8), 2))
        monthly_earnings = float(round(weekly_earnings * 4.3, 2))

        weekend_income = float(round(daily_earnings * np.random.uniform(1.2, 1.6) * 2, 2))
        festival_income = float(round(monthly_earnings * np.random.uniform(0.10, 0.30), 2))

        platform_rating = float(round(np.random.uniform(3.6, 4.98), 2))

        # Expenses
        fuel_expenses = float(round(monthly_earnings * np.random.uniform(0.12, 0.32), 2))
        maintenance_cost = float(round(monthly_earnings * np.random.uniform(0.04, 0.12), 2))
        business_expenses = fuel_expenses + maintenance_cost

        household_expenses = float(round(monthly_earnings * np.random.uniform(0.35, 0.60), 2))
        monthly_expenses = business_expenses + household_expenses

        savings = float(round(max(500.0, (monthly_earnings - monthly_expenses) * np.random.uniform(0.5, 0.9)), 2))
        average_bank_balance = float(round(max(1000.0, savings * np.random.uniform(1.5, 4.0)), 2))

        # Transactions & History
        upi_transactions = int(np.random.normal(120, 30))
        cash_transactions = int(np.random.normal(25, 10))

        family_size = int(np.random.choice([2, 3, 4, 5, 6], p=[0.1, 0.3, 0.35, 0.15, 0.1]))
        dependents = max(0, family_size - random.randint(1, 2))

        loan_history = int(np.random.choice([0, 1, 2, 3, 4], p=[0.4, 0.3, 0.18, 0.08, 0.04]))
        repayment_history = float(round(np.random.uniform(0.70, 1.0) if loan_history > 0 else 1.0, 2))

        # Calculate Repayment Capability Score (0 - 100)
        stability_score = (monthly_earnings / 60000.0) * 35.0
        savings_ratio_val = (savings / monthly_earnings) if monthly_earnings > 0 else 0.1
        savings_score = min(25.0, savings_ratio_val * 100.0)
        performance_score = (platform_rating / 5.0) * 20.0
        repayment_score_part = repayment_history * 20.0

        raw_score = stability_score + savings_score + performance_score + repayment_score_part
        repayment_capability_score = float(max(10.0, min(99.0, round(raw_score + np.random.normal(0, 3), 1))))

        # Determine Risk Level & Loan Terms
        if repayment_capability_score >= 75.0:
            risk_level = "LOW"
            default_prob = float(round(np.random.uniform(0.01, 0.05), 4))
            loan_multiplier = 2.4
        elif repayment_capability_score >= 60.0:
            risk_level = "MEDIUM"
            default_prob = float(round(np.random.uniform(0.06, 0.14), 4))
            loan_multiplier = 1.8
        elif repayment_capability_score >= 45.0:
            risk_level = "HIGH"
            default_prob = float(round(np.random.uniform(0.15, 0.30), 4))
            loan_multiplier = 1.2
        else:
            risk_level = "VERY HIGH"
            default_prob = float(round(np.random.uniform(0.31, 0.65), 4))
            loan_multiplier = 0.6

        eligible_loan_amount = float(round(max(5000.0, min(150000.0, monthly_earnings * loan_multiplier)), -3))
        recommended_daily_repayment = float(round((eligible_loan_amount * 1.12) / 180.0, 2))

        data.append({
            "worker_id": worker_id,
            "platform": platform,
            "location": location,
            "daily_earnings": daily_earnings,
            "weekly_earnings": weekly_earnings,
            "monthly_earnings": monthly_earnings,
            "working_hours": working_hours,
            "completed_orders": completed_orders,
            "platform_rating": platform_rating,
            "fuel_expenses": fuel_expenses,
            "maintenance_cost": maintenance_cost,
            "business_expenses": business_expenses,
            "upi_transactions": upi_transactions,
            "cash_transactions": cash_transactions,
            "monthly_expenses": monthly_expenses,
            "savings": savings,
            "average_bank_balance": average_bank_balance,
            "loan_history": loan_history,
            "repayment_history": repayment_history,
            "years_of_experience": years_of_experience,
            "days_active": days_active,
            "weekend_income": weekend_income,
            "festival_income": festival_income,
            "family_size": family_size,
            "dependents": dependents,
            "repayment_capability_score": repayment_capability_score,
            "risk_level": risk_level,
            "eligible_loan_amount": eligible_loan_amount,
            "recommended_daily_repayment": recommended_daily_repayment,
            "default_probability": default_prob
        })

    df = pd.DataFrame(data)

    if output_path:
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        df.to_csv(output_path, index=False)
        print(f"Generated {len(df)} synthetic records -> {output_path}")

    return df

if __name__ == "__main__":
    target_csv = os.path.join(os.path.dirname(__file__), "artifacts", "gig_training_data.csv")
    generate_gig_worker_dataset(10000, output_path=target_csv)
