from sqlalchemy.orm import Session
from backend.models.domain_models import Repayment
from typing import List

class RepaymentRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, repayment: Repayment) -> Repayment:
        self.db.add(repayment)
        self.db.commit()
        self.db.refresh(repayment)
        return repayment

    def get_by_loan_id(self, loan_id: int) -> List[Repayment]:
        return self.db.query(Repayment).filter(Repayment.loan_id == loan_id).order_by(Repayment.scheduled_date.desc()).all()

    def get_by_user_id(self, user_id: int) -> List[Repayment]:
        return self.db.query(Repayment).filter(Repayment.user_id == user_id).order_by(Repayment.scheduled_date.desc()).all()
