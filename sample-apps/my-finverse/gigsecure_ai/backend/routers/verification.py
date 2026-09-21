from fastapi import APIRouter
from backend.services.verification_service import VerificationService
from backend.schemas.verification_schema import (
    GSTVerificationResponse,
    EWayBillVerificationResponse,
    LogisticsVerificationResponse,
    MerchantProfileResponse
)

router = APIRouter(tags=["Verification Services"])
service = VerificationService()

@router.get("/verification/gst/{gstin}", response_model=GSTVerificationResponse)
def verify_gst(gstin: str):
    return service.verify_gstin(gstin)

@router.get("/verification/eway/{eway}", response_model=EWayBillVerificationResponse)
def verify_eway(eway: str, vehicle: str = "MH-12-AB-1234"):
    return service.verify_eway(eway, vehicle)

@router.get("/verification/logistics/{tracking}", response_model=LogisticsVerificationResponse)
def verify_logistics(tracking: str, partner: str = "Shadowfax"):
    return service.verify_logistics(tracking, partner)

@router.get("/merchant/{merchant_id}", response_model=MerchantProfileResponse)
def get_merchant(merchant_id: str):
    return service.get_merchant_profile(merchant_id)
