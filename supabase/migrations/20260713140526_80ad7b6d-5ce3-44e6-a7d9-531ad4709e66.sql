
CREATE TABLE IF NOT EXISTS public.actions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  projet_id UUID NOT NULL REFERENCES public.projets(id) ON DELETE CASCADE,
  ordre INTEGER NOT NULL DEFAULT 0,
  texte TEXT NOT NULL,
  fait BOOLEAN NOT NULL DEFAULT false,
  date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.actions TO authenticated;
GRANT ALL ON public.actions TO service_role;

ALTER TABLE public.actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated manage actions"
ON public.actions FOR ALL
TO authenticated
USING (true) WITH CHECK (true);

CREATE TRIGGER update_actions_updated_at BEFORE UPDATE ON public.actions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_actions_projet ON public.actions(projet_id, ordre);

-- Migrate existing json actions to rows
DO $$
DECLARE r RECORD; i INTEGER; item TEXT;
BEGIN
  FOR r IN SELECT id, actions FROM public.projets WHERE actions IS NOT NULL LOOP
    i := 0;
    IF jsonb_typeof(r.actions) = 'array' THEN
      FOR item IN SELECT jsonb_array_elements_text(r.actions) LOOP
        INSERT INTO public.actions (projet_id, ordre, texte)
        VALUES (r.id, i, item);
        i := i + 1;
      END LOOP;
    END IF;
  END LOOP;
END $$;
