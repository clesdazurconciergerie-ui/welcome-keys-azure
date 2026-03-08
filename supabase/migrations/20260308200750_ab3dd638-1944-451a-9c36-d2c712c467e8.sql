ALTER TABLE public.inspections DROP CONSTRAINT IF EXISTS inspections_status_check;
ALTER TABLE public.inspections DROP CONSTRAINT IF EXISTS inspection_status_check;
ALTER TABLE public.inspections ADD CONSTRAINT inspections_status_check CHECK (status IN ('draft', 'pending', 'prepared', 'entry_validated', 'exit_completed', 'finalized', 'completed'));