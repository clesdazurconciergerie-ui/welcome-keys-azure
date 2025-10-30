-- RLS Policy to prevent creating a second demo booklet
-- A user can only create ONE demo booklet, enforced at database level

DROP POLICY IF EXISTS "prevent_second_demo_booklet" ON public.booklets;

CREATE POLICY "prevent_second_demo_booklet"
ON public.booklets
FOR INSERT
TO authenticated
WITH CHECK (
  -- Allow non-demo booklets
  (is_demo = false)
  OR
  -- Allow first demo booklet only if user hasn't used demo yet
  (
    is_demo = true 
    AND NOT EXISTS (
      SELECT 1 
      FROM public.users 
      WHERE id = auth.uid() 
      AND has_used_demo = true
    )
  )
);

-- Add comment for documentation
COMMENT ON POLICY "prevent_second_demo_booklet" ON public.booklets IS 
'Prevents users from creating more than one demo booklet. Users can only create a demo booklet if has_used_demo is false.';