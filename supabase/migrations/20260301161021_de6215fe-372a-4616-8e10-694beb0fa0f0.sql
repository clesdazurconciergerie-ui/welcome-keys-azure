-- Drop the duplicate block_anon policies that may conflict
DROP POLICY IF EXISTS "ical_cal_block_anon" ON public.ical_calendars;
DROP POLICY IF EXISTS "ical_cal_block_anon_delete" ON public.ical_calendars;
DROP POLICY IF EXISTS "ical_cal_block_anon_insert" ON public.ical_calendars;
DROP POLICY IF EXISTS "ical_cal_block_anon_update" ON public.ical_calendars;

-- Also fix calendar_events the same way
DROP POLICY IF EXISTS "cal_events_block_anon" ON public.calendar_events;
DROP POLICY IF EXISTS "cal_events_block_anon_delete" ON public.calendar_events;
DROP POLICY IF EXISTS "cal_events_block_anon_insert" ON public.calendar_events;
DROP POLICY IF EXISTS "cal_events_block_anon_update" ON public.calendar_events;

-- Ensure proper own-user policies exist on calendar_events
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'cal_events_select_own' AND polrelid = 'public.calendar_events'::regclass) THEN
    CREATE POLICY "cal_events_select_own" ON public.calendar_events FOR SELECT USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'cal_events_insert_own' AND polrelid = 'public.calendar_events'::regclass) THEN
    CREATE POLICY "cal_events_insert_own" ON public.calendar_events FOR INSERT WITH CHECK (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'cal_events_update_own' AND polrelid = 'public.calendar_events'::regclass) THEN
    CREATE POLICY "cal_events_update_own" ON public.calendar_events FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'cal_events_delete_own' AND polrelid = 'public.calendar_events'::regclass) THEN
    CREATE POLICY "cal_events_delete_own" ON public.calendar_events FOR DELETE USING (user_id = auth.uid());
  END IF;
END $$;