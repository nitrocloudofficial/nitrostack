-- ============================================
-- Migration 006: Monitoring and Bank Products (No Loans)
-- ============================================

CREATE TABLE IF NOT EXISTS bank_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_name TEXT NOT NULL,
  product_name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('SIP', 'TERM_LIFE', 'HEALTH_INSURANCE', 'FIXED_DEPOSIT', 'TAX_SAVER', 'CREDIT_CARD')),
  min_income DECIMAL(15,2) DEFAULT 0,
  target_risk TEXT DEFAULT 'MODERATE' CHECK (target_risk IN ('CONSERVATIVE', 'MODERATE', 'AGGRESSIVE')),
  min_age INTEGER DEFAULT 18,
  max_age INTEGER DEFAULT 70,
  expected_return_or_cover TEXT NOT NULL,
  description TEXT NOT NULL,
  features JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS monitoring_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bank_name TEXT NOT NULL,
  product_id UUID REFERENCES bank_products(id) ON DELETE SET NULL,
  recommendation_type TEXT NOT NULL CHECK (recommendation_type IN ('HEALTH_GAP', 'LIFE_GAP', 'SIP_OPTIMIZATION', 'TAX_SAVER', 'EMERGENCY_BUFFER', 'HIGH_YIELD_SAVINGS')),
  title TEXT NOT NULL,
  reasoning_xai TEXT NOT NULL,
  impact_summary TEXT NOT NULL,
  status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'APPLIED', 'DISMISSED')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bank_products_bank ON bank_products(bank_name);
CREATE INDEX IF NOT EXISTS idx_bank_products_cat ON bank_products(category);
CREATE INDEX IF NOT EXISTS idx_monitoring_user ON monitoring_recommendations(user_id);

-- Seed initial bank products for major banks
INSERT INTO bank_products (bank_name, product_name, category, min_income, target_risk, min_age, max_age, expected_return_or_cover, description, features)
VALUES 
  ('State Bank of India', 'SBI Life eShield Next', 'TERM_LIFE', 300000, 'CONSERVATIVE', 18, 65, '₹1.5 Cr Cover @ ₹1,120/mo', 'Comprehensive level term plan with terminal illness cover and 100% payout option.', '["Terminal Illness Benefit", "Tax Savings u/s 80C", "Level Cover"]'),
  ('State Bank of India', 'SBI Amrit Vrishti 444-Day FD', 'FIXED_DEPOSIT', 0, 'CONSERVATIVE', 18, 90, '7.25% p.a.', 'High-yield 444-day special tenure deposit for surplus liquid cash.', '["7.25% Annual Return", "0.50% Extra for Senior Citizens", "Instant Liquidity"]'),
  ('HDFC Bank', 'HDFC Top 100 Equity SIP', 'SIP', 500000, 'AGGRESSIVE', 18, 60, '14.8% CAGR (5Y)', 'Large-cap disciplined SIP targeting long-term wealth creation for retirement & education.', '["Top 100 Indian Companies", "Zero Exit Load after 1Y", "Automated Monthly SIP"]'),
  ('HDFC Bank', 'HDFC Click 2 Protect Super', 'TERM_LIFE', 400000, 'MODERATE', 18, 65, '₹2.0 Cr Cover @ ₹1,450/mo', 'Smart protection plan that increases cover with life stage milestones (marriage, child birth).', '["Life Stage Top-up", "Return of Premium option", "Critical Illness Add-on"]'),
  ('ICICI Bank', 'ICICI Lombard Elevate Health Plan', 'HEALTH_INSURANCE', 350000, 'MODERATE', 18, 75, '₹15L Cover + Unlimited Restore', 'Next-gen health cover with infinite restore benefit and zero sub-limits on ICU/room rent.', '["Unlimited Reset Benefit", "No Room Rent Capping", "Air Ambulance Included"]'),
  ('ICICI Bank', 'ICICI Prudential Tax Plan ELSS', 'TAX_SAVER', 400000, 'AGGRESSIVE', 18, 60, '15.4% CAGR (3Y Lock-in)', 'Section 80C tax saving equity fund with shortest 3-year lock-in period.', '["Save up to ₹46,800 Tax", "3-Year Lock-in", "Diversified Multi-cap Portfolio"]'),
  ('Axis Bank', 'Axis Long Term Equity ELSS', 'TAX_SAVER', 350000, 'MODERATE', 18, 60, '13.9% CAGR', 'Quality-focused 80C tax saver mutual fund focusing on high-growth leaders.', '["80C Tax Deduction", "Growth-oriented stock selection", "Monthly SIP available"]'),
  ('Kotak Mahindra Bank', 'Kotak Health Care Premium', 'HEALTH_INSURANCE', 300000, 'CONSERVATIVE', 18, 70, '₹10L Cover @ ₹750/mo', 'Family floater health insurance with 100% cumulative bonus for claim-free years.', '["Double Cover in 2 Years", "Cashless at 7000+ Hospitals", "Daycare Procedures Covered"]')
ON CONFLICT DO NOTHING;
