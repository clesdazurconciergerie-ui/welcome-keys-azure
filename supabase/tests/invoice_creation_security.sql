-- Run only on the disposable QA database after fixture schema + migrations.
BEGIN;

DO $$
DECLARE
  u1 uuid := '20000000-0000-4000-8000-000000000001';
  u2 uuid := '20000000-0000-4000-8000-000000000002';
  o1 uuid := '20000000-0000-4000-8000-000000000011';
  o2 uuid := '20000000-0000-4000-8000-000000000012';
  p1 uuid := '20000000-0000-4000-8000-000000000021';
  p2 uuid := '20000000-0000-4000-8000-000000000022';
  d1 jsonb;
  d2 jsonb;
BEGIN
  INSERT INTO public.financial_settings (user_id, company_name, vat_enabled, invoice_prefix, next_invoice_number, invoice_rounding_policy)
  VALUES (u1, 'U1', true, 'U1', 1, 'line_half_up_v1'), (u2, 'U2', true, 'U2', 1, 'line_half_up_v1');
  INSERT INTO public.owners (id, concierge_user_id, first_name, updated_at)
  VALUES (o1, u1, 'Owner 1', now()), (o2, u2, 'Owner 2', now());
  INSERT INTO public.properties (id, user_id, name) VALUES (p1, u1, 'P1'), (p2, u2, 'P2');
  INSERT INTO public.owner_properties VALUES (o1, p1), (o2, p2);

  d1 := public.prepare_invoice_creation_draft(u1, NULL, NULL, jsonb_build_object(
    'owner_id', o1, 'issue_date', '2026-09-14', 'due_date', null,
    'period_start', '2026-09-01', 'period_end', '2026-09-30', 'type', 'invoice', 'currency', 'EUR',
    'lines', jsonb_build_array(jsonb_build_object(
      'line_id', '20000000-0000-4000-8000-000000000031', 'booking_id', null, 'property_id', p1,
      'line_type', 'service', 'description', 'V1', 'quantity', '1', 'unit_price', '10.00', 'vat_rate', '20.00'
    ))
  ));
  d2 := public.prepare_invoice_creation_draft(
    u1, (d1->>'draft_id')::uuid, (d1->>'version')::integer,
    (d1->'input') || jsonb_build_object('lines', jsonb_build_array(jsonb_build_object(
      'line_id', '20000000-0000-4000-8000-000000000032', 'booking_id', null, 'property_id', p1,
      'line_type', 'service', 'description', 'V2', 'quantity', '1', 'unit_price', '11.00', 'vat_rate', '20.00'
    )))
  );

  PERFORM set_config('request.jwt.claim.sub', u1::text, true);
  BEGIN
    PERFORM public.approve_invoice_creation_draft((d1->>'draft_id')::uuid, (d1->>'version')::integer, d1->>'fingerprint');
    RAISE EXCEPTION 'stale version approval should fail';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'stale version approval should fail' THEN RAISE; END IF;
    IF SQLERRM NOT LIKE '%invoice_approval_version_mismatch%' THEN RAISE; END IF;
  END;

  PERFORM set_config('request.jwt.claim.sub', u2::text, true);
  IF public.get_invoice_creation_draft_for_approval((d2->>'draft_id')::uuid) IS NOT NULL THEN
    RAISE EXCEPTION 'other user read another draft';
  END IF;
  BEGIN
    PERFORM public.approve_invoice_creation_draft((d2->>'draft_id')::uuid, (d2->>'version')::integer, d2->>'fingerprint');
    RAISE EXCEPTION 'other user approval should fail';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'other user approval should fail' THEN RAISE; END IF;
    IF SQLERRM NOT LIKE '%invoice_draft_not_found%' THEN RAISE; END IF;
  END;

  -- Even an approved version is stale if a snapshotted business source changes.
  PERFORM set_config('request.jwt.claim.sub', u1::text, true);
  PERFORM public.approve_invoice_creation_draft(
    (d2->>'draft_id')::uuid, (d2->>'version')::integer, d2->>'fingerprint'
  );
  UPDATE public.owners SET updated_at = clock_timestamp() WHERE id = o1;
  BEGIN
    PERFORM public.create_invoice_from_approved_draft(
      u1, (d2->>'draft_id')::uuid, (d2->>'version')::integer,
      d2->>'fingerprint', 'fixture:stale-source:create:0001'
    );
    RAISE EXCEPTION 'changed source should block creation';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'changed source should block creation' THEN RAISE; END IF;
    IF SQLERRM NOT LIKE '%invoice_source_changed_after_approval%' THEN RAISE; END IF;
  END;

  BEGIN
    PERFORM public.prepare_invoice_creation_draft(u1, NULL, NULL, jsonb_build_object(
      'owner_id', o1, 'issue_date', '2026-09-14', 'due_date', null,
      'period_start', '2026-09-01', 'period_end', '2026-09-30', 'type', 'invoice', 'currency', 'EUR',
      'lines', jsonb_build_array(jsonb_build_object(
        'line_id', '20000000-0000-4000-8000-000000000033', 'booking_id', null, 'property_id', p2,
        'line_type', 'service', 'description', 'Wrong scope', 'quantity', '1', 'unit_price', '10.00', 'vat_rate', '20.00'
      ))
    ));
    RAISE EXCEPTION 'out of scope property should fail';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'out of scope property should fail' THEN RAISE; END IF;
    IF SQLERRM NOT LIKE '%invoice_property_out_of_scope%' THEN RAISE; END IF;
  END;
END;
$$;

DO $$
BEGIN
  IF has_table_privilege('authenticated', 'public.invoices', 'INSERT') THEN
    RAISE EXCEPTION 'authenticated still has direct invoice insert';
  END IF;
  IF has_table_privilege('authenticated', 'public.invoice_items', 'INSERT') THEN
    RAISE EXCEPTION 'authenticated still has direct invoice item insert';
  END IF;
  IF has_function_privilege('authenticated', 'public.create_invoice_from_approved_draft(uuid,uuid,integer,text,text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'authenticated can bypass Edge creation';
  END IF;
  IF NOT has_function_privilege('authenticated', 'public.approve_invoice_creation_draft(uuid,integer,text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'authenticated cannot approve own exact draft';
  END IF;
END;
$$;

SET LOCAL ROLE authenticated;
DO $$
BEGIN
  BEGIN
    INSERT INTO public.invoices (
      user_id, owner_id, invoice_number, issue_date, period_start, period_end
    ) VALUES (
      '20000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000011',
      'BYPASS-1', '2026-09-14', '2026-09-01', '2026-09-30'
    );
    RAISE EXCEPTION 'legacy direct insert unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END;
$$;
RESET ROLE;

ROLLBACK;
