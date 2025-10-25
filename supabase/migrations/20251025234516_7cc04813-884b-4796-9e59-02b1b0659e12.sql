-- 0️⃣ Créer l'enum app_role s'il n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM (
      'free_trial',
      'demo_user',
      'free',
      'pack_starter',
      'pack_pro',
      'pack_business',
      'pack_premium',
      'super_admin'
    );
  END IF;
END$$;

-- 0.1️⃣ Créer la table user_roles si elle n'existe pas
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  assigned_at timestamptz DEFAULT now(),
  assigned_by uuid REFERENCES auth.users(id),
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 0.2️⃣ Créer la fonction has_role() si elle n'existe pas
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  );
$$;

-- 1️⃣ Restaurer des valeurs par défaut sûres sur public.users
ALTER TABLE public.users
  ALTER COLUMN subscription_status SET DEFAULT 'trial_active',
  ALTER COLUMN has_used_demo SET DEFAULT false,
  ALTER COLUMN trial_expires_at SET DEFAULT (now() + interval '7 days');

-- 2️⃣ Recréer la fonction trigger pour initialiser un profil utilisateur
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role public.app_role;
BEGIN
  -- Déterminer le rôle selon l'email
  IF NEW.email = 'clesdazur.conciergerie@gmail.com' THEN
    user_role := 'super_admin';
  ELSE
    user_role := 'free_trial';
  END IF;

  -- Insérer dans public.users
  INSERT INTO public.users (
    id, 
    email, 
    subscription_status, 
    trial_expires_at,
    booklet_quota
  )
  VALUES (
    NEW.id,
    NEW.email,
    CASE 
      WHEN NEW.email = 'clesdazur.conciergerie@gmail.com' THEN 'active'
      ELSE 'trial_active'
    END,
    CASE 
      WHEN NEW.email = 'clesdazur.conciergerie@gmail.com' THEN NULL
      ELSE now() + interval '7 days'
    END,
    CASE 
      WHEN NEW.email = 'clesdazur.conciergerie@gmail.com' THEN 999999
      ELSE 3
    END
  )
  ON CONFLICT (id) DO NOTHING;

  -- Insérer dans user_roles (nouveau système sécurisé)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, user_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

-- 3️⃣ Recréer le trigger de synchronisation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4️⃣ Réinitialiser les politiques RLS de base pour public.users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "me_select" ON public.users;
CREATE POLICY "me_select"
  ON public.users 
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

DROP POLICY IF EXISTS "me_update_safe" ON public.users;
CREATE POLICY "me_update_safe"
  ON public.users 
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Users can view their own data" ON public.users;
DROP POLICY IF EXISTS "Users can update their own data" ON public.users;

DROP POLICY IF EXISTS "no_client_insert" ON public.users;
CREATE POLICY "no_client_insert"
  ON public.users 
  FOR INSERT
  TO authenticated
  WITH CHECK (false);