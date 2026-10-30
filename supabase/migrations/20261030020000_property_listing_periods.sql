-- CANDIDAT NON APPLIQUE. A verifier contre le schema Supabase de production.
-- Aucun historique n'est deduit de properties.created_at, status ou d'iCal.
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE public.property_listing_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE RESTRICT,
  online_from date NOT NULL,
  online_until_exclusive date,
  evidence_kind text NOT NULL CHECK (evidence_kind IN ('owner_attested','platform_record')),
  recorded_by uuid NOT NULL DEFAULT auth.uid(),
  recorded_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT listing_period_order CHECK (online_until_exclusive IS NULL OR online_from < online_until_exclusive),
  CONSTRAINT listing_period_no_overlap EXCLUDE USING gist
    (property_id WITH =, daterange(online_from, online_until_exclusive, '[)') WITH &&)
);
CREATE INDEX property_listing_periods_lookup ON public.property_listing_periods(property_id, online_from);
ALTER TABLE public.property_listing_periods ENABLE ROW LEVEL SECURITY;
CREATE POLICY listing_periods_owner_select ON public.property_listing_periods
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND p.user_id = auth.uid())
  );
CREATE POLICY listing_periods_owner_insert ON public.property_listing_periods
  FOR INSERT TO authenticated WITH CHECK (
    recorded_by = auth.uid() AND
    EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND p.user_id = auth.uid())
  );
CREATE POLICY listing_periods_owner_update ON public.property_listing_periods
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND p.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND p.user_id = auth.uid())
  );
CREATE POLICY listing_periods_owner_delete ON public.property_listing_periods
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND p.user_id = auth.uid())
  );
REVOKE ALL ON public.property_listing_periods FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.property_listing_periods TO authenticated;
GRANT SELECT ON public.property_listing_periods TO service_role;

-- Les champs d'audit reflètent l'opération réelle, même si le client envoie une valeur.
CREATE FUNCTION public.stamp_listing_period_audit()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.recorded_by := auth.uid();
    NEW.recorded_at := now();
  ELSE
    NEW.recorded_by := OLD.recorded_by;
    NEW.recorded_at := OLD.recorded_at;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.stamp_listing_period_audit() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER stamp_listing_period_audit
  BEFORE INSERT OR UPDATE ON public.property_listing_periods
  FOR EACH ROW EXECUTE FUNCTION public.stamp_listing_period_audit();

-- Attestation explicite : tous les biens de cet utilisateur, y compris retires,
-- et toutes leurs periodes sont connus depuis complete_from. Jamais auto-remplie.
CREATE TABLE public.property_listing_history_attestations (
  owner_user_id uuid PRIMARY KEY,
  complete_from date NOT NULL,
  attested_by uuid NOT NULL DEFAULT auth.uid(),
  attested_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.property_listing_history_attestations ENABLE ROW LEVEL SECURITY;
CREATE POLICY listing_history_owner_select ON public.property_listing_history_attestations
  FOR SELECT TO authenticated USING (owner_user_id = auth.uid());
CREATE POLICY listing_history_owner_insert ON public.property_listing_history_attestations
  FOR INSERT TO authenticated WITH CHECK (owner_user_id = auth.uid() AND attested_by = auth.uid());
CREATE POLICY listing_history_owner_update ON public.property_listing_history_attestations
  FOR UPDATE TO authenticated USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid() AND attested_by = auth.uid());
REVOKE ALL ON public.property_listing_history_attestations FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON public.property_listing_history_attestations TO authenticated;
GRANT SELECT ON public.property_listing_history_attestations TO service_role;

CREATE FUNCTION public.stamp_listing_history_attestation()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.attested_by := auth.uid();
  NEW.attested_at := now();
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.stamp_listing_history_attestation() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER stamp_listing_history_attestation
  BEFORE INSERT OR UPDATE ON public.property_listing_history_attestations
  FOR EACH ROW EXECUTE FUNCTION public.stamp_listing_history_attestation();

-- Toute correction de periode annule l'attestation jusqu'a nouvelle revue humaine.
CREATE FUNCTION public.invalidate_listing_history_attestation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE owner_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    SELECT user_id INTO owner_id FROM public.properties WHERE id = OLD.property_id;
  ELSE
    SELECT user_id INTO owner_id FROM public.properties WHERE id = NEW.property_id;
  END IF;
  DELETE FROM public.property_listing_history_attestations
    WHERE owner_user_id = owner_id;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.invalidate_listing_history_attestation() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER invalidate_listing_history_on_period_change
  AFTER INSERT OR UPDATE OR DELETE ON public.property_listing_periods
  FOR EACH ROW EXECUTE FUNCTION public.invalidate_listing_history_attestation();

-- Un nouveau bien ou la suppression d'un bien sans periode change aussi le perimetre.
CREATE FUNCTION public.invalidate_listing_history_on_property_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    DELETE FROM public.property_listing_history_attestations WHERE owner_user_id = NEW.user_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM public.property_listing_history_attestations WHERE owner_user_id = OLD.user_id;
    RETURN OLD;
  END IF;
  IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    DELETE FROM public.property_listing_history_attestations
      WHERE owner_user_id IN (NEW.user_id, OLD.user_id);
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.invalidate_listing_history_on_property_change() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER invalidate_listing_history_on_property_change
  AFTER INSERT OR DELETE OR UPDATE OF user_id ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.invalidate_listing_history_on_property_change();

-- Production : verifier les GRANT et les politiques existantes avant application.
-- Aucune ligne historique ni attestation n'est creee par cette migration.
