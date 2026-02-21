
-- Drop table if partially created
DROP TABLE IF EXISTS public.saved_places;

-- Create saved_places table
CREATE TABLE public.saved_places (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  description TEXT,
  distance TEXT,
  maps_link TEXT,
  image_url TEXT,
  website_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.saved_places ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "saved_places_block_anon"
  ON public.saved_places FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "saved_places_select_own"
  ON public.saved_places FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "saved_places_insert_own"
  ON public.saved_places FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "saved_places_update_own"
  ON public.saved_places FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "saved_places_delete_own"
  ON public.saved_places FOR DELETE
  USING (user_id = auth.uid());

-- Trigger for updated_at
CREATE TRIGGER update_saved_places_updated_at
  BEFORE UPDATE ON public.saved_places
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
