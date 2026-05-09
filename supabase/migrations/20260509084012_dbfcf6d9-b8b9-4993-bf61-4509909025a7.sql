
-- Templates de checklists pour états des lieux
CREATE TABLE IF NOT EXISTS public.inspection_checklist_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  property_type text NOT NULL DEFAULT 'apartment',
  description text,
  rooms jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.inspection_checklist_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tpl_select_own" ON public.inspection_checklist_templates
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "tpl_insert_own" ON public.inspection_checklist_templates
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "tpl_update_own" ON public.inspection_checklist_templates
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "tpl_delete_own" ON public.inspection_checklist_templates
  FOR DELETE USING (user_id = auth.uid());

CREATE TRIGGER trg_tpl_updated_at
  BEFORE UPDATE ON public.inspection_checklist_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_tpl_user ON public.inspection_checklist_templates(user_id);

-- Lecture admin globale sur états des lieux
DROP POLICY IF EXISTS "inspections_admin_select_all" ON public.property_inspections;
CREATE POLICY "inspections_admin_select_all" ON public.property_inspections
  FOR SELECT
  USING (public.has_role(auth.uid(), 'super_admin'::public.app_role));
