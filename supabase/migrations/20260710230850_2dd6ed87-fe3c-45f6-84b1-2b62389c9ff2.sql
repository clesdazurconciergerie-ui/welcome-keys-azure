
ALTER TABLE public.property_photos
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
UPDATE public.property_photos SET created_at = COALESCE(uploaded_at, now()) WHERE created_at IS NULL;
