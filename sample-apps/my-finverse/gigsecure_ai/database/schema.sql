-- GigSecure AI PostgreSQL Schema

CREATE TYPE user_role AS ENUM ('Worker', 'Admin', 'Bank', 'Nominee');
CREATE TYPE loan_status AS ENUM ('Pending', 'Approved', 'Active', 'Completed', 'Paused', 'Rejected');
CREATE TYPE repayment_status AS ENUM ('Paid', 'Skipped', 'SmartPaused', 'Failed');
CREATE TYPE claim_status AS ENUM ('Pending', 'InReview', 'Approved', 'Disbursed', 'Rejected');

-- 1. Users Table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(120) NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(30) DEFAULT 'Worker',
    aadhaar_number VARCHAR(20),
    pan_number VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_aadhaar ON users(aadhaar_number);

-- 2. Gig Profiles Table
CREATE TABLE gig_profiles (
    id SERIAL PRIMARY KEY,
    user_id INT UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    primary_platform VARCHAR(50) DEFAULT 'Zomato',
    secondary_platforms VARCHAR(255) DEFAULT 'Swiggy, Uber',
    city_tier VARCHAR(20) DEFAULT 'Tier 1',
    gig_tenure_months INT DEFAULT 12,
    platform_rating FLOAT DEFAULT 4.8,
    order_completion_rate FLOAT DEFAULT 0.95,
    avg_monthly_income FLOAT DEFAULT 28000.0,
    fuel_ratio FLOAT DEFAULT 0.20,
    expense_ratio FLOAT DEFAULT 0.45,
    savings_ratio FLOAT DEFAULT 0.15,
    working_hours FLOAT DEFAULT 45.0,
    bank_account_no VARCHAR(50) DEFAULT '389402910394',
    upi_id VARCHAR(80) DEFAULT 'worker@okhdfcbank',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Transactions Table
CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL,
    amount FLOAT NOT NULL,
    transaction_type VARCHAR(20) DEFAULT 'CREDIT',
    category VARCHAR(50) DEFAULT 'Gig Delivery Payout',
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    description VARCHAR(255),
    reference_id VARCHAR(100) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Credit Scores Table
CREATE TABLE credit_scores (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    credit_score INT NOT NULL,
    risk_category VARCHAR(40) NOT NULL,
    recommended_loan_amount FLOAT NOT NULL,
    interest_rate FLOAT DEFAULT 12.5,
    default_probability FLOAT DEFAULT 0.03,
    cashflow_stability FLOAT DEFAULT 85.0,
    income_velocity FLOAT DEFAULT 5.2,
    savings_burn_index FLOAT DEFAULT 15.0,
    platform_rating_score FLOAT DEFAULT 90.0,
    evaluated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Loans Table
CREATE TABLE loans (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    principal_amount FLOAT NOT NULL,
    total_repayable FLOAT NOT NULL,
    interest_rate FLOAT NOT NULL,
    tenure_months INT NOT NULL,
    daily_repayment_amount FLOAT NOT NULL,
    remaining_balance FLOAT NOT NULL,
    status VARCHAR(30) DEFAULT 'Active',
    approved_at TIMESTAMP,
    disburse_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Repayments Table
CREATE TABLE repayments (
    id SERIAL PRIMARY KEY,
    loan_id INT REFERENCES loans(id) ON DELETE CASCADE,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    scheduled_date TIMESTAMP NOT NULL,
    paid_date TIMESTAMP,
    amount FLOAT NOT NULL,
    payment_mode VARCHAR(30) DEFAULT 'UPI_AUTOPAY',
    status VARCHAR(30) DEFAULT 'Paid',
    smart_pause_reason VARCHAR(255),
    txn_ref VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Invoices Table
CREATE TABLE invoices (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    invoice_number VARCHAR(100) NOT NULL,
    gstin VARCHAR(50) NOT NULL,
    platform_id VARCHAR(50) NOT NULL,
    amount FLOAT NOT NULL,
    date VARCHAR(30) NOT NULL,
    file_path VARCHAR(255),
    status VARCHAR(30) DEFAULT 'VERIFIED',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. Fraud Hashes Table
CREATE TABLE fraud_hashes (
    id SERIAL PRIMARY KEY,
    invoice_id INT,
    sha256_hash VARCHAR(64) UNIQUE NOT NULL,
    user_id INT NOT NULL,
    bank_id VARCHAR(50) DEFAULT 'HDFC_BANK_001',
    gstin VARCHAR(50) NOT NULL,
    invoice_number VARCHAR(100) NOT NULL,
    amount FLOAT NOT NULL,
    detected_duplicate BOOLEAN DEFAULT FALSE,
    verification_status VARCHAR(50) DEFAULT 'PASSED',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_fraud_hashes_sha ON fraud_hashes(sha256_hash);

-- 9. Nominees Table
CREATE TABLE nominees (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    nominee_name VARCHAR(120) NOT NULL,
    relationship VARCHAR(50) NOT NULL,
    aadhaar_number VARCHAR(20) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(120),
    bank_account_no VARCHAR(50) NOT NULL,
    ifsc_code VARCHAR(20) DEFAULT 'HDFC0001234',
    share_percentage FLOAT DEFAULT 100.0,
    is_verified BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. Assets Table
CREATE TABLE assets (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    asset_type VARCHAR(50) NOT NULL,
    institution_name VARCHAR(100) NOT NULL,
    account_identifier VARCHAR(100) NOT NULL,
    estimated_value FLOAT NOT NULL,
    status VARCHAR(30) DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 11. Claims Table
CREATE TABLE claims (
    id SERIAL PRIMARY KEY,
    nominee_id INT NOT NULL,
    user_id INT NOT NULL,
    claim_type VARCHAR(50) DEFAULT 'SUCCESSION_BENEFIT',
    asset_type VARCHAR(50) DEFAULT 'ALL_AGGREGATED_ASSETS',
    asset_id VARCHAR(100),
    death_certificate_no VARCHAR(100) NOT NULL,
    death_date VARCHAR(30) NOT NULL,
    verification_status VARCHAR(30) DEFAULT 'Pending',
    claim_amount FLOAT NOT NULL,
    form_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 12. Notifications Table
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    channel VARCHAR(30) DEFAULT 'SMS',
    status VARCHAR(30) DEFAULT 'SENT',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 13. Audit Logs Table
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(100) NOT NULL,
    details TEXT,
    ip_address VARCHAR(50) DEFAULT '127.0.0.1',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 14. Documents Table
CREATE TABLE documents (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    document_type VARCHAR(50) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    is_verified BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 15. Admin Users Table
CREATE TABLE admin_users (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    department VARCHAR(100) DEFAULT 'Risk & Underwriting',
    access_level VARCHAR(50) DEFAULT 'SUPER_ADMIN',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
