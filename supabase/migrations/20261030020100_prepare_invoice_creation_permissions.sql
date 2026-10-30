-- PREPARATION ONLY: permissions are separated for independent review.
REVOKE ALL ON public.invoice_creation_drafts FROM anon, authenticated;
REVOKE ALL ON public.invoice_creation_idempotency FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.calculate_invoice_amounts(jsonb, boolean, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.prepare_invoice_creation_draft(uuid, uuid, integer, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_invoice_from_approved_draft(uuid, uuid, integer, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_invoice_creation_result(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.approve_invoice_creation_draft(uuid, integer, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_invoice_creation_draft_for_approval(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.validate_invoice_before_pdf(uuid) FROM PUBLIC, anon;

-- Close the legacy browser creation bypass. Existing read/update/delete flows
-- are deliberately not broadened or changed by this prepared migration.
REVOKE INSERT ON TABLE public.invoices FROM anon, authenticated;
REVOKE INSERT ON TABLE public.invoice_items FROM anon, authenticated;

GRANT EXECUTE ON FUNCTION public.prepare_invoice_creation_draft(uuid, uuid, integer, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_invoice_from_approved_draft(uuid, uuid, integer, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_invoice_creation_result(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.approve_invoice_creation_draft(uuid, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_invoice_creation_draft_for_approval(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_invoice_before_pdf(uuid) TO authenticated;

-- No general INSERT/UPDATE/DELETE is granted on the draft or idempotency tables.
-- Direct invoice INSERT is intentionally removed; creation must pass through
-- the atomic SECURITY DEFINER function via the Edge Function.
