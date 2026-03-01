
-- Add mission-related columns to cleaning_interventions
ALTER TABLE public.cleaning_interventions
  ADD COLUMN IF NOT EXISTS scheduled_start_time timestamptz,
  ADD COLUMN IF NOT EXISTS scheduled_end_time timestamptz,
  ADD COLUMN IF NOT EXISTS actual_start_time timestamptz,
  ADD COLUMN IF NOT EXISTS actual_end_time timestamptz,
  ADD COLUMN IF NOT EXISTS mission_type text NOT NULL DEFAULT 'cleaning',
  ADD COLUMN IF NOT EXISTS checklist_validated boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS provider_comment text,
  ADD COLUMN IF NOT EXISTS admin_comment text,
  ADD COLUMN IF NOT EXISTS internal_score numeric,
  ADD COLUMN IF NOT EXISTS punctuality_score numeric,
  ADD COLUMN IF NOT EXISTS mission_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_done boolean NOT NULL DEFAULT false;

-- Add score_global to service_providers
ALTER TABLE public.service_providers
  ADD COLUMN IF NOT EXISTS score_global numeric NOT NULL DEFAULT 0;

-- Create checklist_items table
CREATE TABLE IF NOT EXISTS public.checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  task_text text NOT NULL,
  is_mandatory boolean NOT NULL DEFAULT false,
  order_index integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ci_items_concierge_all" ON public.checklist_items FOR ALL
  USING (EXISTS (SELECT 1 FROM properties WHERE properties.id = checklist_items.property_id AND properties.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM properties WHERE properties.id = checklist_items.property_id AND properties.user_id = auth.uid()));

-- SP can read checklist items for properties they have interventions on
CREATE POLICY "ci_items_sp_select" ON public.checklist_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM cleaning_interventions ci
    JOIN service_providers sp ON sp.id = ci.service_provider_id
    WHERE ci.property_id = checklist_items.property_id
    AND sp.auth_user_id = auth.uid()
  ));

-- Create incident_reports table
CREATE TABLE IF NOT EXISTS public.incident_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intervention_id uuid NOT NULL REFERENCES public.cleaning_interventions(id) ON DELETE CASCADE,
  problem_type text NOT NULL DEFAULT 'other',
  description text,
  photo_url text,
  is_urgent boolean NOT NULL DEFAULT false,
  is_resolved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.incident_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ir_access" ON public.incident_reports FOR ALL
  USING (can_access_intervention(auth.uid(), intervention_id))
  WITH CHECK (can_upload_intervention_photo(auth.uid(), intervention_id));

-- Create material_requests table
CREATE TABLE IF NOT EXISTS public.material_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_provider_id uuid NOT NULL REFERENCES public.service_providers(id) ON DELETE CASCADE,
  concierge_user_id uuid NOT NULL,
  product text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'pending',
  request_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.material_requests ENABLE ROW LEVEL SECURITY;

-- Concierge can manage all
CREATE POLICY "mr_concierge_all" ON public.material_requests FOR ALL
  USING (concierge_user_id = auth.uid())
  WITH CHECK (concierge_user_id = auth.uid());

-- SP can view own and insert
CREATE POLICY "mr_sp_select" ON public.material_requests FOR SELECT
  USING (service_provider_id = get_service_provider_id(auth.uid()));

CREATE POLICY "mr_sp_insert" ON public.material_requests FOR INSERT
  WITH CHECK (service_provider_id = get_service_provider_id(auth.uid()));
