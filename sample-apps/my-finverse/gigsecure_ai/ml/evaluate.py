import os
import json
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.metrics import r2_score, mean_absolute_error, mean_squared_error

from feature_engineering import FeatureEngineer
from model_utils import load_model

def evaluate_saved_model():
    base_dir = os.path.dirname(__file__)
    model_path = os.path.join(base_dir, "models", "xgb_credit_model.pkl")
    data_path = os.path.join(base_dir, "artifacts", "gig_training_data.csv")

    payload = load_model(model_path)
    model = payload["model"]

    df = pd.read_csv(data_path)
    fe = FeatureEngineer()
    engineered_df = fe.create_features(df)

    X = fe.fit_transform(df)
    y = engineered_df["repayment_capability_score"].values

    _, X_test, _, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    preds = model.predict(X_test)

    r2 = float(r2_score(y_test, preds))
    mae = float(mean_absolute_error(y_test, preds))
    mse = float(mean_squared_error(y_test, preds))
    rmse = float(np.sqrt(mse))
    mape = float(np.mean(np.abs((y_test - preds) / np.maximum(y_test, 1.0))) * 100)

    metrics = {
        "model_name": payload.get("model_name", "XGBoost"),
        "r2_score": round(r2, 4),
        "mae": round(mae, 4),
        "mse": round(mse, 4),
        "rmse": round(rmse, 4),
        "mape_percent": round(mape, 2),
        "total_test_samples": len(y_test)
    }

    metrics_path = os.path.join(base_dir, "artifacts", "metrics.json")
    with open(metrics_path, "w") as f:
        json.dump(metrics, f, indent=2)

    print(f"Evaluated model metrics exported -> {metrics_path}")
    print(json.dumps(metrics, indent=2))
    return metrics

if __name__ == "__main__":
    evaluate_saved_model()
