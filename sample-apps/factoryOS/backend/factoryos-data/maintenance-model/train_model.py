"""
train_model.py

Trains a RandomForest classifier on the REAL AI4I 2020 Predictive Maintenance
dataset (source: UCI ML Repository, Matzka 2020) to power the Maintenance
Agent's predict_failure tool.

Why this exists:
  Judges may ask "is this a real model or just an if-statement?" This gives
  you a genuine answer: yes, trained on a real published industrial dataset.

What it does:
  1. Loads ai4i2020.csv
  2. Drops the 5 failure SUBTYPE columns (TWF/HDF/PWF/OSF/RNF) — these leak
     the answer, since they ARE the failure. Only "Machine failure" is the
     label we predict from the sensor readings.
  3. Trains RandomForestClassifier on: Air temperature, Process temperature,
     Rotational speed, Torque, Tool wear (+ Type one-hot encoded)
  4. Saves the trained model to failure_model.pkl
  5. Prints accuracy / precision / recall so you have real numbers to quote
     in your pitch ("our model achieves X% recall on held-out real data")

Run once before the hackathon demo:
  python3 train_model.py
"""

import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
from sklearn.preprocessing import LabelEncoder
import joblib
import json

DATA_PATH = "ai4i2020.csv"
MODEL_PATH = "failure_model.pkl"
ENCODER_PATH = "type_encoder.pkl"
METRICS_PATH = "model_metrics.json"

FEATURE_COLS = [
    "Type",
    "Air temperature [K]",
    "Process temperature [K]",
    "Rotational speed [rpm]",
    "Torque [Nm]",
    "Tool wear [min]",
]
LABEL_COL = "Machine failure"

def main():
    df = pd.read_csv(DATA_PATH)
    df.columns = [c.strip() for c in df.columns]

    # Encode the categorical Type column (L/M/H -> 0/1/2)
    type_encoder = LabelEncoder()
    df["Type_encoded"] = type_encoder.fit_transform(df["Type"])

    feature_matrix = df[
        ["Type_encoded", "Air temperature [K]", "Process temperature [K]",
         "Rotational speed [rpm]", "Torque [Nm]", "Tool wear [min]"]
    ]
    labels = df[LABEL_COL]

    X_train, X_test, y_train, y_test = train_test_split(
        feature_matrix, labels, test_size=0.2, random_state=42, stratify=labels
    )

    # class_weight="balanced" matters here: real failures are only ~3.4% of
    # rows, so an unweighted model will just predict "no failure" every time.
    model = RandomForestClassifier(
        n_estimators=200,
        max_depth=10,
        class_weight="balanced",
        random_state=42,
    )
    model.fit(X_train, y_train)

    preds = model.predict(X_test)
    metrics = {
        "accuracy": round(accuracy_score(y_test, preds), 4),
        "precision": round(precision_score(y_test, preds), 4),
        "recall": round(recall_score(y_test, preds), 4),
        "f1": round(f1_score(y_test, preds), 4),
        "trained_on_rows": len(df),
        "real_failure_rate_pct": round(100 * labels.mean(), 2),
        "feature_importance": dict(
            sorted(
                zip(
                    ["Type", "Air temperature [K]", "Process temperature [K]",
                     "Rotational speed [rpm]", "Torque [Nm]", "Tool wear [min]"],
                    [round(x, 4) for x in model.feature_importances_],
                ),
                key=lambda kv: -kv[1],
            )
        ),
    }

    joblib.dump(model, MODEL_PATH)
    joblib.dump(type_encoder, ENCODER_PATH)
    with open(METRICS_PATH, "w") as f:
        json.dump(metrics, f, indent=2)

    print("Model trained on REAL AI4I 2020 data (10,000 rows, UCI ML Repository).")
    print(json.dumps(metrics, indent=2))
    print(f"\nSaved: {MODEL_PATH}, {ENCODER_PATH}, {METRICS_PATH}")

if __name__ == "__main__":
    main()
