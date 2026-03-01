-- Drop ALL existing policies on ical_calendars
DROP POLICY IF EXISTS "ical_cal_select_own" ON public.ical_calendars;
DROP POLICY IF EXISTS "ical_cal_insert_own" ON public.ical_calendars;
DROP POLICY IF EXISTS "ical_cal_update_own" ON public.ical_calendars;
DROP POLICY IF EXISTS "ical_cal_delete_own" ON public.ical_calendars;
DROP POLICY IF EXISTS "ical_cal_block_anon" ON public.ical_calendars;
DROP POLICY IF EXISTS "ical_cal_block_anon_delete" ON public.ical_calendars;
DROP POLICY IF EXISTS "ical_cal_block_anon_insert" ON public.ical_calendars;
DROP POLICY IF EXISTS "ical_cal_block_anon_update" ON public.ical_calendars;

-- Drop ALL existing policies on calendar_events
DROP POLICY IF EXISTS "cal_ev_select_own" ON public.calendar_events;
DROP POLICY IF EXISTS "cal_ev_insert_own" ON public.calendar_events;
DROP POLICY IF EXISTS "cal_ev_update_own" ON public.calendar_events;
DROP POLICY IF EXISTS "cal_ev_delete_own" ON public.calendar_events;
DROP POLICY IF EXISTS "cal_ev_block_anon" ON public.calendar_events;
DROP POLICY IF EXISTS "cal_ev_block_anon_delete" ON public.calendar_events;
DROP POLICY IF EXISTS "cal_ev_block_anon_insert" ON public.calendar_events;
DROP POLICY IF EXISTS "cal_ev_block_anon_update" ON public.calendar_events;
DROP POLICY IF EXISTS "cal_events_select_own" ON public.calendar_events;
DROP POLICY IF EXISTS "cal_events_insert_own" ON public.calendar_events;
DROP POLICY IF EXISTS "cal_events_update_own" ON public.calendar_events;
DROP POLICY IF EXISTS "cal_events_delete_own" ON public.calendar_events;

-- Ensure RLS is enabled
ALTER TABLE public.ical_calendars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

-- ical_calendars: clean PERMISSIVE policies
CREATE POLICY "Users can view their calendars"
  ON public.ical_calendars FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their calendars"
  ON public.ical_calendars FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their calendars"
  ON public.ical_calendars FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their calendars"
  ON public.ical_calendars FOR DELETE
  USING (user_id = auth.uid());

-- calendar_events: clean PERMISSIVE policies
CREATE POLICY "Users can view their events"
  ON public.calendar_events FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their events"
  ON public.calendar_events FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their events"
  ON public.calendar_events FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their events"
  ON public.calendar_events FOR DELETE
  USING (user_id = auth.uid());