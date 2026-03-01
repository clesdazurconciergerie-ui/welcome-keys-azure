-- Add new fields to financial_settings for the invoice template
ALTER TABLE public.financial_settings
  ADD COLUMN IF NOT EXISTS org_phone text,
  ADD COLUMN IF NOT EXISTS bic text,
  ADD COLUMN IF NOT EXISTS org_postal_code text,
  ADD COLUMN IF NOT EXISTS org_city text;

-- Add billing fields to owners for client section on invoices
ALTER TABLE public.owners
  ADD COLUMN IF NOT EXISTS billing_street text,
  ADD COLUMN IF NOT EXISTS billing_postal_code text,
  ADD COLUMN IF NOT EXISTS billing_city text;

-- Add PDF storage fields to invoices
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS pdf_path text,
  ADD COLUMN IF NOT EXISTS generated_at timestamp with time zone;

-- Create storage bucket for invoice PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('invoices', 'invoices', false)
ON CONFLICT (id) DO NOTHING;

-- RLS: users can manage their own invoice PDFs (folder = user_id)
CREATE POLICY "Users can view own invoices"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'invoices' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload own invoices"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'invoices' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own invoices"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'invoices' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own invoices"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'invoices' AND auth.uid()::text = (storage.foldername(name))[1]);