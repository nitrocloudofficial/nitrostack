-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables for clean schema initialization
DROP TABLE IF EXISTS decision_source_links CASCADE;
DROP TABLE IF EXISTS decision_events CASCADE;
DROP TABLE IF EXISTS source_segments CASCADE;

-- Table 1: Raw transcript & conversation segments
CREATE TABLE source_segments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_name VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    speaker VARCHAR(255),
    sequence_num INT DEFAULT 0,
    embedding vector(1536),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table 2: Structured decision events
CREATE TABLE decision_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    decision TEXT NOT NULL,
    rationale TEXT,
    alternatives TEXT[] DEFAULT '{}',
    status VARCHAR(50) DEFAULT 'decided',
    owner VARCHAR(255),
    topic VARCHAR(255),
    quote TEXT,
    source_name VARCHAR(255),
    embedding vector(1536),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table 3: Decision to segment graph links with dynamic relationship types
CREATE TABLE decision_source_links (
    decision_id UUID REFERENCES decision_events(id) ON DELETE CASCADE,
    segment_id UUID REFERENCES source_segments(id) ON DELETE CASCADE,
    relationship_type VARCHAR(50) DEFAULT 'related',
    PRIMARY KEY (decision_id, segment_id)
);
