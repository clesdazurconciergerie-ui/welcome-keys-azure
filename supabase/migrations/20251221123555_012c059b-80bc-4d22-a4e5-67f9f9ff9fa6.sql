-- ============================================
-- FIX: Policies pour bloquer les écritures sur plans
-- INSERT: WITH CHECK seulement
-- UPDATE/DELETE: USING seulement  
-- ============================================

DROP POLICY IF EXISTS "plans_no_client_write" ON public.plans;

-- INSERT: seulement WITH CHECK (pas de USING)
CREATE POLICY "plans_block_insert" ON public.plans
  AS RESTRICTIVE
  FOR INSERT
  WITH CHECK (false);

-- UPDATE: USING + WITH CHECK
CREATE POLICY "plans_block_update" ON public.plans
  AS RESTRICTIVE
  FOR UPDATE
  USING (false)
  WITH CHECK (false);

-- DELETE: seulement USING (pas de WITH CHECK)
CREATE POLICY "plans_block_delete" ON public.plans
  AS RESTRICTIVE
  FOR DELETE
  USING (false);