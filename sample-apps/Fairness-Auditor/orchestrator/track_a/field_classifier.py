import json
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[2]

TARGET_CONFIG = {
    "loan-decision-agent": BASE_DIR / "target-service" / "config" / "proxy_fields.json",
    "resume-screening-agent": BASE_DIR / "target-service" / "config" / "proxy_fields_resume.json",
    "insurance-quote-agent": BASE_DIR / "target-service" / "config" / "proxy_fields_insurance.json",
    "income-eligibility-agent": BASE_DIR / "target-service" / "config" / "proxy_fields_income_eligibility.json",
}

DEFAULT_PATH = BASE_DIR / "target-service" / "config" / "proxy_fields.json"
LOCAL_SEED_PATH = Path(__file__).resolve().parent / "seed_proxy_fields.json"


def load_proxy_fields(path: Path | None = None, target_name: str | None = None) -> dict:
    """Load proxy field definitions for a target agent.

    Resolution order:
    1. Explicitly supplied path
    2. TARGET_CONFIG mapping for target_name if provided
    3. Default target-service/config/proxy_fields.json
    4. Local seed fallback
    """
    if path is not None:
        target_path = path
    elif target_name in TARGET_CONFIG:
        target_path = TARGET_CONFIG[target_name]
    else:
        target_path = DEFAULT_PATH if DEFAULT_PATH.exists() else LOCAL_SEED_PATH

    if not target_path.exists():
        target_path = DEFAULT_PATH if DEFAULT_PATH.exists() else LOCAL_SEED_PATH

    with open(target_path) as f:
        return json.load(f)
