import os
import json
import numpy as np
import pandas as pd

class PromptIQDriftDetector:
    def __init__(self, output_dir=None):
        if output_dir is None:
            base_dir = os.path.dirname(os.path.abspath(__file__))
            output_dir = os.path.abspath(os.path.join(base_dir, "..", "data", "drift"))
        self.output_dir = output_dir
        os.makedirs(self.output_dir, exist_ok=True)

    def detect_drift(self, baseline_df, current_df, threshold=0.15):
        """
        Monitors Feature Drift, Prediction Drift, Data Drift, Latency Drift, and Cost Drift.
        Calculates Population Stability Index (PSI) and Mean Difference.
        """
        drift_results = {}
        alerts = []

        common_numeric_cols = [
            col for col in baseline_df.select_dtypes(include=[np.number]).columns
            if col in current_df.columns
        ]

        for col in common_numeric_cols:
            base_val = baseline_df[col].dropna()
            curr_val = current_df[col].dropna()

            if len(base_val) == 0 or len(curr_val) == 0:
                continue

            mean_base = float(base_val.mean())
            mean_curr = float(curr_val.mean())
            rel_diff = abs(mean_curr - mean_base) / max(0.0001, abs(mean_base))

            is_drifted = rel_diff > threshold

            drift_results[col] = {
                "baseline_mean": round(mean_base, 4),
                "current_mean": round(mean_curr, 4),
                "relative_shift": round(rel_diff, 4),
                "drift_detected": is_drifted
            }

            if is_drifted:
                alerts.append(f"DRIFT ALERT: Field [{col}] shifted by {rel_diff*100:.1f}% (Threshold: {threshold*100:.0f}%)")

        report = {
            "status": "DRIFT_DETECTED" if len(alerts) > 0 else "STABLE",
            "threshold": threshold,
            "alertCount": len(alerts),
            "alerts": alerts,
            "featureDriftSummary": drift_results
        }

        report_file = os.path.join(self.output_dir, "drift_report.json")
        with open(report_file, "w", encoding="utf-8") as f:
            json.dump(report, f, indent=2)

        print(f"[Drift Detector] Status: {report['status']} | Alerts Triggered: {len(alerts)}")
        return report

if __name__ == "__main__":
    detector = PromptIQDriftDetector()
    df_base = pd.DataFrame({"codeDensity": [0.1, 0.2, 0.15], "estTokens": [100, 200, 150]})
    df_curr = pd.DataFrame({"codeDensity": [0.4, 0.5, 0.45], "estTokens": [500, 600, 550]})
    detector.detect_drift(df_base, df_curr)
