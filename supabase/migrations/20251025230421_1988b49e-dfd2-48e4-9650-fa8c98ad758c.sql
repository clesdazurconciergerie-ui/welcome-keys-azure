-- 1. Ajouter la colonne trial_expires_at et mettre à jour les valeurs par défaut
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS trial_expires_at timestamptz DEFAULT now() + interval '7 days';

-- Mettre à jour le rôle par défaut pour les nouveaux utilisateurs
ALTER TABLE public.users
ALTER COLUMN role SET DEFAULT 'free_trial';

-- 2. Mettre à jour les utilisateurs existants qui sont 'free' pour leur donner un essai
UPDATE public.users
SET 
  role = 'free_trial',
  trial_expires_at = now() + interval '7 days'
WHERE role = 'free' AND subscription_status = 'none';

-- 3. Mettre à jour la fonction can_create_booklet pour gérer le free_trial
CREATE OR REPLACE FUNCTION public.can_create_booklet(uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH u AS (
    SELECT 
      COALESCE(role, 'free_trial') AS role, 
      COALESCE(subscription_status, 'none') AS status,
      trial_expires_at
    FROM public.users 
    WHERE id = uid
  ),
  c AS (
    SELECT count(*)::int AS n 
    FROM public.booklets 
    WHERE user_id = uid
  )
  SELECT CASE
    -- Free trial: 1 livret pendant 7 jours
    WHEN (SELECT role FROM u) = 'free_trial' THEN 
      (SELECT trial_expires_at FROM u) > now() AND (SELECT n FROM c) < 1
    
    -- Utilisateurs payants: vérifier le statut d'abonnement
    WHEN (SELECT status FROM u) <> 'active' THEN false
    
    -- Quotas par plan
    WHEN (SELECT role FROM u) = 'pack_starter' THEN (SELECT n FROM c) < 1
    WHEN (SELECT role FROM u) = 'pack_pro' THEN (SELECT n FROM c) < 5
    WHEN (SELECT role FROM u) = 'pack_business' THEN (SELECT n FROM c) < 15
    WHEN (SELECT role FROM u) = 'pack_premium' THEN true
    WHEN (SELECT role FROM u) = 'super_admin' THEN true
    
    ELSE false
  END;
$$;

-- 4. Mettre à jour le trigger handle_new_user pour attribuer free_trial par défaut
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.users (id, email, role, plan, booklet_quota, trial_expires_at, subscription_status)
  VALUES (
    NEW.id,
    NEW.email,
    CASE 
      WHEN NEW.email = 'clesdazur.conciergerie@gmail.com' THEN 'super_admin'
      ELSE 'free_trial'
    END,
    CASE 
      WHEN NEW.email = 'clesdazur.conciergerie@gmail.com' THEN 'premium'
      ELSE 'basic'
    END,
    CASE 
      WHEN NEW.email = 'clesdazur.conciergerie@gmail.com' THEN 999999
      ELSE 3
    END,
    CASE 
      WHEN NEW.email = 'clesdazur.conciergerie@gmail.com' THEN NULL
      ELSE now() + interval '7 days'
    END,
    CASE 
      WHEN NEW.email = 'clesdazur.conciergerie@gmail.com' THEN 'active'
      ELSE 'none'
    END
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$;