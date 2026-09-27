from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.dependencies import get_current_user
from backend.models.domain_models import User, GigProfile
from backend.schemas.domain_schemas import UserResponse, ProfileUpdateRequest, GigProfileResponse
from backend.services.user_service import UserService

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.put("/update", response_model=UserResponse)
def update_user(req: ProfileUpdateRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    service = UserService(db)
    return service.update_profile(current_user.id, req)

@router.get("/profile", response_model=GigProfileResponse)
def get_user_profile(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    service = UserService(db)
    profile = service.repo.get_gig_profile(current_user.id)
    if not profile:
        profile = GigProfile(
            user_id=current_user.id,
            primary_platform="Zomato",
            avg_monthly_income=28000.0
        )
        profile = service.repo.create_or_update_gig_profile(profile)
    return profile
