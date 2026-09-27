-- TrustPass MVP Database Schema
-- Postgres 14+

-- ============================================================================
-- USERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'consumer' CHECK (role IN ('consumer', 'business', 'moderator', 'admin')),
  email_verified BOOLEAN DEFAULT FALSE,
  email_verified_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Future auth methods (nullable for MVP)
  phone_number VARCHAR(20),
  phone_verified BOOLEAN DEFAULT FALSE,
  oauth_provider VARCHAR(50),
  oauth_id VARCHAR(255),
  
  -- Account metadata
  account_age_days INT GENERATED ALWAYS AS (EXTRACT(DAY FROM CURRENT_TIMESTAMP - created_at)) STORED,
  last_login_at TIMESTAMP,
  
  INDEX idx_email (email),
  INDEX idx_role (role),
  INDEX idx_created_at (created_at)
);

-- ============================================================================
-- BUSINESSES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  owner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  claimed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Trust & fraud metrics (denormalized for speed)
  trust_score_avg DECIMAL(5, 2) DEFAULT 0,
  fraud_risk_score DECIMAL(5, 2) DEFAULT 0,
  review_count INT DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_owner_user_id (owner_user_id),
  INDEX idx_created_at (created_at),
  INDEX idx_fraud_risk_score (fraud_risk_score)
);

-- ============================================================================
-- REVIEWS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Review content
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  text TEXT NOT NULL,
  
  -- Trust & verification
  trust_score INT DEFAULT 0 CHECK (trust_score >= 0 AND trust_score <= 100),
  verification_status VARCHAR(50) NOT NULL DEFAULT 'unverified' CHECK (verification_status IN ('unverified', 'verified', 'flagged', 'removed')),
  
  -- Metadata
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_business_id (business_id),
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at),
  INDEX idx_trust_score (trust_score),
  INDEX idx_verification_status (verification_status),
  INDEX idx_business_created (business_id, created_at)
);

-- ============================================================================
-- TRUST_SCORES TABLE (Timeline/History)
-- ============================================================================
CREATE TABLE IF NOT EXISTS trust_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  
  -- Score & reasons
  score INT NOT NULL CHECK (score >= 0 AND score <= 100),
  reasons JSONB NOT NULL DEFAULT '[]', -- Array of reason strings
  
  -- Scoring breakdown (for transparency)
  evidence_score INT DEFAULT 0,
  reputation_score INT DEFAULT 0,
  originality_score INT DEFAULT 0,
  account_age_score INT DEFAULT 0,
  community_score INT DEFAULT 0,
  
  -- Metadata
  computed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  version INT NOT NULL DEFAULT 1,
  
  INDEX idx_review_id (review_id),
  INDEX idx_computed_at (computed_at),
  INDEX idx_review_computed (review_id, computed_at DESC)
);

-- ============================================================================
-- EVIDENCE TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  
  -- File metadata
  file_url VARCHAR(500) NOT NULL,
  file_type VARCHAR(50) NOT NULL CHECK (file_type IN ('receipt', 'booking', 'delivery', 'photo', 'other')),
  file_size_bytes INT,
  
  -- OCR & metadata (Future Scope)
  ocr_text TEXT,
  metadata JSONB DEFAULT '{}',
  
  -- Verification
  verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMP,
  
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_review_id (review_id),
  INDEX idx_created_at (created_at)
);

-- ============================================================================
-- REVIEWER_REPUTATION TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS reviewer_reputation (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  
  -- Points & tier
  reputation_points INT DEFAULT 0,
  badge_tier VARCHAR(50) NOT NULL DEFAULT 'new_reviewer' CHECK (badge_tier IN (
    'new_reviewer', 'verified_reviewer', 'trusted_reviewer', 'expert_reviewer', 'community_guardian', 'truth_keeper'
  )),
  
  -- Metrics
  total_reviews INT DEFAULT 0,
  total_helpful_count INT DEFAULT 0,
  total_agree_count INT DEFAULT 0,
  total_disagree_count INT DEFAULT 0,
  total_reports_received INT DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_badge_tier (badge_tier),
  INDEX idx_reputation_points (reputation_points DESC)
);

-- ============================================================================
-- BADGES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Badge metadata
  badge_name VARCHAR(100) NOT NULL,
  badge_description TEXT,
  badge_icon_url VARCHAR(500),
  
  -- Criteria
  earned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reason VARCHAR(255),
  
  INDEX idx_user_id (user_id),
  INDEX idx_earned_at (earned_at)
);

-- ============================================================================
-- COMMUNITY_REPORTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS community_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  reporter_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Report metadata
  reason VARCHAR(50) NOT NULL CHECK (reason IN ('fake', 'misleading', 'spam', 'offensive', 'other')),
  description TEXT,
  
  -- Status & resolution
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'upheld', 'dismissed', 'escalated')),
  moderator_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  moderator_decision TEXT,
  
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP,
  
  INDEX idx_review_id (review_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
);

-- ============================================================================
-- AI_ANALYSIS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS ai_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE UNIQUE,
  
  -- Sentiment analysis
  sentiment VARCHAR(50) CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  sentiment_confidence DECIMAL(5, 2),
  
  -- Similarity & duplicates
  similarity_score DECIMAL(5, 2),
  duplicate_flags JSONB DEFAULT '[]', -- Array of similar review IDs
  
  -- Spam/fraud patterns
  spam_score DECIMAL(5, 2),
  fraud_patterns JSONB DEFAULT '{}',
  
  -- Smart summary (aggregated per business)
  summary_snippet TEXT,
  
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_review_id (review_id),
  INDEX idx_sentiment (sentiment)
);

-- ============================================================================
-- AUDIT_LOGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Action metadata
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id UUID,
  
  -- Details
  details JSONB DEFAULT '{}',
  ip_address VARCHAR(45),
  
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_actor_user_id (actor_user_id),
  INDEX idx_action (action),
  INDEX idx_resource_type (resource_type),
  INDEX idx_created_at (created_at)
);

-- ============================================================================
-- SESSIONS TABLE (for session-based auth)
-- ============================================================================
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Session metadata
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  ip_address VARCHAR(45),
  user_agent TEXT,
  
  -- Lifecycle
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  last_activity_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_user_id (user_id),
  INDEX idx_token_hash (token_hash),
  INDEX idx_expires_at (expires_at)
);

-- ============================================================================
-- COMMUNITY_REACTIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS community_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Reaction type
  reaction_type VARCHAR(50) NOT NULL CHECK (reaction_type IN ('helpful', 'agree', 'disagree', 'report')),
  
  -- Metadata
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Unique constraint: one reaction per user per review per type
  UNIQUE(review_id, user_id, reaction_type),
  
  INDEX idx_review_id (review_id),
  INDEX idx_user_id (user_id),
  INDEX idx_reaction_type (reaction_type),
  INDEX idx_created_at (created_at)
);

-- ============================================================================
-- NOTIFICATIONS TABLE (in-app only for MVP)
-- ============================================================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Notification content
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT,
  
  -- Metadata
  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_user_id (user_id),
  INDEX idx_read (read),
  INDEX idx_created_at (created_at)
);

-- ============================================================================
-- INDEXES FOR COMMON QUERIES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_reviews_business_created ON reviews(business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_user_created ON reviews(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trust_scores_review_created ON trust_scores(review_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_reports_review ON community_reports(review_id, status);
CREATE INDEX IF NOT EXISTS idx_ai_analysis_review ON ai_analysis(review_id);
