
-- Allow owner-created blocks (no calendar_id needed)
ALTER TABLE public.calendar_events ALTER COLUMN calendar_id DROP NOT NULL;

-- Owner can INSERT blocks on their properties
CREATE POLICY calendar_events_owner_insert
ON public.calendar_events
FOR INSERT
TO authenticated
WITH CHECK (
  property_id IS NOT NULL
  AND public.is_owner_of_property(property_id)
  AND platform = 'owner_block'
  AND event_type = 'blocked'
);

-- Owner can DELETE their own blocks
CREATE POLICY calendar_events_owner_delete
ON public.calendar_events
FOR DELETE
TO authenticated
USING (
  property_id IS NOT NULL
  AND public.is_owner_of_property(property_id)
  AND platform = 'owner_block'
);

-- Owner can UPDATE their own blocks
CREATE POLICY calendar_events_owner_update
ON public.calendar_events
FOR UPDATE
TO authenticated
USING (
  property_id IS NOT NULL
  AND public.is_owner_of_property(property_id)
  AND platform = 'owner_block'
)
WITH CHECK (
  property_id IS NOT NULL
  AND public.is_owner_of_property(property_id)
  AND platform = 'owner_block'
);
