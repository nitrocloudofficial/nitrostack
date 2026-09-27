from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.dependencies import get_current_user
from backend.models.domain_models import User
from backend.schemas.domain_schemas import NomineeRegisterRequest, NomineeResponse
from backend.services.succession_service import SuccessionService

router = APIRouter(prefix="/nominee", tags=["Nominee Assistance"])

@router.post("/register", response_model=NomineeResponse)
def register_nominee(
    req: NomineeRegisterRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    service = SuccessionService(db)
    return service.register_nominee(current_user.id, req)

@router.get("/details", response_model=NomineeResponse)
def get_nominee_details(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    service = SuccessionService(db)
    nominee = service.repo.get_nominee_by_user(current_user.id)
    if not nominee:
        raise HTTPException(status_code=404, detail="No registered nominee found for current user.")
    return nominee
