-- ============================================================================
-- Fraud Pipeline — PostgreSQL Schema & Seed Data
-- Run once against your DATABASE_URL database:
--   psql $DATABASE_URL -f sql/001-create-tables.sql
-- ============================================================================

-- Enable the uuid-ossp extension (safe to call repeatedly)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. fraud_patterns
--    Stores transaction-level fraud indicators for Agent 2 routing lookups.
-- ============================================================================
CREATE TABLE IF NOT EXISTS fraud_patterns (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id  TEXT        NOT NULL,
  location        TEXT        NOT NULL,       -- free-text location / jurisdiction
  fraud_type      TEXT        NOT NULL,       -- e.g. upi_fraud, card_fraud, phishing
  description     TEXT,
  amount          NUMERIC(14,2),
  reported_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fraud_patterns_location   ON fraud_patterns USING gin (location  gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_fraud_patterns_fraud_type ON fraud_patterns USING gin (fraud_type gin_trgm_ops);

-- trigram extension needed for ILIKE-optimised indexes above
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- re-create the indexes now that pg_trgm is available
DROP INDEX IF EXISTS idx_fraud_patterns_location;
DROP INDEX IF EXISTS idx_fraud_patterns_fraud_type;
CREATE INDEX idx_fraud_patterns_location   ON fraud_patterns USING gin (location   gin_trgm_ops);
CREATE INDEX idx_fraud_patterns_fraud_type ON fraud_patterns USING gin (fraud_type gin_trgm_ops);


-- ============================================================================
-- 2. legal_corpus
--    Stores RBI Master Directions, IT Act statutes, BNS sections, and
--    regulatory circulars for Agent 3 (Legal & Solutions) lookups.
-- ============================================================================
CREATE TABLE IF NOT EXISTS legal_corpus (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entry_id          TEXT        NOT NULL UNIQUE,
  jurisdiction      TEXT        NOT NULL,
  fraud_types       TEXT[]      NOT NULL DEFAULT '{}',   -- postgres text array
  category          TEXT        NOT NULL CHECK (category IN ('statute', 'regulatory_circular', 'compliance_timeline')),
  name              TEXT        NOT NULL,
  section           TEXT        NOT NULL,
  summary           TEXT        NOT NULL,
  source_url        TEXT        NOT NULL,
  relevance         TEXT        NOT NULL,
  mandatory_timeline TEXT,                                -- nullable
  last_verified_at  TEXT        NOT NULL,
  version           TEXT        NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_legal_corpus_jurisdiction ON legal_corpus (jurisdiction);
CREATE INDEX IF NOT EXISTS idx_legal_corpus_category     ON legal_corpus (category);


-- ============================================================================
-- 3. Seed data — fraud_patterns
-- ============================================================================
INSERT INTO fraud_patterns (transaction_id, location, fraud_type, description, amount) VALUES
  ('TXN-UPI-20260710-001', 'IN-MH Mumbai',       'upi_fraud',         'Fraudulent UPI collect request impersonating bank support', 24500.00),
  ('TXN-UPI-20260711-002', 'IN-KA Bengaluru',     'upi_fraud',         'SIM swap leading to unauthorized UPI transfer',            89000.00),
  ('TXN-CARD-20260712-003','IN-MH Pune',          'card_fraud',        'Cloned debit card used at ATM withdrawal',                 45000.00),
  ('TXN-PHI-20260713-004', 'IN-DL Delhi',         'phishing',          'Fake RBI KYC update email harvesting OTP',                 15200.00),
  ('TXN-INV-20260714-005', 'IN-TN Chennai',       'investment_scam',   'Ponzi scheme promising 40% monthly crypto returns',       500000.00),
  ('TXN-CHQ-20260715-006', 'IN-MH Mumbai',        'cheque_fraud',      'Forged signature on demand draft',                        120000.00),
  ('TXN-IMP-20260716-007', 'IN-KA Bengaluru',     'impersonation_scam','Caller impersonated CBI officer demanding wire transfer',  75000.00),
  ('TXN-UPI-20260717-008', 'IN-GJ Ahmedabad',     'upi_fraud',         'QR code swap at petrol station POS terminal',               3200.00),
  ('TXN-BNK-20260718-009', 'IN-WB Kolkata',       'bank_transfer',     'NEFT initiated via compromised net-banking session',      210000.00),
  ('TXN-ORG-20260719-010', 'IN national',         'organized_fraud',   'Multi-state mule account network laundering proceeds',   2500000.00)
ON CONFLICT DO NOTHING;


-- ============================================================================
-- 4. Seed data — legal_corpus
-- ============================================================================
INSERT INTO legal_corpus (entry_id, jurisdiction, fraud_types, category, name, section, summary, source_url, relevance, mandatory_timeline, last_verified_at, version) VALUES
  (
    'in-it-act-66c', 'IN',
    ARRAY['upi_fraud','card_fraud','phishing','identity_theft'],
    'statute',
    'Information Technology Act, 2000', 'Section 66C',
    'Punishes identity theft involving fraudulent or dishonest use of another person identity credentials, password, digital signature, or other unique identification feature.',
    'https://www.indiacode.nic.in/handle/123456789/15442',
    'Relevant when fraud involves stolen credentials, unauthorized account access, or misuse of victim identity in a digital transaction.',
    NULL,
    '2026-07-26', 'db-corpus-2026-07'
  ),
  (
    'in-it-act-66d', 'IN',
    ARRAY['upi_fraud','card_fraud','phishing','impersonation_scam'],
    'statute',
    'Information Technology Act, 2000', 'Section 66D',
    'Punishes cheating by personation using a computer resource or communication device.',
    'https://www.indiacode.nic.in/handle/123456789/15442',
    'Relevant for phishing, fake support calls, spoofed merchant requests, and digital impersonation used to induce payment.',
    NULL,
    '2026-07-26', 'db-corpus-2026-07'
  ),
  (
    'in-bns-318', 'IN',
    ARRAY['upi_fraud','card_fraud','cheque_fraud','investment_scam','general_fraud'],
    'statute',
    'Bharatiya Nyaya Sanhita, 2023', 'Section 318',
    'Defines and punishes cheating, including dishonest inducement to deliver property or consent to retention of property.',
    'https://www.indiacode.nic.in/handle/123456789/20062?view_type=browse',
    'Baseline criminal fraud provision for deceptive inducement causing financial loss.',
    NULL,
    '2026-07-26', 'db-corpus-2026-07'
  ),
  (
    'in-bns-319', 'IN',
    ARRAY['phishing','impersonation_scam','card_fraud','upi_fraud'],
    'statute',
    'Bharatiya Nyaya Sanhita, 2023', 'Section 319',
    'Covers cheating by personation, including pretending to be another person or knowingly substituting one person for another.',
    'https://www.indiacode.nic.in/handle/123456789/20062?view_type=browse',
    'Relevant when the fraudster posed as bank staff, government staff, a merchant, or another trusted identity.',
    NULL,
    '2026-07-26', 'db-corpus-2026-07'
  ),
  (
    'in-bns-111', 'IN',
    ARRAY['investment_scam','organized_fraud','upi_fraud','phishing'],
    'statute',
    'Bharatiya Nyaya Sanhita, 2023', 'Section 111',
    'Addresses organized crime, including continuing unlawful activity involving economic offences or cyber-crimes by an organized group.',
    'https://www.indiacode.nic.in/handle/123456789/20062?view_type=browse',
    'Relevant when Agent 1 flags a multi-victim pattern, related tickets, or organized fraud indicators.',
    NULL,
    '2026-07-26', 'db-corpus-2026-07'
  ),
  (
    'in-ipc-420-legacy', 'IN',
    ARRAY['cheque_fraud','investment_scam','general_fraud'],
    'statute',
    'Indian Penal Code, 1860', 'Legacy Section 420',
    'Legacy cheating and dishonestly inducing delivery of property provision, relevant for historical comparison or offences predating BNS enforcement.',
    'https://www.indiacode.nic.in/',
    'Use only as a legacy reference where the offence date requires pre-BNS legal mapping.',
    NULL,
    '2026-07-26', 'db-corpus-2026-07'
  ),
  (
    'rbi-unauthorized-electronic-banking-2017', 'IN',
    ARRAY['upi_fraud','card_fraud','bank_transfer','phishing'],
    'regulatory_circular',
    'RBI Customer Protection Circular', 'DBR.No.Leg.BC.78/09.07.005/2017-18',
    'Sets customer liability rules for unauthorized electronic banking transactions, including zero liability for qualifying third-party breaches reported within three working days.',
    'https://www.rbi.org.in/commonman/English/scripts/Notification.aspx?Id=2623',
    'Relevant for immediate bank notification, liability assessment, and shadow reversal guidance for electronic banking fraud.',
    'Report within 3 working days for zero liability in qualifying third-party breach cases; 4 to 7 working days may trigger limited liability; bank shadow reversal within 10 working days after notification.',
    '2026-07-26', 'db-corpus-2026-07'
  ),
  (
    'rbi-ppi-unauthorized-payments', 'IN',
    ARRAY['upi_fraud','wallet_fraud','phishing'],
    'compliance_timeline',
    'RBI Master Directions on Prepaid Payment Instruments', 'Paragraphs 16.4.6 and 16.4.7',
    'Provides limited-liability rules for unauthorized electronic payment transactions through non-bank prepaid payment instruments.',
    'https://rbi.org.in/Scripts/BS_ViewMasDirections.aspx?id=11142',
    'Relevant where the disputed transaction used a wallet or other PPI rail rather than a bank account directly.',
    'Notify within 3 days for zero liability in qualifying third-party breach cases; notional reversal within 10 days from notification.',
    '2026-07-26', 'db-corpus-2026-07'
  ),
  (
    'rbi-draft-2026-unauthorized-transactions', 'IN',
    ARRAY['upi_fraud','card_fraud','bank_transfer','phishing'],
    'regulatory_circular',
    'RBI Draft Revised Customer Protection Instructions', 'Draft instructions issued for consultation on 2026-03-06',
    'Draft revised instructions covering unauthorized electronic banking transactions, compensation mechanisms, fraud analytics, and mule account safeguards.',
    'https://www.pib.gov.in/PressReleasePage.aspx?PRID=2244478',
    'Use only as a draft or recent-change confidence note unless confirmed as final in the maintained corpus.',
    'Draft status in this mock corpus; verify current RBI final circular before relying on any changed timeline.',
    '2026-07-26', 'db-corpus-2026-07'
  )
ON CONFLICT (entry_id) DO NOTHING;


-- ============================================================================
-- Done. Verify:
--   SELECT count(*) FROM fraud_patterns;   -- expect 10
--   SELECT count(*) FROM legal_corpus;      -- expect 9
-- ============================================================================
