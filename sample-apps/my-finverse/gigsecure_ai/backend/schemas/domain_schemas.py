from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime

# --- Auth Schemas ---
class UserRegisterRequest(BaseModel):
    full_name: str
    email: EmailStr
    phone: str
    password: str
    role: Optional[str] = "Worker"
    aadhaar_number: Optional[str] = "999988887777"
    pan_number: Optional[str] = "ABCDE1234F"

class UserLoginRequest(BaseModel):
    email: str
    password: str

class SendOTPRequest(BaseModel):
    phone: str

class VerifyOTPRequest(BaseModel):
    phone: str
    otp: str

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user_id: int
    full_name: str
    role: str

# --- User & GigProfile Schemas ---
class UserResponse(BaseModel):
    id: int
    full_name: str
    email: str
    phone: str
    role: str
    aadhaar_number: Optional[str]
    pan_number: Optional[str]
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class ProfileUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    aadhaar_number: Optional[str] = None
    pan_number: Optional[str] = None

class GigProfileConnectRequest(BaseModel):
    primary_platform: str
    secondary_platforms: Optional[str] = "Swiggy, Uber"
    city_tier: Optional[str] = "Tier 1"
    gig_tenure_months: Optional[int] = 12
    avg_monthly_income: Optional[float] = 28000.0
    working_hours: Optional[float] = 45.0
    upi_id: Optional[str] = "worker@okhdfcbank"
    bank_account_no: Optional[str] = "389402910394"

class GigProfileResponse(BaseModel):
    id: int
    user_id: int
    primary_platform: str
    secondary_platforms: Optional[str]
    city_tier: str
    gig_tenure_months: int
    platform_rating: float
    order_completion_rate: float
    avg_monthly_income: float
    fuel_ratio: float
    expense_ratio: float
    savings_ratio: float
    working_hours: float
    bank_account_no: str
    upi_id: str

    class Config:
        from_attributes = True

# --- Credit Score Schemas ---
class CreditEvaluationRequest(BaseModel):
    daily_earnings: Optional[float] = 1000.0
    working_hours: Optional[float] = 45.0
    ratings: Optional[float] = 4.8
    completed_orders: Optional[int] = 450
    fuel_expenses: Optional[float] = 5000.0
    monthly_expenses: Optional[float] = 12000.0
    savings: Optional[float] = 4000.0
    average_balance: Optional[float] = 15000.0

class CreditScoreResponse(BaseModel):
    credit_score: int
    risk_level: str
    eligible_loan: float
    recommended_daily_repayment: float
    confidence_score: float
    interest_rate: float
    max_tenure_months: int
    underwriting_metrics: dict

# --- Loan Schemas ---
class LoanApplyRequest(BaseModel):
    amount: float
    tenure_months: int
    purpose: Optional[str] = "Vehicle Fuel & Operational Expenses"

class LoanResponse(BaseModel):
    id: int
    user_id: int
    principal_amount: float
    total_repayable: float
    interest_rate: float
    tenure_months: int
    daily_repayment_amount: float
    remaining_balance: float
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

class LoanApproveRejectRequest(BaseModel):
    loan_id: int

# --- Repayment Schemas ---
class ProcessRepaymentRequest(BaseModel):
    loan_id: int
    income: float

class RepaymentResponse(BaseModel):
    id: Optional[int] = None
    loan_id: int
    amount: float
    debit_amount: float
    smart_pause_activated: bool
    status: str
    smart_pause_reason: Optional[str] = None
    txn_ref: Optional[str] = None
    scheduled_date: datetime

# --- Invoice & Fraud Schemas ---
class InvoiceUploadRequest(BaseModel):
    invoice_number: str
    gstin: str
    platform_id: str
    amount: float
    date: str

class InvoiceVerificationResponse(BaseModel):
    sha256_hash: str
    duplicate_detected: bool
    verification_status: str
    gst_verified: bool
    eway_bill_verified: bool
    logistics_verified: bool
    merchant_verified: bool
    risk_score: int
    message: str

# --- Succession & Nominee Schemas ---
class NomineeRegisterRequest(BaseModel):
    nominee_name: str
    relationship: str
    aadhaar_number: str
    phone: str
    email: Optional[str] = None
    bank_account_no: str
    ifsc_code: Optional[str] = "HDFC0001234"
    share_percentage: Optional[float] = 100.0

class NomineeResponse(BaseModel):
    id: int
    user_id: int
    nominee_name: str
    relationship: str
    aadhaar_number: str
    phone: str
    email: Optional[str]
    bank_account_no: str
    ifsc_code: str
    share_percentage: float
    is_verified: bool

    class Config:
        from_attributes = True

class SuccessionRescueRequest(BaseModel):
    aadhaar_number: str
    death_certificate_no: Optional[str] = "DC-2026-99210"

class SuccessionRescueResponse(BaseModel):
    confirmed: bool
    deceased_name: str
    death_certificate_no: str
    assets: List[dict]
    total_asset_value: float
    claim_id: str
    claim_status: str
    generated_forms: List[str]

# --- Notification Schemas ---
class NotificationSendRequest(BaseModel):
    user_id: int
    title: str
    message: str
    channel: Optional[str] = "SMS" # SMS, Email, Push

# --- Analytics & Admin Schemas ---
class AnalyticsDashboardResponse(BaseModel):
    total_workers: int
    total_loans_disbursed: float
    active_loans_count: int
    fraud_attempts_blocked: int
    succession_claims_processed: int
    repayment_rate: float
    loan_statistics: dict
    income_trends: list
    repayment_trends: list
    fraud_attempts: list
    risk_distribution: dict
