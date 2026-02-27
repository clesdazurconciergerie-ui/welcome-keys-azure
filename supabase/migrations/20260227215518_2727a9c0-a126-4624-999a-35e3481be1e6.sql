
-- =============================================
-- Phase 1: Owners (Propriétaires) tables
-- =============================================

-- Table des propriétaires gérés par la conciergerie
CREATE TABLE public.owners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  concierge_user_id UUID NOT NULL,
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table de liaison propriétaires <-> logements (booklets)
CREATE TABLE public.owner_properties (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES public.owners(id) ON DELETE CASCADE,
  booklet_id UUID NOT NULL REFERENCES public.booklets(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(owner_id, booklet_id)
);

-- Table des documents propriétaires
CREATE TABLE public.owner_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES public.owners(id) ON DELETE CASCADE,
  concierge_user_id UUID NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'other',
  file_url TEXT NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table des interventions
CREATE TABLE public.owner_interventions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES public.owners(id) ON DELETE CASCADE,
  booklet_id UUID REFERENCES public.booklets(id) ON DELETE SET NULL,
  concierge_user_id UUID NOT NULL,
  type TEXT NOT NULL DEFAULT 'maintenance',
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  scheduled_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.owner_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.owner_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.owner_interventions ENABLE ROW LEVEL SECURITY;

-- RLS: Block anonymous access
CREATE POLICY "owners_block_anon" ON public.owners AS RESTRICTIVE FOR ALL TO public USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "owner_properties_block_anon" ON public.owner_properties AS RESTRICTIVE FOR ALL TO public USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "owner_documents_block_anon" ON public.owner_documents AS RESTRICTIVE FOR ALL TO public USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "owner_interventions_block_anon" ON public.owner_interventions AS RESTRICTIVE FOR ALL TO public USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- RLS: Concierge can manage their own owners
CREATE POLICY "owners_concierge_manage" ON public.owners AS RESTRICTIVE FOR ALL TO authenticated 
  USING (concierge_user_id = auth.uid() OR auth_user_id = auth.uid())
  WITH CHECK (concierge_user_id = auth.uid());

CREATE POLICY "owner_properties_concierge_manage" ON public.owner_properties AS RESTRICTIVE FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.owners WHERE owners.id = owner_properties.owner_id AND (owners.concierge_user_id = auth.uid() OR owners.auth_user_id = auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.owners WHERE owners.id = owner_properties.owner_id AND owners.concierge_user_id = auth.uid()));

CREATE POLICY "owner_documents_concierge_manage" ON public.owner_documents AS RESTRICTIVE FOR ALL TO authenticated
  USING (concierge_user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.owners WHERE owners.id = owner_documents.owner_id AND owners.auth_user_id = auth.uid()))
  WITH CHECK (concierge_user_id = auth.uid());

CREATE POLICY "owner_interventions_concierge_manage" ON public.owner_interventions AS RESTRICTIVE FOR ALL TO authenticated
  USING (concierge_user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.owners WHERE owners.id = owner_interventions.owner_id AND owners.auth_user_id = auth.uid()))
  WITH CHECK (concierge_user_id = auth.uid());

-- Triggers for updated_at
CREATE TRIGGER update_owners_updated_at BEFORE UPDATE ON public.owners FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_owner_interventions_updated_at BEFORE UPDATE ON public.owner_interventions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for owner documents
INSERT INTO storage.buckets (id, name, public) VALUES ('owner-documents', 'owner-documents', false);

CREATE POLICY "owner_docs_upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'owner-documents' AND auth.uid() IS NOT NULL);
CREATE POLICY "owner_docs_select" ON storage.objects FOR SELECT USING (bucket_id = 'owner-documents' AND auth.uid() IS NOT NULL);
CREATE POLICY "owner_docs_delete" ON storage.objects FOR DELETE USING (bucket_id = 'owner-documents' AND auth.uid() IS NOT NULL);
