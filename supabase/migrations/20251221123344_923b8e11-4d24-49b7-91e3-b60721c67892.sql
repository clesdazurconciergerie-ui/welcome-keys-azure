-- ============================================
-- FIX CRITIQUE: Nettoyer et simplifier les RLS
-- Approche: UNE SEULE policy par opération = ownership strict
-- ============================================

-- 1. TABLE: users - Nettoyer les policies redondantes
DROP POLICY IF EXISTS "require_auth_users_select" ON public.users;
DROP POLICY IF EXISTS "require_auth_users_insert" ON public.users;
DROP POLICY IF EXISTS "require_auth_users_update" ON public.users;
DROP POLICY IF EXISTS "require_auth_users_delete" ON public.users;
DROP POLICY IF EXISTS "me_select" ON public.users;
DROP POLICY IF EXISTS "me_update_safe" ON public.users;
DROP POLICY IF EXISTS "no_client_insert" ON public.users;

-- Users: policy unique et claire
CREATE POLICY "users_select_own" ON public.users
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (id = auth.uid() AND role = (SELECT role FROM public.users WHERE id = auth.uid()));

CREATE POLICY "users_no_insert" ON public.users
  FOR INSERT WITH CHECK (false);

CREATE POLICY "users_no_delete" ON public.users
  FOR DELETE USING (false);

-- 2. TABLE: subscriptions - Nettoyer et simplifier
DROP POLICY IF EXISTS "require_auth_subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Service role can manage subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON public.subscriptions;

CREATE POLICY "subscriptions_select_own" ON public.subscriptions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "subscriptions_no_client_write" ON public.subscriptions
  FOR ALL USING (false) WITH CHECK (false);

-- 3. TABLE: booklet_contacts - Nettoyer et simplifier
DROP POLICY IF EXISTS "require_auth_booklet_contacts" ON public.booklet_contacts;
DROP POLICY IF EXISTS "Users can view contact info for their booklets" ON public.booklet_contacts;
DROP POLICY IF EXISTS "Users can insert contact info for their booklets" ON public.booklet_contacts;
DROP POLICY IF EXISTS "Users can update contact info for their booklets" ON public.booklet_contacts;
DROP POLICY IF EXISTS "Users can delete contact info for their booklets" ON public.booklet_contacts;

CREATE POLICY "booklet_contacts_owner_only" ON public.booklet_contacts
  FOR ALL 
  USING (EXISTS (
    SELECT 1 FROM public.booklets 
    WHERE booklets.id = booklet_contacts.booklet_id 
    AND booklets.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.booklets 
    WHERE booklets.id = booklet_contacts.booklet_id 
    AND booklets.user_id = auth.uid()
  ));

-- 4. TABLE: wifi_credentials - Nettoyer et simplifier
DROP POLICY IF EXISTS "require_auth_wifi_credentials" ON public.wifi_credentials;
DROP POLICY IF EXISTS "Users can view wifi credentials for their booklets" ON public.wifi_credentials;
DROP POLICY IF EXISTS "Users can insert wifi credentials for their booklets" ON public.wifi_credentials;
DROP POLICY IF EXISTS "Users can update wifi credentials for their booklets" ON public.wifi_credentials;
DROP POLICY IF EXISTS "Users can delete wifi credentials for their booklets" ON public.wifi_credentials;

CREATE POLICY "wifi_credentials_owner_only" ON public.wifi_credentials
  FOR ALL 
  USING (EXISTS (
    SELECT 1 FROM public.booklets 
    WHERE booklets.id = wifi_credentials.booklet_id 
    AND booklets.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.booklets 
    WHERE booklets.id = wifi_credentials.booklet_id 
    AND booklets.user_id = auth.uid()
  ));

-- 5. TABLE: booklets - Nettoyer et simplifier
DROP POLICY IF EXISTS "require_auth_booklets" ON public.booklets;
DROP POLICY IF EXISTS "booklets_owner_select" ON public.booklets;
DROP POLICY IF EXISTS "booklets_owner_insert" ON public.booklets;
DROP POLICY IF EXISTS "booklets_owner_update" ON public.booklets;
DROP POLICY IF EXISTS "booklets_owner_delete" ON public.booklets;
DROP POLICY IF EXISTS "prevent_second_demo_booklet" ON public.booklets;

CREATE POLICY "booklets_select_own" ON public.booklets
  FOR SELECT USING (
    user_id = auth.uid() 
    AND (is_demo = false OR demo_expires_at > now() OR demo_expires_at IS NULL)
  );

CREATE POLICY "booklets_insert_own" ON public.booklets
  FOR INSERT WITH CHECK (user_id = auth.uid() AND can_create_booklet(auth.uid()));

CREATE POLICY "booklets_update_own" ON public.booklets
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "booklets_delete_own" ON public.booklets
  FOR DELETE USING (user_id = auth.uid());

-- 6. TABLE: pins - Nettoyer et simplifier
DROP POLICY IF EXISTS "require_auth_pins" ON public.pins;
DROP POLICY IF EXISTS "Users can view pins for their booklets" ON public.pins;
DROP POLICY IF EXISTS "Users can insert pins for their booklets" ON public.pins;
DROP POLICY IF EXISTS "Users can update pins for their booklets" ON public.pins;
DROP POLICY IF EXISTS "Users can delete pins for their booklets" ON public.pins;

CREATE POLICY "pins_owner_only" ON public.pins
  FOR ALL 
  USING (EXISTS (
    SELECT 1 FROM public.booklets 
    WHERE booklets.id = pins.booklet_id 
    AND booklets.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.booklets 
    WHERE booklets.id = pins.booklet_id 
    AND booklets.user_id = auth.uid()
  ));

-- 7. TABLE: user_roles - Nettoyer et simplifier
DROP POLICY IF EXISTS "require_auth_user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "users_view_own_roles" ON public.user_roles;
DROP POLICY IF EXISTS "service_manage_roles" ON public.user_roles;

CREATE POLICY "user_roles_select_own" ON public.user_roles
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "user_roles_no_client_write" ON public.user_roles
  FOR ALL USING (false) WITH CHECK (false);

-- 8. TABLE: equipment - Nettoyer et simplifier
DROP POLICY IF EXISTS "require_auth_equipment" ON public.equipment;
DROP POLICY IF EXISTS "eq_owner_select" ON public.equipment;
DROP POLICY IF EXISTS "eq_owner_insert" ON public.equipment;
DROP POLICY IF EXISTS "eq_owner_update" ON public.equipment;
DROP POLICY IF EXISTS "eq_owner_delete" ON public.equipment;

CREATE POLICY "equipment_owner_only" ON public.equipment
  FOR ALL 
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- 9. TABLE: faq - Nettoyer et simplifier
DROP POLICY IF EXISTS "require_auth_faq" ON public.faq;
DROP POLICY IF EXISTS "Users can manage FAQ for their booklets" ON public.faq;

CREATE POLICY "faq_owner_only" ON public.faq
  FOR ALL 
  USING (EXISTS (
    SELECT 1 FROM public.booklets 
    WHERE booklets.id = faq.booklet_id 
    AND booklets.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.booklets 
    WHERE booklets.id = faq.booklet_id 
    AND booklets.user_id = auth.uid()
  ));

-- 10. TABLE: essentials - Nettoyer et simplifier
DROP POLICY IF EXISTS "require_auth_essentials" ON public.essentials;
DROP POLICY IF EXISTS "Users can manage essentials for their booklets" ON public.essentials;

CREATE POLICY "essentials_owner_only" ON public.essentials
  FOR ALL 
  USING (EXISTS (
    SELECT 1 FROM public.booklets 
    WHERE booklets.id = essentials.booklet_id 
    AND booklets.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.booklets 
    WHERE booklets.id = essentials.booklet_id 
    AND booklets.user_id = auth.uid()
  ));

-- 11. TABLE: restaurants - Nettoyer et simplifier
DROP POLICY IF EXISTS "require_auth_restaurants" ON public.restaurants;
DROP POLICY IF EXISTS "Users can manage restaurants for their booklets" ON public.restaurants;

CREATE POLICY "restaurants_owner_only" ON public.restaurants
  FOR ALL 
  USING (EXISTS (
    SELECT 1 FROM public.booklets 
    WHERE booklets.id = restaurants.booklet_id 
    AND booklets.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.booklets 
    WHERE booklets.id = restaurants.booklet_id 
    AND booklets.user_id = auth.uid()
  ));

-- 12. TABLE: activities - Nettoyer et simplifier
DROP POLICY IF EXISTS "require_auth_activities" ON public.activities;
DROP POLICY IF EXISTS "Users can manage activities for their booklets" ON public.activities;

CREATE POLICY "activities_owner_only" ON public.activities
  FOR ALL 
  USING (EXISTS (
    SELECT 1 FROM public.booklets 
    WHERE booklets.id = activities.booklet_id 
    AND booklets.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.booklets 
    WHERE booklets.id = activities.booklet_id 
    AND booklets.user_id = auth.uid()
  ));

-- 13. TABLE: transport - Nettoyer et simplifier
DROP POLICY IF EXISTS "require_auth_transport" ON public.transport;
DROP POLICY IF EXISTS "Users can manage transport for their booklets" ON public.transport;

CREATE POLICY "transport_owner_only" ON public.transport
  FOR ALL 
  USING (EXISTS (
    SELECT 1 FROM public.booklets 
    WHERE booklets.id = transport.booklet_id 
    AND booklets.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.booklets 
    WHERE booklets.id = transport.booklet_id 
    AND booklets.user_id = auth.uid()
  ));

-- 14. TABLE: highlights - Nettoyer et simplifier
DROP POLICY IF EXISTS "require_auth_highlights" ON public.highlights;
DROP POLICY IF EXISTS "Users can manage highlights for their booklets" ON public.highlights;

CREATE POLICY "highlights_owner_only" ON public.highlights
  FOR ALL 
  USING (EXISTS (
    SELECT 1 FROM public.booklets 
    WHERE booklets.id = highlights.booklet_id 
    AND booklets.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.booklets 
    WHERE booklets.id = highlights.booklet_id 
    AND booklets.user_id = auth.uid()
  ));

-- 15. TABLE: nearby_places - Nettoyer et simplifier
DROP POLICY IF EXISTS "require_auth_nearby_places" ON public.nearby_places;
DROP POLICY IF EXISTS "Users can manage nearby places for their booklets" ON public.nearby_places;

CREATE POLICY "nearby_places_owner_only" ON public.nearby_places
  FOR ALL 
  USING (EXISTS (
    SELECT 1 FROM public.booklets 
    WHERE booklets.id = nearby_places.booklet_id 
    AND booklets.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.booklets 
    WHERE booklets.id = nearby_places.booklet_id 
    AND booklets.user_id = auth.uid()
  ));