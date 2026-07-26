from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.dependencies import get_current_user
from backend.models.domain_models import User
from backend.schemas.domain_schemas import GigProfileConnectRequest, GigProfileResponse
from backend.services.user_service import UserService

router = APIRouter(prefix="/profile", tags=["Gig Profile"])

@router.post("/connect-platform", response_model=GigProfileResponse)
def connect_platform(req: GigProfileConnectRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    service = UserService(db)
    return service.connect_gig_platform(current_user.id, req)

@router.get("/platform-data")
def get_platform_data(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    service = UserService(db)
    profile = service.repo.get_gig_profile(current_user.id)
    return {
        "user_id": current_user.id,
        "platform": profile.primary_platform if profile else "Zomato",
        "verified": True,
        "avg_monthly_income": profile.avg_monthly_income if profile else 28000.0,
        "working_hours": profile.working_hours if profile else 45,
        "order_completion_rate": profile.order_completion_rate if profile else 0.96,
        "platform_rating": profile.platform_rating if profile else 4.8,
        "historical_payouts": [
            {"date": "2026-07-01", "amount": 1250.0},
            {"date": "2026-07-02", "amount": 1100.0},
            {"date": "2026-07-03", "amount": 1450.0},
            {"date": "2026-07-04", "amount": 980.0},
            {"date": "2026-07-05", "amount": 1320.0}
        ]
    }
