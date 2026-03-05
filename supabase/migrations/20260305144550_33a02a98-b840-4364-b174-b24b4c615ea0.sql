
-- Fix: co_owner must be PERMISSIVE (need at least one permissive policy for access)
DROP POLICY IF EXISTS co_owner ON public.calendar_overrides;
CREATE POLICY co_owner ON public.calendar_overrides
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Also make co_owner_select permissive for owners
DROP POLICY IF EXISTS co_owner_select ON public.calendar_overrides;
CREATE POLICY co_owner_select ON public.calendar_overrides
  FOR SELECT
  TO authenticated
  USING (is_owner_of_property(auth.uid(), property_id));
