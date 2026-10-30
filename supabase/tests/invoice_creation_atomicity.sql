-- Run on an isolated/local database only, after the prepared migrations.
-- Covers atomic creation, double click, lost response and rollback on line failure.
BEGIN;

DO $$
DECLARE
  v_user uuid := '10000000-0000-4000-8000-000000000001';
  v_owner uuid := '10000000-0000-4000-8000-000000000002';
  v_property uuid := '10000000-0000-4000-8000-000000000003';
  v_draft jsonb;
  v_approval jsonb;
  v_created jsonb;
  v_recovered jsonb;
  v_validation jsonb;
  v_counter integer;
BEGIN
  INSERT INTO public.financial_settings (
    user_id, company_name, vat_enabled, invoice_prefix, next_invoice_number, invoice_rounding_policy
  ) VALUES (v_user, 'Fixture', true, 'TEST', 41, 'line_half_up_v1');
  INSERT INTO public.owners (id, concierge_user_id, first_name, last_name, email, status)
  VALUES (v_owner, v_user, 'Propriétaire', 'Fixture', 'fixture@example.invalid', 'active');
  INSERT INTO public.properties (id, user_id, name, status)
  VALUES (v_property, v_user, 'Logement fixture', 'active');
  INSERT INTO public.owner_properties (owner_id, property_id) VALUES (v_owner, v_property);

  v_draft := public.prepare_invoice_creation_draft(v_user, NULL, NULL, jsonb_build_object(
    'owner_id', v_owner, 'issue_date', '2026-09-14', 'due_date', '2026-10-14',
    'period_start', '2026-09-01', 'period_end', '2026-09-30',
    'type', 'invoice', 'currency', 'EUR',
    'lines', jsonb_build_array(
      jsonb_build_object(
        'line_id', '10000000-0000-4000-8000-000000000011',
        'booking_id', NULL, 'property_id', v_property,
        'line_type', 'commission', 'description', 'Commission fixture',
        'quantity', '1', 'unit_price', '654.85', 'vat_rate', '20.00'
      ),
      jsonb_build_object(
        'line_id', '10000000-0000-4000-8000-000000000012',
        'booking_id', NULL, 'property_id', v_property,
        'line_type', 'pass_through_cost', 'description', 'Frais fixture',
        'quantity', '1', 'unit_price', '186.94', 'vat_rate', '0.00'
      )
    )
  ));

  PERFORM set_config('request.jwt.claim.sub', v_user::text, true);
  v_approval := public.approve_invoice_creation_draft(
    (v_draft->>'draft_id')::uuid, (v_draft->>'version')::integer, v_draft->>'fingerprint'
  );
  v_created := public.create_invoice_from_approved_draft(
    v_user, (v_draft->>'draft_id')::uuid, (v_draft->>'version')::integer,
    v_draft->>'fingerprint', 'fixture:invoice:create:00000001'
  );

  IF (SELECT count(*) FROM public.invoices WHERE id = (v_created->>'invoice_id')::uuid) <> 1
    OR (SELECT count(*) FROM public.invoice_items WHERE invoice_id = (v_created->>'invoice_id')::uuid) <> 2
  THEN RAISE EXCEPTION 'atomic invoice fixture incomplete'; END IF;
  IF v_created->>'invoice_number' <> 'TEST-2026-041' THEN
    RAISE EXCEPTION 'numbering fixture failed: %', v_created;
  END IF;

  -- Every PDF operation is allowed only while the durable invoice and its lines reconcile.
  v_validation := public.validate_invoice_before_pdf((v_created->>'invoice_id')::uuid);
  IF NOT (v_validation->>'valid')::boolean THEN
    RAISE EXCEPTION 'fresh atomic invoice unexpectedly failed PDF validation: %', v_validation;
  END IF;
  BEGIN
    UPDATE public.invoice_items SET total = total + 1
    WHERE invoice_id = (v_created->>'invoice_id')::uuid;
    v_validation := public.validate_invoice_before_pdf((v_created->>'invoice_id')::uuid);
    IF (v_validation->>'valid')::boolean THEN
      RAISE EXCEPTION 'inconsistent invoice unexpectedly passed PDF validation';
    END IF;
    RAISE EXCEPTION 'qa_restore_pdf_fixture';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'qa_restore_pdf_fixture' THEN RAISE; END IF;
  END;
  v_validation := public.validate_invoice_before_pdf((v_created->>'invoice_id')::uuid);
  IF NOT (v_validation->>'valid')::boolean THEN
    RAISE EXCEPTION 'PDF fixture was not restored by subtransaction';
  END IF;

  -- Double click: the same key returns the same durable result, not a second invoice.
  v_recovered := public.create_invoice_from_approved_draft(
    v_user, (v_draft->>'draft_id')::uuid, (v_draft->>'version')::integer,
    v_draft->>'fingerprint', 'fixture:invoice:create:00000001'
  );
  IF v_recovered IS DISTINCT FROM v_created THEN RAISE EXCEPTION 'idempotent replay mismatch'; END IF;

  -- Lost response: lookup by key recovers exactly the created result.
  v_recovered := public.get_invoice_creation_result(v_user, 'fixture:invoice:create:00000001');
  IF v_recovered IS DISTINCT FROM v_created THEN RAISE EXCEPTION 'lost response recovery mismatch'; END IF;

  -- A different key cannot create the same approved draft again.
  BEGIN
    PERFORM public.create_invoice_from_approved_draft(
      v_user, (v_draft->>'draft_id')::uuid, (v_draft->>'version')::integer,
      v_draft->>'fingerprint', 'fixture:invoice:create:00000002'
    );
    RAISE EXCEPTION 'second key should have failed';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'second key should have failed' THEN RAISE; END IF;
  END;

  SELECT next_invoice_number INTO v_counter FROM public.financial_settings WHERE user_id = v_user;
  IF v_counter <> 42 THEN RAISE EXCEPTION 'counter incremented more than once: %', v_counter; END IF;
END;
$$;

CREATE OR REPLACE FUNCTION pg_temp.fail_fixture_invoice_line()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'fixture_line_failure';
END;
$$;

CREATE TRIGGER fixture_fail_invoice_line
BEFORE INSERT ON public.invoice_items
FOR EACH ROW WHEN (NEW.description = 'FAIL')
EXECUTE FUNCTION pg_temp.fail_fixture_invoice_line();

DO $$
DECLARE
  v_user uuid := '10000000-0000-4000-8000-000000000001';
  v_owner uuid := '10000000-0000-4000-8000-000000000002';
  v_property uuid := '10000000-0000-4000-8000-000000000003';
  v_draft jsonb;
  v_invoice_count integer;
  v_counter integer;
BEGIN
  SELECT count(*) INTO v_invoice_count FROM public.invoices WHERE user_id = v_user;
  SELECT next_invoice_number INTO v_counter FROM public.financial_settings WHERE user_id = v_user;
  v_draft := public.prepare_invoice_creation_draft(v_user, NULL, NULL, jsonb_build_object(
    'owner_id', v_owner, 'issue_date', '2026-09-15', 'due_date', NULL,
    'period_start', '2026-09-01', 'period_end', '2026-09-30',
    'type', 'invoice', 'currency', 'EUR',
    'lines', jsonb_build_array(jsonb_build_object(
      'line_id', '10000000-0000-4000-8000-000000000013',
      'booking_id', NULL, 'property_id', v_property,
      'line_type', 'service', 'description', 'FAIL',
      'quantity', '1', 'unit_price', '10.00', 'vat_rate', '20.00'
    ))
  ));
  PERFORM set_config('request.jwt.claim.sub', v_user::text, true);
  PERFORM public.approve_invoice_creation_draft(
    (v_draft->>'draft_id')::uuid, (v_draft->>'version')::integer, v_draft->>'fingerprint'
  );

  BEGIN
    PERFORM public.create_invoice_from_approved_draft(
      v_user, (v_draft->>'draft_id')::uuid, (v_draft->>'version')::integer,
      v_draft->>'fingerprint', 'fixture:invoice:create:failure01'
    );
    RAISE EXCEPTION 'intermediate failure should have aborted';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'intermediate failure should have aborted' THEN RAISE; END IF;
  END;

  IF (SELECT count(*) FROM public.invoices WHERE user_id = v_user) <> v_invoice_count THEN
    RAISE EXCEPTION 'invoice survived intermediate failure';
  END IF;
  IF (SELECT next_invoice_number FROM public.financial_settings WHERE user_id = v_user) <> v_counter THEN
    RAISE EXCEPTION 'counter changed after rollback';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.invoice_creation_idempotency
    WHERE user_id = v_user AND idempotency_key = 'fixture:invoice:create:failure01'
  ) THEN RAISE EXCEPTION 'idempotency result survived failed transaction'; END IF;
END;
$$;

ROLLBACK;

-- Concurrency is intentionally a separate two-session test: both sessions prepare
-- and approve a different draft, then call create simultaneously. Acceptance:
-- two complete invoices, two unique consecutive numbers, counter +2, no orphan line.
