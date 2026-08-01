-- OmniJourney AI / NitroStack Database Schema Migration
-- Designed for Supabase PostgreSQL
-- Project Context: ramp_auth

-- -----------------------------------------------------------------------------
-- 1. CUSTOMERS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    cif_number VARCHAR(11) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_customers_cif ON public.customers(cif_number);

-- -----------------------------------------------------------------------------
-- 2. CUSTOMER PROFILES
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.customer_profiles (
    id UUID PRIMARY KEY REFERENCES public.customers(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(15),
    email VARCHAR(255),
    pan_number VARCHAR(10),
    kyc_status VARCHAR(20) DEFAULT 'PENDING' NOT NULL CONSTRAINT chk_kyc_status CHECK (kyc_status IN ('PENDING', 'COMPLETED', 'EXPIRED')),
    kyc_expiry DATE,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- -----------------------------------------------------------------------------
-- 3. BANK ACCOUNTS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bank_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    account_number VARCHAR(20) UNIQUE NOT NULL,
    account_type VARCHAR(20) NOT NULL CONSTRAINT chk_account_type CHECK (account_type IN ('SAVINGS', 'CURRENT', 'FIXED_DEPOSIT', 'RECURRING_DEPOSIT', 'HOME_LOAN')),
    branch_name VARCHAR(100),
    ifsc_code VARCHAR(11),
    nominee_status VARCHAR(20) DEFAULT 'NOT_REGISTERED' NOT NULL CONSTRAINT chk_nominee_status CHECK (nominee_status IN ('REGISTERED', 'NOT_REGISTERED', 'EXEMPT')),
    balance NUMERIC(15,2) DEFAULT 0.00 NOT NULL,
    available_balance NUMERIC(15,2) DEFAULT 0.00 NOT NULL,
    interest_rate NUMERIC(5,2),
    maturity_date DATE,
    next_emi_date DATE,
    next_emi_amount NUMERIC(15,2),
    status VARCHAR(20) DEFAULT 'ACTIVE' NOT NULL CONSTRAINT chk_status CHECK (status IN ('ACTIVE', 'INACTIVE', 'FROZEN')),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_accounts_cust ON public.bank_accounts(customer_id);
CREATE INDEX IF NOT EXISTS idx_accounts_num ON public.bank_accounts(account_number);

-- -----------------------------------------------------------------------------
-- 4. BENEFICIARIES
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.beneficiaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    account_number VARCHAR(34) NOT NULL,
    bank_name VARCHAR(100),
    ifsc_code VARCHAR(11),
    swift_code VARCHAR(11),
    country VARCHAR(100),
    is_international BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bene_cust ON public.beneficiaries(customer_id);

-- -----------------------------------------------------------------------------
-- 5. TRANSACTION HISTORY
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.transaction_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES public.bank_accounts(id) ON DELETE CASCADE,
    transaction_reference VARCHAR(50) UNIQUE NOT NULL,
    amount NUMERIC(15,2) NOT NULL,
    charges NUMERIC(15,2) DEFAULT 0.00 NOT NULL,
    transaction_type VARCHAR(30) NOT NULL CONSTRAINT chk_tx_type CHECK (transaction_type IN ('DEPOSIT', 'WITHDRAWAL', 'DOMESTIC_TRANSFER', 'INTERNATIONAL_TRANSFER')),
    transfer_mode VARCHAR(10) CONSTRAINT chk_tx_mode CHECK (transfer_mode IS NULL OR transfer_mode IN ('CASH', 'CHEQUE', 'ATM', 'NEFT', 'RTGS', 'IMPS', 'SWIFT')),
    status VARCHAR(20) NOT NULL CONSTRAINT chk_tx_status CHECK (status IN ('SUCCESS', 'FAILED', 'PENDING_COMPLIANCE')),
    failure_reason TEXT,
    narration TEXT,
    beneficiary_id UUID REFERENCES public.beneficiaries(id) ON DELETE SET NULL,
    reference_doc_number VARCHAR(50),
    foreign_currency VARCHAR(3) DEFAULT 'INR' NOT NULL,
    exchange_rate NUMERIC(10,4) DEFAULT 1.0000 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tx_ref ON public.transaction_history(transaction_reference);
CREATE INDEX IF NOT EXISTS idx_tx_acct ON public.transaction_history(account_id);
CREATE INDEX IF NOT EXISTS idx_tx_created ON public.transaction_history(created_at);

-- -----------------------------------------------------------------------------
-- 6. STANDING INSTRUCTIONS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.standing_instructions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES public.bank_accounts(id) ON DELETE CASCADE,
    description VARCHAR(150),
    amount NUMERIC(15,2) NOT NULL,
    next_execution_date DATE NOT NULL,
    frequency VARCHAR(20) NOT NULL CONSTRAINT chk_si_frequency CHECK (frequency IN ('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUALLY')),
    status VARCHAR(20) DEFAULT 'ACTIVE' NOT NULL CONSTRAINT chk_si_status CHECK (status IN ('ACTIVE', 'PAUSED', 'COMPLETED'))
);

CREATE INDEX IF NOT EXISTS idx_si_acct ON public.standing_instructions(account_id);

-- -----------------------------------------------------------------------------
-- 7. CREDIT SCORES
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.credit_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    score INTEGER NOT NULL,
    bureau_name VARCHAR(50) DEFAULT 'CIBIL' NOT NULL,
    payment_history_pct INTEGER,
    credit_utilization_pct INTEGER,
    average_credit_age_years NUMERIC(4,2),
    hard_inquiries_6m INTEGER,
    report_date DATE DEFAULT CURRENT_DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_credit_cust ON public.credit_scores(customer_id);

-- -----------------------------------------------------------------------------
-- 8. CUSTOMER SESSIONS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.customer_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    ip_address VARCHAR(45),
    user_agent TEXT,
    device_type VARCHAR(20),
    browser_name VARCHAR(50),
    os_name VARCHAR(50),
    screen_resolution VARCHAR(20),
    login_time TIMESTAMPTZ DEFAULT now() NOT NULL,
    logout_time TIMESTAMPTZ,
    session_token TEXT
);

CREATE INDEX IF NOT EXISTS idx_session_token ON public.customer_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_session_cust ON public.customer_sessions(customer_id);

-- -----------------------------------------------------------------------------
-- 9. USER DEVICES
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    device_fingerprint VARCHAR(255),
    device_name VARCHAR(100),
    is_trusted BOOLEAN DEFAULT false NOT NULL,
    last_used_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_devices_cust ON public.user_devices(customer_id);

-- -----------------------------------------------------------------------------
-- 10. AUDIT LOGS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id VARCHAR(50),
    ip_address VARCHAR(45),
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_cust ON public.audit_logs(customer_id);

-- -----------------------------------------------------------------------------
-- 11. SUPPORT CASES
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.support_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    case_number VARCHAR(30) UNIQUE NOT NULL,
    subject VARCHAR(200) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'OPEN' NOT NULL CONSTRAINT chk_case_status CHECK (status IN ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED')),
    priority VARCHAR(10) DEFAULT 'MEDIUM' NOT NULL CONSTRAINT chk_case_priority CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cases_cust ON public.support_cases(customer_id);

-- -----------------------------------------------------------------------------
-- 12. JOURNEY EVENTS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.journey_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES public.customer_sessions(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    page_route VARCHAR(255),
    payload JSONB,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_events_session ON public.journey_events(session_id);

-- -----------------------------------------------------------------------------
-- 13. ESCALATION PREDICTIONS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.escalation_predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES public.journey_events(id) ON DELETE SET NULL,
    case_id UUID REFERENCES public.support_cases(id) ON DELETE SET NULL,
    risk_score NUMERIC(5,2) NOT NULL,
    escalation_reason TEXT,
    predicted_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- -----------------------------------------------------------------------------
-- AUTOMATIC TIMESTAMP TRIGGERS
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_customers_updated_at ON public.customers;
CREATE TRIGGER update_customers_updated_at
BEFORE UPDATE ON public.customers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_customer_profiles_updated_at ON public.customer_profiles;
CREATE TRIGGER update_customer_profiles_updated_at
BEFORE UPDATE ON public.customer_profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_support_cases_updated_at ON public.support_cases;
CREATE TRIGGER update_support_cases_updated_at
BEFORE UPDATE ON public.support_cases
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- -----------------------------------------------------------------------------
-- AUTO USER PROFILES FROM AUTH USERS (SYNC FOR SEED & NEW USERS)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    cif_val VARCHAR(11);
    full_name_val TEXT;
    first_name_val VARCHAR(100);
    last_name_val VARCHAR(100);
BEGIN
    cif_val := COALESCE(NEW.raw_user_meta_data->>'cif_number', substring(replace(NEW.id::text, '-', '') from 1 for 11));
    full_name_val := COALESCE(NEW.raw_user_meta_data->>'full_name', 'Bank Customer');
    
    first_name_val := split_part(full_name_val, ' ', 1);
    last_name_val := NULLIF(substring(full_name_val from length(first_name_val) + 2), '');
    IF last_name_val IS NULL OR last_name_val = '' THEN
        last_name_val := 'User';
    END IF;

    INSERT INTO public.customers (id, cif_number)
    VALUES (NEW.id, cif_val)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.customer_profiles (id, first_name, last_name, email)
    VALUES (NEW.id, first_name_val, last_name_val, NEW.email)
    ON CONFLICT (id) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill any pre-existing auth users into customers and customer_profiles
DO $$
DECLARE
    u RECORD;
    cif_val VARCHAR(11);
    full_name_val TEXT;
    first_name_val VARCHAR(100);
    last_name_val VARCHAR(100);
BEGIN
    FOR u IN SELECT * FROM auth.users LOOP
        cif_val := COALESCE(u.raw_user_meta_data->>'cif_number', substring(replace(u.id::text, '-', '') from 1 for 11));
        full_name_val := COALESCE(u.raw_user_meta_data->>'full_name', 'Bank Customer');
        
        first_name_val := split_part(full_name_val, ' ', 1);
        last_name_val := NULLIF(substring(full_name_val from length(first_name_val) + 2), '');
        IF last_name_val IS NULL OR last_name_val = '' THEN
            last_name_val := 'User';
        END IF;

        INSERT INTO public.customers (id, cif_number)
        VALUES (u.id, cif_val)
        ON CONFLICT (id) DO NOTHING;

        INSERT INTO public.customer_profiles (id, first_name, last_name, email)
        VALUES (u.id, first_name_val, last_name_val, u.email)
        ON CONFLICT (id) DO NOTHING;
    END LOOP;
END;
$$;

-- -----------------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) & POLICIES
-- -----------------------------------------------------------------------------
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beneficiaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.standing_instructions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journey_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escalation_predictions ENABLE ROW LEVEL SECURITY;

-- Customers RLS
DROP POLICY IF EXISTS "Users can view own customer record" ON public.customers;
CREATE POLICY "Users can view own customer record" ON public.customers FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own customer record" ON public.customers;
CREATE POLICY "Users can update own customer record" ON public.customers FOR UPDATE USING (auth.uid() = id);

-- Profiles RLS
DROP POLICY IF EXISTS "Users can view own profile" ON public.customer_profiles;
CREATE POLICY "Users can view own profile" ON public.customer_profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.customer_profiles;
CREATE POLICY "Users can update own profile" ON public.customer_profiles FOR UPDATE USING (auth.uid() = id);

-- Bank Accounts RLS
DROP POLICY IF EXISTS "Users can view own bank accounts" ON public.bank_accounts;
CREATE POLICY "Users can view own bank accounts" ON public.bank_accounts FOR SELECT USING (auth.uid() = customer_id);

DROP POLICY IF EXISTS "Users can manage own bank accounts" ON public.bank_accounts;
CREATE POLICY "Users can manage own bank accounts" ON public.bank_accounts FOR ALL USING (auth.uid() = customer_id);

-- Beneficiaries RLS
DROP POLICY IF EXISTS "Users can view own beneficiaries" ON public.beneficiaries;
CREATE POLICY "Users can view own beneficiaries" ON public.beneficiaries FOR SELECT USING (auth.uid() = customer_id);

DROP POLICY IF EXISTS "Users can manage own beneficiaries" ON public.beneficiaries;
CREATE POLICY "Users can manage own beneficiaries" ON public.beneficiaries FOR ALL USING (auth.uid() = customer_id);

-- Transactions RLS
DROP POLICY IF EXISTS "Users can view own transactions" ON public.transaction_history;
CREATE POLICY "Users can view own transactions" ON public.transaction_history FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.bank_accounts WHERE bank_accounts.id = transaction_history.account_id AND bank_accounts.customer_id = auth.uid())
);

DROP POLICY IF EXISTS "Users can insert transactions for own accounts" ON public.transaction_history;
CREATE POLICY "Users can insert transactions for own accounts" ON public.transaction_history FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.bank_accounts WHERE bank_accounts.id = transaction_history.account_id AND bank_accounts.customer_id = auth.uid())
);

-- Standing Instructions RLS
DROP POLICY IF EXISTS "Users can view own standing instructions" ON public.standing_instructions;
CREATE POLICY "Users can view own standing instructions" ON public.standing_instructions FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.bank_accounts WHERE bank_accounts.id = standing_instructions.account_id AND bank_accounts.customer_id = auth.uid())
);

DROP POLICY IF EXISTS "Users can manage own standing instructions" ON public.standing_instructions;
CREATE POLICY "Users can manage own standing instructions" ON public.standing_instructions FOR ALL USING (
    EXISTS (SELECT 1 FROM public.bank_accounts WHERE bank_accounts.id = standing_instructions.account_id AND bank_accounts.customer_id = auth.uid())
);

-- Credit Scores RLS
DROP POLICY IF EXISTS "Users can view own credit score" ON public.credit_scores;
CREATE POLICY "Users can view own credit score" ON public.credit_scores FOR SELECT USING (auth.uid() = customer_id);

-- Sessions RLS
DROP POLICY IF EXISTS "Users can view own sessions" ON public.customer_sessions;
CREATE POLICY "Users can view own sessions" ON public.customer_sessions FOR SELECT USING (auth.uid() = customer_id);

DROP POLICY IF EXISTS "Users can manage own sessions" ON public.customer_sessions;
CREATE POLICY "Users can manage own sessions" ON public.customer_sessions FOR ALL USING (auth.uid() = customer_id);

-- Devices RLS
DROP POLICY IF EXISTS "Users can manage own devices" ON public.user_devices;
CREATE POLICY "Users can manage own devices" ON public.user_devices FOR ALL USING (auth.uid() = customer_id);

-- Support Cases RLS
DROP POLICY IF EXISTS "Users can view own support cases" ON public.support_cases;
CREATE POLICY "Users can view own support cases" ON public.support_cases FOR SELECT USING (auth.uid() = customer_id);

DROP POLICY IF EXISTS "Users can create support cases" ON public.support_cases;
CREATE POLICY "Users can create support cases" ON public.support_cases FOR INSERT WITH CHECK (auth.uid() = customer_id);