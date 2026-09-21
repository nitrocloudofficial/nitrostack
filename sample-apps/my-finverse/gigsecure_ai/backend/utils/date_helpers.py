from datetime import datetime, timedelta

def get_current_utc_str() -> str:
    return datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")

def add_days_to_date(days: int) -> datetime:
    return datetime.utcnow() + timedelta(days=days)
