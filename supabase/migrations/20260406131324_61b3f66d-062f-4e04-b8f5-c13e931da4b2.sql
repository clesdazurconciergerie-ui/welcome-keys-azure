
CREATE TABLE IF NOT EXISTS public.photo_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  label text NOT NULL,
  description text,
  required boolean NOT NULL DEFAULT true,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.photo_requirements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can manage photo_requirements"
  ON public.photo_requirements
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = photo_requirements.property_id
        AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = photo_requirements.property_id
        AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Providers can read photo_requirements"
  ON public.photo_requirements
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.missions m
      WHERE m.property_id = photo_requirements.property_id
        AND m.selected_provider_id IN (
          SELECT sp.id FROM public.service_providers sp
          WHERE sp.auth_user_id = auth.uid()
        )
    )
  );

CREATE TABLE IF NOT EXISTS public.mission_photo_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id uuid NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
  requirement_id uuid NOT NULL REFERENCES public.photo_requirements(id) ON DELETE CASCADE,
  photo_url text NOT NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(mission_id, requirement_id, photo_url)
);

ALTER TABLE public.mission_photo_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Provider can manage completions"
  ON public.mission_photo_completions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.missions m
      WHERE m.id = mission_photo_completions.mission_id
        AND (
          m.user_id = auth.uid()
          OR m.selected_provider_id IN (
            SELECT sp.id FROM public.service_providers sp WHERE sp.auth_user_id = auth.uid()
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.missions m
      WHERE m.id = mission_photo_completions.mission_id
        AND m.selected_provider_id IN (
          SELECT sp.id FROM public.service_providers sp WHERE sp.auth_user_id = auth.uid()
        )
    )
  );

CREATE POLICY "Concierge can read completions"
  ON public.mission_photo_completions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.missions m
      WHERE m.id = mission_photo_completions.mission_id
        AND m.user_id = auth.uid()
    )
  );

CREATE INDEX idx_photo_requirements_property ON public.photo_requirements(property_id);
CREATE INDEX idx_mission_photo_completions_mission ON public.mission_photo_completions(mission_id);
