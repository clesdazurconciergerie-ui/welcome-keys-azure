
-- Add invoice branding color columns to financial_settings
ALTER TABLE public.financial_settings
  ADD COLUMN IF NOT EXISTS invoice_primary_color text DEFAULT '#061452',
  ADD COLUMN IF NOT EXISTS invoice_accent_color text DEFAULT '#C4A45B',
  ADD COLUMN IF NOT EXISTS invoice_text_color text DEFAULT NULL;

-- Add unique constraint on (user_id, invoice_number) pattern via invoices table
-- to prevent duplicate invoice numbers per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_user_number 
  ON public.invoices (user_id, invoice_number);
