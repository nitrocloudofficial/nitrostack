import os
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, cross_val_score, GridSearchCV
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.linear_model import Ridge
from xgboost import XGBRegressor
from sklearn.metrics import r2_score, mean_absolute_error, mean_squared_error

from data_generation import generate_gig_worker_dataset
from feature_engineering import FeatureEngineer
from model_utils import save_model

def train_and_select_best_model():
    base_dir = os.path.dirname(__file__)
    data_path = os.path.join(base_dir, "artifacts", "gig_training_data.csv")

    if not os.path.exists(data_path):
        df = generate_gig_worker_dataset(10000, output_path=data_path)
    else:
        df = pd.read_csv(data_path)

    fe = FeatureEngineer()
    engineered_df = fe.create_features(df)
    
    X = fe.fit_transform(df)
    y = engineered_df["repayment_capability_score"].values

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    # Models comparison
    models = {
        "XGBoost": XGBRegressor(n_estimators=150, learning_rate=0.08, max_depth=6, random_state=42),
        "RandomForest": RandomForestRegressor(n_estimators=100, max_depth=12, random_state=42),
        "GradientBoosting": GradientBoostingRegressor(n_estimators=120, learning_rate=0.08, random_state=42),
        "RidgeRegression": Ridge(alpha=1.0)
    }

    results = {}
    best_name = None
    best_r2 = -float("inf")
    best_model_instance = None

    print("\n================ MODEL TRAINING & COMPARISON ================")
    for name, model in models.items():
        model.fit(X_train, y_train)
        preds = model.predict(X_test)

        r2 = r2_score(y_test, preds)
        mae = mean_absolute_error(y_test, preds)
        rmse = np.sqrt(mean_squared_error(y_test, preds))

        cv_scores = cross_val_score(model, X_train, y_train, cv=5, scoring="r2")
        cv_mean = cv_scores.mean()

        print(f"[{name}] R2: {r2:.4f} | CV Mean R2: {cv_mean:.4f} | MAE: {mae:.4f} | RMSE: {rmse:.4f}")

        results[name] = {"r2": r2, "cv_mean": cv_mean, "mae": mae, "rmse": rmse, "model": model}

        if r2 > best_r2:
            best_r2 = r2
            best_name = name
            best_model_instance = model

    print(f"\nWinner Model Automatically Selected: {best_name} (R2 Score: {best_r2:.4f})")

    # Hyperparameter Tuning on Winner Model if XGBoost or RF
    best_params = {}
    if best_name == "XGBoost":
        param_grid = {
            'max_depth': [4, 6, 8],
            'learning_rate': [0.05, 0.1],
            'n_estimators': [100, 150]
        }
        grid = GridSearchCV(XGBRegressor(random_state=42), param_grid, cv=3, scoring='r2', n_jobs=-1)
        grid.fit(X_train, y_train)
        best_model_instance = grid.best_estimator_
        best_params = grid.best_params_
        print(f"Hyperparameter GridSearch Best Params for XGBoost: {best_params}")

    model_payload = {
        "model": best_model_instance,
        "model_name": best_name,
        "scaler": fe.scaler,
        "feature_columns": fe.feature_columns,
        "best_r2": float(best_r2),
        "best_params": best_params
    }

    model_output = os.path.join(base_dir, "models", "xgb_credit_model.pkl")
    save_model(model_payload, model_output)
    return model_output

if __name__ == "__main__":
    train_and_select_best_model()
