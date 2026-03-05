
-- Fix RLS: ci_owner must be PERMISSIVE (at least one permissive policy required)
DROP POLICY IF EXISTS ci_owner ON public.cash_incomes;
CREATE POLICY ci_owner ON public.cash_incomes
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
