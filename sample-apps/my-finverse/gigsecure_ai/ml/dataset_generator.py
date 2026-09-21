import numpy as np
import pandas as pd
import random
import os

def generate_gig_dataset(n_samples=5200, output_path="gig_underwriting_data.csv"):
    np.random.seed(42)
    random.seed(42)

    platforms = ['Zomato', 'Swiggy', 'Uber', 'Ola', 'Urban Company', 'Blinkit', 'Zepto', 'Porter']
    tiers = ['Tier 1', 'Tier 2', 'Tier 3']

    data = []
    for i in range(1, n_samples + 1):
        worker_id = f"GIG-{10000 + i}"
        platform = random.choice(platforms)
        city_tier = random.choice(tiers)
        
        # Monthly income in INR between 12000 and 65000
        avg_monthly_income = np.random.normal(28000, 8000)
        avg_monthly_income = max(11000, min(75000, avg_monthly_income))
        
        # Income stability (0.0 to 1.0)
        income_stability = np.random.beta(5, 2) if avg_monthly_income > 30000 else np.random.beta(2, 3)
        income_stability = round(float(income_stability), 3)

        # Income velocity (% month-over-month growth -15% to +35%)
        income_velocity = np.random.normal(5.0, 10.0)
        income_velocity = round(float(income_velocity), 2)

        # Working hours per week (20 to 70 hours)
        working_hours = int(np.random.normal(45, 10))
        working_hours = max(18, min(75, working_hours))

        # Order completion rate (75% to 99%)
        order_completion = round(float(np.random.uniform(0.78, 0.99)), 3)

        # Customer rating (3.2 to 5.0)
        platform_rating = round(float(np.random.uniform(3.5, 4.98)), 2)

        # Fuel / Operational Ratio (% of income spent on fuel/maintenance: 12% to 45%)
        fuel_ratio = round(float(np.random.uniform(0.12, 0.42)), 3)

        # Household Expense Ratio (30% to 75%)
        expense_ratio = round(float(np.random.uniform(0.30, 0.70)), 3)

        # Savings Ratio (0% to 35%)
        savings_ratio = max(0.02, round(1.0 - (fuel_ratio + expense_ratio + np.random.uniform(0.05, 0.15)), 3))

        # Active Gig Months (3 to 60)
        gig_tenure_months = random.randint(3, 60)

        # Failed AutoPay counts in last 6 months
        failed_autopays = np.random.choice([0, 1, 2, 3, 4], p=[0.75, 0.15, 0.06, 0.03, 0.01])

        # Formulate Repayment Capability Score (300 to 850)
        base_score = 400 + (avg_monthly_income / 75000) * 180 + (income_stability * 140) + (income_velocity * 1.5) \
                     + (savings_ratio * 120) + (platform_rating * 20) - (failed_autopays * 45) - (fuel_ratio * 50)
        
        credit_score = int(max(300, min(850, base_score + np.random.normal(0, 15))))

        # Recommend Loan Amount based on cash flow (INR 5,000 to 1,50,000)
        max_loan_rec = int(round((avg_monthly_income * (credit_score / 600.0) * 2.2), -3))
        max_loan_rec = max(5000, min(150000, max_loan_rec))

        # Target classification
        if credit_score >= 740:
            risk_category = "Low Risk"
            default_probability = round(float(np.random.uniform(0.01, 0.05)), 4)
        elif credit_score >= 640:
            risk_category = "Moderate Risk"
            default_probability = round(float(np.random.uniform(0.06, 0.14)), 4)
        elif credit_score >= 550:
            risk_category = "High Risk"
            default_probability = round(float(np.random.uniform(0.15, 0.35)), 4)
        else:
            risk_category = "Very High Risk"
            default_probability = round(float(np.random.uniform(0.36, 0.70)), 4)

        data.append({
            "worker_id": worker_id,
            "platform": platform,
            "city_tier": city_tier,
            "avg_monthly_income": round(avg_monthly_income, 2),
            "income_stability": income_stability,
            "income_velocity": income_velocity,
            "working_hours": working_hours,
            "order_completion": order_completion,
            "platform_rating": platform_rating,
            "fuel_ratio": fuel_ratio,
            "expense_ratio": expense_ratio,
            "savings_ratio": savings_ratio,
            "gig_tenure_months": gig_tenure_months,
            "failed_autopays": failed_autopays,
            "credit_score": credit_score,
            "recommended_loan": max_loan_rec,
            "risk_category": risk_category,
            "default_probability": default_probability
        })

    df = pd.DataFrame(data)
    os.makedirs(os.path.dirname(output_path) if os.path.dirname(output_path) else '.', exist_ok=True)
    df.to_csv(output_path, index=False)
    print(f"Successfully generated {len(df)} synthetic records to {output_path}")
    return df

if __name__ == "__main__":
    generate_gig_dataset()
