import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface FeatureFlags {
  ai_enabled: boolean;
  ai_tasks_enabled: boolean;
  ai_analysis_enabled: boolean;
  ai_listing_enabled: boolean;
  ai_forecast_enabled: boolean;
}

const DEFAULTS: FeatureFlags = {
  ai_enabled: true,
  ai_tasks_enabled: true,
  ai_analysis_enabled: true,
  ai_listing_enabled: true,
  ai_forecast_enabled: true,
};

export function useFeatureFlags() {
  const [flags, setFlags] = useState<FeatureFlags>(DEFAULTS);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data } = await (supabase as any)
      .from("ai_feature_flags")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    if (data) {
      setFlags({
        ai_enabled: data.ai_enabled,
        ai_tasks_enabled: data.ai_tasks_enabled,
        ai_analysis_enabled: data.ai_analysis_enabled,
        ai_listing_enabled: data.ai_listing_enabled,
        ai_forecast_enabled: data.ai_forecast_enabled,
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const update = async (partial: Partial<FeatureFlags>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const payload = { ...partial, user_id: user.id };
    await (supabase as any)
      .from("ai_feature_flags")
      .upsert(payload, { onConflict: "user_id" });
    setFlags(prev => ({ ...prev, ...partial }));
  };

  return { flags, loading, update };
}
