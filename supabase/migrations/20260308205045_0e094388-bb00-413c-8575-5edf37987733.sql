-- Fix: Both existing policies are RESTRICTIVE, meaning no PERMISSIVE policy exists
-- so ALL operations are denied. We need to drop the restrictive owner policy
-- and recreate it as PERMISSIVE.

DROP POLICY "vp_owner" ON public.vendor_payments;

CREATE POLICY "vp_owner" ON public.vendor_payments
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());