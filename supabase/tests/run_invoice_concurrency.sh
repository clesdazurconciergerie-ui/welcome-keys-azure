#!/bin/sh
set -eu

if [ "$#" -ne 1 ]; then
  echo "usage: $0 postgresql://.../disposable_database" >&2
  exit 2
fi

db_url=$1
psql_bin=${PSQL_BIN:-psql}
tmp_dir=$(mktemp -d)
trap 'rm -rf "$tmp_dir"' EXIT

"$psql_bin" "$db_url" -v ON_ERROR_STOP=1 -c "SELECT pg_advisory_lock(724602); SELECT pg_sleep(2); SELECT pg_advisory_unlock(724602);" >"$tmp_dir/gate.log" 2>&1 &
gate_pid=$!
sleep 0.2
"$psql_bin" "$db_url" -v ON_ERROR_STOP=1 -c "SELECT public.qa_create_invoice_concurrent('case1');" >"$tmp_dir/case1.log" 2>&1 &
p1=$!
"$psql_bin" "$db_url" -v ON_ERROR_STOP=1 -c "SELECT public.qa_create_invoice_concurrent('case2');" >"$tmp_dir/case2.log" 2>&1 &
p2=$!
wait "$gate_pid"
wait "$p1"
wait "$p2"

"$psql_bin" "$db_url" -v ON_ERROR_STOP=1 <<'SQL'
DO $$
DECLARE overlap boolean; numbers text[]; next_number integer;
BEGIN
  SELECT max(started_at) < min(finished_at) INTO overlap FROM public.qa_invoice_concurrency_cases;
  IF NOT overlap THEN RAISE EXCEPTION 'connections did not overlap'; END IF;
  SELECT array_agg(invoice_number ORDER BY invoice_number) INTO numbers
  FROM public.invoices WHERE user_id = '30000000-0000-4000-8000-000000000001';
  IF numbers IS DISTINCT FROM ARRAY['CC-2026-070','CC-2026-071'] THEN
    RAISE EXCEPTION 'non-consecutive or duplicate numbers: %', numbers;
  END IF;
  SELECT next_invoice_number INTO next_number FROM public.financial_settings
  WHERE user_id = '30000000-0000-4000-8000-000000000001';
  IF next_number <> 72 THEN RAISE EXCEPTION 'counter expected 72, got %', next_number; END IF;
  IF (SELECT count(*) FROM public.invoice_items ii JOIN public.invoices i ON i.id = ii.invoice_id
      WHERE i.user_id = '30000000-0000-4000-8000-000000000001') <> 2 THEN
    RAISE EXCEPTION 'orphan or missing line in concurrent creation';
  END IF;
END;
$$;
SELECT case_name, started_at, finished_at, result->>'invoice_number' AS invoice_number
FROM public.qa_invoice_concurrency_cases ORDER BY case_name;
SQL
