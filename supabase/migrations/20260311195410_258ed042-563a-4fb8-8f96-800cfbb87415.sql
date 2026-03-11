
-- Add columns to prospect_followups
ALTER TABLE prospect_followups
  ADD COLUMN IF NOT EXISTS followup_type text DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS email_subject text,
  ADD COLUMN IF NOT EXISTS email_body text,
  ADD COLUMN IF NOT EXISTS sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS error_message text;

-- Create email_templates table
CREATE TABLE IF NOT EXISTS email_templates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  etape integer NOT NULL,
  delai_jours integer NOT NULL,
  email_subject text NOT NULL,
  email_body text NOT NULL,
  actif boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "template_owner" ON email_templates
  FOR ALL USING (user_id = auth.uid());
