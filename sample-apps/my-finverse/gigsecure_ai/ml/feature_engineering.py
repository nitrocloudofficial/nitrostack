import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler

class FeatureEngineer:
    def __init__(self):
        self.scaler = StandardScaler()
        self.feature_columns = [
            "income_velocity",
            "income_stability",
            "weekly_growth_rate",
            "monthly_growth_rate",
            "fuel_expense_ratio",
            "savings_ratio",
            "expense_ratio",
            "income_variance",
            "platform_performance_score",
            "order_completion_ratio",
            "customer_rating_score",
            "transaction_frequency",
            "cash_flow_stability",
            "debt_ratio",
            "loan_utilization"
        ]

    def create_features(self, df: pd.DataFrame) -> pd.DataFrame:
        df = df.copy()

        # Ensure all expected raw columns exist in DataFrame
        expected_raw_defaults = {
            "daily_earnings": 1000.0,
            "weekly_earnings": 6000.0,
            "monthly_earnings": 26000.0,
            "working_hours": 45.0,
            "completed_orders": 450,
            "platform_rating": 4.5,
            "fuel_expenses": 4000.0,
            "maintenance_cost": 1000.0,
            "business_expenses": 5000.0,
            "monthly_expenses": 12000.0,
            "savings": 4000.0,
            "average_bank_balance": 10000.0,
            "upi_transactions": 100,
            "cash_transactions": 20,
            "loan_history": 1,
            "repayment_history": 0.95,
            "weekend_income": 2500.0,
            "festival_income": 3500.0
        }

        for col, default_val in expected_raw_defaults.items():
            if col not in df.columns:
                df[col] = default_val
            else:
                df[col] = df[col].fillna(default_val)

        # Derive monthly_earnings if it was not provided explicitly
        if "daily_earnings" in df.columns:
            df["monthly_earnings"] = np.where(df["monthly_earnings"] <= 0, df["daily_earnings"] * 26.0, df["monthly_earnings"])

        earnings = np.maximum(df["monthly_earnings"], 1000.0)

        # 1. Income Velocity & Growth Rates
        df["income_velocity"] = np.round((df["weekly_earnings"] * 4.0) / earnings, 3)
        df["income_stability"] = np.round(np.clip(1.0 - (df["fuel_expenses"] / earnings), 0.1, 1.0), 3)
        df["weekly_growth_rate"] = np.round(((df["weekend_income"] / (df["daily_earnings"] * 2 + 1e-5)) - 1.0) * 100, 2)
        df["monthly_growth_rate"] = np.round((df["festival_income"] / earnings) * 100, 2)

        # 2. Expense & Financial Ratios
        df["fuel_expense_ratio"] = np.round(np.clip(df["fuel_expenses"] / earnings, 0.01, 0.6), 3)
        df["savings_ratio"] = np.round(np.clip(df["savings"] / earnings, 0.0, 0.8), 3)
        df["expense_ratio"] = np.round(np.clip(df["monthly_expenses"] / earnings, 0.1, 0.95), 3)
        df["income_variance"] = np.round(np.abs(df["daily_earnings"] - (earnings / 26.0)), 2)

        # 3. Platform & Operational Metrics
        hrs = np.maximum(df["working_hours"], 5.0)
        df["platform_performance_score"] = np.round((df["completed_orders"] / hrs) * (df["platform_rating"] / 5.0), 3)
        df["order_completion_ratio"] = np.round(np.clip(df["completed_orders"] / (hrs * 10.0), 0.5, 1.0), 3)
        df["customer_rating_score"] = np.round(df["platform_rating"] / 5.0, 3)

        # 4. Cash Flow & Banking Metrics
        total_txns = np.maximum(df["upi_transactions"] + df["cash_transactions"], 1.0)
        df["transaction_frequency"] = np.round(df["upi_transactions"] / total_txns, 3)
        expenses_safe = np.maximum(df["monthly_expenses"], 1000.0)
        df["cash_flow_stability"] = np.round(df["average_bank_balance"] / expenses_safe, 3)
        df["debt_ratio"] = np.round(df["monthly_expenses"] / (earnings + 1.0), 3)
        df["loan_utilization"] = np.round(df["loan_history"] / 5.0, 2)

        # Outlier handling (1st - 99th percentile capping)
        for col in self.feature_columns:
            if col in df.columns:
                p1 = df[col].quantile(0.005)
                p99 = df[col].quantile(0.995)
                df[col] = np.clip(df[col], p1, p99)

        return df

    def fit_transform(self, df: pd.DataFrame) -> np.ndarray:
        engineered_df = self.create_features(df)
        X = engineered_df[self.feature_columns]
        return self.scaler.fit_transform(X)

    def transform(self, df: pd.DataFrame) -> np.ndarray:
        engineered_df = self.create_features(df)
        X = engineered_df[self.feature_columns]
        return self.scaler.transform(X)
