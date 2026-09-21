import os
import pandas as pd
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.model_selection import train_test_split
from sklearn.metrics import confusion_matrix

from feature_engineering import FeatureEngineer
from model_utils import load_model

def generate_visualizations():
    base_dir = os.path.dirname(__file__)
    artifacts_dir = os.path.join(base_dir, "artifacts")
    os.makedirs(artifacts_dir, exist_ok=True)

    data_path = os.path.join(artifacts_dir, "gig_training_data.csv")
    model_path = os.path.join(base_dir, "models", "xgb_credit_model.pkl")

    df = pd.read_csv(data_path)
    payload = load_model(model_path)
    model = payload["model"]

    fe = FeatureEngineer()
    engineered_df = fe.create_features(df)
    X = fe.fit_transform(df)
    y = engineered_df["repayment_capability_score"].values

    _, X_test, _, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    preds = model.predict(X_test)

    # 1. Feature Importance Plot
    plt.figure(figsize=(10, 6))
    if hasattr(model, "feature_importances_"):
        importances = model.feature_importances_
        feature_names = fe.feature_columns
        indices = np.argsort(importances)[::-1]

        plt.title("Credit Underwriting Feature Importance Ranking", fontsize=14, fontweight='bold')
        plt.barh(range(len(indices)), importances[indices], align="center", color="#10b981")
        plt.yticks(range(len(indices)), [feature_names[i] for i in indices])
        plt.xlabel("Relative Importance Score")
        plt.gca().invert_yaxis()
        plt.tight_layout()
        plt.savefig(os.path.join(artifacts_dir, "feature_importance.png"), dpi=300)
        plt.close()

    # 2. Confusion Matrix Plot for Risk Categories
    true_categories = ["LOW" if s >= 75 else "MEDIUM" if s >= 60 else "HIGH" if s >= 45 else "VERY HIGH" for s in y_test]
    pred_categories = ["LOW" if s >= 75 else "MEDIUM" if s >= 60 else "HIGH" if s >= 45 else "VERY HIGH" for s in preds]

    labels = ["LOW", "MEDIUM", "HIGH", "VERY HIGH"]
    cm = confusion_matrix(true_categories, pred_categories, labels=labels)

    plt.figure(figsize=(8, 6))
    sns.heatmap(cm, annot=True, fmt="d", cmap="Greens", xticklabels=labels, yticklabels=labels)
    plt.title("Credit Risk Classification Confusion Matrix", fontsize=14, fontweight='bold')
    plt.xlabel("Predicted Risk Tier")
    plt.ylabel("Actual Risk Tier")
    plt.tight_layout()
    plt.savefig(os.path.join(artifacts_dir, "confusion_matrix.png"), dpi=300)
    plt.close()

    # 3. Income Distribution
    plt.figure(figsize=(10, 5))
    sns.histplot(df["monthly_earnings"], kde=True, color="#3b82f6")
    plt.title("Gig Worker Monthly Income Distribution (INR)", fontsize=14, fontweight='bold')
    plt.xlabel("Monthly Income (INR)")
    plt.tight_layout()
    plt.savefig(os.path.join(artifacts_dir, "income_distribution.png"), dpi=300)
    plt.close()

    # 4. Correlation Matrix Plot
    plt.figure(figsize=(12, 10))
    corr = engineered_df[fe.feature_columns].corr()
    sns.heatmap(corr, annot=False, cmap="coolwarm", center=0)
    plt.title("Feature Correlation Matrix", fontsize=14, fontweight='bold')
    plt.tight_layout()
    plt.savefig(os.path.join(artifacts_dir, "correlation_matrix.png"), dpi=300)
    plt.close()

    # 5. Prediction Scatter Plot
    plt.figure(figsize=(8, 6))
    plt.scatter(y_test, preds, alpha=0.3, color="#10b981")
    plt.plot([0, 100], [0, 100], 'r--', label="Perfect Fit (y=x)")
    plt.title("Actual vs. Predicted Repayment Capability Score", fontsize=14, fontweight='bold')
    plt.xlabel("Actual Score")
    plt.ylabel("Predicted Score")
    plt.legend()
    plt.tight_layout()
    plt.savefig(os.path.join(artifacts_dir, "prediction_scatter.png"), dpi=300)
    plt.close()

    print(f"Generated 5 visualization charts in {artifacts_dir}")

if __name__ == "__main__":
    generate_visualizations()
