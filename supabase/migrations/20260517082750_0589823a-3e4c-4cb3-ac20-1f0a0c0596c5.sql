ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS onboarding_steps JSONB NOT NULL DEFAULT '{"logement": false, "ical": false, "livret": false, "prestataire": false}'::jsonb,
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;