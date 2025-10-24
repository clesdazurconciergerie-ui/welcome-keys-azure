-- Security fix: Move WiFi credentials to a separate secure table
-- Only authenticated owners can manage credentials
-- Public access requires valid PIN via server-side endpoint

-- Create dedicated wifi_credentials table
CREATE TABLE IF NOT EXISTS public.wifi_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booklet_id UUID NOT NULL REFERENCES public.booklets(id) ON DELETE CASCADE,
  ssid TEXT NOT NULL,
  password TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS wifi_credentials_booklet_idx ON public.wifi_credentials(booklet_id);

-- Ensure one WiFi credential per booklet
CREATE UNIQUE INDEX IF NOT EXISTS wifi_credentials_booklet_unique_idx ON public.wifi_credentials(booklet_id);

-- Enable RLS
ALTER TABLE public.wifi_credentials ENABLE ROW LEVEL SECURITY;

-- Owner-only SELECT policy
CREATE POLICY "Users can view wifi credentials for their booklets"
ON public.wifi_credentials
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.booklets
    WHERE booklets.id = wifi_credentials.booklet_id
      AND booklets.user_id = auth.uid()
  )
);

-- Owner-only INSERT policy
CREATE POLICY "Users can insert wifi credentials for their booklets"
ON public.wifi_credentials
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.booklets
    WHERE booklets.id = wifi_credentials.booklet_id
      AND booklets.user_id = auth.uid()
  )
);

-- Owner-only UPDATE policy
CREATE POLICY "Users can update wifi credentials for their booklets"
ON public.wifi_credentials
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.booklets
    WHERE booklets.id = wifi_credentials.booklet_id
      AND booklets.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.booklets
    WHERE booklets.id = wifi_credentials.booklet_id
      AND booklets.user_id = auth.uid()
  )
);

-- Owner-only DELETE policy
CREATE POLICY "Users can delete wifi credentials for their booklets"
ON public.wifi_credentials
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.booklets
    WHERE booklets.id = wifi_credentials.booklet_id
      AND booklets.user_id = auth.uid()
  )
);

-- Migrate existing WiFi data from booklets table
INSERT INTO public.wifi_credentials (booklet_id, ssid, password)
SELECT id, wifi_name, wifi_password
FROM public.booklets
WHERE wifi_name IS NOT NULL AND wifi_password IS NOT NULL
ON CONFLICT (booklet_id) DO NOTHING;

-- Drop the old columns from booklets (data is now in wifi_credentials)
ALTER TABLE public.booklets DROP COLUMN IF EXISTS wifi_name;
ALTER TABLE public.booklets DROP COLUMN IF EXISTS wifi_password;

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_wifi_credentials_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_wifi_credentials_updated_at
BEFORE UPDATE ON public.wifi_credentials
FOR EACH ROW
EXECUTE FUNCTION public.update_wifi_credentials_updated_at();