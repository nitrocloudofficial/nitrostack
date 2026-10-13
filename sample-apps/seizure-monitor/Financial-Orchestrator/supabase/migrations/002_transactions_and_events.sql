-- ============================================
-- Migration 002: Transactions, Holdings & Events
-- ============================================

-- Unified transaction ledger (time-series)
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bank_account_id UUID REFERENCES bank_accounts(id),
  type TEXT NOT NULL CHECK (type IN ('CREDIT', 'DEBIT')),
  amount DECIMAL(15,2) NOT NULL,
  category TEXT NOT NULL,
  merchant TEXT,
  description TEXT,
  source_tier TEXT NOT NULL CHECK (source_tier IN ('BANK_API', 'DOCUMENT', 'USER_INPUT')),
  balance_after DECIMAL(15,2),
  timestamp TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Mutual fund holdings (from CAS)
CREATE TABLE IF NOT EXISTS mutual_fund_holdings (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scheme_code TEXT NOT NULL,
  scheme_name TEXT NOT NULL,
  amc_name TEXT,
  folio_number TEXT,
  units DECIMAL(15,4) DEFAULT 0,
  invested_value DECIMAL(15,2) DEFAULT 0,
  current_value DECIMAL(15,2) DEFAULT 0,
  nav DECIMAL(10,4),
  source_tier TEXT DEFAULT 'DOCUMENT',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tax profiles (from Form 16)
CREATE TABLE IF NOT EXISTS tax_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assessment_year TEXT NOT NULL,
  data JSONB NOT NULL,
  source_tier TEXT DEFAULT 'DOCUMENT',
  ingested_at TIMESTAMPTZ DEFAULT NOW()
);

-- Financial goals
CREATE TABLE IF NOT EXISTS financial_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target_amount DECIMAL(15,2) NOT NULL,
  target_year INTEGER NOT NULL,
  priority INTEGER DEFAULT 5,
  category TEXT,
  current_progress DECIMAL(15,2) DEFAULT 0,
  source_tier TEXT DEFAULT 'USER_INPUT',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insurance policies
CREATE TABLE IF NOT EXISTS insurance_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  provider TEXT NOT NULL,
  cover_amount DECIMAL(15,2) NOT NULL,
  annual_premium DECIMAL(15,2) NOT NULL,
  maturity_date DATE,
  source_tier TEXT DEFAULT 'USER_INPUT',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Life events
CREATE TABLE IF NOT EXISTS life_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  impact_weights JSONB DEFAULT '{}',
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for time-series queries
CREATE INDEX idx_transactions_user_time ON transactions(user_id, timestamp DESC);
CREATE INDEX idx_transactions_category ON transactions(category);
CREATE INDEX idx_mf_holdings_user ON mutual_fund_holdings(user_id);
CREATE INDEX idx_life_events_user ON life_events(user_id, timestamp DESC);
