from pydantic import BaseModel
from typing import Optional

class GSTVerificationResponse(BaseModel):
    status: str
    is_valid: bool
    business_name: str
    registration_date: str
    gstin: str
    taxpayer_type: str
    message: str

class EWayBillVerificationResponse(BaseModel):
    status: str
    is_valid: bool
    eway_number: str
    vehicle_number: str
    distance_km: int
    delivery_date: str
    message: str

class LogisticsVerificationResponse(BaseModel):
    partner_name: str
    tracking_number: str
    status: str
    delivery_confidence: float
    is_delivered: bool
    location: str
    message: str

class MerchantProfileResponse(BaseModel):
    merchant_id: str
    merchant_name: str
    gstin: str
    trust_score: float
    total_invoices: int
    verified_invoices: int
    flagged_frauds: int
    business_age_years: float
    risk_category: str
