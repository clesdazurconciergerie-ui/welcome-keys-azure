ALTER TABLE public.estim_estimations
  ADD COLUMN IF NOT EXISTS ai_status text NOT NULL DEFAULT 'idle',
  ADD COLUMN IF NOT EXISTS ai_error text,
  ADD COLUMN IF NOT EXISTS ai_analyzed_at timestamptz,
  ADD COLUMN IF NOT EXISTS ai_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS ai_facts jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS report_photo_selection jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.estim_photos
  ADD COLUMN IF NOT EXISTS aesthetic_score integer,
  ADD COLUMN IF NOT EXISTS technical_score integer,
  ADD COLUMN IF NOT EXISTS importance_score integer,
  ADD COLUMN IF NOT EXISTS ai_usable boolean,
  ADD COLUMN IF NOT EXISTS selected_for_report boolean NOT NULL DEFAULT false;

ALTER TABLE public.estim_documents
  ADD COLUMN IF NOT EXISTS raw_extraction jsonb NOT NULL DEFAULT '{}'::jsonb;