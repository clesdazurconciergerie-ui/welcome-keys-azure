-- ═══════════════════════════════════════════════════════════════
-- CORRECTION : Remplacer les policies PERMISSIVE par RESTRICTIVE
-- pour bloquer définitivement tout accès anonyme
-- ═══════════════════════════════════════════════════════════════

-- Supprimer les anciennes policies qui ne fonctionnent pas correctement
DROP POLICY IF EXISTS "block_anon_access_users" ON public.users;
DROP POLICY IF EXISTS "block_anon_access_subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "block_anon_access_booklet_contacts" ON public.booklet_contacts;
DROP POLICY IF EXISTS "block_anon_access_wifi_credentials" ON public.wifi_credentials;
DROP POLICY IF EXISTS "block_anon_access_booklets" ON public.booklets;
DROP POLICY IF EXISTS "block_anon_access_pins" ON public.pins;
DROP POLICY IF EXISTS "block_anon_access_equipment" ON public.equipment;
DROP POLICY IF EXISTS "block_anon_access_faq" ON public.faq;
DROP POLICY IF EXISTS "block_anon_access_essentials" ON public.essentials;
DROP POLICY IF EXISTS "block_anon_access_restaurants" ON public.restaurants;
DROP POLICY IF EXISTS "block_anon_access_activities" ON public.activities;
DROP POLICY IF EXISTS "block_anon_access_transport" ON public.transport;
DROP POLICY IF EXISTS "block_anon_access_highlights" ON public.highlights;
DROP POLICY IF EXISTS "block_anon_access_nearby_places" ON public.nearby_places;
DROP POLICY IF EXISTS "block_anon_access_user_roles" ON public.user_roles;

-- ═══════════════════════════════════════════════════════════════
-- APPROCHE CORRECTE : Policies RESTRICTIVE qui exigent l'authentification
-- Ces policies s'appliquent EN PLUS des policies existantes et 
-- bloquent tout accès si auth.uid() IS NULL
-- ═══════════════════════════════════════════════════════════════

-- 1. TABLE USERS - Protection emails et Stripe IDs
CREATE POLICY "require_auth_users"
ON public.users
AS RESTRICTIVE
FOR ALL
TO public
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- 2. TABLE SUBSCRIPTIONS - Protection Stripe IDs
CREATE POLICY "require_auth_subscriptions"
ON public.subscriptions
AS RESTRICTIVE
FOR ALL
TO public
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- 3. TABLE BOOKLET_CONTACTS - Protection emails/téléphones
CREATE POLICY "require_auth_booklet_contacts"
ON public.booklet_contacts
AS RESTRICTIVE
FOR ALL
TO public
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- 4. TABLE WIFI_CREDENTIALS - Protection mots de passe WiFi
CREATE POLICY "require_auth_wifi_credentials"
ON public.wifi_credentials
AS RESTRICTIVE
FOR ALL
TO public
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- 5. TABLE BOOKLETS - Protection access codes
CREATE POLICY "require_auth_booklets"
ON public.booklets
AS RESTRICTIVE
FOR ALL
TO public
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- 6. TABLE PINS - Protection codes PIN
CREATE POLICY "require_auth_pins"
ON public.pins
AS RESTRICTIVE
FOR ALL
TO public
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- 7. TABLE EQUIPMENT
CREATE POLICY "require_auth_equipment"
ON public.equipment
AS RESTRICTIVE
FOR ALL
TO public
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- 8. TABLE FAQ
CREATE POLICY "require_auth_faq"
ON public.faq
AS RESTRICTIVE
FOR ALL
TO public
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- 9. TABLE ESSENTIALS
CREATE POLICY "require_auth_essentials"
ON public.essentials
AS RESTRICTIVE
FOR ALL
TO public
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- 10. TABLE RESTAURANTS
CREATE POLICY "require_auth_restaurants"
ON public.restaurants
AS RESTRICTIVE
FOR ALL
TO public
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- 11. TABLE ACTIVITIES
CREATE POLICY "require_auth_activities"
ON public.activities
AS RESTRICTIVE
FOR ALL
TO public
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- 12. TABLE TRANSPORT
CREATE POLICY "require_auth_transport"
ON public.transport
AS RESTRICTIVE
FOR ALL
TO public
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- 13. TABLE HIGHLIGHTS
CREATE POLICY "require_auth_highlights"
ON public.highlights
AS RESTRICTIVE
FOR ALL
TO public
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- 14. TABLE NEARBY_PLACES
CREATE POLICY "require_auth_nearby_places"
ON public.nearby_places
AS RESTRICTIVE
FOR ALL
TO public
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- 15. TABLE USER_ROLES
CREATE POLICY "require_auth_user_roles"
ON public.user_roles
AS RESTRICTIVE
FOR ALL
TO public
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);