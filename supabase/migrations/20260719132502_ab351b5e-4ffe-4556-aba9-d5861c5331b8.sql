ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS issue_date date DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS due_date date,
  ADD COLUMN IF NOT EXISTS type text DEFAULT 'invoice',
  ADD COLUMN IF NOT EXISTS paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS pdf_path text,
  ADD COLUMN IF NOT EXISTS generated_at timestamptz;

ALTER TABLE public.invoices ALTER COLUMN status SET DEFAULT 'draft';