from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, Enum as SQLEnum
from sqlalchemy.orm import relationship as sql_relationship, declarative_base
from datetime import datetime
import enum
from backend.database import Base

class UserRole(str, enum.Enum):
    WORKER = "Worker"
    ADMIN = "Admin"
    BANK = "Bank"
    NOMINEE = "Nominee"

class LoanStatus(str, enum.Enum):
    PENDING = "Pending"
    APPROVED = "Approved"
    ACTIVE = "Active"
    COMPLETED = "Completed"
    PAUSED = "Paused"
    REJECTED = "Rejected"

class RepaymentStatus(str, enum.Enum):
    PAID = "Paid"
    SKIPPED = "Skipped"
    SMART_PAUSED = "SmartPaused"
    FAILED = "Failed"

class ClaimStatus(str, enum.Enum):
    PENDING = "Pending"
    IN_REVIEW = "InReview"
    APPROVED = "Approved"
    DISBURSED = "Disbursed"
    REJECTED = "Rejected"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(120), nullable=False)
    email = Column(String(120), unique=True, index=True, nullable=False)
    phone = Column(String(20), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(30), default=UserRole.WORKER)
    aadhaar_number = Column(String(20), index=True, nullable=True)
    pan_number = Column(String(20), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    gig_profile = sql_relationship("GigProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    credit_scores = sql_relationship("CreditScore", back_populates="user", cascade="all, delete-orphan")
    loans = sql_relationship("Loan", back_populates="user", cascade="all, delete-orphan")
    nominees = sql_relationship("Nominee", back_populates="user", cascade="all, delete-orphan")
    assets = sql_relationship("Asset", back_populates="user", cascade="all, delete-orphan")
    invoices = sql_relationship("Invoice", back_populates="user", cascade="all, delete-orphan")
    notifications = sql_relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    audit_logs = sql_relationship("AuditLog", back_populates="user", cascade="all, delete-orphan")

class GigProfile(Base):
    __tablename__ = "gig_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    primary_platform = Column(String(50), nullable=False, default="Zomato")
    secondary_platforms = Column(String(255), default="Swiggy, Uber")
    city_tier = Column(String(20), default="Tier 1")
    gig_tenure_months = Column(Integer, default=12)
    platform_rating = Column(Float, default=4.5)
    order_completion_rate = Column(Float, default=0.95)
    avg_monthly_income = Column(Float, default=28000.0)
    fuel_ratio = Column(Float, default=0.20)
    expense_ratio = Column(Float, default=0.45)
    savings_ratio = Column(Float, default=0.15)
    working_hours = Column(Float, default=45.0)
    bank_account_no = Column(String(50), default="389402910394")
    upi_id = Column(String(80), default="worker@okhdfcbank")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = sql_relationship("User", back_populates="gig_profile")

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    platform = Column(String(50), nullable=False)
    amount = Column(Float, nullable=False)
    transaction_type = Column(String(20), default="CREDIT") # CREDIT or DEBIT
    category = Column(String(50), default="Gig Delivery Payout")
    date = Column(DateTime, default=datetime.utcnow)
    description = Column(String(255), nullable=True)
    reference_id = Column(String(100), unique=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class CreditScore(Base):
    __tablename__ = "credit_scores"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    credit_score = Column(Integer, nullable=False)
    risk_category = Column(String(40), nullable=False)
    recommended_loan_amount = Column(Float, nullable=False)
    interest_rate = Column(Float, default=12.5)
    default_probability = Column(Float, default=0.03)
    cashflow_stability = Column(Float, default=85.0)
    income_velocity = Column(Float, default=5.2)
    savings_burn_index = Column(Float, default=15.0)
    platform_rating_score = Column(Float, default=90.0)
    evaluated_at = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = sql_relationship("User", back_populates="credit_scores")

class Loan(Base):
    __tablename__ = "loans"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    principal_amount = Column(Float, nullable=False)
    total_repayable = Column(Float, nullable=False)
    interest_rate = Column(Float, nullable=False)
    tenure_months = Column(Integer, nullable=False)
    daily_repayment_amount = Column(Float, nullable=False)
    remaining_balance = Column(Float, nullable=False)
    status = Column(String(30), default=LoanStatus.PENDING)
    approved_at = Column(DateTime, nullable=True)
    disburse_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = sql_relationship("User", back_populates="loans")
    repayments = sql_relationship("Repayment", back_populates="loan", cascade="all, delete-orphan")

class Repayment(Base):
    __tablename__ = "repayments"

    id = Column(Integer, primary_key=True, index=True)
    loan_id = Column(Integer, ForeignKey("loans.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    scheduled_date = Column(DateTime, nullable=False)
    paid_date = Column(DateTime, nullable=True)
    amount = Column(Float, nullable=False)
    payment_mode = Column(String(30), default="UPI_AUTOPAY")
    status = Column(String(30), default=RepaymentStatus.PAID)
    smart_pause_reason = Column(String(255), nullable=True)
    txn_ref = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    loan = sql_relationship("Loan", back_populates="repayments")

class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    invoice_number = Column(String(100), nullable=False)
    gstin = Column(String(50), nullable=False)
    platform_id = Column(String(50), nullable=False)
    amount = Column(Float, nullable=False)
    date = Column(String(30), nullable=False)
    file_path = Column(String(255), nullable=True)
    status = Column(String(30), default="VERIFIED")
    sha256_hash = Column(String(64), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = sql_relationship("User", back_populates="invoices")

class FraudHash(Base):
    __tablename__ = "fraud_hashes"

    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, nullable=True)
    sha256_hash = Column(String(64), unique=True, index=True, nullable=False)
    user_id = Column(Integer, nullable=False)
    bank_id = Column(String(50), default="HDFC_BANK_001")
    bank_name = Column(String(100), default="HDFC Bank")
    merchant_name = Column(String(120), default="Apex Express Ltd")
    gstin = Column(String(50), default="27AAACG1234H1Z5")
    invoice_number = Column(String(100), default="INV-001")
    amount = Column(Float, default=0.0)
    detected_duplicate = Column(Boolean, default=False)
    verification_status = Column(String(50), default="PASSED")
    created_at = Column(DateTime, default=datetime.utcnow)

class Nominee(Base):
    __tablename__ = "nominees"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    nominee_name = Column(String(120), nullable=False)
    relationship = Column(String(50), nullable=False)
    aadhaar_number = Column(String(20), nullable=False)
    phone = Column(String(20), nullable=False)
    email = Column(String(120), nullable=True)
    bank_account_no = Column(String(50), nullable=False)
    ifsc_code = Column(String(20), default="HDFC0001234")
    share_percentage = Column(Float, default=100.0)
    is_verified = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = sql_relationship("User", back_populates="nominees")

class Asset(Base):
    __tablename__ = "assets"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    asset_type = Column(String(50), nullable=False) # Bank, Insurance, PF, MutualFund, Wallet
    institution_name = Column(String(100), nullable=False)
    account_identifier = Column(String(100), nullable=False)
    estimated_value = Column(Float, nullable=False)
    status = Column(String(30), default="ACTIVE")
    created_at = Column(DateTime, default=datetime.utcnow)

    user = sql_relationship("User", back_populates="assets")

class Claim(Base):
    __tablename__ = "claims"

    id = Column(Integer, primary_key=True, index=True)
    nominee_id = Column(Integer, nullable=False)
    user_id = Column(Integer, nullable=False)
    claim_type = Column(String(50), default="SUCCESSION_BENEFIT")
    asset_type = Column(String(50), default="ALL_AGGREGATED_ASSETS")
    asset_id = Column(String(100), nullable=True)
    death_certificate_no = Column(String(100), nullable=False)
    death_date = Column(String(30), nullable=False)
    verification_status = Column(String(30), default=ClaimStatus.PENDING)
    claim_amount = Column(Float, nullable=False)
    form_url = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(150), nullable=False)
    message = Column(Text, nullable=False)
    channel = Column(String(30), default="SMS")
    status = Column(String(30), default="SENT")
    created_at = Column(DateTime, default=datetime.utcnow)

    user = sql_relationship("User", back_populates="notifications")

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    action = Column(String(100), nullable=False)
    resource = Column(String(100), default="INVOICE_FRAUD_SYSTEM")
    details = Column(Text, nullable=True)
    ip_address = Column(String(50), default="127.0.0.1")
    created_at = Column(DateTime, default=datetime.utcnow)

    user = sql_relationship("User", back_populates="audit_logs")

class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False)
    document_type = Column(String(50), nullable=False)
    file_name = Column(String(255), nullable=False)
    file_path = Column(String(255), nullable=False)
    is_verified = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class AdminUser(Base):
    __tablename__ = "admin_users"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False)
    department = Column(String(100), default="Risk & Underwriting")
    access_level = Column(String(50), default="SUPER_ADMIN")
    created_at = Column(DateTime, default=datetime.utcnow)
