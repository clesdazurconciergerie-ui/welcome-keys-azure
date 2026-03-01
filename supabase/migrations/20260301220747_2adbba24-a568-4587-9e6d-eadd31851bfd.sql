-- =============================================
-- AI PERFORMANCE MODULE: Tables + RLS
-- =============================================

-- 1) ai_feature_flags: per-user feature toggles
CREATE TABLE public.ai_feature_flags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  ai_enabled BOOLEAN NOT NULL DEFAULT true,
  ai_tasks_enabled BOOLEAN NOT NULL DEFAULT true,
  ai_analysis_enabled BOOLEAN NOT NULL DEFAULT true,
  ai_listing_enabled BOOLEAN NOT NULL DEFAULT true,
  ai_forecast_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_feature_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "aiff_owner" ON public.ai_feature_flags FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 2) ai_runs: track each AI invocation
CREATE TABLE public.ai_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL DEFAULT 'analysis',
  period_start DATE,
  period_end DATE,
  status TEXT NOT NULL DEFAULT 'pending',
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "air_owner" ON public.ai_runs FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 3) ai_insights: AI analysis results
CREATE TABLE public.ai_insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  run_id UUID REFERENCES public.ai_runs(id) ON DELETE SET NULL,
  period_start DATE,
  period_end DATE,
  summary_text TEXT,
  bullets_json JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "aii_owner" ON public.ai_insights FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 4) ai_tasks: smart to-do items
CREATE TABLE public.ai_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  scope TEXT NOT NULL DEFAULT 'general',
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'todo',
  due_date DATE,
  source TEXT NOT NULL DEFAULT 'manual',
  related_type TEXT,
  related_id UUID,
  confidence NUMERIC,
  run_id UUID REFERENCES public.ai_runs(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ait_owner" ON public.ai_tasks FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 5) ai_listing_suggestions: listing optimizer output
CREATE TABLE public.ai_listing_suggestions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  run_id UUID REFERENCES public.ai_runs(id) ON DELETE SET NULL,
  suggestions JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_listing_suggestions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ails_owner" ON public.ai_listing_suggestions FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Triggers for updated_at
CREATE TRIGGER update_ai_feature_flags_updated_at BEFORE UPDATE ON public.ai_feature_flags
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_ai_tasks_updated_at BEFORE UPDATE ON public.ai_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();