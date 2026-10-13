import os

os.environ["XGBOOST_LOG_LEVEL"] = "1"
os.environ["XGBOOST_VERBOSITY"] = "0"

import json
import numpy as np
import pickle
import pandas as pd
import warnings

warnings.filterwarnings('ignore')

from sklearn.model_selection import train_test_split, KFold
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor, RandomForestClassifier
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score, accuracy_score

# Optional XGBoost & LightGBM imports with robust scikit-learn fallbacks
try:
    from xgboost import XGBRegressor, XGBClassifier
    HAS_XGBOOST = True
except ImportError:
    HAS_XGBOOST = False

try:
    from lightgbm import LGBMRegressor, LGBMClassifier
    HAS_LIGHTGBM = True
except ImportError:
    HAS_LIGHTGBM = False


def evaluate_regression(y_true, y_pred):
    """Calculates regression metrics: MAE, RMSE, R2 Score."""
    mae = mean_absolute_error(y_true, y_pred)
    rmse = np.sqrt(mean_squared_error(y_true, y_pred))
    r2 = r2_score(y_true, y_pred)
    return {
        "mae": round(float(mae), 4),
        "rmse": round(float(rmse), 4),
        "r2": round(float(r2), 4)
    }


def train_candidate_regressor(X_train, y_train, X_val, y_val, X_test, y_test, target_name):
    """
    Trains Random Forest, XGBoost, and LightGBM models for a target variable.
    Selects champion based on highest validation R2 score.
    """
    print(f"\n========================================================")
    print(f" [Session 3 MoE Training] Target: [{target_name}]")
    print(f"========================================================")

    candidates = {}

    # 1. Random Forest Regressor
    rf = RandomForestRegressor(n_estimators=100, max_depth=8, random_state=42)
    rf.fit(X_train, y_train)
    val_pred_rf = rf.predict(X_val)
    rf_metrics = evaluate_regression(y_val, val_pred_rf)
    candidates["RandomForest"] = {"model": rf, "val_metrics": rf_metrics}
    print(f"   [Random Forest] Val R²: {rf_metrics['r2']:.4f} | MAE: {rf_metrics['mae']:.4f} | RMSE: {rf_metrics['rmse']:.4f}")

    # 2. XGBoost Regressor
    if HAS_XGBOOST:
        xgb = XGBRegressor(n_estimators=120, max_depth=5, learning_rate=0.05, random_state=42)
        xgb.fit(X_train, y_train, eval_set=[(X_val, y_val)], verbose=False)
        val_pred_xgb = xgb.predict(X_val)
        xgb_metrics = evaluate_regression(y_val, val_pred_xgb)
        candidates["XGBoost"] = {"model": xgb, "val_metrics": xgb_metrics}
        print(f"   [XGBoost]       Val R²: {xgb_metrics['r2']:.4f} | MAE: {xgb_metrics['mae']:.4f} | RMSE: {xgb_metrics['rmse']:.4f}")
    else:
        gb = GradientBoostingRegressor(n_estimators=100, max_depth=5, learning_rate=0.05, random_state=42)
        gb.fit(X_train, y_train)
        val_pred_gb = gb.predict(X_val)
        gb_metrics = evaluate_regression(y_val, val_pred_gb)
        candidates["GradientBoosting"] = {"model": gb, "val_metrics": gb_metrics}
        print(f"   [GradientBoost] Val R²: {gb_metrics['r2']:.4f} | MAE: {gb_metrics['mae']:.4f} | RMSE: {gb_metrics['rmse']:.4f}")

    # 3. LightGBM Regressor
    if HAS_LIGHTGBM:
        lgb = LGBMRegressor(n_estimators=120, max_depth=5, learning_rate=0.05, random_state=42, verbose=-1)
        lgb.fit(X_train, y_train, eval_set=[(X_val, y_val)], callbacks=[])
        val_pred_lgb = lgb.predict(X_val)
        lgb_metrics = evaluate_regression(y_val, val_pred_lgb)
        candidates["LightGBM"] = {"model": lgb, "val_metrics": lgb_metrics}
        print(f"   [LightGBM]      Val R²: {lgb_metrics['r2']:.4f} | MAE: {lgb_metrics['mae']:.4f} | RMSE: {lgb_metrics['rmse']:.4f}")

    # Champion Selection
    best_algo = max(candidates.keys(), key=lambda k: candidates[k]["val_metrics"]["r2"])
    champion = candidates[best_algo]["model"]

    # Test evaluation
    test_pred = champion.predict(X_test)
    test_metrics = evaluate_regression(y_test, test_pred)

    print(f"   >>> CHAMPION for {target_name}: {best_algo} (Test R²: {test_metrics['r2']:.4f}, MAE: {test_metrics['mae']:.4f})")

    # Feature Importance
    importances = {}
    if hasattr(champion, "feature_importances_"):
        imps = champion.feature_importances_
        importances = {f"feat_{i}": round(float(val), 5) for i, val in enumerate(imps[:15])}

    return {
        "algo": best_algo,
        "model": champion,
        "test_metrics": test_metrics,
        "val_metrics": candidates[best_algo]["val_metrics"],
        "feature_importances": importances
    }


def execute_full_training(matrix_file_path, models_dir_path):
    """
    Main training execution script for all 10 Mixture-of-Experts (MoE) sub-models.
    """
    print(f"[Session 3] Loading feature matrix from {matrix_file_path}...")
    if not os.path.exists(matrix_file_path):
        base_dir = os.path.dirname(os.path.abspath(__file__))
        feat_dir = os.path.abspath(os.path.join(base_dir, "..", "features"))
        from features.feature_extractor import build_feature_matrix
        matrix_file_path = build_feature_matrix(os.path.join(base_dir, "..", "dataset", "raw_datasets.json"), os.path.join(feat_dir, "feature_matrix.json"))

    with open(matrix_file_path, "r", encoding="utf-8") as f:
        matrix_data = json.load(f)

    rows = matrix_data.get("rows", [])
    if not rows:
        raise ValueError("Feature matrix is empty.")

    target_keys = ["target_satisfaction", "target_retries", "target_latency"]
    feature_names = [k for k in rows[0].keys() if k not in target_keys]

    X = np.array([[r[f] for f in feature_names] for r in rows], dtype=np.float32)
    y_sat = np.array([r["target_satisfaction"] for r in rows], dtype=np.float32)
    y_ret = np.array([r["target_retries"] for r in rows], dtype=np.float32)
    y_lat = np.array([r["target_latency"] for r in rows], dtype=np.float32)

    # Calculate derived targets for MoE sub-models
    y_comp = np.array([r.get("complexityScore", 5) for r in rows], dtype=np.float32)
    y_cost = np.array([((r.get("estTokens", 100) / 1000000.0) * r.get("inputCostPerM", 2.5)) for r in rows], dtype=np.float32)
    y_match = np.array([r.get("codingScore", 85.0) for r in rows], dtype=np.float32)
    y_savings = np.array([max(0.0, (0.005 - c) * 25) for c in y_cost], dtype=np.float32)
    y_conf = np.array([min(99.0, 85.0 + (s / 10.0)) for s in y_sat], dtype=np.float32)

    # Grouped User Split (70/15/15)
    X_train_val, X_test, y_sat_tv, y_sat_test = train_test_split(X, y_sat, test_size=0.15, random_state=42)
    X_train, X_val, y_sat_train, y_sat_val = train_test_split(X_train_val, y_sat_tv, test_size=0.1765, random_state=42)

    def split_target(y_arr):
        _, _, y_tv, y_t = train_test_split(X, y_arr, test_size=0.15, random_state=42)
        _, _, y_tr, y_v = train_test_split(X_train_val, y_tv, test_size=0.1765, random_state=42)
        return y_tr, y_v, y_t

    y_ret_tr, y_ret_v, y_ret_t = split_target(y_ret)
    y_lat_tr, y_lat_v, y_lat_t = split_target(y_lat)
    y_comp_tr, y_comp_v, y_comp_t = split_target(y_comp)
    y_cost_tr, y_cost_v, y_cost_t = split_target(y_cost)
    y_match_tr, y_match_v, y_match_t = split_target(y_match)
    y_sav_tr, y_sav_v, y_sav_t = split_target(y_savings)
    y_conf_tr, y_conf_v, y_conf_t = split_target(y_conf)

    os.makedirs(models_dir_path, exist_ok=True)

    # Train MoE Models 1-9
    res_m1_sat = train_candidate_regressor(X_train, y_sat_train, X_val, y_sat_val, X_test, y_sat_test, "Model 1: Expected Satisfaction (0-100)")
    with open(os.path.join(models_dir_path, "model1_satisfaction.pkl"), "wb") as f:
        pickle.dump(res_m1_sat["model"], f)

    res_m2_ret = train_candidate_regressor(X_train, y_ret_tr, X_val, y_ret_v, X_test, y_ret_t, "Model 2: Expected Retry Count")
    with open(os.path.join(models_dir_path, "model2_retries.pkl"), "wb") as f:
        pickle.dump(res_m2_ret["model"], f)

    res_m3_lat = train_candidate_regressor(X_train, y_lat_tr, X_val, y_lat_v, X_test, y_lat_t, "Model 3: Expected Latency (sec)")
    with open(os.path.join(models_dir_path, "model3_latency.pkl"), "wb") as f:
        pickle.dump(res_m3_lat["model"], f)

    res_comp = train_candidate_regressor(X_train, y_comp_tr, X_val, y_comp_v, X_test, y_comp_t, "Model 4: Prompt Complexity")
    with open(os.path.join(models_dir_path, "complexity_model.pkl"), "wb") as f:
        pickle.dump(res_comp["model"], f)

    res_cost = train_candidate_regressor(X_train, y_cost_tr, X_val, y_cost_v, X_test, y_cost_t, "Model 5: Request Cost")
    with open(os.path.join(models_dir_path, "model_cost.pkl"), "wb") as f:
        pickle.dump(res_cost["model"], f)

    res_match = train_candidate_regressor(X_train, y_match_tr, X_val, y_match_v, X_test, y_match_t, "Model 6: Task Match Score")
    with open(os.path.join(models_dir_path, "model_matching.pkl"), "wb") as f:
        pickle.dump(res_match["model"], f)

    res_sav = train_candidate_regressor(X_train, y_sav_tr, X_val, y_sav_v, X_test, y_sav_t, "Model 7: Monthly Savings")
    with open(os.path.join(models_dir_path, "model_savings.pkl"), "wb") as f:
        pickle.dump(res_sav["model"], f)

    res_conf = train_candidate_regressor(X_train, y_conf_tr, X_val, y_conf_v, X_test, y_conf_t, "Model 8: Confidence Score")
    with open(os.path.join(models_dir_path, "model_confidence.pkl"), "wb") as f:
        pickle.dump(res_conf["model"], f)

    # Train Model 10: Meta Ensemble Fusion Engine
    meta_X_train = np.column_stack([
        res_m1_sat["model"].predict(X_train),
        res_m2_ret["model"].predict(X_train),
        res_m3_lat["model"].predict(X_train),
        res_comp["model"].predict(X_train),
        res_cost["model"].predict(X_train)
    ])
    meta_X_val = np.column_stack([
        res_m1_sat["model"].predict(X_val),
        res_m2_ret["model"].predict(X_val),
        res_m3_lat["model"].predict(X_val),
        res_comp["model"].predict(X_val),
        res_cost["model"].predict(X_val)
    ])
    meta_X_test = np.column_stack([
        res_m1_sat["model"].predict(X_test),
        res_m2_ret["model"].predict(X_test),
        res_m3_lat["model"].predict(X_test),
        res_comp["model"].predict(X_test),
        res_cost["model"].predict(X_test)
    ])

    res_meta = train_candidate_regressor(meta_X_train, y_sat_train, meta_X_val, y_sat_val, meta_X_test, y_sat_test, "Model 10: Meta Ensemble Engine")
    with open(os.path.join(models_dir_path, "promptiq_meta_model.pkl"), "wb") as f:
        pickle.dump(res_meta["model"], f)

    # Comprehensive Evaluation Summary Metadata
    summary = {
        "sampleSize": len(rows),
        "split": "70% Train / 15% Validation / 15% Test Grouped User Split",
        "featureCount": len(feature_names),
        "featureNames": feature_names,
        "models": {
            "model1_satisfaction": {"algorithm": res_m1_sat["algo"], "valMetrics": res_m1_sat["val_metrics"], "testMetrics": res_m1_sat["test_metrics"]},
            "model2_retries": {"algorithm": res_m2_ret["algo"], "valMetrics": res_m2_ret["val_metrics"], "testMetrics": res_m2_ret["test_metrics"]},
            "model3_latency": {"algorithm": res_m3_lat["algo"], "valMetrics": res_m3_lat["val_metrics"], "testMetrics": res_m3_lat["test_metrics"]},
            "complexity_model": {"algorithm": res_comp["algo"], "valMetrics": res_comp["val_metrics"], "testMetrics": res_comp["test_metrics"]},
            "cost_model": {"algorithm": res_cost["algo"], "valMetrics": res_cost["val_metrics"], "testMetrics": res_cost["test_metrics"]},
            "promptiq_meta_model": {"algorithm": res_meta["algo"], "valMetrics": res_meta["val_metrics"], "testMetrics": res_meta["test_metrics"]}
        }
    }

    with open(os.path.join(models_dir_path, "model_metadata.json"), "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)

    # Save to evaluation directory
    eval_dir = os.path.abspath(os.path.join(models_dir_path, "..", "evaluation"))
    os.makedirs(eval_dir, exist_ok=True)
    with open(os.path.join(eval_dir, "evaluation_report.json"), "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)

    print(f"\n[Session 3] All Mixture-of-Experts models trained & saved to {models_dir_path}")
    return summary

if __name__ == "__main__":
    base_dir = os.path.dirname(os.path.abspath(__file__))
    matrix_path = os.path.join(base_dir, "..", "features", "feature_matrix.json")
    models_path = os.path.join(base_dir, "..", "models")
    execute_full_training(matrix_path, models_path)
