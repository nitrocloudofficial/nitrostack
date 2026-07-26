from sqlalchemy.orm import Session
from backend.models.domain_models import FraudHash, Invoice
from typing import Optional, List

class FraudRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_hash_by_sha(self, sha256_hash: str) -> Optional[FraudHash]:
        return self.db.query(FraudHash).filter(FraudHash.sha256_hash == sha256_hash).first()

    def create_fraud_hash(self, fraud_hash: FraudHash) -> FraudHash:
        self.db.add(fraud_hash)
        self.db.commit()
        self.db.refresh(fraud_hash)
        return fraud_hash

    def create_invoice(self, invoice: Invoice) -> Invoice:
        self.db.add(invoice)
        self.db.commit()
        self.db.refresh(invoice)
        return invoice

    def get_all_fraud_hashes(self) -> List[FraudHash]:
        return self.db.query(FraudHash).order_by(FraudHash.created_at.desc()).all()

    def get_all_hashes(self) -> List[FraudHash]:
        return self.db.query(FraudHash).order_by(FraudHash.created_at.desc()).all()
