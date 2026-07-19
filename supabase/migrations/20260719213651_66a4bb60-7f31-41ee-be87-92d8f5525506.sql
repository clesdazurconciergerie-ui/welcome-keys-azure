-- Colonnes rapport PDF sur property_inspections
ALTER TABLE public.property_inspections
  ADD COLUMN IF NOT EXISTS report_pdf_url text,
  ADD COLUMN IF NOT EXISTS report_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS report_sent_to text[];

-- Lien optionnel vers la mission de ménage dont on hérite les photos
ALTER TABLE public.property_inspections
  ADD COLUMN IF NOT EXISTS cleaning_mission_id uuid;

CREATE INDEX IF NOT EXISTS idx_property_inspections_cleaning_mission
  ON public.property_inspections(cleaning_mission_id);