from backend.utils.gst_validator import verify_gst_portal
from backend.utils.eway_validator import validate_eway_bill
from backend.utils.logistics_validator import verify_logistics_partner
from backend.schemas.verification_schema import (
    GSTVerificationResponse,
    EWayBillVerificationResponse,
    LogisticsVerificationResponse,
    MerchantProfileResponse
)

class VerificationService:
    def verify_gstin(self, gstin: str) -> GSTVerificationResponse:
        res = verify_gst_portal(gstin)
        return GSTVerificationResponse(**res)

    def verify_eway(self, eway_number: str, vehicle_number: str = "MH-12-AB-1234") -> EWayBillVerificationResponse:
        res = validate_eway_bill(eway_number, vehicle_number)
        return EWayBillVerificationResponse(**res)

    def verify_logistics(self, tracking_number: str, partner_name: str = "Shadowfax / Delhivery") -> LogisticsVerificationResponse:
        res = verify_logistics_partner(partner_name, tracking_number)
        return LogisticsVerificationResponse(**res)

    def get_merchant_profile(self, merchant_id: str) -> MerchantProfileResponse:
        # Mock merchant profile score calculation
        trust_score = 92.5 if not merchant_id.startswith("SUSP") else 42.0
        return MerchantProfileResponse(
            merchant_id=merchant_id,
            merchant_name="Apex Express Supplies Ltd",
            gstin="27AAACG1234H1Z5",
            trust_score=trust_score,
            total_invoices=142,
            verified_invoices=139,
            flagged_frauds=3 if trust_score < 50 else 0,
            business_age_years=4.5,
            risk_category="Low Risk Verified Vendor" if trust_score >= 80 else "High Risk Flagged Vendor"
        )
