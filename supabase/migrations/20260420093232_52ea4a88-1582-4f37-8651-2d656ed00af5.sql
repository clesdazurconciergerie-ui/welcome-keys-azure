-- ============================================================================
-- MODULE 1 — Voyageur Messaging Engine
-- ============================================================================

-- Enums
CREATE TYPE public.guest_message_trigger AS ENUM (
  'booking_confirmed',
  'three_days_before',
  'day_before_arrival',
  'check_in_day',
  'mid_stay',
  'day_before_checkout',
  'one_day_after'
);

CREATE TYPE public.guest_message_channel AS ENUM ('email', 'sms', 'whatsapp');

CREATE TYPE public.guest_message_status AS ENUM ('pending', 'sent', 'failed', 'cancelled');

-- Templates table
CREATE TABLE public.guest_message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  trigger_type public.guest_message_trigger NOT NULL,
  channel public.guest_message_channel NOT NULL DEFAULT 'email',
  subject TEXT,
  body_markdown TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  property_ids UUID[] DEFAULT NULL,
  language TEXT NOT NULL DEFAULT 'fr',
  send_at_time TIME NOT NULL DEFAULT '10:00:00',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_guest_templates_user ON public.guest_message_templates(user_id);
CREATE INDEX idx_guest_templates_trigger ON public.guest_message_templates(user_id, trigger_type) WHERE is_active = true;

-- Scheduled messages table
CREATE TABLE public.guest_scheduled_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.guest_message_templates(id) ON DELETE SET NULL,
  trigger_type public.guest_message_trigger NOT NULL,
  channel public.guest_message_channel NOT NULL DEFAULT 'email',
  recipient_email TEXT,
  recipient_phone TEXT,
  rendered_subject TEXT,
  rendered_body TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  status public.guest_message_status NOT NULL DEFAULT 'pending',
  external_id TEXT,
  error_message TEXT,
  attempts INT NOT NULL DEFAULT 0,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_guest_scheduled_pending ON public.guest_scheduled_messages(scheduled_at, status) WHERE status = 'pending';
CREATE INDEX idx_guest_scheduled_user_booking ON public.guest_scheduled_messages(user_id, booking_id);
CREATE INDEX idx_guest_scheduled_user_status ON public.guest_scheduled_messages(user_id, status, scheduled_at DESC);

-- RLS
ALTER TABLE public.guest_message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_scheduled_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own templates"
  ON public.guest_message_templates
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own scheduled messages"
  ON public.guest_scheduled_messages
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Updated_at trigger for templates
CREATE TRIGGER update_guest_templates_updated_at
  BEFORE UPDATE ON public.guest_message_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- Function: schedule guest messages from a booking
-- ============================================================================
CREATE OR REPLACE FUNCTION public.schedule_messages_for_booking(_booking_id UUID)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  bk RECORD;
  tpl RECORD;
  scheduled_at_ts TIMESTAMPTZ;
  count_inserted INT := 0;
BEGIN
  SELECT b.*, p.name AS property_name
  INTO bk
  FROM public.bookings b
  JOIN public.properties p ON p.id = b.property_id
  WHERE b.id = _booking_id;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  -- Cancel any pending messages for this booking (idempotency)
  UPDATE public.guest_scheduled_messages
  SET status = 'cancelled'
  WHERE booking_id = _booking_id
    AND status = 'pending';

  -- For each active template owned by the booking owner
  FOR tpl IN
    SELECT *
    FROM public.guest_message_templates t
    WHERE t.user_id = bk.user_id
      AND t.is_active = true
      AND (t.property_ids IS NULL OR bk.property_id = ANY(t.property_ids))
  LOOP
    -- Compute scheduled_at based on trigger
    scheduled_at_ts := CASE tpl.trigger_type
      WHEN 'booking_confirmed'    THEN now()
      WHEN 'three_days_before'    THEN (bk.check_in - INTERVAL '3 days')::date + tpl.send_at_time
      WHEN 'day_before_arrival'   THEN (bk.check_in - INTERVAL '1 day')::date + tpl.send_at_time
      WHEN 'check_in_day'         THEN bk.check_in::date + tpl.send_at_time
      WHEN 'mid_stay'             THEN
        CASE WHEN (bk.check_out - bk.check_in) > 4
          THEN (bk.check_in + ((bk.check_out - bk.check_in) / 2))::date + tpl.send_at_time
          ELSE NULL
        END
      WHEN 'day_before_checkout'  THEN (bk.check_out - INTERVAL '1 day')::date + tpl.send_at_time
      WHEN 'one_day_after'        THEN (bk.check_out + INTERVAL '1 day')::date + tpl.send_at_time
    END;

    -- Skip if no schedule date (mid_stay on short stays) or in the past for non-immediate triggers
    IF scheduled_at_ts IS NULL THEN
      CONTINUE;
    END IF;

    INSERT INTO public.guest_scheduled_messages (
      user_id, booking_id, property_id, template_id,
      trigger_type, channel,
      recipient_email, recipient_phone,
      rendered_subject, rendered_body,
      scheduled_at, status
    ) VALUES (
      bk.user_id, bk.id, bk.property_id, tpl.id,
      tpl.trigger_type, tpl.channel,
      bk.guest_email, bk.guest_phone,
      tpl.subject, tpl.body_markdown,  -- raw template, rendered at send time
      scheduled_at_ts,
      CASE WHEN scheduled_at_ts < now() - INTERVAL '1 hour' THEN 'cancelled'::public.guest_message_status
           ELSE 'pending'::public.guest_message_status
      END
    );

    count_inserted := count_inserted + 1;
  END LOOP;

  RETURN count_inserted;
END;
$$;

-- ============================================================================
-- Trigger: auto-schedule on booking insert/update
-- ============================================================================
CREATE OR REPLACE FUNCTION public.trigger_schedule_guest_messages()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Cancel pending messages on booking cancellation
  IF NEW.price_status = 'canceled' THEN
    UPDATE public.guest_scheduled_messages
    SET status = 'cancelled'
    WHERE booking_id = NEW.id AND status = 'pending';
    RETURN NEW;
  END IF;

  -- Reschedule on insert or when dates change
  IF TG_OP = 'INSERT' OR
     OLD.check_in IS DISTINCT FROM NEW.check_in OR
     OLD.check_out IS DISTINCT FROM NEW.check_out OR
     OLD.guest_email IS DISTINCT FROM NEW.guest_email THEN
    PERFORM public.schedule_messages_for_booking(NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER auto_schedule_guest_messages
  AFTER INSERT OR UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_schedule_guest_messages();