from sqlalchemy.orm import Session
from backend.models.domain_models import Loan, LoanStatus
from typing import List, Optional

class LoanRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, loan: Loan) -> Loan:
        self.db.add(loan)
        self.db.commit()
        self.db.refresh(loan)
        return loan

    def get_by_id(self, loan_id: int) -> Optional[Loan]:
        return self.db.query(Loan).filter(Loan.id == loan_id).first()

    def get_by_user_id(self, user_id: int) -> List[Loan]:
        return self.db.query(Loan).filter(Loan.user_id == user_id).order_by(Loan.created_at.desc()).all()

    def get_active_loan_by_user(self, user_id: int) -> Optional[Loan]:
        return self.db.query(Loan).filter(
            Loan.user_id == user_id, 
            Loan.status.in_([LoanStatus.ACTIVE, LoanStatus.APPROVED, LoanStatus.PAUSED])
        ).first()

    def update(self, loan: Loan) -> Loan:
        self.db.commit()
        self.db.refresh(loan)
        return loan

    def get_all(self) -> List[Loan]:
        return self.db.query(Loan).order_by(Loan.created_at.desc()).all()
