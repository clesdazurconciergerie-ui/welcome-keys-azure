ALTER TABLE public.service_providers ADD COLUMN IF NOT EXISTS push_token text;
ALTER TABLE public.service_providers ADD COLUMN IF NOT EXISTS push_enabled boolean NOT NULL DEFAULT false;