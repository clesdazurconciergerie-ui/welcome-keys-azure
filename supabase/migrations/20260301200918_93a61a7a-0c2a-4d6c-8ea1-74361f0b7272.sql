
-- =============================================
-- Finance Module Schema Evolution
-- =============================================

-- 1) Add columns to invoices
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS due_date date,
  ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'invoice',
  ADD COLUMN IF NOT EXISTS issue_date date DEFAULT CURRENT_DATE;

-- 2) Add columns to invoice_items for line categorization
ALTER TABLE public.invoice_items
  ADD COLUMN IF NOT EXISTS line_type text NOT NULL DEFAULT 'revenue',
  ADD COLUMN IF NOT EXISTS vat_rate numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES public.properties(id),
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}';

-- 3) Add columns to expenses
ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'paid',
  ADD COLUMN IF NOT EXISTS vat_rate numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vat_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES public.owners(id);

-- 4) Create services_catalog table
CREATE TABLE IF NOT EXISTS public.services_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  default_unit_price numeric NOT NULL DEFAULT 0,
  default_vat_rate numeric NOT NULL DEFAULT 20,
  unit_label text DEFAULT 'unité',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.services_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sc_block_anon" ON public.services_catalog
  AS RESTRICTIVE FOR ALL TO public
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "sc_owner" ON public.services_catalog
  AS RESTRICTIVE FOR ALL TO public
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TRIGGER update_services_catalog_updated_at
  BEFORE UPDATE ON public.services_catalog
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5) Create vendor_payments table
CREATE TABLE IF NOT EXISTS public.vendor_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  provider_id uuid REFERENCES public.service_providers(id),
  date date NOT NULL DEFAULT CURRENT_DATE,
  description text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  vat_rate numeric DEFAULT 0,
  vat_amount numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'to_pay',
  owner_id uuid REFERENCES public.owners(id),
  property_id uuid REFERENCES public.properties(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.vendor_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vp_block_anon" ON public.vendor_payments
  AS RESTRICTIVE FOR ALL TO public
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "vp_owner" ON public.vendor_payments
  AS RESTRICTIVE FOR ALL TO public
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TRIGGER update_vendor_payments_updated_at
  BEFORE UPDATE ON public.vendor_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6) Add default_due_days to financial_settings
ALTER TABLE public.financial_settings
  ADD COLUMN IF NOT EXISTS default_due_days integer DEFAULT 30;

-- 7) Create indexes
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_issue_date ON public.invoices(issue_date);
CREATE INDEX IF NOT EXISTS idx_invoices_type ON public.invoices(type);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON public.expenses(status);
CREATE INDEX IF NOT EXISTS idx_vendor_payments_status ON public.vendor_payments(status);
CREATE INDEX IF NOT EXISTS idx_vendor_payments_date ON public.vendor_payments(date);
CREATE INDEX IF NOT EXISTS idx_services_catalog_user ON public.services_catalog(user_id);
