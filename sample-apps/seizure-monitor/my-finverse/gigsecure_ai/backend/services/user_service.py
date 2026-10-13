from sqlalchemy.orm import Session
from backend.repositories.user_repository import UserRepository
from backend.models.domain_models import User, GigProfile
from backend.auth.security import hash_password, verify_password
from backend.auth.jwt_handler import create_access_token, create_refresh_token
from backend.schemas.domain_schemas import UserRegisterRequest, UserLoginRequest, ProfileUpdateRequest, GigProfileConnectRequest
from fastapi import HTTPException, status

class UserService:
    def __init__(self, db: Session):
        self.repo = UserRepository(db)

    def register_user(self, req: UserRegisterRequest):
        if self.repo.get_by_email(req.email):
            raise HTTPException(status_code=400, detail="User with this email already exists.")
        if self.repo.get_by_phone(req.phone):
            raise HTTPException(status_code=400, detail="User with this phone number already exists.")

        user = User(
            full_name=req.full_name,
            email=req.email,
            phone=req.phone,
            password_hash=hash_password(req.password),
            role=req.role or "Worker",
            aadhaar_number=req.aadhaar_number,
            pan_number=req.pan_number
        )
        created_user = self.repo.create(user)

        # Create default gig profile for workers
        if created_user.role == "Worker":
            profile = GigProfile(
                user_id=created_user.id,
                primary_platform="Zomato",
                avg_monthly_income=28000.0,
                working_hours=45.0
            )
            self.repo.create_or_update_gig_profile(profile)

        return created_user

    def authenticate_user(self, req: UserLoginRequest):
        user = self.repo.get_by_email(req.email)
        if not user or not verify_password(req.password, user.password_hash):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password.")
        
        access_token = create_access_token({"sub": str(user.id), "role": user.role})
        refresh_token = create_refresh_token({"sub": str(user.id)})

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "user_id": user.id,
            "full_name": user.full_name,
            "role": user.role
        }

    def update_profile(self, user_id: int, req: ProfileUpdateRequest):
        user = self.repo.get_by_id(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found.")
        if req.full_name:
            user.full_name = req.full_name
        if req.phone:
            user.phone = req.phone
        if req.aadhaar_number:
            user.aadhaar_number = req.aadhaar_number
        if req.pan_number:
            user.pan_number = req.pan_number
        return self.repo.update(user)

    def connect_gig_platform(self, user_id: int, req: GigProfileConnectRequest):
        profile = self.repo.get_gig_profile(user_id)
        if not profile:
            profile = GigProfile(user_id=user_id)
        
        profile.primary_platform = req.primary_platform
        if req.secondary_platforms:
            profile.secondary_platforms = req.secondary_platforms
        if req.city_tier:
            profile.city_tier = req.city_tier
        if req.gig_tenure_months:
            profile.gig_tenure_months = req.gig_tenure_months
        if req.avg_monthly_income:
            profile.avg_monthly_income = req.avg_monthly_income
        if req.working_hours:
            profile.working_hours = req.working_hours
        if req.upi_id:
            profile.upi_id = req.upi_id
        if req.bank_account_no:
            profile.bank_account_no = req.bank_account_no

        return self.repo.create_or_update_gig_profile(profile)
