-- 1) Valeurs par défaut pour les utilisateurs
ALTER TABLE public.users
  ALTER COLUMN role SET DEFAULT 'free',
  ALTER COLUMN subscription_status SET DEFAULT 'none';

-- 2) Fonction de quota par rôle avec sécurité
CREATE OR REPLACE FUNCTION public.can_create_booklet(uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH u AS (
    SELECT COALESCE(role, 'free') AS role, 
           COALESCE(subscription_status, 'none') AS status
    FROM public.users 
    WHERE id = uid
  ),
  c AS (
    SELECT count(*)::int AS n 
    FROM public.booklets 
    WHERE user_id = uid
  )
  SELECT CASE
    WHEN (SELECT status FROM u) <> 'active' THEN false
    WHEN (SELECT role FROM u) = 'pack_starter' THEN (SELECT n FROM c) < 1
    WHEN (SELECT role FROM u) = 'pack_pro' THEN (SELECT n FROM c) < 5
    WHEN (SELECT role FROM u) = 'pack_business' THEN (SELECT n FROM c) < 15
    WHEN (SELECT role FROM u) = 'pack_premium' THEN true
    WHEN (SELECT role FROM u) = 'super_admin' THEN true
    ELSE false
  END;
$$;

-- 3) Nettoyage des anciennes politiques permissives
DROP POLICY IF EXISTS "allow_authenticated_insert" ON public.booklets;
DROP POLICY IF EXISTS "public_insert" ON public.booklets;
DROP POLICY IF EXISTS "Users can insert their own booklets" ON public.booklets;

-- 4) Nouvelles politiques RLS strictes
CREATE POLICY "owner_select"
ON public.booklets FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "owner_update"
ON public.booklets FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "insert_with_quota"
ON public.booklets FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND public.can_create_booklet(auth.uid())
);