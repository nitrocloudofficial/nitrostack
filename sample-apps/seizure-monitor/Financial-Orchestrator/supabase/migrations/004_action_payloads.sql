-- ============================================
-- Migration 004: Action Payloads (HITL Execution Engine)
-- ============================================

CREATE TABLE IF NOT EXISTS action_payloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('INVESTMENT_BUY', 'INVESTMENT_SELL', 'SIP_START', 'SIP_STOP', 'LOAN_APPLICATION', 'INSURANCE_PURCHASE', 'FD_CREATION')),
  status TEXT NOT NULL DEFAULT 'DRAFTED' CHECK (status IN ('DRAFTED', 'PENDING_APPROVAL', 'APPROVED', 'EXECUTED', 'REJECTED', 'EXPIRED')),
  payload JSONB NOT NULL DEFAULT '{}',
  plain_english_summary TEXT NOT NULL,
  estimated_impact TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  resolved_at TIMESTAMPTZ,
  resolved_by TEXT
);

CREATE INDEX idx_action_payloads_user ON action_payloads(user_id);
CREATE INDEX idx_action_payloads_status ON action_payloads(status);
CREATE INDEX idx_action_payloads_expires ON action_payloads(expires_at) WHERE status = 'PENDING_APPROVAL';
