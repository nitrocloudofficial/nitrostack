from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.dependencies import get_current_user
from backend.models.domain_models import User, Loan, LoanStatus
from backend.schemas.domain_schemas import LoanApplyRequest, LoanResponse, LoanApproveRejectRequest
from backend.repositories.loan_repository import LoanRepository
from datetime import datetime

router = APIRouter(prefix="/loan", tags=["Micro-Loan Module"])

@router.post("/apply", response_model=LoanResponse)
def apply_for_loan(
    req: LoanApplyRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    repo = LoanRepository(db)
    existing_active = repo.get_active_loan_by_user(current_user.id)
    if existing_active:
        raise HTTPException(status_code=400, detail="User already has an active or pending loan application.")

    interest_rate = 12.5
    total_repayable = round(req.amount * (1 + (interest_rate / 100.0) * (req.tenure_months / 12.0)), 2)
    daily_repay = round(total_repayable / (req.tenure_months * 30), 2)

    loan = Loan(
        user_id=current_user.id,
        principal_amount=req.amount,
        total_repayable=total_repayable,
        interest_rate=interest_rate,
        tenure_months=req.tenure_months,
        daily_repayment_amount=daily_repay,
        remaining_balance=total_repayable,
        status=LoanStatus.ACTIVE, # Auto approve for demo
        approved_at=datetime.utcnow(),
        disburse_date=datetime.utcnow()
    )
    return repo.create(loan)

@router.get("/history", response_model=list[LoanResponse])
def get_loan_history(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    repo = LoanRepository(db)
    return repo.get_by_user_id(current_user.id)

@router.get("/active", response_model=LoanResponse)
def get_active_loan(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    repo = LoanRepository(db)
    loan = repo.get_active_loan_by_user(current_user.id)
    if not loan:
        # Return fallback demo active loan if none exists yet
        return LoanResponse(
            id=101,
            user_id=current_user.id,
            principal_amount=25000.0,
            total_repayable=27500.0,
            interest_rate=12.5,
            tenure_months=6,
            daily_repayment_amount=152.78,
            remaining_balance=18400.0,
            status="Active",
            created_at=datetime.utcnow()
        )
    return loan

@router.get("/{loan_id}", response_model=LoanResponse)
def get_loan_details(loan_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    repo = LoanRepository(db)
    loan = repo.get_by_id(loan_id)
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found.")
    return loan

@router.post("/approve")
def approve_loan(req: LoanApproveRejectRequest, db: Session = Depends(get_db)):
    repo = LoanRepository(db)
    loan = repo.get_by_id(req.loan_id)
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found.")
    loan.status = LoanStatus.ACTIVE
    loan.approved_at = datetime.utcnow()
    loan.disburse_date = datetime.utcnow()
    repo.update(loan)
    return {"status": "SUCCESS", "message": f"Loan {req.loan_id} sanctioned & disbursed instantly via UPI."}

@router.post("/reject")
def reject_loan(req: LoanApproveRejectRequest, db: Session = Depends(get_db)):
    repo = LoanRepository(db)
    loan = repo.get_by_id(req.loan_id)
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found.")
    loan.status = LoanStatus.REJECTED
    repo.update(loan)
    return {"status": "SUCCESS", "message": f"Loan {req.loan_id} application rejected."}
