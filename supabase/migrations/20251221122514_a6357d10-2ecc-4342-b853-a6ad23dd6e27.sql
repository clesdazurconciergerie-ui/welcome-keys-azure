-- ═══════════════════════════════════════════════════════════════
-- CORRECTION FINALE : S'assurer que les SELECT sont aussi bloqués
-- Les policies FOR ALL RESTRICTIVE doivent fonctionner mais on ajoute
-- des policies SELECT spécifiques pour être sûr
-- ═══════════════════════════════════════════════════════════════

-- Supprimer les anciennes policies génériques
DROP POLICY IF EXISTS "require_auth_users" ON public.users;

-- Créer des policies RESTRICTIVE spécifiques par opération pour users
CREATE POLICY "require_auth_users_select"
ON public.users
AS RESTRICTIVE
FOR SELECT
TO public
USING (auth.uid() IS NOT NULL);

CREATE POLICY "require_auth_users_insert"
ON public.users
AS RESTRICTIVE
FOR INSERT
TO public
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "require_auth_users_update"
ON public.users
AS RESTRICTIVE
FOR UPDATE
TO public
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "require_auth_users_delete"
ON public.users
AS RESTRICTIVE
FOR DELETE
TO public
USING (auth.uid() IS NOT NULL);