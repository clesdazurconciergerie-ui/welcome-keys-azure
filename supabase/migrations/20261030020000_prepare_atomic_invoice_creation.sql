-- PREPARATION ONLY: do not apply without a production backup and explicit approval.
-- Existing invoices are never updated by this migration.

ALTER TABLE public.financial_settings
  ADD COLUMN IF NOT EXISTS invoice_rounding_policy text;

ALTER TABLE public.invoice_items
  ADD COLUMN IF NOT EXISTS vat_amount numeric(12,2);

CREATE TABLE IF NOT EXISTS public.invoice_creation_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  version integer NOT NULL DEFAULT 1 CHECK (version >= 1),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'created', 'expired')),
  input jsonb NOT NULL,
  calculation jsonb NOT NULL,
  source_versions jsonb NOT NULL,
  fingerprint text NOT NULL CHECK (fingerprint ~ '^[0-9a-f]{64}$'),
  approved_version integer,
  approved_fingerprint text,
  approved_at timestamptz,
  approved_by uuid,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_invoice_id uuid REFERENCES public.invoices(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (status = 'approved' AND approved_version = version AND approved_fingerprint = fingerprint AND approved_at IS NOT NULL)
    OR status <> 'approved'
  )
);

CREATE TABLE IF NOT EXISTS public.invoice_creation_idempotency (
  user_id uuid NOT NULL,
  idempotency_key text NOT NULL CHECK (idempotency_key ~ '^[A-Za-z0-9._:-]{20,128}$'),
  draft_id uuid NOT NULL REFERENCES public.invoice_creation_drafts(id),
  draft_version integer NOT NULL,
  fingerprint text NOT NULL CHECK (fingerprint ~ '^[0-9a-f]{64}$'),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id),
  result jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, idempotency_key),
  UNIQUE (draft_id)
);

CREATE INDEX IF NOT EXISTS idx_invoice_creation_drafts_user_status
  ON public.invoice_creation_drafts(user_id, status, updated_at DESC);

-- Preserve legacy duplicate rows unchanged. New approved invoices are unique,
-- and the trigger also refuses collisions with every historical number.
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_user_number
  ON public.invoices(user_id, invoice_number)
  WHERE company_snapshot ? 'approved_draft_fingerprint';

CREATE OR REPLACE FUNCTION public.guard_invoice_number_uniqueness()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.user_id IS NOT DISTINCT FROM OLD.user_id
       AND NEW.invoice_number IS NOT DISTINCT FROM OLD.invoice_number THEN RETURN NEW; END IF;
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.user_id::text, 0));
  IF EXISTS (SELECT 1 FROM public.invoices i WHERE i.user_id = NEW.user_id
       AND i.invoice_number = NEW.invoice_number AND i.id <> NEW.id) THEN
    RAISE EXCEPTION 'invoice_number_already_exists' USING ERRCODE = '23505';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_invoice_number_uniqueness() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER trg_guard_invoice_number_uniqueness
  BEFORE INSERT OR UPDATE OF user_id, invoice_number ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.guard_invoice_number_uniqueness();

ALTER TABLE public.invoice_creation_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_creation_idempotency ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.calculate_invoice_amounts(
  p_lines jsonb,
  p_vat_enabled boolean,
  p_rounding_policy text
) RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_line jsonb;
  v_lines jsonb := '[]'::jsonb;
  v_quantity numeric;
  v_unit_price numeric;
  v_vat_rate numeric;
  v_line_net numeric;
  v_line_vat numeric;
  v_subtotal_cents bigint := 0;
  v_vat_cents bigint := 0;
  v_rate_bps integer;
  v_first_rate integer;
  v_mixed_rates boolean := false;
BEGIN
  IF p_rounding_policy IS NULL THEN
    RAISE EXCEPTION 'invoice_rounding_policy_not_configured';
  END IF;
  IF p_rounding_policy <> 'line_half_up_v1' THEN
    RAISE EXCEPTION 'invoice_rounding_policy_unsupported';
  END IF;
  IF jsonb_typeof(p_lines) <> 'array' OR jsonb_array_length(p_lines) = 0 OR jsonb_array_length(p_lines) > 100 THEN
    RAISE EXCEPTION 'invoice_lines_invalid';
  END IF;

  FOR v_line IN SELECT value FROM jsonb_array_elements(p_lines)
  LOOP
    IF COALESCE(v_line->>'quantity', '') !~ '^(0|[1-9][0-9]{0,5})(\.[0-9]{1,4})?$'
      OR COALESCE(v_line->>'unit_price', '') !~ '^-?(0|[1-9][0-9]{0,9})(\.[0-9]{1,2})?$'
      OR COALESCE(v_line->>'vat_rate', '') !~ '^(0|[1-9][0-9]{0,2})(\.[0-9]{1,2})?$'
    THEN
      RAISE EXCEPTION 'invoice_line_decimal_invalid';
    END IF;

    v_quantity := (v_line->>'quantity')::numeric;
    v_unit_price := (v_line->>'unit_price')::numeric;
    v_vat_rate := CASE WHEN p_vat_enabled THEN (v_line->>'vat_rate')::numeric ELSE 0 END;
    IF v_quantity <= 0 OR v_vat_rate < 0 OR v_vat_rate > 100 THEN
      RAISE EXCEPTION 'invoice_line_value_invalid';
    END IF;

    -- Exact NUMERIC arithmetic. The configured policy rounds net per line, then
    -- VAT per line, both to cents. No JavaScript Number participates.
    v_line_net := round(v_quantity * v_unit_price, 2);
    v_line_vat := round(v_line_net * v_vat_rate / 100, 2);
    v_rate_bps := round(v_vat_rate * 100)::integer;
    v_subtotal_cents := v_subtotal_cents + round(v_line_net * 100)::bigint;
    v_vat_cents := v_vat_cents + round(v_line_vat * 100)::bigint;

    IF v_first_rate IS NULL THEN v_first_rate := v_rate_bps;
    ELSIF v_first_rate <> v_rate_bps THEN v_mixed_rates := true;
    END IF;

    v_lines := v_lines || jsonb_build_array(
      (v_line - 'unit_price' - 'vat_rate') || jsonb_build_object(
        'quantity', to_char(v_quantity, 'FM999999990.0000'),
        'unit_price_cents', round(v_unit_price * 100)::bigint,
        'vat_rate_bps', v_rate_bps,
        'net_cents', round(v_line_net * 100)::bigint,
        'vat_cents', round(v_line_vat * 100)::bigint,
        'gross_cents', round((v_line_net + v_line_vat) * 100)::bigint
      )
    );
  END LOOP;

  RETURN jsonb_build_object(
    'calculation_version', 'invoice_amounts_v1',
    'rounding_policy', p_rounding_policy,
    'currency', 'EUR',
    'lines', v_lines,
    'subtotal_cents', v_subtotal_cents,
    'vat_cents', v_vat_cents,
    'total_cents', v_subtotal_cents + v_vat_cents,
    'header_vat_rate_bps', CASE WHEN v_mixed_rates THEN NULL ELSE v_first_rate END
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.prepare_invoice_creation_draft(
  p_user_id uuid,
  p_draft_id uuid,
  p_expected_version integer,
  p_input jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_settings public.financial_settings%ROWTYPE;
  v_owner public.owners%ROWTYPE;
  v_existing public.invoice_creation_drafts%ROWTYPE;
  v_line jsonb;
  v_version integer := 1;
  v_calculation jsonb;
  v_source_versions jsonb;
  v_fingerprint text;
  v_draft_id uuid;
BEGIN
  SELECT * INTO v_settings FROM public.financial_settings
  WHERE user_id = p_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'invoice_financial_settings_missing'; END IF;
  IF v_settings.invoice_rounding_policy IS NULL THEN RAISE EXCEPTION 'invoice_rounding_policy_not_configured'; END IF;

  SELECT * INTO v_owner FROM public.owners
  WHERE id = (p_input->>'owner_id')::uuid AND concierge_user_id = p_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'invoice_owner_out_of_scope'; END IF;

  IF p_input->>'currency' <> 'EUR'
    OR p_input->>'type' NOT IN ('invoice', 'credit_note')
    OR (p_input->>'period_start')::date > (p_input->>'period_end')::date
  THEN RAISE EXCEPTION 'invoice_input_invalid'; END IF;

  FOR v_line IN SELECT value FROM jsonb_array_elements(p_input->'lines')
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.properties p
      JOIN public.owner_properties op ON op.property_id = p.id
      WHERE p.id = (v_line->>'property_id')::uuid
        AND p.user_id = p_user_id
        AND op.owner_id = v_owner.id
    ) THEN RAISE EXCEPTION 'invoice_property_out_of_scope'; END IF;
    IF NULLIF(v_line->>'booking_id', '') IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = (v_line->>'booking_id')::uuid
        AND b.user_id = p_user_id
        AND b.property_id = (v_line->>'property_id')::uuid
    ) THEN RAISE EXCEPTION 'invoice_booking_out_of_scope'; END IF;
  END LOOP;

  v_calculation := public.calculate_invoice_amounts(
    p_input->'lines', COALESCE(v_settings.vat_enabled, false), v_settings.invoice_rounding_policy
  );
  v_source_versions := jsonb_build_object(
    'financial_settings_updated_at', to_jsonb(v_settings.updated_at),
    'owner_updated_at', to_jsonb(v_owner.updated_at),
    'bookings', COALESCE((
      SELECT jsonb_object_agg(b.id::text, b.updated_at)
      FROM public.bookings b
      WHERE b.id IN (
        SELECT NULLIF(value->>'booking_id', '')::uuid FROM jsonb_array_elements(p_input->'lines')
        WHERE NULLIF(value->>'booking_id', '') IS NOT NULL
      )
    ), '{}'::jsonb)
  );

  IF p_draft_id IS NOT NULL THEN
    SELECT * INTO v_existing FROM public.invoice_creation_drafts
    WHERE id = p_draft_id AND user_id = p_user_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'invoice_draft_not_found'; END IF;
    IF v_existing.status = 'created' THEN RAISE EXCEPTION 'invoice_draft_already_created'; END IF;
    IF p_expected_version IS DISTINCT FROM v_existing.version THEN RAISE EXCEPTION 'invoice_draft_version_conflict'; END IF;
    v_version := v_existing.version + 1;
    v_draft_id := v_existing.id;
  ELSE
    v_draft_id := gen_random_uuid();
  END IF;

  v_fingerprint := encode(digest(
    convert_to((p_input || jsonb_build_object(
      'calculation', v_calculation,
      'source_versions', v_source_versions,
      'version', v_version
    ))::text, 'UTF8'), 'sha256'
  ), 'hex');

  INSERT INTO public.invoice_creation_drafts (
    id, user_id, version, status, input, calculation, source_versions, fingerprint,
    approved_version, approved_fingerprint, approved_at, approved_by, expires_at, updated_at
  ) VALUES (
    v_draft_id, p_user_id, v_version, 'draft', p_input, v_calculation, v_source_versions, v_fingerprint,
    NULL, NULL, NULL, NULL, now() + interval '7 days', now()
  )
  ON CONFLICT (id) DO UPDATE SET
    version = EXCLUDED.version,
    status = 'draft',
    input = EXCLUDED.input,
    calculation = EXCLUDED.calculation,
    source_versions = EXCLUDED.source_versions,
    fingerprint = EXCLUDED.fingerprint,
    approved_version = NULL,
    approved_fingerprint = NULL,
    approved_at = NULL,
    approved_by = NULL,
    expires_at = EXCLUDED.expires_at,
    updated_at = now();

  RETURN jsonb_build_object(
    'draft_id', v_draft_id,
    'version', v_version,
    'fingerprint', v_fingerprint,
    'expires_at', now() + interval '7 days',
    'input', p_input,
    'calculation', v_calculation
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_invoice_creation_draft(
  p_draft_id uuid,
  p_version integer,
  p_fingerprint text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_draft public.invoice_creation_drafts%ROWTYPE;
BEGIN
  SELECT * INTO v_draft FROM public.invoice_creation_drafts
  WHERE id = p_draft_id AND user_id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'invoice_draft_not_found'; END IF;
  IF v_draft.status = 'created' THEN RAISE EXCEPTION 'invoice_draft_already_created'; END IF;
  IF v_draft.version <> p_version OR v_draft.fingerprint <> p_fingerprint THEN
    RAISE EXCEPTION 'invoice_approval_version_mismatch';
  END IF;
  IF v_draft.expires_at <= now() THEN RAISE EXCEPTION 'invoice_draft_expired'; END IF;

  UPDATE public.invoice_creation_drafts SET
    status = 'approved', approved_version = version, approved_fingerprint = fingerprint,
    approved_at = now(), approved_by = auth.uid(), updated_at = now()
  WHERE id = p_draft_id;

  RETURN jsonb_build_object('draft_id', p_draft_id, 'version', p_version, 'fingerprint', p_fingerprint, 'approved_at', now());
END;
$$;

CREATE OR REPLACE FUNCTION public.get_invoice_creation_draft_for_approval(
  p_draft_id uuid
) RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT jsonb_build_object(
    'draft_id', d.id,
    'version', d.version,
    'status', d.status,
    'fingerprint', d.fingerprint,
    'expires_at', d.expires_at,
    'input', d.input,
    'calculation', d.calculation,
    'approved_at', d.approved_at,
    'created_invoice_id', d.created_invoice_id
  )
  FROM public.invoice_creation_drafts d
  WHERE d.id = p_draft_id AND d.user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.create_invoice_from_approved_draft(
  p_user_id uuid,
  p_draft_id uuid,
  p_version integer,
  p_fingerprint text,
  p_idempotency_key text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_draft public.invoice_creation_drafts%ROWTYPE;
  v_settings public.financial_settings%ROWTYPE;
  v_owner public.owners%ROWTYPE;
  v_idempotency public.invoice_creation_idempotency%ROWTYPE;
  v_recalculated jsonb;
  v_invoice_id uuid;
  v_invoice_number text;
  v_line jsonb;
  v_result jsonb;
  v_issue_year integer;
  v_next_number integer;
BEGIN
  SELECT * INTO v_idempotency FROM public.invoice_creation_idempotency
  WHERE user_id = p_user_id AND idempotency_key = p_idempotency_key;
  IF FOUND THEN
    IF v_idempotency.draft_id <> p_draft_id
      OR v_idempotency.draft_version <> p_version
      OR v_idempotency.fingerprint <> p_fingerprint
    THEN RAISE EXCEPTION 'invoice_idempotency_conflict'; END IF;
    RETURN v_idempotency.result;
  END IF;

  SELECT * INTO v_draft FROM public.invoice_creation_drafts
  WHERE id = p_draft_id AND user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'invoice_draft_not_found'; END IF;

  SELECT * INTO v_idempotency FROM public.invoice_creation_idempotency
  WHERE user_id = p_user_id AND idempotency_key = p_idempotency_key;
  IF FOUND THEN
    IF v_idempotency.draft_id <> p_draft_id
      OR v_idempotency.draft_version <> p_version
      OR v_idempotency.fingerprint <> p_fingerprint
    THEN RAISE EXCEPTION 'invoice_idempotency_conflict'; END IF;
    RETURN v_idempotency.result;
  END IF;
  IF v_draft.status = 'created' THEN RAISE EXCEPTION 'invoice_draft_already_created'; END IF;
  IF v_draft.status <> 'approved'
    OR v_draft.version <> p_version
    OR v_draft.fingerprint <> p_fingerprint
    OR v_draft.approved_version <> p_version
    OR v_draft.approved_fingerprint <> p_fingerprint
  THEN RAISE EXCEPTION 'invoice_draft_not_approved'; END IF;
  IF v_draft.expires_at <= now() THEN RAISE EXCEPTION 'invoice_draft_expired'; END IF;

  SELECT * INTO v_settings FROM public.financial_settings
  WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'invoice_financial_settings_missing'; END IF;
  IF to_jsonb(v_settings.updated_at) IS DISTINCT FROM v_draft.source_versions->'financial_settings_updated_at' THEN
    RAISE EXCEPTION 'invoice_source_changed_after_approval';
  END IF;
  SELECT * INTO v_owner FROM public.owners
  WHERE id = (v_draft.input->>'owner_id')::uuid AND concierge_user_id = p_user_id;
  IF NOT FOUND OR to_jsonb(v_owner.updated_at) IS DISTINCT FROM v_draft.source_versions->'owner_updated_at' THEN
    RAISE EXCEPTION 'invoice_source_changed_after_approval';
  END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_each(v_draft.source_versions->'bookings') s
    LEFT JOIN public.bookings b ON b.id::text = s.key AND b.user_id = p_user_id
    WHERE b.id IS NULL OR to_jsonb(b.updated_at) IS DISTINCT FROM s.value
  ) THEN RAISE EXCEPTION 'invoice_source_changed_after_approval'; END IF;

  v_recalculated := public.calculate_invoice_amounts(
    v_draft.input->'lines', COALESCE(v_settings.vat_enabled, false), v_settings.invoice_rounding_policy
  );
  IF v_recalculated IS DISTINCT FROM v_draft.calculation THEN RAISE EXCEPTION 'invoice_calculation_changed'; END IF;

  v_issue_year := extract(year FROM (v_draft.input->>'issue_date')::date);
  v_next_number := greatest(coalesce(v_settings.next_invoice_number, 1), 1);
  LOOP
    v_invoice_number := concat(
      COALESCE(NULLIF(v_settings.invoice_prefix, ''), 'FAC'), '-', v_issue_year, '-',
      lpad(v_next_number::text, greatest(3, length(v_next_number::text)), '0')
    );
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.invoices
      WHERE user_id = p_user_id AND invoice_number = v_invoice_number);
    v_next_number := v_next_number + 1;
  END LOOP;

  INSERT INTO public.invoices (
    user_id, owner_id, invoice_number, invoice_date, issue_date, due_date,
    period_start, period_end, subtotal, vat_rate, vat_amount, total,
    status, type, notes, company_snapshot, owner_snapshot
  ) VALUES (
    p_user_id, v_owner.id, v_invoice_number,
    (v_draft.input->>'issue_date')::date, (v_draft.input->>'issue_date')::date,
    NULLIF(v_draft.input->>'due_date', '')::date,
    (v_draft.input->>'period_start')::date, (v_draft.input->>'period_end')::date,
    ((v_recalculated->>'subtotal_cents')::bigint::numeric / 100),
    CASE WHEN v_recalculated->>'header_vat_rate_bps' IS NULL THEN NULL
      ELSE ((v_recalculated->>'header_vat_rate_bps')::integer::numeric / 100) END,
    ((v_recalculated->>'vat_cents')::bigint::numeric / 100),
    ((v_recalculated->>'total_cents')::bigint::numeric / 100),
    'draft', v_draft.input->>'type', NULL,
    (to_jsonb(v_settings) - 'user_id' - 'next_invoice_number') || jsonb_build_object(
      'calculation_version', v_recalculated->>'calculation_version',
      'invoice_rounding_policy', v_settings.invoice_rounding_policy,
      'approved_draft_fingerprint', p_fingerprint,
      'approved_calculation', v_recalculated
    ),
    to_jsonb(v_owner) - 'auth_user_id' - 'concierge_user_id' - 'notes'
  ) RETURNING id INTO v_invoice_id;

  FOR v_line IN SELECT value FROM jsonb_array_elements(v_recalculated->'lines')
  LOOP
    INSERT INTO public.invoice_items (
      invoice_id, booking_id, property_id, description, quantity, unit_price,
      total, vat_amount, item_type, line_type, vat_rate, metadata
    ) VALUES (
      v_invoice_id, NULLIF(v_line->>'booking_id', '')::uuid, (v_line->>'property_id')::uuid,
      v_line->>'description', (v_line->>'quantity')::numeric,
      ((v_line->>'unit_price_cents')::bigint::numeric / 100),
      ((v_line->>'net_cents')::bigint::numeric / 100),
      ((v_line->>'vat_cents')::bigint::numeric / 100),
      'revenue', v_line->>'line_type', ((v_line->>'vat_rate_bps')::integer::numeric / 100),
      jsonb_build_object(
        'calculation_version', v_recalculated->>'calculation_version',
        'draft_line_id', v_line->>'line_id',
        'gross_cents', (v_line->>'gross_cents')::bigint
      )
    );
  END LOOP;

  UPDATE public.bookings SET financial_status = 'invoiced', updated_at = now()
  WHERE user_id = p_user_id AND id IN (
    SELECT NULLIF(value->>'booking_id', '')::uuid FROM jsonb_array_elements(v_draft.input->'lines')
    WHERE NULLIF(value->>'booking_id', '') IS NOT NULL
  );
  UPDATE public.financial_settings SET next_invoice_number = v_next_number + 1
  WHERE id = v_settings.id;

  v_result := jsonb_build_object(
    'invoice_id', v_invoice_id,
    'invoice_number', v_invoice_number,
    'status', 'draft',
    'issue_date', v_draft.input->>'issue_date',
    'currency', 'EUR',
    'subtotal_cents', (v_recalculated->>'subtotal_cents')::bigint,
    'vat_cents', (v_recalculated->>'vat_cents')::bigint,
    'total_cents', (v_recalculated->>'total_cents')::bigint,
    'created_at', now()
  );

  INSERT INTO public.invoice_creation_idempotency (
    user_id, idempotency_key, draft_id, draft_version, fingerprint, invoice_id, result
  ) VALUES (p_user_id, p_idempotency_key, p_draft_id, p_version, p_fingerprint, v_invoice_id, v_result);
  UPDATE public.invoice_creation_drafts SET status = 'created', created_invoice_id = v_invoice_id, updated_at = now()
  WHERE id = p_draft_id;
  RETURN v_result;
END;
$$;

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
  WHERE id = p_invoice_id AND user_id = auth.uid();
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

CREATE OR REPLACE FUNCTION public.get_invoice_creation_result(
  p_user_id uuid,
  p_idempotency_key text
) RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT result FROM public.invoice_creation_idempotency
  WHERE user_id = p_user_id AND idempotency_key = p_idempotency_key;
$$;

COMMENT ON FUNCTION public.calculate_invoice_amounts(jsonb, boolean, text) IS
  'Single source of truth for future invoice line, subtotal, VAT and total calculation.';
COMMENT ON FUNCTION public.create_invoice_from_approved_draft(uuid, uuid, integer, text, text) IS
  'Atomic, idempotent creation only; it never generates a PDF or sends an invoice.';
