-- Run only on an isolated/local database after applying the two prepared migrations.
-- This file performs no production write and rolls back all test data.
BEGIN;

DO $$
DECLARE
  v_result jsonb;
BEGIN
  v_result := public.calculate_invoice_amounts(
    '[
      {"line_id":"00000000-0000-4000-8000-000000000001","property_id":"00000000-0000-4000-8000-000000000010","line_type":"commission","description":"Commission","quantity":"3","unit_price":"19.99","vat_rate":"20.00"},
      {"line_id":"00000000-0000-4000-8000-000000000002","property_id":"00000000-0000-4000-8000-000000000010","line_type":"service","description":"Service","quantity":"1.25","unit_price":"80.00","vat_rate":"10.00"},
      {"line_id":"00000000-0000-4000-8000-000000000003","property_id":"00000000-0000-4000-8000-000000000010","line_type":"pass_through_cost","description":"Frais refacturés","quantity":"3","unit_price":"0.10","vat_rate":"0.00"}
    ]'::jsonb,
    true,
    'line_half_up_v1'
  );

  IF (v_result->>'subtotal_cents')::bigint <> 16027 THEN
    RAISE EXCEPTION 'subtotal test failed: %', v_result;
  END IF;
  -- 59.97 x 20% = 11.994 -> 11.99; 100.00 x 10% = 10.00.
  IF (v_result->>'vat_cents')::bigint <> 2199 THEN
    RAISE EXCEPTION 'VAT rounding test failed: %', v_result;
  END IF;
  IF (v_result->>'total_cents')::bigint <> 18226 THEN
    RAISE EXCEPTION 'total test failed: %', v_result;
  END IF;
  IF v_result->>'header_vat_rate_bps' IS NOT NULL THEN
    RAISE EXCEPTION 'mixed VAT rate must not create a fake header rate';
  END IF;

  v_result := public.calculate_invoice_amounts(
    '[{"line_id":"00000000-0000-4000-8000-000000000004","property_id":"00000000-0000-4000-8000-000000000010","line_type":"service","description":"TVA désactivée","quantity":"1","unit_price":"12.34","vat_rate":"20.00"}]'::jsonb,
    false,
    'line_half_up_v1'
  );
  IF (v_result->>'vat_cents')::bigint <> 0 OR (v_result->>'total_cents')::bigint <> 1234 THEN
    RAISE EXCEPTION 'disabled VAT test failed: %', v_result;
  END IF;

  BEGIN
    PERFORM public.calculate_invoice_amounts('[]'::jsonb, true, 'line_half_up_v1');
    RAISE EXCEPTION 'empty invoice should have failed';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'empty invoice should have failed' THEN RAISE; END IF;
  END;

  BEGIN
    PERFORM public.calculate_invoice_amounts(
      '[{"quantity":"1","unit_price":"1.00","vat_rate":"20.00"}]'::jsonb,
      true,
      NULL
    );
    RAISE EXCEPTION 'missing policy should have failed';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'missing policy should have failed' THEN RAISE; END IF;
  END;
END;
$$;

ROLLBACK;
