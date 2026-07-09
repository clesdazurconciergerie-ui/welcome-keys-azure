CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY,
  email text UNIQUE NOT NULL,
  role text DEFAULT 'free_trial',
  plan text DEFAULT 'basic',
  booklet_quota integer DEFAULT 3,
  trial_expires_at timestamptz,
  subscription_status text DEFAULT 'none',
  onboarding_completed boolean DEFAULT false,
  onboarding_completed_at timestamptz,
  stripe_customer_id text,
  latest_checkout_session_id text,
  full_name text, avatar_url text, phone text,
  demo_token_issued_at timestamptz, demo_token_expires_at timestamptz,
  has_used_demo boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO authenticated;
GRANT ALL ON public.users TO service_role;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL, slug text UNIQUE,
  price_cents integer DEFAULT 0, currency text DEFAULT 'EUR', interval text DEFAULT 'month',
  booklet_quota integer DEFAULT 5, features jsonb DEFAULT '{}'::jsonb, is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.plans TO anon, authenticated;
GRANT ALL ON public.plans TO service_role;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "plans_public_read" ON public.plans;
CREATE POLICY "plans_public_read" ON public.plans FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL, plan_id uuid REFERENCES public.plans(id) ON DELETE SET NULL,
  stripe_subscription_id text, stripe_customer_id text, status text DEFAULT 'none',
  current_period_start timestamptz, current_period_end timestamptz,
  cancel_at_period_end boolean DEFAULT false, canceled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "subs_select_own" ON public.subscriptions;
CREATE POLICY "subs_select_own" ON public.subscriptions FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.booklets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text, concierge_name text, logo_url text,
  appearance jsonb DEFAULT '{}'::jsonb,
  wizard_step integer DEFAULT 1, is_complete boolean DEFAULT false, status text DEFAULT 'draft',
  address text, city text, postcode text, country text, description text,
  wifi_name text, wifi_password text, contact_email text, contact_phone text,
  nearby jsonb DEFAULT '[]'::jsonb, gallery jsonb DEFAULT '[]'::jsonb,
  tagline text, language text DEFAULT 'fr', show_logo boolean DEFAULT true,
  google_maps_link text, access_code text,
  checkin_procedure text, checkout_procedure text, parking_info text, safety_tips text,
  manual_pdf_url text, waste_location text, sorting_instructions text,
  cleaning_rules text, cleaning_tips text, airbnb_license text,
  safety_instructions text, gdpr_notice text, disclaimer text,
  geo jsonb DEFAULT '{"lat": null, "lon": null}'::jsonb,
  timezone text DEFAULT 'Europe/Paris',
  background_color text DEFAULT '#ffffff', accent_color text DEFAULT '#18c0df', text_color text DEFAULT '#1a1a1a',
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.booklets TO authenticated;
GRANT SELECT ON public.booklets TO anon;
GRANT ALL ON public.booklets TO service_role;
ALTER TABLE public.booklets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "booklets_owner_all" ON public.booklets;
CREATE POLICY "booklets_owner_all" ON public.booklets FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.pins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booklet_id uuid NOT NULL REFERENCES public.booklets(id) ON DELETE CASCADE,
  pin_code text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.pins TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.pins TO authenticated;
GRANT ALL ON public.pins TO service_role;
CREATE INDEX IF NOT EXISTS idx_pins_code ON public.pins(pin_code);
ALTER TABLE public.pins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pins_public_read" ON public.pins;
CREATE POLICY "pins_public_read" ON public.pins FOR SELECT USING (true);
DROP POLICY IF EXISTS "pins_owner_write" ON public.pins;
CREATE POLICY "pins_owner_write" ON public.pins FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.booklets b WHERE b.id = pins.booklet_id AND b.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.booklets b WHERE b.id = pins.booklet_id AND b.user_id = auth.uid()));

CREATE TABLE IF NOT EXISTS public.wifi_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booklet_id uuid NOT NULL REFERENCES public.booklets(id) ON DELETE CASCADE,
  ssid text NOT NULL, password text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wifi_credentials TO authenticated;
GRANT ALL ON public.wifi_credentials TO service_role;
CREATE UNIQUE INDEX IF NOT EXISTS wifi_credentials_booklet_unique_idx ON public.wifi_credentials(booklet_id);
ALTER TABLE public.wifi_credentials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "wifi_credentials_owner_all" ON public.wifi_credentials;
CREATE POLICY "wifi_credentials_owner_all" ON public.wifi_credentials FOR ALL TO authenticated
  USING (EXISTS(SELECT 1 FROM public.booklets b WHERE b.id = wifi_credentials.booklet_id AND b.user_id = auth.uid()))
  WITH CHECK (EXISTS(SELECT 1 FROM public.booklets b WHERE b.id = wifi_credentials.booklet_id AND b.user_id = auth.uid()));

CREATE TABLE IF NOT EXISTS public.booklet_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booklet_id uuid NOT NULL REFERENCES public.booklets(id) ON DELETE CASCADE,
  contact_email text, contact_phone text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.booklet_contacts TO authenticated;
GRANT ALL ON public.booklet_contacts TO service_role;
CREATE UNIQUE INDEX IF NOT EXISTS booklet_contacts_booklet_unique_idx ON public.booklet_contacts(booklet_id);
ALTER TABLE public.booklet_contacts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "booklet_contacts_owner_all" ON public.booklet_contacts;
CREATE POLICY "booklet_contacts_owner_all" ON public.booklet_contacts FOR ALL TO authenticated
  USING (EXISTS(SELECT 1 FROM public.booklets b WHERE b.id = booklet_contacts.booklet_id AND b.user_id = auth.uid()))
  WITH CHECK (EXISTS(SELECT 1 FROM public.booklets b WHERE b.id = booklet_contacts.booklet_id AND b.user_id = auth.uid()));

CREATE TABLE IF NOT EXISTS public.equipment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booklet_id uuid NOT NULL REFERENCES public.booklets(id) ON DELETE CASCADE,
  name text NOT NULL, category text NOT NULL, instructions text, manual_url text,
  photos jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.equipment TO authenticated;
GRANT SELECT ON public.equipment TO anon;
GRANT ALL ON public.equipment TO service_role;
CREATE INDEX IF NOT EXISTS equipment_booklet_idx ON public.equipment(booklet_id);
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "equipment_owner_all" ON public.equipment;
CREATE POLICY "equipment_owner_all" ON public.equipment FOR ALL TO authenticated
  USING (EXISTS(SELECT 1 FROM public.booklets b WHERE b.id = equipment.booklet_id AND b.user_id = auth.uid()))
  WITH CHECK (EXISTS(SELECT 1 FROM public.booklets b WHERE b.id = equipment.booklet_id AND b.user_id = auth.uid()));

CREATE TABLE IF NOT EXISTS public.nearby_places (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booklet_id uuid NOT NULL REFERENCES public.booklets(id) ON DELETE CASCADE,
  name text NOT NULL, type text NOT NULL, distance text, maps_link text, description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nearby_places TO authenticated;
GRANT SELECT ON public.nearby_places TO anon;
GRANT ALL ON public.nearby_places TO service_role;
CREATE INDEX IF NOT EXISTS nearby_places_booklet_idx ON public.nearby_places(booklet_id);
ALTER TABLE public.nearby_places ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "nearby_places_owner_all" ON public.nearby_places;
CREATE POLICY "nearby_places_owner_all" ON public.nearby_places FOR ALL TO authenticated
  USING (EXISTS(SELECT 1 FROM public.booklets b WHERE b.id = nearby_places.booklet_id AND b.user_id = auth.uid()))
  WITH CHECK (EXISTS(SELECT 1 FROM public.booklets b WHERE b.id = nearby_places.booklet_id AND b.user_id = auth.uid()));

CREATE TABLE IF NOT EXISTS public.faq (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booklet_id uuid NOT NULL REFERENCES public.booklets(id) ON DELETE CASCADE,
  question text NOT NULL, answer text NOT NULL,
  order_index integer DEFAULT 0, is_favorite boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.faq TO authenticated;
GRANT SELECT ON public.faq TO anon;
GRANT ALL ON public.faq TO service_role;
CREATE INDEX IF NOT EXISTS faq_booklet_idx ON public.faq(booklet_id);
ALTER TABLE public.faq ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "faq_owner_all" ON public.faq;
CREATE POLICY "faq_owner_all" ON public.faq FOR ALL TO authenticated
  USING (EXISTS(SELECT 1 FROM public.booklets b WHERE b.id = faq.booklet_id AND b.user_id = auth.uid()))
  WITH CHECK (EXISTS(SELECT 1 FROM public.booklets b WHERE b.id = faq.booklet_id AND b.user_id = auth.uid()));

CREATE TABLE IF NOT EXISTS public.highlights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booklet_id uuid NOT NULL REFERENCES public.booklets(id) ON DELETE CASCADE,
  title text NOT NULL, type text NOT NULL, rating numeric(2,1),
  description text, url text, price_range text,
  tags text[] DEFAULT '{}', order_index integer DEFAULT 0,
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.highlights TO authenticated;
GRANT SELECT ON public.highlights TO anon;
GRANT ALL ON public.highlights TO service_role;
ALTER TABLE public.highlights ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "highlights_owner_all" ON public.highlights;
CREATE POLICY "highlights_owner_all" ON public.highlights FOR ALL TO authenticated
  USING (EXISTS(SELECT 1 FROM public.booklets b WHERE b.id = highlights.booklet_id AND b.user_id = auth.uid()))
  WITH CHECK (EXISTS(SELECT 1 FROM public.booklets b WHERE b.id = highlights.booklet_id AND b.user_id = auth.uid()));

CREATE TABLE IF NOT EXISTS public.restaurants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booklet_id uuid NOT NULL REFERENCES public.booklets(id) ON DELETE CASCADE,
  name text NOT NULL, cuisine text, price_range text, address text, phone text, url text,
  rating numeric(2,1), tags text[] DEFAULT '{}', is_owner_pick boolean DEFAULT false,
  order_index integer DEFAULT 0,
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.restaurants TO authenticated;
GRANT SELECT ON public.restaurants TO anon;
GRANT ALL ON public.restaurants TO service_role;
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "restaurants_owner_all" ON public.restaurants;
CREATE POLICY "restaurants_owner_all" ON public.restaurants FOR ALL TO authenticated
  USING (EXISTS(SELECT 1 FROM public.booklets b WHERE b.id = restaurants.booklet_id AND b.user_id = auth.uid()))
  WITH CHECK (EXISTS(SELECT 1 FROM public.booklets b WHERE b.id = restaurants.booklet_id AND b.user_id = auth.uid()));

CREATE TABLE IF NOT EXISTS public.activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booklet_id uuid NOT NULL REFERENCES public.booklets(id) ON DELETE CASCADE,
  name text NOT NULL, category text, when_available text[] DEFAULT '{}',
  duration text, price text, booking_url text, age_restrictions text,
  tags text[] DEFAULT '{}', is_owner_pick boolean DEFAULT false, order_index integer DEFAULT 0,
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activities TO authenticated;
GRANT SELECT ON public.activities TO anon;
GRANT ALL ON public.activities TO service_role;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "activities_owner_all" ON public.activities;
CREATE POLICY "activities_owner_all" ON public.activities FOR ALL TO authenticated
  USING (EXISTS(SELECT 1 FROM public.booklets b WHERE b.id = activities.booklet_id AND b.user_id = auth.uid()))
  WITH CHECK (EXISTS(SELECT 1 FROM public.booklets b WHERE b.id = activities.booklet_id AND b.user_id = auth.uid()));

CREATE TABLE IF NOT EXISTS public.essentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booklet_id uuid NOT NULL REFERENCES public.booklets(id) ON DELETE CASCADE,
  name text NOT NULL, type text NOT NULL, address text, phone text,
  hours text, distance text, notes text, order_index integer DEFAULT 0,
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.essentials TO authenticated;
GRANT SELECT ON public.essentials TO anon;
GRANT ALL ON public.essentials TO service_role;
ALTER TABLE public.essentials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "essentials_owner_all" ON public.essentials;
CREATE POLICY "essentials_owner_all" ON public.essentials FOR ALL TO authenticated
  USING (EXISTS(SELECT 1 FROM public.booklets b WHERE b.id = essentials.booklet_id AND b.user_id = auth.uid()))
  WITH CHECK (EXISTS(SELECT 1 FROM public.booklets b WHERE b.id = essentials.booklet_id AND b.user_id = auth.uid()));

CREATE TABLE IF NOT EXISTS public.transport (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booklet_id uuid NOT NULL REFERENCES public.booklets(id) ON DELETE CASCADE,
  name text NOT NULL, type text NOT NULL, address text, distance text,
  instructions text, price text, url text, order_index integer DEFAULT 0,
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transport TO authenticated;
GRANT SELECT ON public.transport TO anon;
GRANT ALL ON public.transport TO service_role;
ALTER TABLE public.transport ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "transport_owner_all" ON public.transport;
CREATE POLICY "transport_owner_all" ON public.transport FOR ALL TO authenticated
  USING (EXISTS(SELECT 1 FROM public.booklets b WHERE b.id = transport.booklet_id AND b.user_id = auth.uid()))
  WITH CHECK (EXISTS(SELECT 1 FROM public.booklets b WHERE b.id = transport.booklet_id AND b.user_id = auth.uid()));

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('free_trial','demo_user','free','pack_starter','pack_pro','pack_business','pack_premium','super_admin');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  assigned_at timestamptz DEFAULT now(),
  assigned_by uuid REFERENCES auth.users(id),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_roles_view_own" ON public.user_roles;
CREATE POLICY "user_roles_view_own" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public._signup_errors (
  id BIGSERIAL PRIMARY KEY,
  details text,
  occurred_at timestamptz DEFAULT now()
);
GRANT ALL ON public._signup_errors TO service_role;
ALTER TABLE public._signup_errors ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.generate_unique_pin()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_pin TEXT; pin_exists BOOLEAN; chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
BEGIN
  LOOP
    new_pin := '';
    FOR i IN 1..8 LOOP new_pin := new_pin || substr(chars, floor(random() * length(chars) + 1)::int, 1); END LOOP;
    SELECT EXISTS(SELECT 1 FROM public.pins WHERE pin_code = new_pin) INTO pin_exists;
    EXIT WHEN NOT pin_exists;
  END LOOP;
  RETURN new_pin;
END; $$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.can_create_booklet(uid uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  WITH u AS (
    SELECT COALESCE(role,'free_trial') AS role, COALESCE(subscription_status,'none') AS status,
           trial_expires_at, demo_token_expires_at
    FROM public.users WHERE id = uid
  ),
  c AS (SELECT count(*)::int AS n FROM public.booklets WHERE user_id = uid)
  SELECT CASE
    WHEN (SELECT role FROM u) = 'demo_user' THEN (SELECT demo_token_expires_at FROM u) > now() AND (SELECT n FROM c) < 1
    WHEN (SELECT role FROM u) = 'free_trial' THEN (SELECT trial_expires_at FROM u) > now() AND (SELECT n FROM c) < 1
    WHEN (SELECT status FROM u) <> 'active' THEN false
    WHEN (SELECT role FROM u) = 'pack_starter' THEN (SELECT n FROM c) < 1
    WHEN (SELECT role FROM u) = 'pack_pro' THEN (SELECT n FROM c) < 5
    WHEN (SELECT role FROM u) = 'pack_business' THEN (SELECT n FROM c) < 15
    WHEN (SELECT role FROM u) = 'pack_premium' THEN true
    WHEN (SELECT role FROM u) = 'super_admin' THEN true
    ELSE false
  END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE user_role TEXT;
BEGIN
  IF NEW.email = 'clesdazur.conciergerie@gmail.com' THEN user_role := 'super_admin';
  ELSE user_role := 'free_trial'; END IF;
  INSERT INTO public.users (id,email,subscription_status,role,trial_expires_at,booklet_quota)
  VALUES (NEW.id, NEW.email,
    CASE WHEN NEW.email='clesdazur.conciergerie@gmail.com' THEN 'active' ELSE 'trial_active' END,
    user_role,
    CASE WHEN NEW.email='clesdazur.conciergerie@gmail.com' THEN NULL ELSE now()+interval '7 days' END,
    CASE WHEN NEW.email='clesdazur.conciergerie@gmail.com' THEN 999999 ELSE 3 END
  ) ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, user_role::public.app_role) ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  INSERT INTO public._signup_errors (details) VALUES (SQLERRM);
  RAISE;
END; $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP POLICY IF EXISTS "me_select" ON public.users;
CREATE POLICY "me_select" ON public.users FOR SELECT TO authenticated USING (id = auth.uid());
DROP POLICY IF EXISTS "me_update" ON public.users;
CREATE POLICY "me_update" ON public.users FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());