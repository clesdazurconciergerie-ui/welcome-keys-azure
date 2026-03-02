import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CleaningAutomationSettings {
  cleaning_enabled: boolean;
  cleaning_payout_amount: number;
  cleaning_default_start_time: string;
  cleaning_duration_minutes: number;
  cleaning_lead_time_hours: number;
  cleaning_open_mode: boolean;
  cleaning_instructions_template: string | null;
}

const defaults: CleaningAutomationSettings = {
  cleaning_enabled: false,
  cleaning_payout_amount: 0,
  cleaning_default_start_time: "11:00",
  cleaning_duration_minutes: 120,
  cleaning_lead_time_hours: 0,
  cleaning_open_mode: true,
  cleaning_instructions_template: null,
};

export function useCleaningAutomation(propertyId: string | undefined) {
  const [settings, setSettings] = useState<CleaningAutomationSettings>(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetch = useCallback(async () => {
    if (!propertyId) return;
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("properties")
      .select("cleaning_enabled, cleaning_payout_amount, cleaning_default_start_time, cleaning_duration_minutes, cleaning_lead_time_hours, cleaning_open_mode, cleaning_instructions_template")
      .eq("id", propertyId)
      .single();
    if (!error && data) {
      setSettings({
        cleaning_enabled: data.cleaning_enabled ?? false,
        cleaning_payout_amount: data.cleaning_payout_amount ?? 0,
        cleaning_default_start_time: data.cleaning_default_start_time ?? "11:00",
        cleaning_duration_minutes: data.cleaning_duration_minutes ?? 120,
        cleaning_lead_time_hours: data.cleaning_lead_time_hours ?? 0,
        cleaning_open_mode: data.cleaning_open_mode ?? true,
        cleaning_instructions_template: data.cleaning_instructions_template ?? null,
      });
    }
    setLoading(false);
  }, [propertyId]);

  useEffect(() => { fetch(); }, [fetch]);

  const save = async (values: Partial<CleaningAutomationSettings>) => {
    if (!propertyId) return;
    setSaving(true);
    const { error } = await (supabase as any)
      .from("properties")
      .update(values)
      .eq("id", propertyId);
    if (error) {
      toast.error("Erreur: " + error.message);
    } else {
      toast.success("Paramètres ménage enregistrés");
      setSettings(prev => ({ ...prev, ...values }));
    }
    setSaving(false);
  };

  return { settings, loading, saving, save, setSettings };
}
