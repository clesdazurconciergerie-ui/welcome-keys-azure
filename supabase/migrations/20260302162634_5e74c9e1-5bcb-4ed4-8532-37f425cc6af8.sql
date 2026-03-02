
-- Missions table (concierge publishes, providers apply)
CREATE TABLE public.missions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  property_id uuid REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
  mission_type text NOT NULL DEFAULT 'cleaning',
  title text NOT NULL,
  instructions text,
  start_at timestamp with time zone NOT NULL,
  end_at timestamp with time zone,
  duration_minutes integer,
  payout_amount numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  selected_provider_id uuid REFERENCES public.service_providers(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Mission applications table
CREATE TABLE public.mission_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id uuid REFERENCES public.missions(id) ON DELETE CASCADE NOT NULL,
  provider_id uuid REFERENCES public.service_providers(id) ON DELETE CASCADE NOT NULL,
  message text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(mission_id, provider_id)
);

-- Enable RLS
ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mission_applications ENABLE ROW LEVEL SECURITY;

-- Function to check if user is a provider for a given concierge
CREATE OR REPLACE FUNCTION public.get_provider_concierge_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT concierge_user_id FROM service_providers
  WHERE auth_user_id = _user_id AND status = 'active'
  LIMIT 1;
$$;

-- Missions RLS: concierge full access
CREATE POLICY "missions_concierge_all" ON public.missions
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Missions RLS: provider can see open missions for their concierge + their assigned missions
CREATE POLICY "missions_provider_select" ON public.missions
  FOR SELECT TO authenticated
  USING (
    (status = 'open' AND user_id = get_provider_concierge_id(auth.uid()))
    OR selected_provider_id = get_service_provider_id(auth.uid())
  );

-- Missions RLS: provider can update their assigned missions (confirm, mark done)
CREATE POLICY "missions_provider_update" ON public.missions
  FOR UPDATE TO authenticated
  USING (selected_provider_id = get_service_provider_id(auth.uid()));

-- Applications RLS: concierge sees applications for their missions
CREATE POLICY "applications_concierge_select" ON public.mission_applications
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM missions WHERE missions.id = mission_applications.mission_id AND missions.user_id = auth.uid()
  ));

-- Applications RLS: concierge can update applications (accept/reject)
CREATE POLICY "applications_concierge_update" ON public.mission_applications
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM missions WHERE missions.id = mission_applications.mission_id AND missions.user_id = auth.uid()
  ));

-- Applications RLS: provider can insert their own applications
CREATE POLICY "applications_provider_insert" ON public.mission_applications
  FOR INSERT TO authenticated
  WITH CHECK (provider_id = get_service_provider_id(auth.uid()));

-- Applications RLS: provider can see their own applications
CREATE POLICY "applications_provider_select" ON public.mission_applications
  FOR SELECT TO authenticated
  USING (provider_id = get_service_provider_id(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER missions_updated_at BEFORE UPDATE ON public.missions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER mission_applications_updated_at BEFORE UPDATE ON public.mission_applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
