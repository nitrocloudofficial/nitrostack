-- ============================================
-- Migration 005: Simulator Tables
-- users, bank_accounts, stock_companies, bank_transactions, market_alerts, user_financial_profiles
-- ============================================

-- ─────────────────────────────────────────────
-- 0. Core Tables (in case they don't exist)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  date_of_birth DATE,
  pan_number_hash TEXT,
  city TEXT,
  occupation TEXT,
  employer_name TEXT,
  monthly_income DECIMAL(15,2) DEFAULT 0,
  risk_tolerance TEXT DEFAULT 'MODERATE' CHECK (risk_tolerance IN ('CONSERVATIVE', 'MODERATE', 'AGGRESSIVE')),
  target_retirement_age INTEGER DEFAULT 60,
  dependents INTEGER DEFAULT 0,
  marital_status TEXT DEFAULT 'SINGLE',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bank_name TEXT NOT NULL,
  account_type TEXT NOT NULL CHECK (account_type IN ('SAVINGS', 'CURRENT', 'FD', 'RD', 'LOAN', 'CREDIT_CARD')),
  account_number_masked TEXT NOT NULL,
  balance DECIMAL(15,2) DEFAULT 0,
  currency TEXT DEFAULT 'INR',
  account_id_short TEXT UNIQUE,
  last_synced TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- 1. Stock Companies (simulated live market ticks)
-- ─────────────────────────────────────────────
DROP TABLE IF EXISTS stock_companies CASCADE;
CREATE TABLE IF NOT EXISTS stock_companies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tradingsymbol   TEXT NOT NULL,                 -- e.g. RELIANCE (No longer UNIQUE for time-series)
  company_name    TEXT NOT NULL,
  exchange        TEXT NOT NULL DEFAULT 'NSE',
  sector          TEXT,
  current_price   DECIMAL(12,2) NOT NULL,
  open_price      DECIMAL(12,2) NOT NULL,
  close_price     DECIMAL(12,2) NOT NULL,
  day_high        DECIMAL(12,2),
  day_low         DECIMAL(12,2),
  volume          BIGINT DEFAULT 0,
  timestamp       TIMESTAMPTZ DEFAULT NOW(),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_companies_symbol_time ON stock_companies(tradingsymbol, timestamp DESC);


-- ─────────────────────────────────────────────
-- 1b. Mutual Funds (simulated live NAV ticks)
-- ─────────────────────────────────────────────
DROP TABLE IF EXISTS live_mutual_funds CASCADE;
CREATE TABLE IF NOT EXISTS live_mutual_funds (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scheme_code     TEXT NOT NULL,
  scheme_name     TEXT NOT NULL,
  amc_name        TEXT NOT NULL,
  category        TEXT,
  nav             DECIMAL(12,4) NOT NULL,
  open_nav        DECIMAL(12,4) NOT NULL,
  close_nav       DECIMAL(12,4) NOT NULL,
  timestamp       TIMESTAMPTZ DEFAULT NOW(),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_live_mutual_funds_code_time ON live_mutual_funds(scheme_code, timestamp DESC);



-- ─────────────────────────────────────────────
-- 2. Bank Transactions (webhook-style JSON rows)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bank_transactions (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id              TEXT UNIQUE NOT NULL,       -- TXN_UPI_xxxx
  account_id                  TEXT NOT NULL,              -- sbi_acc_1029
  bank_name                   TEXT NOT NULL,
  account_number_masked       TEXT NOT NULL,
  transaction_type            TEXT NOT NULL CHECK (transaction_type IN ('DEBIT', 'CREDIT')),
  payment_channel             TEXT NOT NULL,
  payment_app                 TEXT,
  merchant_name               TEXT NOT NULL,
  merchant_vpa                TEXT,
  category                    TEXT NOT NULL,
  description                 TEXT NOT NULL,
  amount                      DECIMAL(12,2) NOT NULL,
  currency                    TEXT NOT NULL DEFAULT 'INR',
  balance_after_transaction   DECIMAL(12,2) NOT NULL,
  timestamp                   TIMESTAMPTZ NOT NULL,
  status                      TEXT NOT NULL DEFAULT 'SUCCESS'
                              CHECK (status IN ('SUCCESS', 'PENDING', 'FAILED')),
  created_at                  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bank_txn_account   ON bank_transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_bank_txn_timestamp ON bank_transactions(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_bank_txn_category  ON bank_transactions(category);


-- ─────────────────────────────────────────────
-- 3. Market Alerts (broker-style webhook rows)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS market_alerts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type      TEXT NOT NULL CHECK (alert_type IN (
                    'PORTFOLIO_DRAWDOWN', 'BREAKOUT_SIGNAL', 'PRICE_UPDATE'
                  )),
  broker          TEXT NOT NULL DEFAULT 'ZERODHA',
  tradingsymbol   TEXT NOT NULL,
  exchange        TEXT NOT NULL DEFAULT 'NSE',
  current_price   DECIMAL(12,2) NOT NULL,
  trigger_price   DECIMAL(12,2) NOT NULL,
  change_percent  DECIMAL(6,2) NOT NULL,
  timestamp       TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_market_alerts_symbol ON market_alerts(tradingsymbol);
CREATE INDEX IF NOT EXISTS idx_market_alerts_time   ON market_alerts(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_market_alerts_type   ON market_alerts(alert_type);


-- ─────────────────────────────────────────────
-- 4. User Financial Profiles (deep JSONB)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_financial_profiles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  profile_data  JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT uq_user_financial_profile UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_ufp_user ON user_financial_profiles(user_id);

-- GIN index lets you query *inside* the JSONB payload efficiently
CREATE INDEX IF NOT EXISTS idx_ufp_profile_gin ON user_financial_profiles USING GIN (profile_data);


-- ─────────────────────────────────────────────
-- 5. Helper: auto-update updated_at on changes
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach to user_financial_profiles
DROP TRIGGER IF EXISTS trg_ufp_updated ON user_financial_profiles;
CREATE TRIGGER trg_ufp_updated
  BEFORE UPDATE ON user_financial_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
