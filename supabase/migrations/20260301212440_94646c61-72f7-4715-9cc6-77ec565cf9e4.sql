
-- Fix invoices: inv_concierge must be PERMISSIVE to grant access
DROP POLICY IF EXISTS "inv_block_anon" ON public.invoices;
DROP POLICY IF EXISTS "inv_concierge" ON public.invoices;
DROP POLICY IF EXISTS "inv_owner_select" ON public.invoices;

-- PERMISSIVE: concierge owns the invoice
CREATE POLICY "inv_concierge"
  ON public.invoices
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- PERMISSIVE: owner can SELECT their invoices
CREATE POLICY "inv_owner_select"
  ON public.invoices
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM owners
    WHERE owners.id = invoices.owner_id
    AND owners.auth_user_id = auth.uid()
  ));

-- RESTRICTIVE: block anonymous
CREATE POLICY "inv_block_anon"
  ON public.invoices
  AS RESTRICTIVE
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Fix invoice_items: same pattern
DROP POLICY IF EXISTS "ii_block_anon" ON public.invoice_items;
DROP POLICY IF EXISTS "ii_via_invoice" ON public.invoice_items;
DROP POLICY IF EXISTS "ii_owner_select" ON public.invoice_items;

-- PERMISSIVE: access via invoice ownership
CREATE POLICY "ii_via_invoice"
  ON public.invoice_items
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM invoices
    WHERE invoices.id = invoice_items.invoice_id
    AND invoices.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM invoices
    WHERE invoices.id = invoice_items.invoice_id
    AND invoices.user_id = auth.uid()
  ));

-- PERMISSIVE: owner can SELECT
CREATE POLICY "ii_owner_select"
  ON public.invoice_items
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM invoices i
    JOIN owners o ON o.id = i.owner_id
    WHERE i.id = invoice_items.invoice_id
    AND o.auth_user_id = auth.uid()
  ));

-- RESTRICTIVE: block anonymous
CREATE POLICY "ii_block_anon"
  ON public.invoice_items
  AS RESTRICTIVE
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
