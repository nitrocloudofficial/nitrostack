from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class InvoiceUploadRequest(BaseModel):
    gstin: str = Field(..., example="27AAACG1234H1Z5")
    merchant_name: str = Field(..., example="Apex Express Supplies Ltd")
    platform_id: str = Field(..., example="ZOMATO-PAT-992")
    invoice_number: str = Field(..., example="INV-2026-0881")
    invoice_date: str = Field(..., example="2026-07-25")
    amount: float = Field(..., gt=0, example=45000.0)
    buyer_name: str = Field("Swiggy Private Limited", example="Swiggy Private Limited")
    buyer_gstin: str = Field("27AAACS8888H1Z1", example="27AAACS8888H1Z1")
    delivery_location: Optional[str] = "Mumbai, Maharashtra"
    product_description: Optional[str] = "Commercial Fleet Logistics & Spare Parts"
    vehicle_number: Optional[str] = "MH-12-AB-1234"
    eway_bill_number: Optional[str] = "123456789012"
    transport_id: Optional[str] = "TRK-987654"
    submitting_bank: Optional[str] = "HDFC Bank"

class InvoiceUploadResponse(BaseModel):
    id: int
    invoice_number: str
    gstin: str
    amount: float
    sha256_hash: str
    is_duplicate: bool
    fraud_risk_level: str
    merchant_trust_score: float
    gst_status: str
    eway_status: str
    logistics_status: str
    message: str
    created_at: str
