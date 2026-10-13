-- Supabase Migration: Create sessions table for short-term LLM memory rehydration

CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  message_history jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security (RLS)
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Allow users to manage their own sessions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'sessions' AND policyname = 'users manage their own sessions'
  ) THEN
    CREATE POLICY "users manage their own sessions"
      ON sessions FOR ALL
      USING (auth.uid() = patient_id)
      WITH CHECK (auth.uid() = patient_id);
  END IF;
END $$;
