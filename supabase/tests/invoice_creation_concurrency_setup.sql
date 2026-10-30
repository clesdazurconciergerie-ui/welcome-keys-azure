-- Disposable database only. Leaves fixture rows for the two-session runner.
CREATE TABLE IF NOT EXISTS public.qa_invoice_concurrency_cases (
  case_name text PRIMARY KEY,
  draft_id uuid NOT NULL,
  version integer NOT NULL,
  fingerprint text NOT NULL,
  idempotency_key text NOT NULL,
  started_at timestamptz,
  finished_at timestamptz,
  result jsonb
);

CREATE OR REPLACE FUNCTION public.qa_create_invoice_concurrent(p_case_name text)
RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE c public.qa_invoice_concurrency_cases%ROWTYPE; r jsonb;
BEGIN
  PERFORM pg_advisory_lock_shared(724602);
  SELECT * INTO c FROM public.qa_invoice_concurrency_cases WHERE case_name = p_case_name;
  UPDATE public.qa_invoice_concurrency_cases SET started_at = clock_timestamp() WHERE case_name = p_case_name;
  r := public.create_invoice_from_approved_draft(
    '30000000-0000-4000-8000-000000000001', c.draft_id, c.version, c.fingerprint, c.idempotency_key
  );
  UPDATE public.qa_invoice_concurrency_cases SET finished_at = clock_timestamp(), result = r WHERE case_name = p_case_name;
  PERFORM pg_advisory_unlock_shared(724602);
  RETURN r;
END;
$$;

DO $$
DECLARE
  u uuid := '30000000-0000-4000-8000-000000000001';
  o uuid := '30000000-0000-4000-8000-000000000002';
  p uuid := '30000000-0000-4000-8000-000000000003';
  d jsonb;
  n integer;
BEGIN
  INSERT INTO public.financial_settings (user_id, company_name, vat_enabled, invoice_prefix, next_invoice_number, invoice_rounding_policy)
  VALUES (u, 'Concurrency', true, 'CC', 70, 'line_half_up_v1');
  INSERT INTO public.owners (id, concierge_user_id, first_name, updated_at) VALUES (o, u, 'Concurrent', now());
  INSERT INTO public.properties (id, user_id, name) VALUES (p, u, 'Concurrent property');
  INSERT INTO public.owner_properties VALUES (o, p);
  PERFORM set_config('request.jwt.claim.sub', u::text, true);

  FOR n IN 1..2 LOOP
    d := public.prepare_invoice_creation_draft(u, NULL, NULL, jsonb_build_object(
      'owner_id', o, 'issue_date', '2026-09-14', 'due_date', null,
      'period_start', '2026-09-01', 'period_end', '2026-09-30', 'type', 'invoice', 'currency', 'EUR',
      'lines', jsonb_build_array(jsonb_build_object(
        'line_id', CASE n WHEN 1 THEN '30000000-0000-4000-8000-000000000011' ELSE '30000000-0000-4000-8000-000000000012' END,
        'booking_id', null, 'property_id', p, 'line_type', 'service', 'description', 'Concurrent ' || n,
        'quantity', '1', 'unit_price', (10 + n)::text, 'vat_rate', '20.00'
      ))
    ));
    PERFORM public.approve_invoice_creation_draft((d->>'draft_id')::uuid, (d->>'version')::integer, d->>'fingerprint');
    INSERT INTO public.qa_invoice_concurrency_cases VALUES (
      'case' || n, (d->>'draft_id')::uuid, (d->>'version')::integer, d->>'fingerprint',
      'fixture:concurrency:create:0000000' || n, NULL, NULL, NULL
    );
  END LOOP;
END;
$$;
