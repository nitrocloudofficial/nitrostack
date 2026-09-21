from sqlalchemy.orm import Session
from backend.utils.sha256 import generate_invoice_sha256
from backend.utils.duplicate_detector import check_duplicate_invoice_hash
from backend.models.domain_models import FraudHash
from datetime import datetime

class HashService:
    def __init__(self, db: Session):
        self.db = db

    def generate_and_check(self, gstin: str, platform_id: str, invoice_number: str, invoice_date: str, amount: float, buyer_gstin: str = "") -> dict:
        sha256_hash = generate_invoice_sha256(gstin, platform_id, invoice_number, invoice_date, amount, buyer_gstin)
        dup_info = check_duplicate_invoice_hash(self.db, sha256_hash)
        return dup_info

    def register_hash(self, sha256_hash: str, bank_name: str, merchant_name: str, invoice_number: str, user_id: int):
        new_hash = FraudHash(
            sha256_hash=sha256_hash,
            bank_name=bank_name,
            merchant_name=merchant_name,
            invoice_number=invoice_number,
            user_id=user_id,
            created_at=datetime.utcnow()
        )
        self.db.add(new_hash)
        self.db.commit()
        return new_hash
