
-- 1. Add team_member to app_role enum (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'team_member' AND enumtypid = 'public.app_role'::regtype) THEN
    ALTER TYPE public.app_role ADD VALUE 'team_member';
  END IF;
END $$;

-- 2. team_permissions table
CREATE TABLE IF NOT EXISTS public.team_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  sections jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_permissions TO authenticated;
GRANT ALL ON public.team_permissions TO service_role;

ALTER TABLE public.team_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "team_permissions_self_read" ON public.team_permissions;
CREATE POLICY "team_permissions_self_read" ON public.team_permissions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "team_permissions_admin_write" ON public.team_permissions;
CREATE POLICY "team_permissions_admin_write" ON public.team_permissions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER team_permissions_updated_at BEFORE UPDATE ON public.team_permissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Block public signups: only admin-created users (with created_by_admin metadata) are allowed
CREATE OR REPLACE FUNCTION public.block_public_signups()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (NEW.raw_user_meta_data->>'created_by_admin')::text = 'true' THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'Inscription désactivée. Contacte l''administrateur pour obtenir un compte.'
    USING ERRCODE = 'insufficient_privilege';
END;
$$;

DROP TRIGGER IF EXISTS block_public_signups_trigger ON auth.users;
CREATE TRIGGER block_public_signups_trigger
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.block_public_signups();
