from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.dependencies import get_current_user
from backend.models.domain_models import User
from backend.schemas.domain_schemas import ProcessRepaymentRequest, RepaymentResponse
from backend.services.repayment_service import RepaymentService

router = APIRouter(prefix="/repayment", tags=["Repayment Engine"])

@router.post("/process", response_model=RepaymentResponse)
def process_repayment(
    req: ProcessRepaymentRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    service = RepaymentService(db)
    return service.process_repayment(current_user.id, req)

@router.post("/pause")
def pause_repayment(
    loan_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    service = RepaymentService(db)
    return service.pause_loan(current_user.id, loan_id)

@router.post("/resume")
def resume_repayment(
    loan_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    service = RepaymentService(db)
    return service.resume_loan(current_user.id, loan_id)

@router.get("/history")
def get_repayment_history(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    service = RepaymentService(db)
    repayments = service.repay_repo.get_by_user_id(current_user.id)
    return repayments
