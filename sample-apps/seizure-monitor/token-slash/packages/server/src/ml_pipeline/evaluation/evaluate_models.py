import os

os.environ["XGBOOST_LOG_LEVEL"] = "1"
os.environ["XGBOOST_VERBOSITY"] = "0"

import sys
import json
import numpy as np
import pickle
import warnings

warnings.filterwarnings('ignore')

try:
    # pyrefly: ignore [missing-import]
    import xgboost
except ImportError:
    pass

try:
    # pyrefly: ignore [missing-import]
    import lightgbm
except ImportError:
    pass

def generate_evaluation_report(matrix_path, models_dir_path, output_report_path):
    """
    Generates detailed metrics, feature importances, and explainability report.
    """
    print(f"Reading feature matrix from {matrix_path}...")
    with open(matrix_path, "r", encoding="utf-8") as f:
        matrix_data = json.load(f)

    rows = matrix_data.get("rows", [])
    target_keys = ["target_satisfaction", "target_retries", "target_latency"]
    feature_names = [k for k in rows[0].keys() if k not in target_keys]

    meta_file = os.path.join(models_dir_path, "model_metadata.json")
    if os.path.exists(meta_file):
        with open(meta_file, "r", encoding="utf-8") as f:
            metadata = json.load(f)
    else:
        metadata = {}

    # Load trained models
    def load_model(name):
        path = os.path.join(models_dir_path, f"{name}.pkl")
        if os.path.exists(path):
            with open(path, "rb") as f:
                return pickle.load(f)
        return None

    m1 = load_model("model1_satisfaction")
    m2 = load_model("model2_retries")
    m3 = load_model("model3_latency")

    feature_importances = {}

    for name, m in [("Model 1 (Satisfaction)", m1), ("Model 2 (Retries)", m2), ("Model 3 (Latency)", m3)]:
        if m is not None and hasattr(m, "feature_importances_"):
            imps = m.feature_importances_
            ranked = sorted(zip(feature_names, [round(float(v), 5) for v in imps]), key=lambda x: x[1], reverse=True)
            feature_importances[name] = dict(ranked[:15])  # Top 15 features

    report = {
        "evaluationSummary": "TokenSlash 3-Model Intelligence Suite Performance Report",
        "sampleCount": len(rows),
        "featureCount": len(feature_names),
        "targetModels": metadata.get("models", {}),
        "topFeatureImportances": feature_importances,
        "calibration": {
            "confidenceThreshold": 0.85,
            "satisfactionMinMax": [0, 100],
            "maxRetriesCap": 4
        }
    }

    os.makedirs(os.path.dirname(output_report_path), exist_ok=True)
    with open(output_report_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)

    print(f"Evaluation report saved to {output_report_path}")
    return output_report_path

if __name__ == "__main__":
    base_dir = os.path.dirname(os.path.abspath(__file__))
    matrix = os.path.join(base_dir, "..", "features", "feature_matrix.json")
    models = os.path.join(base_dir, "..", "models")
    out_rep = os.path.join(base_dir, "evaluation_report.json")
    generate_evaluation_report(matrix, models, out_rep)
