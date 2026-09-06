CREATE TABLE public.estim_owners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  first_name text NOT NULL DEFAULT '',
  last_name text NOT NULL DEFAULT '',
  email text,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.estim_owners TO authenticated;
GRANT ALL ON public.estim_owners TO service_role;
ALTER TABLE public.estim_owners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own estim_owners" ON public.estim_owners FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.estim_estimations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  owner_id uuid REFERENCES public.estim_owners(id) ON DELETE SET NULL,
  reference text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'draft',
  title text,
  address text,
  city text,
  postal_code text,
  district text,
  lat numeric,
  lng numeric,
  property_type text,
  location_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  features jsonb NOT NULL DEFAULT '{}'::jsonb,
  constraints jsonb NOT NULL DEFAULT '{}'::jsonb,
  ai_analysis jsonb NOT NULL DEFAULT '{}'::jsonb,
  ai_scores jsonb NOT NULL DEFAULT '{}'::jsonb,
  rdna_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  market_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  seasonality jsonb NOT NULL DEFAULT '{}'::jsonb,
  results jsonb NOT NULL DEFAULT '{}'::jsonb,
  sources jsonb NOT NULL DEFAULT '{}'::jsonb,
  manual_overrides jsonb NOT NULL DEFAULT '{}'::jsonb,
  confidence_score integer,
  internal_notes text,
  report_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.estim_estimations TO authenticated;
GRANT ALL ON public.estim_estimations TO service_role;
ALTER TABLE public.estim_estimations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own estim_estimations" ON public.estim_estimations FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE INDEX estim_estimations_user_idx ON public.estim_estimations(user_id, created_at DESC);

CREATE TABLE public.estim_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  estimation_id uuid NOT NULL REFERENCES public.estim_estimations(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  file_name text,
  category text,
  position integer NOT NULL DEFAULT 0,
  is_cover boolean NOT NULL DEFAULT false,
  ai_analysis jsonb NOT NULL DEFAULT '{}'::jsonb,
  quality_score integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.estim_photos TO authenticated;
GRANT ALL ON public.estim_photos TO service_role;
ALTER TABLE public.estim_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own estim_photos" ON public.estim_photos FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE INDEX estim_photos_estimation_idx ON public.estim_photos(estimation_id, position);

CREATE TABLE public.estim_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  estimation_id uuid NOT NULL REFERENCES public.estim_estimations(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'rdna',
  storage_path text NOT NULL,
  file_name text,
  status text NOT NULL DEFAULT 'uploaded',
  extracted jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.estim_documents TO authenticated;
GRANT ALL ON public.estim_documents TO service_role;
ALTER TABLE public.estim_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own estim_documents" ON public.estim_documents FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.estim_comparables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  estimation_id uuid NOT NULL REFERENCES public.estim_estimations(id) ON DELETE CASCADE,
  source text NOT NULL DEFAULT 'rdna',
  name text,
  url text,
  bedrooms integer,
  capacity integer,
  displayed_price numeric,
  occupancy_pct numeric,
  annual_revenue numeric,
  similarity_score integer,
  is_primary boolean NOT NULL DEFAULT true,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.estim_comparables TO authenticated;
GRANT ALL ON public.estim_comparables TO service_role;
ALTER TABLE public.estim_comparables ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own estim_comparables" ON public.estim_comparables FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE SEQUENCE IF NOT EXISTS public.estim_reference_seq;
CREATE OR REPLACE FUNCTION public.next_estimation_reference()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n bigint;
BEGIN
  n := nextval('public.estim_reference_seq');
  RETURN 'AKP-' || to_char(now(), 'YYYY') || '-' || lpad(n::text, 4, '0');
END; $$;
GRANT EXECUTE ON FUNCTION public.next_estimation_reference() TO authenticated;

CREATE TRIGGER estim_estimations_updated BEFORE UPDATE ON public.estim_estimations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER estim_owners_updated BEFORE UPDATE ON public.estim_owners
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "estim photos own folder" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'estimation-photos' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'estimation-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "estim docs own folder" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'estimation-documents' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'estimation-documents' AND (storage.foldername(name))[1] = auth.uid()::text);