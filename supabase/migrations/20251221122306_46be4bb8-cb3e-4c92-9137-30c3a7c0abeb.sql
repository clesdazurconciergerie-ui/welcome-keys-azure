-- ═══════════════════════════════════════════════════════════════
-- SÉCURISATION CRITIQUE : Bloquer tout accès anonyme aux données sensibles
-- ═══════════════════════════════════════════════════════════════

-- 1. TABLE USERS - Emails et Stripe IDs
-- Supprimer toute policy permissive existante qui pourrait permettre un accès public
-- Les policies actuelles sont RESTRICTIVE, mais on ajoute une protection explicite

-- Bloquer explicitement les accès anon/public sur users
CREATE POLICY "block_anon_access_users"
ON public.users
AS PERMISSIVE
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- 2. TABLE SUBSCRIPTIONS - Stripe IDs sensibles
-- Bloquer les accès anon sur subscriptions
CREATE POLICY "block_anon_access_subscriptions"
ON public.subscriptions
AS PERMISSIVE
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- 3. TABLE BOOKLET_CONTACTS - Emails et téléphones
CREATE POLICY "block_anon_access_booklet_contacts"
ON public.booklet_contacts
AS PERMISSIVE
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- 4. TABLE WIFI_CREDENTIALS - Mots de passe WiFi
CREATE POLICY "block_anon_access_wifi_credentials"
ON public.wifi_credentials
AS PERMISSIVE
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- 5. TABLE BOOKLETS - Access codes sensibles
CREATE POLICY "block_anon_access_booklets"
ON public.booklets
AS PERMISSIVE
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- 6. TABLE PINS - Codes PIN d'accès
CREATE POLICY "block_anon_access_pins"
ON public.pins
AS PERMISSIVE
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- 7. TABLE EQUIPMENT
CREATE POLICY "block_anon_access_equipment"
ON public.equipment
AS PERMISSIVE
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- 8. TABLE FAQ
CREATE POLICY "block_anon_access_faq"
ON public.faq
AS PERMISSIVE
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- 9. TABLE ESSENTIALS - Téléphones
CREATE POLICY "block_anon_access_essentials"
ON public.essentials
AS PERMISSIVE
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- 10. TABLE RESTAURANTS - Téléphones et adresses
CREATE POLICY "block_anon_access_restaurants"
ON public.restaurants
AS PERMISSIVE
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- 11. TABLE ACTIVITIES - URLs de réservation
CREATE POLICY "block_anon_access_activities"
ON public.activities
AS PERMISSIVE
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- 12. TABLE TRANSPORT
CREATE POLICY "block_anon_access_transport"
ON public.transport
AS PERMISSIVE
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- 13. TABLE HIGHLIGHTS
CREATE POLICY "block_anon_access_highlights"
ON public.highlights
AS PERMISSIVE
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- 14. TABLE NEARBY_PLACES
CREATE POLICY "block_anon_access_nearby_places"
ON public.nearby_places
AS PERMISSIVE
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- 15. TABLE USER_ROLES
CREATE POLICY "block_anon_access_user_roles"
ON public.user_roles
AS PERMISSIVE
FOR ALL
TO anon
USING (false)
WITH CHECK (false);