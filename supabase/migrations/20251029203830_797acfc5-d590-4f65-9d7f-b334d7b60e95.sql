-- Fix privacy bug: Clean up and consolidate RLS policies on booklets table
-- Remove duplicate policies and ensure strict owner-only access

-- Drop all existing SELECT policies on booklets (we'll recreate a single clean one)
DROP POLICY IF EXISTS "Users can view their own booklets" ON public.booklets;
DROP POLICY IF EXISTS "owner_select" ON public.booklets;
DROP POLICY IF EXISTS "Hide expired demo booklets from public access" ON public.booklets;

-- Drop duplicate UPDATE policy
DROP POLICY IF EXISTS "owner_update" ON public.booklets;

-- Create single, clear SELECT policy for owner access
CREATE POLICY "booklets_owner_select"
ON public.booklets
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() 
  AND 
  -- Hide expired demo booklets
  CASE
    WHEN (is_demo = true AND demo_expires_at < now()) THEN false
    ELSE true
  END
);

-- Create single UPDATE policy for owner access
CREATE POLICY "booklets_owner_update"
ON public.booklets
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Ensure DELETE policy is clean (keep existing one, just verify it's correct)
DROP POLICY IF EXISTS "Users can delete their own booklets" ON public.booklets;
CREATE POLICY "booklets_owner_delete"
ON public.booklets
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Keep the INSERT policy with quota check (it's good as is)
-- Just ensure it's the only INSERT policy
DROP POLICY IF EXISTS "insert_with_quota" ON public.booklets;
CREATE POLICY "booklets_owner_insert"
ON public.booklets
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() AND can_create_booklet(auth.uid()));

-- Verify RLS is enabled
ALTER TABLE public.booklets ENABLE ROW LEVEL SECURITY;

-- Add comment for documentation
COMMENT ON TABLE public.booklets IS 'Booklets are strictly scoped to their owner via RLS. All policies enforce user_id = auth.uid().';