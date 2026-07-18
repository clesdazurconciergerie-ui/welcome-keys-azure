-- Helper: is current user the linked-active owner of a given property?
CREATE OR REPLACE FUNCTION public.is_owner_of_property(_property_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.owner_properties op
    JOIN public.owners o ON o.id = op.owner_id
    WHERE op.property_id = _property_id
      AND o.auth_user_id = auth.uid()
      AND o.status = 'active'
  );
$$;

-- Helper: is current user the linked-active owner referenced by owner_id?
CREATE OR REPLACE FUNCTION public.is_owner_row(_owner_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.owners o
    WHERE o.id = _owner_id
      AND o.auth_user_id = auth.uid()
      AND o.status = 'active'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_owner_of_property(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_owner_row(uuid) TO authenticated;

-- === SELECT policies for the owner portal ===

-- properties
DROP POLICY IF EXISTS properties_owner_read ON public.properties;
CREATE POLICY properties_owner_read ON public.properties
  FOR SELECT TO authenticated
  USING (public.is_owner_of_property(id));

-- bookings
DROP POLICY IF EXISTS bookings_owner_read ON public.bookings;
CREATE POLICY bookings_owner_read ON public.bookings
  FOR SELECT TO authenticated
  USING (property_id IS NOT NULL AND public.is_owner_of_property(property_id));

-- calendar_events
DROP POLICY IF EXISTS calendar_events_owner_read ON public.calendar_events;
CREATE POLICY calendar_events_owner_read ON public.calendar_events
  FOR SELECT TO authenticated
  USING (property_id IS NOT NULL AND public.is_owner_of_property(property_id));

-- calendar_overrides (owner needs to see hidden overrides too for filtering)
DROP POLICY IF EXISTS calendar_overrides_owner_read ON public.calendar_overrides;
CREATE POLICY calendar_overrides_owner_read ON public.calendar_overrides
  FOR SELECT TO authenticated
  USING (property_id IS NOT NULL AND public.is_owner_of_property(property_id));

-- ical_calendars
DROP POLICY IF EXISTS ical_calendars_owner_read ON public.ical_calendars;
CREATE POLICY ical_calendars_owner_read ON public.ical_calendars
  FOR SELECT TO authenticated
  USING (property_id IS NOT NULL AND public.is_owner_of_property(property_id));

-- cleaning_interventions
DROP POLICY IF EXISTS cleaning_interventions_owner_read ON public.cleaning_interventions;
CREATE POLICY cleaning_interventions_owner_read ON public.cleaning_interventions
  FOR SELECT TO authenticated
  USING (property_id IS NOT NULL AND public.is_owner_of_property(property_id));

-- cleaning_photos (linked via intervention → property)
DROP POLICY IF EXISTS cleaning_photos_owner_read ON public.cleaning_photos;
CREATE POLICY cleaning_photos_owner_read ON public.cleaning_photos
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.cleaning_interventions ci
    WHERE ci.id = cleaning_photos.intervention_id
      AND ci.property_id IS NOT NULL
      AND public.is_owner_of_property(ci.property_id)
  ));

-- missions
DROP POLICY IF EXISTS missions_owner_read ON public.missions;
CREATE POLICY missions_owner_read ON public.missions
  FOR SELECT TO authenticated
  USING (property_id IS NOT NULL AND public.is_owner_of_property(property_id));

-- property_documents
DROP POLICY IF EXISTS property_documents_owner_read ON public.property_documents;
CREATE POLICY property_documents_owner_read ON public.property_documents
  FOR SELECT TO authenticated
  USING (property_id IS NOT NULL AND public.is_owner_of_property(property_id));

-- property_photos
DROP POLICY IF EXISTS property_photos_owner_read ON public.property_photos;
CREATE POLICY property_photos_owner_read ON public.property_photos
  FOR SELECT TO authenticated
  USING (property_id IS NOT NULL AND public.is_owner_of_property(property_id));

-- inspections
DROP POLICY IF EXISTS inspections_owner_read ON public.inspections;
CREATE POLICY inspections_owner_read ON public.inspections
  FOR SELECT TO authenticated
  USING (property_id IS NOT NULL AND public.is_owner_of_property(property_id));

-- property_inspections
DROP POLICY IF EXISTS property_inspections_owner_read ON public.property_inspections;
CREATE POLICY property_inspections_owner_read ON public.property_inspections
  FOR SELECT TO authenticated
  USING (property_id IS NOT NULL AND public.is_owner_of_property(property_id));

-- booklets (owner reads only booklets attached to their property)
DROP POLICY IF EXISTS booklets_owner_read ON public.booklets;
CREATE POLICY booklets_owner_read ON public.booklets
  FOR SELECT TO authenticated
  USING (property_id IS NOT NULL AND public.is_owner_of_property(property_id));

-- invoices (owner_id path)
DROP POLICY IF EXISTS invoices_owner_read ON public.invoices;
CREATE POLICY invoices_owner_read ON public.invoices
  FOR SELECT TO authenticated
  USING (owner_id IS NOT NULL AND public.is_owner_row(owner_id));

-- monthly_reports (owner_id path)
DROP POLICY IF EXISTS monthly_reports_owner_read ON public.monthly_reports;
CREATE POLICY monthly_reports_owner_read ON public.monthly_reports
  FOR SELECT TO authenticated
  USING (owner_id IS NOT NULL AND public.is_owner_row(owner_id));

-- owner_documents (owner_id path)
DROP POLICY IF EXISTS owner_documents_owner_read ON public.owner_documents;
CREATE POLICY owner_documents_owner_read ON public.owner_documents
  FOR SELECT TO authenticated
  USING (owner_id IS NOT NULL AND public.is_owner_row(owner_id));

-- owner_requests (owner reads/creates their own via owner_id)
DROP POLICY IF EXISTS owner_requests_owner_read ON public.owner_requests;
CREATE POLICY owner_requests_owner_read ON public.owner_requests
  FOR SELECT TO authenticated
  USING (owner_id IS NOT NULL AND public.is_owner_row(owner_id));

DROP POLICY IF EXISTS owner_requests_owner_insert ON public.owner_requests;
CREATE POLICY owner_requests_owner_insert ON public.owner_requests
  FOR INSERT TO authenticated
  WITH CHECK (owner_id IS NOT NULL AND public.is_owner_row(owner_id));

-- owner_request_messages: owner can read/insert messages for own requests
DROP POLICY IF EXISTS owner_request_messages_owner_read ON public.owner_request_messages;
CREATE POLICY owner_request_messages_owner_read ON public.owner_request_messages
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.owner_requests r
    WHERE r.id = owner_request_messages.request_id
      AND r.owner_id IS NOT NULL
      AND public.is_owner_row(r.owner_id)
  ));

DROP POLICY IF EXISTS owner_request_messages_owner_insert ON public.owner_request_messages;
CREATE POLICY owner_request_messages_owner_insert ON public.owner_request_messages
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.owner_requests r
    WHERE r.id = owner_request_messages.request_id
      AND r.owner_id IS NOT NULL
      AND public.is_owner_row(r.owner_id)
  ));

-- azurkeys_reports: tighten from public read to concierge-only + linked-owner read via property slug
DROP POLICY IF EXISTS azurkeys_reports_auth_all ON public.azurkeys_reports;
CREATE POLICY azurkeys_reports_concierge_all ON public.azurkeys_reports
  FOR ALL TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());
CREATE POLICY azurkeys_reports_owner_read ON public.azurkeys_reports
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.name = azurkeys_reports.property_slug
      AND public.is_owner_of_property(p.id)
  ));
