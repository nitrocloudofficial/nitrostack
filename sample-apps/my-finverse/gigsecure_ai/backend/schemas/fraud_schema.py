from pydantic import BaseModel, Field
from typing import List, Optional

class FraudCheckRequest(BaseModel):
    gstin: str
    platform_id: str
    invoice_number: str
    invoice_date: str
    amount: float
    buyer_gstin: str = ""
    bank_name: str = "HDFC Bank"

class FraudCheckResponse(BaseModel):
    is_duplicate: bool
    sha256_hash: str
    fraud_risk_level: str
    fraud_score: float
    previous_bank: Optional[str] = None
    previous_timestamp: Optional[str] = None
    previous_merchant: Optional[str] = None
    risk_factors: List[str]
    message: str

class FraudStatisticsResponse(BaseModel):
    total_invoices_scanned: int
    total_fraud_attempts_blocked: int
    duplicate_financing_blocked: int
    gst_failures: int
    eway_failures: int
    risk_distribution: dict
    bank_breakdown: dict
