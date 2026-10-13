-- ============================================
-- Migration 001: Users and Bank Accounts
-- ============================================

-- Users table — core identity (flat storage in Supabase)
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

-- Bank accounts table — multi-bank connections
CREATE TABLE IF NOT EXISTS bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bank_name TEXT NOT NULL,
  account_type TEXT NOT NULL CHECK (account_type IN ('SAVINGS', 'CURRENT', 'FD', 'RD', 'LOAN', 'CREDIT_CARD')),
  account_number_masked TEXT NOT NULL,
  balance DECIMAL(15,2) DEFAULT 0,
  currency TEXT DEFAULT 'INR',
  last_synced TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_bank_accounts_user ON bank_accounts(user_id);
CREATE INDEX idx_bank_accounts_bank ON bank_accounts(bank_name);
