#!/bin/sh
set -eu

if [ "$#" -ne 1 ]; then
  echo "usage: $0 postgresql://.../fresh_disposable_database" >&2
  exit 2
fi

db_url=$1
psql_bin=${PSQL_BIN:-psql}
root_dir=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)

run_file() {
  "$psql_bin" "$db_url" -v ON_ERROR_STOP=1 -f "$root_dir/$1"
}

run_file supabase/tests/fixtures/invoice_creation_base_schema.sql
run_file supabase/migrations/20261030020000_prepare_atomic_invoice_creation.sql
run_file supabase/migrations/20261030020100_prepare_invoice_creation_permissions.sql
run_file supabase/tests/invoice_creation_calculation.sql
run_file supabase/tests/invoice_creation_atomicity.sql
run_file supabase/tests/invoice_creation_security.sql
run_file supabase/tests/invoice_creation_concurrency_setup.sql

PSQL_BIN="$psql_bin" sh "$root_dir/supabase/tests/run_invoice_concurrency.sh" "$db_url"
