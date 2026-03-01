
ALTER TABLE public.prospects
  DROP CONSTRAINT prospects_converted_owner_id_fkey,
  ADD CONSTRAINT prospects_converted_owner_id_fkey
    FOREIGN KEY (converted_owner_id) REFERENCES public.owners(id) ON DELETE SET NULL;
