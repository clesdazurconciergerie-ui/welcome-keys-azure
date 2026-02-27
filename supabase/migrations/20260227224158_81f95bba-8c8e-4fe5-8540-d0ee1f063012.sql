
-- Drop the recursive policies
DROP POLICY IF EXISTS "properties_owner_select" ON public.properties;
DROP POLICY IF EXISTS "booklets_owner_select" ON public.booklets;

-- Create security definer function to check owner access without triggering RLS
CREATE OR REPLACE FUNCTION public.is_owner_of_property(_user_id uuid, _property_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM owner_properties op
    JOIN owners o ON o.id = op.owner_id
    WHERE op.property_id = _property_id
      AND o.auth_user_id = _user_id
      AND o.status = 'active'
  );
$$;

-- Recreate policies using the function (no recursion)
CREATE POLICY "properties_owner_select" ON public.properties
  FOR SELECT TO authenticated
  USING (public.is_owner_of_property(auth.uid(), id));

CREATE POLICY "booklets_owner_select" ON public.booklets
  FOR SELECT TO authenticated
  USING (public.is_owner_of_property(auth.uid(), property_id));
