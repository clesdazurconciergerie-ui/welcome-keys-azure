-- Create monthly_reports table
CREATE TABLE public.monthly_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.owners(id) ON DELETE CASCADE,
  concierge_user_id UUID NOT NULL,
  period_month DATE NOT NULL, -- first day of reported month (e.g. 2026-03-01 for March 2026)
  
  -- Aggregated KPIs
  total_bookings INTEGER NOT NULL DEFAULT 0,
  total_nights INTEGER NOT NULL DEFAULT 0,
  available_nights INTEGER NOT NULL DEFAULT 0,
  occupancy_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  adr NUMERIC(10,2) NOT NULL DEFAULT 0,
  gross_revenue NUMERIC(12,2) NOT NULL DEFAULT 0,
  owner_net NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_interventions INTEGER NOT NULL DEFAULT 0,
  total_photos INTEGER NOT NULL DEFAULT 0,
  
  -- Detailed payload (JSON snapshot for PDF rendering)
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- File & status
  pdf_path TEXT,
  status TEXT NOT NULL DEFAULT 'generated' CHECK (status IN ('generated','sent','error')),
  error_message TEXT,
  email_sent_at TIMESTAMPTZ,
  
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT monthly_reports_owner_period_unique UNIQUE (owner_id, period_month)
);

-- Indexes
CREATE INDEX idx_monthly_reports_owner ON public.monthly_reports(owner_id, period_month DESC);
CREATE INDEX idx_monthly_reports_concierge ON public.monthly_reports(concierge_user_id, period_month DESC);

-- Enable RLS
ALTER TABLE public.monthly_reports ENABLE ROW LEVEL SECURITY;

-- Concierges: full access to their owners' reports
CREATE POLICY "Concierges manage their owners' reports"
ON public.monthly_reports
FOR ALL
TO authenticated
USING (auth.uid() = concierge_user_id)
WITH CHECK (auth.uid() = concierge_user_id);

-- Owners: read-only access to their own reports
CREATE POLICY "Owners view their own reports"
ON public.monthly_reports
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.owners o
    WHERE o.id = monthly_reports.owner_id
      AND o.auth_user_id = auth.uid()
      AND o.status = 'active'
  )
);

-- Block anonymous access
CREATE POLICY "Block anon access to monthly_reports"
ON public.monthly_reports
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- updated_at trigger
CREATE TRIGGER update_monthly_reports_updated_at
BEFORE UPDATE ON public.monthly_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Storage policies for monthly-reports/ folder in owner-documents bucket
-- Concierges can upload/read/delete their owner reports
CREATE POLICY "Concierges manage monthly-reports files"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'owner-documents'
  AND (storage.foldername(name))[1] = 'monthly-reports'
  AND (storage.foldername(name))[2] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'owner-documents'
  AND (storage.foldername(name))[1] = 'monthly-reports'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- Owners can read their own monthly reports
CREATE POLICY "Owners read their monthly reports"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'owner-documents'
  AND (storage.foldername(name))[1] = 'monthly-reports'
  AND EXISTS (
    SELECT 1 FROM public.monthly_reports mr
    JOIN public.owners o ON o.id = mr.owner_id
    WHERE mr.pdf_path = storage.objects.name
      AND o.auth_user_id = auth.uid()
      AND o.status = 'active'
  )
);