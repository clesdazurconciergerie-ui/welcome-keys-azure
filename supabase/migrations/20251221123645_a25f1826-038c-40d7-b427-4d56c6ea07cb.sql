-- Policies RESTRICTIVE pour bloquer anon sur toutes les tables sensibles
CREATE POLICY "users_block_anon" ON public.users AS RESTRICTIVE FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "subscriptions_block_anon" ON public.subscriptions AS RESTRICTIVE FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "booklet_contacts_block_anon" ON public.booklet_contacts AS RESTRICTIVE FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "wifi_credentials_block_anon" ON public.wifi_credentials AS RESTRICTIVE FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "booklets_block_anon" ON public.booklets AS RESTRICTIVE FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "pins_block_anon" ON public.pins AS RESTRICTIVE FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "user_roles_block_anon" ON public.user_roles AS RESTRICTIVE FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "equipment_block_anon" ON public.equipment AS RESTRICTIVE FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "faq_block_anon" ON public.faq AS RESTRICTIVE FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "essentials_block_anon" ON public.essentials AS RESTRICTIVE FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "restaurants_block_anon" ON public.restaurants AS RESTRICTIVE FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "activities_block_anon" ON public.activities AS RESTRICTIVE FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "transport_block_anon" ON public.transport AS RESTRICTIVE FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "highlights_block_anon" ON public.highlights AS RESTRICTIVE FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "nearby_places_block_anon" ON public.nearby_places AS RESTRICTIVE FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "signup_errors_block_anon" ON public._signup_errors AS RESTRICTIVE FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);