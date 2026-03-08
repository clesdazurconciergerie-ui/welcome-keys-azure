
CREATE TABLE public.property_cleaning_buffer (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  photo_url text NOT NULL,
  cleaning_intervention_id uuid REFERENCES public.cleaning_interventions(id) ON DELETE SET NULL,
  cleaning_mission_id uuid,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  used_in_inspection boolean NOT NULL DEFAULT false,
  inspection_id uuid REFERENCES public.inspections(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.property_cleaning_buffer ENABLE ROW LEVEL SECURITY;

CREATE POLICY "buffer_concierge_all"
  ON public.property_cleaning_buffer
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "buffer_block_anon"
  ON public.property_cleaning_buffer
  AS RESTRICTIVE
  FOR ALL
  TO public
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE INDEX idx_cleaning_buffer_property ON public.property_cleaning_buffer(property_id, used_in_inspection);
