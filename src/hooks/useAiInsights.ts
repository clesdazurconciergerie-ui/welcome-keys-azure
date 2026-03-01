import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AiInsight {
  id: string;
  user_id: string;
  run_id: string | null;
  period_start: string | null;
  period_end: string | null;
  summary_text: string | null;
  bullets_json: any[];
  created_at: string;
}

export function useAiInsights() {
  const [insights, setInsights] = useState<AiInsight[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    const { data } = await (supabase as any)
      .from("ai_insights")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5);
    setInsights(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { insights, loading, refetch: fetch };
}
