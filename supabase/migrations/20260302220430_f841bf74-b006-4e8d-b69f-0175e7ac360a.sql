
-- Notification settings for SMTP (password NOT stored here, only in edge function secrets)
CREATE TABLE public.notification_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  smtp_host text,
  smtp_port integer DEFAULT 587,
  smtp_secure boolean DEFAULT true,
  smtp_user text,
  smtp_from_name text,
  smtp_from_email text,
  email_notifications_enabled boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ns_owner" ON public.notification_settings
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TRIGGER update_notification_settings_updated_at
  BEFORE UPDATE ON public.notification_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Email outbox for reliability and logging
CREATE TABLE public.email_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  mission_id uuid NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL REFERENCES public.service_providers(id) ON DELETE CASCADE,
  to_email text NOT NULL,
  subject text NOT NULL,
  body_html text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  UNIQUE(user_id, mission_id, provider_id)
);

ALTER TABLE public.email_outbox ENABLE ROW LEVEL SECURITY;

CREATE POLICY "outbox_owner" ON public.email_outbox
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
