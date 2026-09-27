from sqlalchemy.orm import Session
from backend.repositories.loan_repository import LoanRepository
from backend.repositories.repayment_repository import RepaymentRepository
from backend.models.domain_models import Repayment, RepaymentStatus, LoanStatus
from backend.schemas.domain_schemas import ProcessRepaymentRequest, RepaymentResponse
from fastapi import HTTPException
from datetime import datetime
import uuid

class RepaymentService:
    def __init__(self, db: Session):
        self.db = db
        self.loan_repo = LoanRepository(db)
        self.repay_repo = RepaymentRepository(db)

    def process_repayment(self, user_id: int, req: ProcessRepaymentRequest) -> RepaymentResponse:
        loan = self.loan_repo.get_by_id(req.loan_id)
        if not loan or loan.user_id != user_id:
            raise HTTPException(status_code=404, detail="Active loan not found.")

        if req.income == 0:
            # Smart Pause Triggered!
            loan.status = LoanStatus.PAUSED
            self.loan_repo.update(loan)

            repayment = Repayment(
                loan_id=loan.id,
                user_id=user_id,
                scheduled_date=datetime.utcnow(),
                paid_date=datetime.utcnow(),
                amount=0.0,
                status=RepaymentStatus.SMART_PAUSED,
                smart_pause_reason="Zero income recorded today - Smart Pause automatically protects worker liquidity.",
                txn_ref=f"SP-{uuid.uuid4().hex[:8].upper()}"
            )
            saved_repayment = self.repay_repo.create(repayment)

            return RepaymentResponse(
                id=saved_repayment.id,
                loan_id=loan.id,
                amount=0.0,
                debit_amount=0.0,
                smart_pause_activated=True,
                status="SMART_PAUSED",
                smart_pause_reason=saved_repayment.smart_pause_reason,
                txn_ref=saved_repayment.txn_ref,
                scheduled_date=saved_repayment.scheduled_date
            )

        # Dynamic repayment formula: 12% of today's earnings capped at standard daily payment + 20%
        dynamic_debit = round(min(req.income * 0.14, loan.daily_repayment_amount * 1.25), 2)
        dynamic_debit = min(dynamic_debit, loan.remaining_balance)

        loan.remaining_balance = round(max(0.0, loan.remaining_balance - dynamic_debit), 2)
        if loan.remaining_balance == 0:
            loan.status = LoanStatus.COMPLETED
        else:
            loan.status = LoanStatus.ACTIVE
        self.loan_repo.update(loan)

        txn_ref = f"UPI-{uuid.uuid4().hex[:10].upper()}"
        repayment = Repayment(
            loan_id=loan.id,
            user_id=user_id,
            scheduled_date=datetime.utcnow(),
            paid_date=datetime.utcnow(),
            amount=dynamic_debit,
            status=RepaymentStatus.PAID,
            txn_ref=txn_ref
        )
        saved_repayment = self.repay_repo.create(repayment)

        return RepaymentResponse(
            id=saved_repayment.id,
            loan_id=loan.id,
            amount=dynamic_debit,
            debit_amount=dynamic_debit,
            smart_pause_activated=False,
            status="PAID",
            txn_ref=txn_ref,
            scheduled_date=saved_repayment.scheduled_date
        )

    def pause_loan(self, user_id: int, loan_id: int, reason: str = "Manual pause request"):
        loan = self.loan_repo.get_by_id(loan_id)
        if not loan or loan.user_id != user_id:
            raise HTTPException(status_code=404, detail="Loan not found.")
        loan.status = LoanStatus.PAUSED
        self.loan_repo.update(loan)
        return {"status": "PAUSED", "loan_id": loan_id, "message": f"Loan repayment paused: {reason}"}

    def resume_loan(self, user_id: int, loan_id: int):
        loan = self.loan_repo.get_by_id(loan_id)
        if not loan or loan.user_id != user_id:
            raise HTTPException(status_code=404, detail="Loan not found.")
        loan.status = LoanStatus.ACTIVE
        self.loan_repo.update(loan)
        return {"status": "ACTIVE", "loan_id": loan_id, "message": "Loan repayment resumed automatically via UPI AutoPay."}
