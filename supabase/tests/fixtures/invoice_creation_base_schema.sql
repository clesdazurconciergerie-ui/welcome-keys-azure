-- Minimal isolated PostgreSQL/Supabase-shaped schema for invoice creation QA.
-- It contains no production data and is never applied as a migration.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$ BEGIN CREATE ROLE anon NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE ROLE authenticated NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE ROLE service_role NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE SCHEMA IF NOT EXISTS auth;
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

CREATE TABLE public.financial_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  company_name text,
  address text,
  org_phone text,
  org_postal_code text,
  org_city text,
  vat_number text,
  iban text,
  bic text,
  legal_footer text,
  default_due_days integer,
  vat_enabled boolean DEFAULT false,
  default_vat_rate numeric(5,2),
  logo_url text,
  invoice_prefix text,
  next_invoice_number integer NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.owners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  concierge_user_id uuid NOT NULL,
  auth_user_id uuid,
  first_name text,
  last_name text,
  email text,
  phone text,
  billing_street text,
  billing_postal_code text,
  billing_city text,
  status text,
  notes text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text,
  status text
);

CREATE TABLE public.owner_properties (
  owner_id uuid NOT NULL REFERENCES public.owners(id),
  property_id uuid NOT NULL REFERENCES public.properties(id),
  PRIMARY KEY (owner_id, property_id)
);

CREATE TABLE public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  property_id uuid NOT NULL REFERENCES public.properties(id),
  financial_status text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  owner_id uuid NOT NULL REFERENCES public.owners(id),
  invoice_number text NOT NULL,
  invoice_date date,
  issue_date date NOT NULL,
  due_date date,
  period_start date NOT NULL,
  period_end date NOT NULL,
  subtotal numeric(12,2),
  vat_rate numeric(5,2),
  vat_amount numeric(12,2),
  total numeric(12,2),
  status text,
  type text,
  notes text,
  company_snapshot jsonb,
  owner_snapshot jsonb,
  pdf_path text,
  generated_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES public.bookings(id),
  property_id uuid REFERENCES public.properties(id),
  description text NOT NULL,
  quantity numeric NOT NULL,
  unit_price numeric(12,2) NOT NULL,
  total numeric(12,2) NOT NULL,
  item_type text,
  line_type text,
  vat_rate numeric(5,2),
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Simulate the legacy browser grants that production currently has. The
-- prepared permissions migration must remove INSERT while preserving reads.
GRANT USAGE ON SCHEMA public, auth TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA auth TO anon, authenticated, service_role;
