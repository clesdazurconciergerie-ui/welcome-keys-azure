ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
-- Prepared locally only. No historical invoice is updated or published.
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS owner_published_at timestamptz;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS owner_published_by uuid;

-- Permissive legacy policies cannot reveal drafts through another read path.
DROP POLICY IF EXISTS invoice_owner_publication_gate ON public.invoices;
CREATE POLICY invoice_owner_publication_gate ON public.invoices AS RESTRICTIVE FOR SELECT TO authenticated
USING (user_id=auth.uid() OR (
  status IN ('sent','paid')
  AND (NOT COALESCE(company_snapshot ? 'approved_draft_fingerprint',false) OR owner_published_at IS NOT NULL)
));
DROP POLICY IF EXISTS invoice_item_owner_publication_gate ON public.invoice_items;
CREATE POLICY invoice_item_owner_publication_gate ON public.invoice_items AS RESTRICTIVE FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.invoices i WHERE i.id=invoice_items.invoice_id));

CREATE OR REPLACE FUNCTION public.invoice_owner_delivery_preview(p_invoice_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions,pg_temp AS $$
DECLARE v_invoice public.invoices%ROWTYPE; v_owner public.owners%ROWTYPE; v_lines jsonb; v_check jsonb; v_content jsonb; v_hash text;
BEGIN
  SELECT * INTO v_invoice FROM public.invoices WHERE id=p_invoice_id AND user_id=auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'invoice_not_found'; END IF;
  SELECT * INTO v_owner FROM public.owners WHERE id=v_invoice.owner_id AND concierge_user_id=v_invoice.user_id FOR SHARE;
  IF NOT FOUND OR v_owner.auth_user_id IS NULL THEN RAISE EXCEPTION 'invoice_owner_portal_not_linked'; END IF;
  IF v_invoice.status NOT IN ('draft','sent','paid') THEN RAISE EXCEPTION 'invoice_not_publishable'; END IF;
  PERFORM id FROM public.invoice_items WHERE invoice_id=p_invoice_id ORDER BY id FOR UPDATE;
  v_check:=public.validate_invoice_before_pdf(p_invoice_id);
  IF NOT COALESCE((v_check->>'valid')::boolean,false) THEN RAISE EXCEPTION 'invoice_totals_unreconciled'; END IF;
  SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.id),'[]'::jsonb) INTO v_lines FROM public.invoice_items x WHERE invoice_id=p_invoice_id;
  -- Status/paid_at/publication timestamp may evolve without changing the document.
  v_content:=(to_jsonb(v_invoice)-'status'-'paid_at'-'owner_published_at'-'owner_published_by'-'updated_at')||jsonb_build_object('lines',v_lines,'portal_auth_user_id',v_owner.auth_user_id);
  v_hash:=encode(digest(convert_to(v_content::text,'UTF8'),'sha256'),'hex');
  RETURN jsonb_build_object('invoice_id',v_invoice.id,'invoice_number',v_invoice.invoice_number,'owner_id',v_owner.id,
    'owner_name',concat_ws(' ',v_owner.first_name,v_owner.last_name),'total',v_invoice.total,'fingerprint',v_hash,
    'published_at',v_invoice.owner_published_at,'destination','owner_portal','email_sent',false);
END $$;

-- One explicit click with the exact preview fingerprint publishes the document.
-- A replay returns the same publication; no email or PDF job is started.
CREATE OR REPLACE FUNCTION public.publish_invoice_to_owner(p_invoice_id uuid,p_fingerprint text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_preview jsonb; v_when timestamptz;
BEGIN
  v_preview:=public.invoice_owner_delivery_preview(p_invoice_id);
  IF p_fingerprint IS NULL OR p_fingerprint IS DISTINCT FROM v_preview->>'fingerprint' THEN RAISE EXCEPTION 'invoice_publication_changed'; END IF;
  UPDATE public.invoices SET owner_published_at=COALESCE(owner_published_at,now()),
      owner_published_by=COALESCE(owner_published_by,auth.uid()),status=CASE WHEN status='draft' THEN 'sent' ELSE status END
  WHERE id=p_invoice_id AND user_id=auth.uid() RETURNING owner_published_at INTO v_when;
  RETURN v_preview||jsonb_build_object('state','published','published_at',v_when,'destination','owner_portal','email_sent',false,'pdf_generated',false);
END $$;

REVOKE ALL ON FUNCTION public.invoice_owner_delivery_preview(uuid) FROM PUBLIC,anon,service_role;
REVOKE ALL ON FUNCTION public.publish_invoice_to_owner(uuid,text) FROM PUBLIC,anon,service_role;
GRANT EXECUTE ON FUNCTION public.invoice_owner_delivery_preview(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.publish_invoice_to_owner(uuid,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.validate_invoice_before_pdf(
  p_invoice_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_invoice public.invoices%ROWTYPE;
  v_item_count integer;
  v_subtotal numeric;
  v_vat numeric;
BEGIN
  SELECT * INTO v_invoice FROM public.invoices
  WHERE id = p_invoice_id AND (user_id = auth.uid() OR (
    status IN ('sent','paid') AND (NOT COALESCE(company_snapshot ? 'approved_draft_fingerprint',false) OR owner_published_at IS NOT NULL)
    AND EXISTS (SELECT 1 FROM public.owners o WHERE o.id=invoices.owner_id AND o.auth_user_id=auth.uid())
  ));
  IF NOT FOUND THEN RAISE EXCEPTION 'invoice_not_found'; END IF;

  SELECT count(*), COALESCE(sum(total), 0), COALESCE(sum(vat_amount), 0)
  INTO v_item_count, v_subtotal, v_vat
  FROM public.invoice_items WHERE invoice_id = p_invoice_id;

  RETURN jsonb_build_object(
    'valid', v_item_count > 0
      AND round(v_subtotal, 2) = round(COALESCE(v_invoice.subtotal, 0), 2)
      AND round(v_vat, 2) = round(COALESCE(v_invoice.vat_amount, 0), 2)
      AND round(v_subtotal + v_vat, 2) = round(COALESCE(v_invoice.total, 0), 2),
    'invoice_id', p_invoice_id,
    'item_count', v_item_count,
    'stored_subtotal_cents', round(COALESCE(v_invoice.subtotal, 0) * 100)::bigint,
    'lines_subtotal_cents', round(v_subtotal * 100)::bigint,
    'stored_vat_cents', round(COALESCE(v_invoice.vat_amount, 0) * 100)::bigint,
    'lines_vat_cents', round(v_vat * 100)::bigint,
    'stored_total_cents', round(COALESCE(v_invoice.total, 0) * 100)::bigint,
    'lines_total_cents', round((v_subtotal + v_vat) * 100)::bigint,
    'calculation_version', v_invoice.company_snapshot->>'calculation_version'
  );
END;
$$;

