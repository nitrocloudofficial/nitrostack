import os
import joblib

def save_model(model_obj, output_path: str):
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    joblib.dump(model_obj, output_path)
    print(f"Model successfully saved to {output_path}")

def load_model(model_path: str):
    if not os.path.exists(model_path):
        raise FileNotFoundError(f"Model file not found at {model_path}")
    return joblib.load(model_path)
