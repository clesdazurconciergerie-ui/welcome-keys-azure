DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'financial_settings_user_id_key'
  ) THEN
    ALTER TABLE financial_settings ADD CONSTRAINT financial_settings_user_id_key UNIQUE (user_id);
  END IF;
END $$;