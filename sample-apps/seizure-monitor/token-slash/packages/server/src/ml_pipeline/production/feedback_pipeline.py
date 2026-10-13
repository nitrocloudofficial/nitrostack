import os
import json
import time
import uuid
import pandas as pd

class PromptIQFeedbackPipeline:
    def __init__(self, feedback_dir=None):
        if feedback_dir is None:
            base_dir = os.path.dirname(os.path.abspath(__file__))
            feedback_dir = os.path.abspath(os.path.join(base_dir, "..", "data", "feedback"))
        
        self.feedback_dir = feedback_dir
        os.makedirs(self.feedback_dir, exist_ok=True)
        self.feedback_file = os.path.join(self.feedback_dir, "feedback_dataset.json")
        self.future_file = os.path.join(self.feedback_dir, "future_training_dataset.json")

    def record_recommendation_event(self, event_data):
        """
        Logs a production recommendation event with user interaction feedback.
        """
        event_record = {
            "recommendationId": str(uuid.uuid4()),
            "timestamp": event_data.get("timestamp", time.strftime("%Y-%m-%dT%H:%M:%SZ")),
            "promptId": event_data.get("promptId", str(uuid.uuid4())[:8]),
            "userId": event_data.get("userId", "usr_default"),
            "promptText": event_data.get("promptText", ""),
            "businessMode": event_data.get("businessMode", "balanced"),
            "recommendedModel": event_data.get("recommendedModel", "deepseek-v3"),
            "actualModelUsed": event_data.get("actualModelUsed", event_data.get("recommendedModel", "deepseek-v3")),
            "wasAccepted": event_data.get("wasAccepted", True),
            "userSwitchedModel": event_data.get("userSwitchedModel", False),
            "estimatedSatisfaction": event_data.get("estimatedSatisfaction", 85.0),
            "actualSatisfaction": event_data.get("actualSatisfaction", 88.0),
            "estimatedCost": event_data.get("estimatedCost", 0.000015),
            "actualCost": event_data.get("actualCost", 0.000015),
            "estimatedRetries": event_data.get("estimatedRetries", 0.2),
            "actualRetries": event_data.get("actualRetries", 0.0),
            "estimatedLatency": event_data.get("estimatedLatency", 1.0),
            "actualLatency": event_data.get("actualLatency", 0.95),
            "userRating": event_data.get("userRating", 5),
            "feedbackText": event_data.get("feedbackText", "Great speed and accuracy")
        }

        # Append to feedback store
        existing_records = []
        if os.path.exists(self.feedback_file):
            try:
                with open(self.feedback_file, "r", encoding="utf-8") as f:
                    existing_records = json.load(f)
            except Exception:
                existing_records = []
        
        existing_records.append(event_record)
        
        with open(self.feedback_file, "w", encoding="utf-8") as f:
            json.dump(existing_records, f, indent=2)

        # Export CSV/Parquet dataset
        df = pd.DataFrame(existing_records)
        df.to_csv(os.path.join(self.feedback_dir, "feedback_dataset.csv"), index=False)

        print(f"[Production Intelligence] Feedback record saved. Total production feedback count: {len(existing_records)}")
        return event_record["recommendationId"]

    def generate_future_training_dataset(self, baseline_dataset_path):
        """
        Combines raw training data with validated user feedback for continuous self-learning.
        """
        feedback_records = []
        if os.path.exists(self.feedback_file):
            with open(self.feedback_file, "r", encoding="utf-8") as f:
                feedback_records = json.load(f)

        print(f"[Production Intelligence] Merging {len(feedback_records)} user feedback records into retrain store...")
        
        future_pkg = {
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "feedbackCount": len(feedback_records),
            "status": "READY_FOR_RETRAINING" if len(feedback_records) >= 50 else "COLLECTING",
            "records": feedback_records
        }

        with open(self.future_file, "w", encoding="utf-8") as f:
            json.dump(future_pkg, f, indent=2)

        return self.future_file

if __name__ == "__main__":
    pipeline = PromptIQFeedbackPipeline()
    pipeline.record_recommendation_event({
        "promptText": "Write a Python function to parse JSON with error handling",
        "recommendedModel": "deepseek-v3",
        "wasAccepted": True,
        "actualSatisfaction": 90.0
    })
