from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.services.user_service import UserService
from backend.schemas.domain_schemas import (
    UserRegisterRequest, UserLoginRequest, SendOTPRequest, VerifyOTPRequest, RefreshTokenRequest, TokenResponse
)
from backend.auth.otp import generate_otp, verify_otp
from backend.auth.jwt_handler import decode_token, create_access_token

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=TokenResponse)
def register(req: UserRegisterRequest, db: Session = Depends(get_db)):
    service = UserService(db)
    user = service.register_user(req)
    auth_data = service.authenticate_user(UserLoginRequest(email=req.email, password=req.password))
    return auth_data

@router.post("/login", response_model=TokenResponse)
def login(req: UserLoginRequest, db: Session = Depends(get_db)):
    service = UserService(db)
    return service.authenticate_user(req)

@router.post("/send-otp")
def send_otp(req: SendOTPRequest):
    otp = generate_otp(req.phone)
    return {
        "status": "SUCCESS",
        "phone": req.phone,
        "message": f"OTP successfully dispatched via SMS. (Demo Mock OTP: {otp})"
    }

@router.post("/verify-otp")
def verify_otp_endpoint(req: VerifyOTPRequest, db: Session = Depends(get_db)):
    valid = verify_otp(req.phone, req.otp)
    if not valid:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP.")
    
    # Auto register or fetch existing user for OTP login
    service = UserService(db)
    user = service.repo.get_by_phone(req.phone)
    if not user:
        # Create user via phone
        email = f"user_{req.phone[-6:]}@gigsecure.ai"
        user = service.register_user(UserRegisterRequest(
            full_name=f"Gig Partner ({req.phone[-4:]})",
            email=email,
            phone=req.phone,
            password="OtpDefaultPassword2026!"
        ))
    
    access_token = create_access_token({"sub": str(user.id), "role": user.role})
    return {
        "access_token": access_token,
        "refresh_token": access_token,
        "token_type": "bearer",
        "user_id": user.id,
        "full_name": user.full_name,
        "role": user.role
    }

@router.post("/refresh")
def refresh_token(req: RefreshTokenRequest):
    payload = decode_token(req.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    
    new_access_token = create_access_token({"sub": payload.get("sub")})
    return {"access_token": new_access_token, "token_type": "bearer"}
