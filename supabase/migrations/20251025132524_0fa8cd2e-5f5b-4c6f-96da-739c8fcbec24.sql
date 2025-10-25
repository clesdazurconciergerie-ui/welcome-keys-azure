-- Add metadata fields to booklets table
ALTER TABLE public.booklets
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS postcode text,
ADD COLUMN IF NOT EXISTS country text,
ADD COLUMN IF NOT EXISTS geo jsonb DEFAULT '{"lat": null, "lon": null}'::jsonb,
ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'Europe/Paris';

-- Create highlights table
CREATE TABLE IF NOT EXISTS public.highlights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booklet_id uuid NOT NULL REFERENCES public.booklets(id) ON DELETE CASCADE,
  title text NOT NULL,
  type text NOT NULL,
  rating numeric(2,1),
  description text,
  url text,
  price_range text,
  tags text[] DEFAULT '{}',
  order_index integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create restaurants table
CREATE TABLE IF NOT EXISTS public.restaurants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booklet_id uuid NOT NULL REFERENCES public.booklets(id) ON DELETE CASCADE,
  name text NOT NULL,
  cuisine text,
  price_range text,
  address text,
  phone text,
  url text,
  rating numeric(2,1),
  tags text[] DEFAULT '{}',
  is_owner_pick boolean DEFAULT false,
  order_index integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create activities table
CREATE TABLE IF NOT EXISTS public.activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booklet_id uuid NOT NULL REFERENCES public.booklets(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text,
  when_available text[] DEFAULT '{}',
  duration text,
  price text,
  booking_url text,
  age_restrictions text,
  tags text[] DEFAULT '{}',
  is_owner_pick boolean DEFAULT false,
  order_index integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create essentials table (groceries, pharmacies, etc.)
CREATE TABLE IF NOT EXISTS public.essentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booklet_id uuid NOT NULL REFERENCES public.booklets(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL, -- 'grocery', 'pharmacy', 'hospital', etc.
  address text,
  phone text,
  hours text,
  distance text,
  notes text,
  order_index integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create transport table
CREATE TABLE IF NOT EXISTS public.transport (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booklet_id uuid NOT NULL REFERENCES public.booklets(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL, -- 'parking', 'train_station', 'bus_stop', 'shuttle', etc.
  address text,
  distance text,
  instructions text,
  price text,
  url text,
  order_index integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.highlights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.essentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport ENABLE ROW LEVEL SECURITY;

-- RLS policies for highlights
CREATE POLICY "Users can manage highlights for their booklets"
ON public.highlights
FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.booklets
  WHERE booklets.id = highlights.booklet_id
  AND booklets.user_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.booklets
  WHERE booklets.id = highlights.booklet_id
  AND booklets.user_id = auth.uid()
));

-- RLS policies for restaurants
CREATE POLICY "Users can manage restaurants for their booklets"
ON public.restaurants
FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.booklets
  WHERE booklets.id = restaurants.booklet_id
  AND booklets.user_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.booklets
  WHERE booklets.id = restaurants.booklet_id
  AND booklets.user_id = auth.uid()
));

-- RLS policies for activities
CREATE POLICY "Users can manage activities for their booklets"
ON public.activities
FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.booklets
  WHERE booklets.id = activities.booklet_id
  AND booklets.user_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.booklets
  WHERE booklets.id = activities.booklet_id
  AND booklets.user_id = auth.uid()
));

-- RLS policies for essentials
CREATE POLICY "Users can manage essentials for their booklets"
ON public.essentials
FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.booklets
  WHERE booklets.id = essentials.booklet_id
  AND booklets.user_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.booklets
  WHERE booklets.id = essentials.booklet_id
  AND booklets.user_id = auth.uid()
));

-- RLS policies for transport
CREATE POLICY "Users can manage transport for their booklets"
ON public.transport
FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.booklets
  WHERE booklets.id = transport.booklet_id
  AND booklets.user_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.booklets
  WHERE booklets.id = transport.booklet_id
  AND booklets.user_id = auth.uid()
));

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_highlights_booklet_id ON public.highlights(booklet_id);
CREATE INDEX IF NOT EXISTS idx_restaurants_booklet_id ON public.restaurants(booklet_id);
CREATE INDEX IF NOT EXISTS idx_activities_booklet_id ON public.activities(booklet_id);
CREATE INDEX IF NOT EXISTS idx_essentials_booklet_id ON public.essentials(booklet_id);
CREATE INDEX IF NOT EXISTS idx_transport_booklet_id ON public.transport(booklet_id);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_highlights_updated_at
BEFORE UPDATE ON public.highlights
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_restaurants_updated_at
BEFORE UPDATE ON public.restaurants
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_activities_updated_at
BEFORE UPDATE ON public.activities
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();