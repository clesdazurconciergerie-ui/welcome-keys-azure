-- Clean up conflicting RLS policies on users table
-- Remove redundant deny_all policies and keep only the self-only policy

-- 1) Ensure RLS is enabled
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 2) Drop the conflicting deny_all policies
DROP POLICY IF EXISTS "deny_all_public_access" ON public.users;
DROP POLICY IF EXISTS "deny_all_unauthenticated_access" ON public.users;

-- 3) Drop any other potentially permissive policies
DROP POLICY IF EXISTS "Public read access" ON public.users;

-- 4) Ensure the self-only read policy exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'users'
      AND policyname = 'Users can view their own data'
  ) THEN
    CREATE POLICY "Users can view their own data"
      ON public.users
      FOR SELECT
      TO authenticated
      USING (auth.uid() = id);
  END IF;
END$$;

-- 5) Ensure the self-only update policy exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'users'
      AND policyname = 'Users can update their own data'
  ) THEN
    CREATE POLICY "Users can update their own data"
      ON public.users
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = id)
      WITH CHECK (auth.uid() = id);
  END IF;
END$$;

-- 6) Lock down explicit SQL privileges
REVOKE ALL ON TABLE public.users FROM PUBLIC;
REVOKE ALL ON TABLE public.users FROM anon;
GRANT SELECT, UPDATE ON TABLE public.users TO authenticated;