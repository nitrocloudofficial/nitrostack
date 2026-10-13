from sqlalchemy.orm import Session
from backend.models.domain_models import FraudHash

def check_duplicate_invoice_hash(db: Session, sha256_hash: str) -> dict:
    existing = db.query(FraudHash).filter(FraudHash.sha256_hash == sha256_hash).first()
    if existing:
        return {
            "is_duplicate": True,
            "previous_bank": existing.bank_name,
            "timestamp": existing.created_at.strftime("%Y-%m-%d %H:%M:%S") if existing.created_at else "N/A",
            "merchant": existing.merchant_name,
            "invoice_number": existing.invoice_number,
            "sha256_hash": sha256_hash
        }
    return {
        "is_duplicate": False,
        "previous_bank": None,
        "timestamp": None,
        "merchant": None,
        "invoice_number": None,
        "sha256_hash": sha256_hash
    }
