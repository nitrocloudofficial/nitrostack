-- =============================================================================
-- SUPABASE ROW LEVEL SECURITY (RLS) POLICIES FOR LANNEX
-- =============================================================================

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bill_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running to avoid duplicate policy errors
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can manage their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can view own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can manage own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can view own assets" ON public.assets;
DROP POLICY IF EXISTS "Users can manage own assets" ON public.assets;
DROP POLICY IF EXISTS "Allow access to debts" ON public.debts;
DROP POLICY IF EXISTS "Allow access to receipts" ON public.receipts;
DROP POLICY IF EXISTS "Allow access to bill items" ON public.bill_items;
DROP POLICY IF EXISTS "Allow access to action logs" ON public.action_logs;

-- -------------------------------------------------------------
-- 1. USERS TABLE POLICIES
-- -------------------------------------------------------------
CREATE POLICY "Users can view their own profile"
  ON public.users FOR SELECT
  USING (auth.uid()::text = id OR auth.role() = 'service_role' OR auth.role() = 'anon');

CREATE POLICY "Users can manage their own profile"
  ON public.users FOR ALL
  USING (auth.uid()::text = id OR auth.role() = 'service_role');

-- -------------------------------------------------------------
-- 2. EXPENSES TABLE POLICIES
-- -------------------------------------------------------------
CREATE POLICY "Users can view own expenses"
  ON public.expenses FOR SELECT
  USING ("userId" IS NULL OR "userId" = auth.uid()::text OR auth.role() = 'service_role' OR auth.role() = 'anon');

CREATE POLICY "Users can manage own expenses"
  ON public.expenses FOR ALL
  USING ("userId" IS NULL OR "userId" = auth.uid()::text OR auth.role() = 'service_role' OR auth.role() = 'anon');

-- -------------------------------------------------------------
-- 3. ASSETS TABLE POLICIES
-- -------------------------------------------------------------
CREATE POLICY "Users can view own assets"
  ON public.assets FOR SELECT
  USING ("userId" IS NULL OR "userId" = auth.uid()::text OR auth.role() = 'service_role' OR auth.role() = 'anon');

CREATE POLICY "Users can manage own assets"
  ON public.assets FOR ALL
  USING ("userId" IS NULL OR "userId" = auth.uid()::text OR auth.role() = 'service_role' OR auth.role() = 'anon');

-- -------------------------------------------------------------
-- 4. DEBTS TABLE POLICIES
-- -------------------------------------------------------------
CREATE POLICY "Allow access to debts"
  ON public.debts FOR ALL
  USING (auth.role() IN ('authenticated', 'service_role', 'anon'));

-- -------------------------------------------------------------
-- 5. RECEIPTS TABLE POLICIES
-- -------------------------------------------------------------
CREATE POLICY "Allow access to receipts"
  ON public.receipts FOR ALL
  USING (auth.role() IN ('authenticated', 'service_role', 'anon'));

-- -------------------------------------------------------------
-- 6. BILL ITEMS TABLE POLICIES
-- -------------------------------------------------------------
CREATE POLICY "Allow access to bill items"
  ON public.bill_items FOR ALL
  USING (auth.role() IN ('authenticated', 'service_role', 'anon'));

-- -------------------------------------------------------------
-- 7. ACTION LOGS TABLE POLICIES
-- -------------------------------------------------------------
CREATE POLICY "Allow access to action logs"
  ON public.action_logs FOR ALL
  USING (auth.role() IN ('authenticated', 'service_role', 'anon'));
