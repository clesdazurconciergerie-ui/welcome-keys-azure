CREATE TABLE IF NOT EXISTS public.financial_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  company_name text,
  logo_url text,
  address text,
  org_phone text,
  org_postal_code text,
  org_city text,
  vat_number text,
  default_vat_rate numeric NOT NULL DEFAULT 20,
  invoice_prefix text NOT NULL DEFAULT 'FAC',
  next_invoice_number integer NOT NULL DEFAULT 1,
  iban text,
  bic text,
  legal_footer text,
  default_due_days integer NOT NULL DEFAULT 30,
  vat_enabled boolean NOT NULL DEFAULT true,
  invoice_primary_color text,
  invoice_accent_color text,
  invoice_text_color text,
  default_signature_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_settings TO authenticated;
GRANT ALL ON public.financial_settings TO service_role;

ALTER TABLE public.financial_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own financial_settings"
  ON public.financial_settings
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_financial_settings_updated
  BEFORE UPDATE ON public.financial_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();