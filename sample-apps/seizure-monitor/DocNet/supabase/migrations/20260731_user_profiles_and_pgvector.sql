-- Supabase Migration: User Profiles Table + RLS & pgvector Semantic Memory

-- 1. User Profiles Table + Row Level Security (RLS)
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  age int,
  allergies text[],
  chronic_conditions text[],
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_profiles' AND policyname = 'users manage their own profile'
  ) THEN
    CREATE POLICY "users manage their own profile"
      ON user_profiles FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- 2. pgvector Extension & Semantic Memory Column
CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE health_episodes
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS embedding vector(384);

-- HNSW Index for fast vector similarity search
CREATE INDEX IF NOT EXISTS idx_health_episodes_embedding
  ON health_episodes
  USING hnsw (embedding vector_cosine_ops);

-- 3. RPC Function for Vector Cosine Similarity Matching
CREATE OR REPLACE FUNCTION match_health_episodes(
  query_embedding vector(384),
  match_user_id uuid DEFAULT NULL,
  match_scope text DEFAULT 'global',
  match_limit int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  symptoms text[],
  clinical_summary text,
  recommended_specialty text,
  severity text,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    id,
    symptoms,
    clinical_summary,
    recommended_specialty,
    severity,
    1 - (embedding <=> query_embedding) AS similarity
  FROM health_episodes
  WHERE (match_scope = 'global' OR user_id = match_user_id)
  ORDER BY embedding <=> query_embedding
  LIMIT match_limit;
$$;
