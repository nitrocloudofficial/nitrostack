from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.dependencies import get_current_user
from backend.models.domain_models import User

router = APIRouter(prefix="/analytics", tags=["Analytics & Heatmaps"])

@router.get("/dashboard")
def get_analytics_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return {
        "income_heatmaps": [
            {"day": "Mon", "avg_earnings": 1150},
            {"day": "Tue", "avg_earnings": 1080},
            {"day": "Wed", "avg_earnings": 1220},
            {"day": "Thu", "avg_earnings": 1190},
            {"day": "Fri", "avg_earnings": 1450},
            {"day": "Sat", "avg_earnings": 1850},
            {"day": "Sun", "avg_earnings": 1920}
        ],
        "loan_distribution": [
            {"category": "Emergency Fuel Loan", "count": 210},
            {"category": "Working Capital Loan", "count": 180},
            {"category": "EV Fleet Expansion", "count": 90}
        ],
        "fraud_heatmap": [
            {"region": "Mumbai NCR", "risk_level": "LOW", "flagged_count": 8},
            {"region": "Bengaluru", "risk_level": "LOW", "flagged_count": 5},
            {"region": "Delhi NCR", "risk_level": "MEDIUM", "flagged_count": 14},
            {"region": "Hyderabad", "risk_level": "LOW", "flagged_count": 3}
        ],
        "repayment_performance": {
            "on_time_autopay_rate": 96.8,
            "smart_pause_protected_rate": 3.2,
            "default_rate": 0.0
        }
    }
