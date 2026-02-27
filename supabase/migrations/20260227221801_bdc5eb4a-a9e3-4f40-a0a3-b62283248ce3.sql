
-- Fix owners RLS: change RESTRICTIVE to PERMISSIVE
DROP POLICY IF EXISTS "owners_block_anon" ON owners;
DROP POLICY IF EXISTS "owners_concierge_manage" ON owners;

CREATE POLICY "owners_select" ON owners FOR SELECT USING (concierge_user_id = auth.uid() OR auth_user_id = auth.uid());
CREATE POLICY "owners_insert" ON owners FOR INSERT WITH CHECK (concierge_user_id = auth.uid());
CREATE POLICY "owners_update" ON owners FOR UPDATE USING (concierge_user_id = auth.uid() OR auth_user_id = auth.uid()) WITH CHECK (concierge_user_id = auth.uid());
CREATE POLICY "owners_delete" ON owners FOR DELETE USING (concierge_user_id = auth.uid());

-- Fix owner_properties RLS
DROP POLICY IF EXISTS "owner_properties_block_anon" ON owner_properties;
DROP POLICY IF EXISTS "owner_properties_manage" ON owner_properties;

CREATE POLICY "owner_properties_select" ON owner_properties FOR SELECT USING (
  EXISTS (SELECT 1 FROM owners WHERE owners.id = owner_properties.owner_id AND (owners.concierge_user_id = auth.uid() OR owners.auth_user_id = auth.uid()))
  OR EXISTS (SELECT 1 FROM properties WHERE properties.id = owner_properties.property_id AND properties.user_id = auth.uid())
);
CREATE POLICY "owner_properties_insert" ON owner_properties FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM properties WHERE properties.id = owner_properties.property_id AND properties.user_id = auth.uid())
);
CREATE POLICY "owner_properties_update" ON owner_properties FOR UPDATE USING (
  EXISTS (SELECT 1 FROM properties WHERE properties.id = owner_properties.property_id AND properties.user_id = auth.uid())
);
CREATE POLICY "owner_properties_delete" ON owner_properties FOR DELETE USING (
  EXISTS (SELECT 1 FROM properties WHERE properties.id = owner_properties.property_id AND properties.user_id = auth.uid())
);

-- Fix owner_documents RLS
DROP POLICY IF EXISTS "owner_documents_block_anon" ON owner_documents;
DROP POLICY IF EXISTS "owner_documents_concierge_manage" ON owner_documents;

CREATE POLICY "owner_documents_select" ON owner_documents FOR SELECT USING (
  concierge_user_id = auth.uid() OR EXISTS (SELECT 1 FROM owners WHERE owners.id = owner_documents.owner_id AND owners.auth_user_id = auth.uid())
);
CREATE POLICY "owner_documents_insert" ON owner_documents FOR INSERT WITH CHECK (concierge_user_id = auth.uid());
CREATE POLICY "owner_documents_update" ON owner_documents FOR UPDATE USING (concierge_user_id = auth.uid());
CREATE POLICY "owner_documents_delete" ON owner_documents FOR DELETE USING (concierge_user_id = auth.uid());

-- Fix owner_interventions RLS
DROP POLICY IF EXISTS "owner_interventions_block_anon" ON owner_interventions;
DROP POLICY IF EXISTS "owner_interventions_concierge_manage" ON owner_interventions;

CREATE POLICY "owner_interventions_select" ON owner_interventions FOR SELECT USING (
  concierge_user_id = auth.uid() OR EXISTS (SELECT 1 FROM owners WHERE owners.id = owner_interventions.owner_id AND owners.auth_user_id = auth.uid())
);
CREATE POLICY "owner_interventions_insert" ON owner_interventions FOR INSERT WITH CHECK (concierge_user_id = auth.uid());
CREATE POLICY "owner_interventions_update" ON owner_interventions FOR UPDATE USING (concierge_user_id = auth.uid());
CREATE POLICY "owner_interventions_delete" ON owner_interventions FOR DELETE USING (concierge_user_id = auth.uid());
