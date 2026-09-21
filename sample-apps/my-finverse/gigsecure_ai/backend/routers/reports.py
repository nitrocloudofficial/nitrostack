from fastapi import APIRouter, Response, Depends
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.dependencies import get_current_user
from backend.models.domain_models import User
from backend.services.report_service import ReportService

router = APIRouter(prefix="/reports", tags=["PDF Reports Generator"])

@router.get("/credit")
def download_credit_report(current_user: User = Depends(get_current_user)):
    service = ReportService()
    pdf_bytes = service.generate_credit_report(
        user_name=current_user.full_name,
        credit_score=785,
        risk_level="Low Risk",
        eligible_amount=45000.0
    )
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=GigSecure_Credit_Report.pdf"}
    )

@router.get("/fraud")
def download_fraud_report():
    service = ReportService()
    pdf_bytes = service.generate_fraud_report(
        hash_code="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        status="NO DUPLICATE FOUND - CLEARED",
        risk_score=5
    )
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=GigSecure_Fraud_Shield_Report.pdf"}
    )

@router.get("/loan")
def download_loan_report(current_user: User = Depends(get_current_user)):
    service = ReportService()
    pdf_bytes = service.generate_loan_report(
        loan_id=101,
        amount=25000.0,
        daily_repay=152.78,
        remaining=18400.0
    )
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=GigSecure_Loan_Statement.pdf"}
    )

@router.get("/succession")
def download_succession_report(claim_id: str = "CLM-889102"):
    service = ReportService()
    pdf_bytes = service.generate_succession_report(
        nominee_name="Sunita Sharma",
        total_value=329400.0,
        claim_id=claim_id
    )
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=GigSecure_Succession_Certificate.pdf"}
    )
