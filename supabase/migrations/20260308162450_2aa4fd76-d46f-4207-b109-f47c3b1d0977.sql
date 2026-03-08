
CREATE TABLE public.inspections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  linked_inspection_id UUID REFERENCES public.inspections(id) ON DELETE SET NULL,
  inspection_type TEXT NOT NULL DEFAULT 'entry' CHECK (inspection_type IN ('entry', 'exit')),
  guest_name TEXT,
  inspection_date DATE NOT NULL DEFAULT CURRENT_DATE,
  occupants_count INTEGER,
  meter_electricity TEXT,
  meter_water TEXT,
  meter_gas TEXT,
  general_comment TEXT,
  damage_notes TEXT,
  cleaning_photos_json JSONB DEFAULT '[]'::jsonb,
  exit_photos_json JSONB DEFAULT '[]'::jsonb,
  concierge_signature_url TEXT,
  guest_signature_url TEXT,
  pdf_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;

-- Concierge full access
CREATE POLICY "insp_concierge_all" ON public.inspections
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Owner read access via property
CREATE POLICY "insp_owner_select" ON public.inspections
  FOR SELECT TO authenticated
  USING (public.is_owner_of_property(auth.uid(), property_id));

-- Updated_at trigger
CREATE TRIGGER inspections_updated_at
  BEFORE UPDATE ON public.inspections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
