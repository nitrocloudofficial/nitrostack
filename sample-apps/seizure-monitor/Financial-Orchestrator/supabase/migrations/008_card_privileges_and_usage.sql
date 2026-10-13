-- ============================================
-- Migration 008: Card Privileges and Usage Monitoring
-- ============================================

-- Table for User Cards
CREATE TABLE IF NOT EXISTS user_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  card_name TEXT NOT NULL,
  card_type TEXT DEFAULT 'CREDIT_CARD' CHECK (card_type IN ('CREDIT_CARD', 'DEBIT_CARD')),
  card_number_last4 TEXT DEFAULT '4321',
  annual_fee DECIMAL(15,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table for Card Privileges & Usage
CREATE TABLE IF NOT EXISTS card_privileges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_card_id UUID NOT NULL REFERENCES user_cards(id) ON DELETE CASCADE,
  privilege_name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('LOUNGE', 'ENTERTAINMENT', 'LIFESTYLE', 'INSURANCE', 'DINING', 'FUEL', 'GOLF', 'MILESTONE')),
  total_quota INTEGER NOT NULL DEFAULT 1,
  used_quota INTEGER NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'Visits',
  monetary_value_per_unit DECIMAL(15,2) DEFAULT 1000.00,
  reset_frequency TEXT DEFAULT 'QUARTERLY' CHECK (reset_frequency IN ('MONTHLY', 'QUARTERLY', 'ANNUALLY')),
  expiry_date DATE,
  is_forgotten_alert BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_cards_email ON user_cards(user_email);
CREATE INDEX IF NOT EXISTS idx_card_privileges_card ON card_privileges(user_card_id);

-- Seed Card & Privilege Data for Demo Profiles (Priya Sharma, Rajesh Kumar, Suresh Iyer)

-- 1. Priya Sharma Cards & Privileges
DO $$
DECLARE
  v_user_id UUID;
  v_card1_id UUID;
  v_card2_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM users WHERE email = 'priya.sharma@email.com' LIMIT 1;
  
  -- Card 1: HDFC Regalia Gold
  INSERT INTO user_cards (id, user_id, user_email, bank_name, card_name, card_type, card_number_last4, annual_fee)
  VALUES (gen_random_uuid(), v_user_id, 'priya.sharma@email.com', 'HDFC Bank', 'HDFC Regalia Gold Credit Card', 'CREDIT_CARD', '8912', 2500.00)
  RETURNING id INTO v_card1_id;

  INSERT INTO card_privileges (user_card_id, privilege_name, category, total_quota, used_quota, unit, monetary_value_per_unit, reset_frequency, expiry_date, is_forgotten_alert)
  VALUES 
    (v_card1_id, 'Complimentary Airport Lounge Access', 'LOUNGE', 12, 4, 'Visits', 1500.00, 'QUARTERLY', '2026-09-30', TRUE),
    (v_card1_id, 'BookMyShow Buy 1 Get 1 Movie Tickets', 'ENTERTAINMENT', 24, 8, 'Tickets', 300.00, 'MONTHLY', '2026-08-31', FALSE),
    (v_card1_id, 'Swiggy One & MMT Black Annual Vouchers', 'LIFESTYLE', 1, 0, 'Voucher', 2499.00, 'ANNUALLY', '2026-08-15', TRUE),
    (v_card1_id, 'Comprehensive Air Accident Cover', 'INSURANCE', 1, 1, 'Cr Cover', 10000000.00, 'ANNUALLY', '2026-12-31', FALSE);

  -- Card 2: ICICI Sapphiro
  INSERT INTO user_cards (id, user_id, user_email, bank_name, card_name, card_type, card_number_last4, annual_fee)
  VALUES (gen_random_uuid(), v_user_id, 'priya.sharma@email.com', 'ICICI Bank', 'ICICI Sapphiro Credit Card', 'CREDIT_CARD', '4401', 3500.00)
  RETURNING id INTO v_card2_id;

  INSERT INTO card_privileges (user_card_id, privilege_name, category, total_quota, used_quota, unit, monetary_value_per_unit, reset_frequency, expiry_date, is_forgotten_alert)
  VALUES 
    (v_card2_id, 'Golf Course Rounds & Lessons', 'GOLF', 4, 1, 'Rounds', 3500.00, 'QUARTERLY', '2026-09-30', TRUE),
    (v_card2_id, 'Culinary Treats 15% Dining Discount', 'DINING', 12, 9, 'Visits', 650.00, 'MONTHLY', '2026-12-31', FALSE),
    (v_card2_id, '1% Fuel Surcharge Waiver', 'FUEL', 12, 10, 'Months', 250.00, 'MONTHLY', '2026-12-31', FALSE);
END $$;
