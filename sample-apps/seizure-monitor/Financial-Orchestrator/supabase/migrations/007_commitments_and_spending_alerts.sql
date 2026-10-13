-- ============================================
-- Migration 007: Financial Commitments & Overspend Alerts
-- ============================================

CREATE TABLE IF NOT EXISTS financial_commitments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  commitment_name TEXT NOT NULL,
  commitment_type TEXT NOT NULL CHECK (commitment_type IN ('LOAN_EMI', 'CREDIT_CARD_AUTOPAY', 'SIP_AUTODEBIT', 'INSURANCE_PREMIUM', 'UTILITY_BILL')),
  amount DECIMAL(15,2) NOT NULL,
  due_date DATE NOT NULL,
  bank_name TEXT NOT NULL,
  status TEXT DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED', 'PAID', 'OVERDUE')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS spending_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('OVERSPEND_WARNING', 'COMMITMENT_DEFICIT_RISK', 'AUTOPAY_DUE_SOON')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  amount_at_risk DECIMAL(15,2) DEFAULT 0,
  severity TEXT DEFAULT 'WARNING' CHECK (severity IN ('CRITICAL', 'WARNING', 'INFO')),
  status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'RESOLVED', 'SNOOZED')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_commitments_email ON financial_commitments(user_email);
CREATE INDEX IF NOT EXISTS idx_spending_alerts_email ON spending_alerts(user_email);

-- Seed commitments for demo users
INSERT INTO financial_commitments (user_email, commitment_name, commitment_type, amount, due_date, bank_name, status)
VALUES 
  ('priya.sharma@email.com', 'HDFC Home Loan AutoPay EMI', 'LOAN_EMI', 45000.00, CURRENT_DATE + INTERVAL '3 days', 'HDFC Bank', 'SCHEDULED'),
  ('priya.sharma@email.com', 'ICICI Sapphiro Credit Card Bill', 'CREDIT_CARD_AUTOPAY', 28500.00, CURRENT_DATE + INTERVAL '5 days', 'ICICI Bank', 'SCHEDULED'),
  ('priya.sharma@email.com', 'HDFC Top 100 Equity SIP Auto-debit', 'SIP_AUTODEBIT', 15000.00, CURRENT_DATE + INTERVAL '2 days', 'HDFC Bank', 'SCHEDULED'),

  ('rajesh.kumar@email.com', 'SBI Personal Loan EMI', 'LOAN_EMI', 22000.00, CURRENT_DATE + INTERVAL '4 days', 'State Bank of India', 'SCHEDULED'),
  ('rajesh.kumar@email.com', 'SBI Life eShield Insurance Premium', 'INSURANCE_PREMIUM', 1120.00, CURRENT_DATE + INTERVAL '6 days', 'State Bank of India', 'SCHEDULED'),
  ('rajesh.kumar@email.com', 'Axis Long Term Equity SIP', 'SIP_AUTODEBIT', 10000.00, CURRENT_DATE + INTERVAL '3 days', 'Axis Bank', 'SCHEDULED'),

  ('arun.venkatesh@email.com', 'Canara Bank Housing Loan EMI', 'LOAN_EMI', 18500.00, CURRENT_DATE + INTERVAL '2 days', 'Canara Bank', 'SCHEDULED'),
  ('arun.venkatesh@email.com', 'Kotak Health Insurance Renewal', 'INSURANCE_PREMIUM', 750.00, CURRENT_DATE + INTERVAL '7 days', 'Kotak Mahindra Bank', 'SCHEDULED'),

  ('neha.patel@email.com', 'Axis Credit Card Auto-Pay', 'CREDIT_CARD_AUTOPAY', 14200.00, CURRENT_DATE + INTERVAL '3 days', 'Axis Bank', 'SCHEDULED'),
  ('neha.patel@email.com', 'ICICI Prudential Tax Plan SIP', 'SIP_AUTODEBIT', 5000.00, CURRENT_DATE + INTERVAL '5 days', 'ICICI Bank', 'SCHEDULED'),

  ('suresh.iyer@email.com', 'Commercial Property Loan EMI', 'LOAN_EMI', 85000.00, CURRENT_DATE + INTERVAL '4 days', 'HDFC Bank', 'SCHEDULED'),
  ('suresh.iyer@email.com', 'HDFC Business Credit Card Auto-Pay', 'CREDIT_CARD_AUTOPAY', 62000.00, CURRENT_DATE + INTERVAL '6 days', 'HDFC Bank', 'SCHEDULED')
ON CONFLICT DO NOTHING;
