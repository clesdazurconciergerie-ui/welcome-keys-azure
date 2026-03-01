
-- Fix: fs_owner must be PERMISSIVE (not RESTRICTIVE) to actually grant access.
-- RESTRICTIVE-only = always denied. We need one PERMISSIVE + one RESTRICTIVE.

-- Drop both existing policies
DROP POLICY IF EXISTS "fs_block_anon" ON public.financial_settings;
DROP POLICY IF EXISTS "fs_owner" ON public.financial_settings;

-- Re-create fs_owner as PERMISSIVE (grants access when user_id matches)
CREATE POLICY "fs_owner"
  ON public.financial_settings
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Re-create fs_block_anon as RESTRICTIVE (blocks anonymous access)
CREATE POLICY "fs_block_anon"
  ON public.financial_settings
  AS RESTRICTIVE
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Ensure unique constraint on user_id exists (for upsert onConflict)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'financial_settings_user_id_key'
  ) THEN
    ALTER TABLE public.financial_settings ADD CONSTRAINT financial_settings_user_id_key UNIQUE (user_id);
  END IF;
END $$;
