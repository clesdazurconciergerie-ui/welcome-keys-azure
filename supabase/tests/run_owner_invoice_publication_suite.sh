#!/bin/sh
set -eu
if [ "$#" -ne 1 ]; then echo "usage: $0 postgresql://.../fresh_disposable_database" >&2; exit 2; fi
delivery_db_url=$1
psql_bin=${PSQL_BIN:-psql}
root_dir=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
for relative in supabase/tests/fixtures/invoice_creation_base_schema.sql supabase/migrations/20261030020000_prepare_atomic_invoice_creation.sql supabase/migrations/20261030020100_prepare_invoice_creation_permissions.sql supabase/migrations/20261030030000_owner_invoice_publication.sql supabase/tests/owner_invoice_publication.sql; do
 "$psql_bin" "$delivery_db_url" -v ON_ERROR_STOP=1 -f "$root_dir/$relative"
done
