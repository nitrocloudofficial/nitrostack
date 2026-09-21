import hashlib
from sqlalchemy.orm import Session
from backend.repositories.fraud_repository import FraudRepository
from backend.models.domain_models import FraudHash, Invoice
from backend.schemas.domain_schemas import InvoiceUploadRequest, InvoiceVerificationResponse
from fastapi import HTTPException, status

class FraudService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = FraudRepository(db)

    def generate_sha256_hash(self, gstin: str, platform_id: str, invoice_number: str, amount: float) -> str:
        raw_string = f"{gstin.strip().upper()}|{platform_id.strip().upper()}|{invoice_number.strip().upper()}|{amount:.2f}"
        return hashlib.sha256(raw_string.encode('utf-8')).hexdigest()

    def process_invoice(self, user_id: int, req: InvoiceUploadRequest) -> InvoiceVerificationResponse:
        sha256_hash = self.generate_sha256_hash(req.gstin, req.platform_id, req.invoice_number, req.amount)

        existing_hash = self.repo.get_hash_by_sha(sha256_hash)
        if existing_hash:
            # Duplicate detected across multi-bank ledger!
            fraud_record = FraudHash(
                sha256_hash=sha256_hash,
                user_id=user_id,
                gstin=req.gstin,
                invoice_number=req.invoice_number,
                amount=req.amount,
                detected_duplicate=True,
                verification_status="DUPLICATE_FLAGGED"
            )
            self.repo.create_fraud_hash(fraud_record)
            
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Duplicate Financing Detected: This invoice fingerprint matches a prior loan disbursement in the central multi-bank ledger."
            )

        # Simulate Government & Logistics Verification APIs
        gst_verified = len(req.gstin) == 15 and req.gstin.isalnum()
        eway_bill_verified = True
        logistics_verified = True
        merchant_verified = True

        risk_score = 5 if (gst_verified and eway_bill_verified) else 75

        # Save invoice record
        invoice = Invoice(
            user_id=user_id,
            invoice_number=req.invoice_number,
            gstin=req.gstin,
            platform_id=req.platform_id,
            amount=req.amount,
            date=req.date,
            status="VERIFIED"
        )
        saved_invoice = self.repo.create_invoice(invoice)

        # Save unique SHA-256 fingerprint in central ledger
        fraud_hash = FraudHash(
            invoice_id=saved_invoice.id,
            sha256_hash=sha256_hash,
            user_id=user_id,
            gstin=req.gstin,
            invoice_number=req.invoice_number,
            amount=req.amount,
            detected_duplicate=False,
            verification_status="CLEARED"
        )
        self.repo.create_fraud_hash(fraud_hash)

        return InvoiceVerificationResponse(
            sha256_hash=sha256_hash,
            duplicate_detected=False,
            verification_status="PASSED",
            gst_verified=gst_verified,
            eway_bill_verified=eway_bill_verified,
            logistics_verified=logistics_verified,
            merchant_verified=merchant_verified,
            risk_score=risk_score,
            message="Invoice fingerprint verified cleanly across multi-bank registry. No duplicate financing detected."
        )
