-- Migration: Add full_name to user_profiles and setup sync trigger

-- 1. Add full_name column
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS full_name text;

-- 2. Create function to automatically create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, full_name)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name'
  )
  ON CONFLICT (user_id) DO UPDATE 
  SET full_name = EXCLUDED.full_name;
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
