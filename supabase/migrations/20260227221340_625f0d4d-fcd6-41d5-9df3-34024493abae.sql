
-- Fix properties RLS: change RESTRICTIVE to PERMISSIVE
DROP POLICY IF EXISTS "properties_block_anon" ON properties;
DROP POLICY IF EXISTS "properties_owner_manage" ON properties;

CREATE POLICY "properties_select_own" ON properties FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "properties_insert_own" ON properties FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "properties_update_own" ON properties FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "properties_delete_own" ON properties FOR DELETE USING (user_id = auth.uid());

-- Fix property_photos RLS
DROP POLICY IF EXISTS "property_photos_block_anon" ON property_photos;
DROP POLICY IF EXISTS "property_photos_owner_manage" ON property_photos;

CREATE POLICY "property_photos_select_own" ON property_photos FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "property_photos_insert_own" ON property_photos FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "property_photos_update_own" ON property_photos FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "property_photos_delete_own" ON property_photos FOR DELETE USING (user_id = auth.uid());

-- Fix property_documents RLS
DROP POLICY IF EXISTS "property_documents_block_anon" ON property_documents;
DROP POLICY IF EXISTS "property_documents_owner_manage" ON property_documents;

CREATE POLICY "property_documents_select_own" ON property_documents FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "property_documents_insert_own" ON property_documents FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "property_documents_update_own" ON property_documents FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "property_documents_delete_own" ON property_documents FOR DELETE USING (user_id = auth.uid());
