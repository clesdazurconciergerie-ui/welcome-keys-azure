
CREATE TABLE public.ical_calendars (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  url TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'other',
  last_synced_at TIMESTAMP WITH TIME ZONE,
  sync_status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ical_calendars ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ical_cal_block_anon" ON public.ical_calendars AS RESTRICTIVE FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "ical_cal_block_anon_insert" ON public.ical_calendars AS RESTRICTIVE FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "ical_cal_block_anon_update" ON public.ical_calendars AS RESTRICTIVE FOR UPDATE USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "ical_cal_block_anon_delete" ON public.ical_calendars AS RESTRICTIVE FOR DELETE USING (auth.uid() IS NOT NULL);

CREATE POLICY "ical_cal_select_own" ON public.ical_calendars AS RESTRICTIVE FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "ical_cal_insert_own" ON public.ical_calendars AS RESTRICTIVE FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "ical_cal_update_own" ON public.ical_calendars AS RESTRICTIVE FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "ical_cal_delete_own" ON public.ical_calendars AS RESTRICTIVE FOR DELETE USING (user_id = auth.uid());

CREATE TABLE public.calendar_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  calendar_id UUID NOT NULL REFERENCES public.ical_calendars(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  summary TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  guest_name TEXT,
  platform TEXT NOT NULL DEFAULT 'other',
  status TEXT NOT NULL DEFAULT 'confirmed',
  ical_uid TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cal_ev_block_anon" ON public.calendar_events AS RESTRICTIVE FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "cal_ev_block_anon_insert" ON public.calendar_events AS RESTRICTIVE FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "cal_ev_block_anon_update" ON public.calendar_events AS RESTRICTIVE FOR UPDATE USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "cal_ev_block_anon_delete" ON public.calendar_events AS RESTRICTIVE FOR DELETE USING (auth.uid() IS NOT NULL);

CREATE POLICY "cal_ev_select_own" ON public.calendar_events AS RESTRICTIVE FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "cal_ev_insert_own" ON public.calendar_events AS RESTRICTIVE FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "cal_ev_update_own" ON public.calendar_events AS RESTRICTIVE FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "cal_ev_delete_own" ON public.calendar_events AS RESTRICTIVE FOR DELETE USING (user_id = auth.uid());
