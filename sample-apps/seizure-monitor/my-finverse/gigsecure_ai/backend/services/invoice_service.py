from sqlalchemy.orm import Session
from fastapi import HTTPException
from backend.schemas.invoice_schema import InvoiceUploadRequest, InvoiceUploadResponse
from backend.models.domain_models import Invoice, AuditLog
from backend.services.hash_service import HashService
from backend.services.verification_service import VerificationService
from backend.services.risk_service import FraudRiskService
from datetime import datetime

class InvoiceService:
    def __init__(self, db: Session):
        self.db = db
        self.hash_service = HashService(db)
        self.verification_service = VerificationService()

    def process_invoice_upload(self, user_id: int, req: InvoiceUploadRequest) -> InvoiceUploadResponse:
        bank_name = req.submitting_bank or "HDFC Bank"

        # 1. SHA-256 Fingerprint & Central Ledger Duplicate Check
        dup_info = self.hash_service.generate_and_check(
            gstin=req.gstin,
            platform_id=req.platform_id,
            invoice_number=req.invoice_number,
            invoice_date=req.invoice_date,
            amount=req.amount,
            buyer_gstin=req.buyer_gstin or ""
        )

        sha256_hash = dup_info["sha256_hash"]
        is_duplicate = dup_info["is_duplicate"]

        # 2. Verifications (GST, eWay, Logistics)
        gst_res = self.verification_service.verify_gstin(req.gstin)
        eway_res = self.verification_service.verify_eway(req.eway_bill_number or "123456789012", req.vehicle_number or "")
        logistics_res = self.verification_service.verify_logistics(req.transport_id or "TRK-100", "Delhivery")

        merchant_profile = self.verification_service.get_merchant_profile(req.merchant_name)
        merchant_trust_score = merchant_profile.trust_score

        # 3. Fraud Risk Score Engine
        risk_res = FraudRiskService.calculate_fraud_score(
            is_duplicate=is_duplicate,
            is_gst_valid=gst_res.is_valid,
            is_eway_valid=eway_res.is_valid,
            delivery_confidence=logistics_res.delivery_confidence,
            merchant_trust_score=merchant_trust_score,
            amount=req.amount
        )

        # Log Audit Trail
        audit_entry = AuditLog(
            user_id=user_id,
            action=f"INVOICE_UPLOAD_CHECK | Bank: {bank_name} | Dup: {is_duplicate}",
            resource="INVOICE_FRAUD_SYSTEM",
            details=f"SHA256: {sha256_hash}",
            ip_address="127.0.0.1",
            created_at=datetime.utcnow()
        )
        self.db.add(audit_entry)

        if is_duplicate:
            self.db.commit()
            raise HTTPException(
                status_code=400,
                detail={
                    "error": "Duplicate Financing Detected",
                    "previous_bank": dup_info["previous_bank"],
                    "timestamp": dup_info["timestamp"],
                    "merchant": dup_info["merchant"],
                    "invoice_number": dup_info["invoice_number"],
                    "sha256_hash": sha256_hash,
                    "message": f"Invoice #{req.invoice_number} was previously financed by {dup_info['previous_bank']} on {dup_info['timestamp']}."
                }
            )

        # Register fingerprint in central ledger
        self.hash_service.register_hash(
            sha256_hash=sha256_hash,
            bank_name=bank_name,
            merchant_name=req.merchant_name,
            invoice_number=req.invoice_number,
            user_id=user_id
        )

        # Save Invoice Record
        new_inv = Invoice(
            user_id=user_id,
            invoice_number=req.invoice_number,
            gstin=req.gstin,
            platform_id=req.platform_id,
            amount=req.amount,
            date=req.invoice_date,
            status="Verified" if risk_res["risk_level"] == "LOW" else "Flagged",
            sha256_hash=sha256_hash,
            created_at=datetime.utcnow()
        )
        self.db.add(new_inv)
        self.db.commit()
        self.db.refresh(new_inv)

        return InvoiceUploadResponse(
            id=new_inv.id,
            invoice_number=req.invoice_number,
            gstin=req.gstin,
            amount=req.amount,
            sha256_hash=sha256_hash,
            is_duplicate=False,
            fraud_risk_level=risk_res["risk_level"],
            merchant_trust_score=merchant_trust_score,
            gst_status=gst_res.status,
            eway_status=eway_res.status,
            logistics_status=logistics_res.status,
            message="Invoice authenticated, SHA-256 fingerprint registered in central multi-bank ledger.",
            created_at=new_inv.created_at.strftime("%Y-%m-%d %H:%M:%S")
        )
