-- Create tables for multi-step booklet wizard with all required fields

-- Extend booklets table with new fields for the wizard
ALTER TABLE public.booklets ADD COLUMN IF NOT EXISTS tagline TEXT;
ALTER TABLE public.booklets ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'fr';
ALTER TABLE public.booklets ADD COLUMN IF NOT EXISTS show_logo BOOLEAN DEFAULT true;
ALTER TABLE public.booklets ADD COLUMN IF NOT EXISTS google_maps_link TEXT;
ALTER TABLE public.booklets ADD COLUMN IF NOT EXISTS access_code TEXT;
ALTER TABLE public.booklets ADD COLUMN IF NOT EXISTS checkin_procedure TEXT;
ALTER TABLE public.booklets ADD COLUMN IF NOT EXISTS checkout_procedure TEXT;
ALTER TABLE public.booklets ADD COLUMN IF NOT EXISTS parking_info TEXT;
ALTER TABLE public.booklets ADD COLUMN IF NOT EXISTS safety_tips TEXT;
ALTER TABLE public.booklets ADD COLUMN IF NOT EXISTS manual_pdf_url TEXT;
ALTER TABLE public.booklets ADD COLUMN IF NOT EXISTS waste_location TEXT;
ALTER TABLE public.booklets ADD COLUMN IF NOT EXISTS sorting_instructions TEXT;
ALTER TABLE public.booklets ADD COLUMN IF NOT EXISTS cleaning_rules TEXT;
ALTER TABLE public.booklets ADD COLUMN IF NOT EXISTS cleaning_tips TEXT;
ALTER TABLE public.booklets ADD COLUMN IF NOT EXISTS airbnb_license TEXT;
ALTER TABLE public.booklets ADD COLUMN IF NOT EXISTS safety_instructions TEXT;
ALTER TABLE public.booklets ADD COLUMN IF NOT EXISTS gdpr_notice TEXT;
ALTER TABLE public.booklets ADD COLUMN IF NOT EXISTS disclaimer TEXT;
ALTER TABLE public.booklets ADD COLUMN IF NOT EXISTS wizard_step INTEGER DEFAULT 1;
ALTER TABLE public.booklets ADD COLUMN IF NOT EXISTS is_complete BOOLEAN DEFAULT false;

-- Create equipment table
CREATE TABLE IF NOT EXISTS public.equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booklet_id UUID NOT NULL REFERENCES public.booklets(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  instructions TEXT,
  manual_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS equipment_booklet_idx ON public.equipment(booklet_id);

ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage equipment for their booklets"
ON public.equipment FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.booklets
    WHERE booklets.id = equipment.booklet_id
      AND booklets.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.booklets
    WHERE booklets.id = equipment.booklet_id
      AND booklets.user_id = auth.uid()
  )
);

-- Create nearby places table
CREATE TABLE IF NOT EXISTS public.nearby_places (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booklet_id UUID NOT NULL REFERENCES public.booklets(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  distance TEXT,
  maps_link TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS nearby_places_booklet_idx ON public.nearby_places(booklet_id);

ALTER TABLE public.nearby_places ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage nearby places for their booklets"
ON public.nearby_places FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.booklets
    WHERE booklets.id = nearby_places.booklet_id
      AND booklets.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.booklets
    WHERE booklets.id = nearby_places.booklet_id
      AND booklets.user_id = auth.uid()
  )
);

-- Create FAQ table
CREATE TABLE IF NOT EXISTS public.faq (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booklet_id UUID NOT NULL REFERENCES public.booklets(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS faq_booklet_idx ON public.faq(booklet_id);
CREATE INDEX IF NOT EXISTS faq_order_idx ON public.faq(booklet_id, order_index);

ALTER TABLE public.faq ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage FAQ for their booklets"
ON public.faq FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.booklets
    WHERE booklets.id = faq.booklet_id
      AND booklets.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.booklets
    WHERE booklets.id = faq.booklet_id
      AND booklets.user_id = auth.uid()
  )
);

-- Insert default FAQ templates for new booklets
INSERT INTO public.faq (booklet_id, question, answer, order_index)
SELECT 
  b.id,
  q.question,
  q.answer,
  q.order_index
FROM public.booklets b
CROSS JOIN (
  VALUES 
    ('Comment faire le check-in ?', 'Les instructions de check-in vous seront envoyées par email 24h avant votre arrivée.', 1),
    ('Où jeter les poubelles ?', 'Les poubelles se trouvent à l''emplacement indiqué dans la section "Ménage et tri".', 2),
    ('Le WiFi ne fonctionne pas, que faire ?', 'Vérifiez que vous avez bien entré le mot de passe. En cas de problème, contactez la conciergerie.', 3),
    ('Puis-je inviter des personnes ?', 'Merci de respecter le nombre maximum de personnes indiqué dans votre réservation.', 4)
) AS q(question, answer, order_index)
WHERE NOT EXISTS (
  SELECT 1 FROM public.faq WHERE faq.booklet_id = b.id
)
ON CONFLICT DO NOTHING;