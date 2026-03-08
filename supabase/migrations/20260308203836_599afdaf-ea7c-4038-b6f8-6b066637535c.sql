
-- Table to track unique booklet views by IP
CREATE TABLE public.booklet_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booklet_id uuid NOT NULL REFERENCES public.booklets(id) ON DELETE CASCADE,
  visitor_ip text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(booklet_id, visitor_ip)
);

-- Add unique_views_count column to booklets
ALTER TABLE public.booklets ADD COLUMN unique_views_count integer NOT NULL DEFAULT 0;

-- Enable RLS
ALTER TABLE public.booklet_views ENABLE ROW LEVEL SECURITY;

-- Allow anon inserts (public tracking) but no reads from client
CREATE POLICY "booklet_views_no_client_read" ON public.booklet_views
  FOR SELECT TO authenticated
  USING (false);

-- Allow service role to do everything (edge function uses service role)
-- No client-side policy needed for insert since edge function handles it
