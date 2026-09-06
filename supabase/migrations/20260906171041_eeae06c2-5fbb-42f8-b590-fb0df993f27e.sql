-- Comparables : origine, contexte de prix, caractéristiques strictes, traçabilité
ALTER TABLE public.estim_comparables
  ADD COLUMN IF NOT EXISTS origin text NOT NULL DEFAULT 'rdna',
  ADD COLUMN IF NOT EXISTS platform text,
  ADD COLUMN IF NOT EXISTS property_type text,
  ADD COLUMN IF NOT EXISTS bathrooms numeric,
  ADD COLUMN IF NOT EXISTS surface_m2 numeric,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS district text,
  ADD COLUMN IF NOT EXISTS lat numeric,
  ADD COLUMN IF NOT EXISTS lng numeric,
  ADD COLUMN IF NOT EXISTS distance_m numeric,
  ADD COLUMN IF NOT EXISTS pool_kind text NOT NULL DEFAULT 'inconnue',
  ADD COLUMN IF NOT EXISTS view_kind text NOT NULL DEFAULT 'inconnue',
  ADD COLUMN IF NOT EXISTS parking_kind text NOT NULL DEFAULT 'inconnu',
  ADD COLUMN IF NOT EXISTS ac_kind text NOT NULL DEFAULT 'inconnue',
  ADD COLUMN IF NOT EXISTS exterior_kind text NOT NULL DEFAULT 'inconnu',
  ADD COLUMN IF NOT EXISTS amenities jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS rating numeric,
  ADD COLUMN IF NOT EXISTS reviews_count integer,
  ADD COLUMN IF NOT EXISTS currency text,
  ADD COLUMN IF NOT EXISTS cleaning_fee numeric,
  ADD COLUMN IF NOT EXISTS other_fees numeric,
  ADD COLUMN IF NOT EXISTS total_stay_price numeric,
  ADD COLUMN IF NOT EXISTS actual_revenue numeric,
  ADD COLUMN IF NOT EXISTS price_context jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS availability jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS observed_at timestamptz,
  ADD COLUMN IF NOT EXISTS ai_visual jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS not_relevant boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS kept_manually boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS manual_overrides jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS created_manually boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sources jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS estim_comparables_estimation_origin_idx
  ON public.estim_comparables (estimation_id, origin);

-- Estimation : instantané du marché local, contexte, événements, qualité des données
ALTER TABLE public.estim_estimations
  ADD COLUMN IF NOT EXISTS market_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS local_context jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS local_events jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS research_status text NOT NULL DEFAULT 'idle',
  ADD COLUMN IF NOT EXISTS research_error text,
  ADD COLUMN IF NOT EXISTS researched_at timestamptz,
  ADD COLUMN IF NOT EXISTS data_quality_score integer;