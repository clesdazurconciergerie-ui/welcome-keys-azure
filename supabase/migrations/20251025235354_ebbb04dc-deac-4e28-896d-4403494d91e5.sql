-- ✅ Enable RLS on all public tables and add missing policies

-- 1️⃣ Enable RLS on all public tables
DO $$
DECLARE 
    r RECORD;
BEGIN
  FOR r IN 
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', r.tablename);
  END LOOP;
END $$;

-- 2️⃣ Add RLS policies for user_roles table
-- Users can view their own roles
DROP POLICY IF EXISTS "users_view_own_roles" ON public.user_roles;
CREATE POLICY "users_view_own_roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Only service role can insert/update/delete roles (via edge functions)
DROP POLICY IF EXISTS "service_manage_roles" ON public.user_roles;
CREATE POLICY "service_manage_roles"
  ON public.user_roles
  FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);

-- 3️⃣ Add RLS policies for _signup_errors (diagnostic table)
-- Only accessible via service role (no client access)
DROP POLICY IF EXISTS "no_client_access_errors" ON public._signup_errors;
CREATE POLICY "no_client_access_errors"
  ON public._signup_errors
  FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);

-- 4️⃣ Verify RLS is enabled on all tables
-- This query will show the status (for logging purposes)
DO $$
DECLARE
  r RECORD;
  disabled_count INTEGER := 0;
BEGIN
  FOR r IN 
    SELECT 
      c.relname AS table_name,
      c.relrowsecurity AS rls_enabled
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' 
      AND c.relkind = 'r'
      AND NOT c.relrowsecurity
  LOOP
    disabled_count := disabled_count + 1;
    RAISE NOTICE 'Table % still has RLS disabled!', r.table_name;
  END LOOP;
  
  IF disabled_count = 0 THEN
    RAISE NOTICE '✅ All public tables have RLS enabled';
  ELSE
    RAISE WARNING '⚠️ % table(s) still have RLS disabled', disabled_count;
  END IF;
END $$;