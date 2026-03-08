ALTER TABLE public.financial_settings
ADD COLUMN IF NOT EXISTS default_signature_url text DEFAULT NULL;