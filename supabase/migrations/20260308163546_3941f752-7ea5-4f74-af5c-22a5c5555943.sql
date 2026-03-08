
ALTER TABLE public.inspections 
  ADD COLUMN IF NOT EXISTS cleaning_intervention_id UUID REFERENCES public.cleaning_interventions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cleaner_name TEXT,
  ALTER COLUMN inspection_type DROP NOT NULL,
  ALTER COLUMN inspection_type SET DEFAULT 'entry';

-- Allow 'pending' status for auto-created inspections awaiting concierge completion
ALTER TABLE public.inspections DROP CONSTRAINT IF EXISTS inspections_status_check;
ALTER TABLE public.inspections ADD CONSTRAINT inspections_status_check CHECK (status IN ('draft', 'pending', 'completed'));

-- Drop the type constraint to allow combined entry+exit in one record
ALTER TABLE public.inspections DROP CONSTRAINT IF EXISTS inspections_inspection_type_check;
