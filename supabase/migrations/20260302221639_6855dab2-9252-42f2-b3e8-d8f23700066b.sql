
-- 1. Owner requests table (messaging between owner and concierge)
CREATE TABLE public.owner_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  owner_id uuid NOT NULL REFERENCES public.owners(id) ON DELETE CASCADE,
  property_id uuid REFERENCES public.properties(id),
  category text NOT NULL DEFAULT 'other',
  title text,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.owner_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "or_owner_all" ON public.owner_requests FOR ALL
  USING (EXISTS (SELECT 1 FROM owners WHERE owners.id = owner_requests.owner_id AND owners.auth_user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM owners WHERE owners.id = owner_requests.owner_id AND owners.auth_user_id = auth.uid()));

CREATE POLICY "or_concierge_all" ON public.owner_requests FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TRIGGER update_owner_requests_updated_at
  BEFORE UPDATE ON public.owner_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Owner request messages table
CREATE TABLE public.owner_request_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.owner_requests(id) ON DELETE CASCADE,
  sender_role text NOT NULL DEFAULT 'owner',
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.owner_request_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "orm_access" ON public.owner_request_messages FOR ALL
  USING (EXISTS (
    SELECT 1 FROM owner_requests r
    LEFT JOIN owners o ON o.id = r.owner_id
    WHERE r.id = owner_request_messages.request_id
    AND (r.user_id = auth.uid() OR o.auth_user_id = auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM owner_requests r
    LEFT JOIN owners o ON o.id = r.owner_id
    WHERE r.id = owner_request_messages.request_id
    AND (r.user_id = auth.uid() OR o.auth_user_id = auth.uid())
  ));

-- 3. Calendar events: allow owners to see events for their properties
CREATE POLICY "ce_owner_select" ON public.calendar_events FOR SELECT
  USING (is_owner_of_property(auth.uid(), property_id));

-- 4. Allow owners to upload their own documents
CREATE POLICY "owner_documents_owner_insert_self" ON public.owner_documents FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM owners WHERE owners.id = owner_documents.owner_id AND owners.auth_user_id = auth.uid()));

-- 5. Allow owners to delete their own uploaded documents
CREATE POLICY "owner_documents_owner_delete_self" ON public.owner_documents FOR DELETE
  USING (EXISTS (SELECT 1 FROM owners WHERE owners.id = owner_documents.owner_id AND owners.auth_user_id = auth.uid()));

-- 6. Storage policy for owner-documents bucket (owner upload)
CREATE POLICY "owner_can_upload_own_docs" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'owner-documents'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "owner_can_read_own_docs" ON storage.objects FOR SELECT
  USING (
    bucket_id = 'owner-documents'
    AND auth.uid() IS NOT NULL
  );
