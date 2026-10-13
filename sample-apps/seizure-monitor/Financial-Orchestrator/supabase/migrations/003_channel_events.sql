-- ============================================
-- Migration 003: Channel Events (Journey Stitching)
-- ============================================

CREATE TABLE IF NOT EXISTS channel_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id UUID NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('MOBILE_APP', 'WEB_PORTAL', 'IVR_CALL', 'API', 'BRANCH')),
  action TEXT NOT NULL,
  payload JSONB DEFAULT '{}',
  status TEXT NOT NULL CHECK (status IN ('SUCCESS', 'ERROR', 'TIMEOUT', 'IN_PROGRESS', 'ABANDONED')),
  error_details TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_channel_events_user_time ON channel_events(user_id, timestamp DESC);
CREATE INDEX idx_channel_events_session ON channel_events(session_id);
CREATE INDEX idx_channel_events_status ON channel_events(status);
