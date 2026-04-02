ALTER TABLE public.call_prompter_settings 
ADD COLUMN IF NOT EXISTS voice_profile jsonb DEFAULT NULL;