import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface AutomationSettings {
  auto_cleaning_missions: boolean;
  auto_link_cleaning_photos: boolean;
  notifications_enabled: boolean;
  provider_reminders: boolean;
  reminder_hours_before: number;
}

const defaults: AutomationSettings = {
  auto_cleaning_missions: true,
  auto_link_cleaning_photos: false,
  notifications_enabled: true,
  provider_reminders: false,
  reminder_hours_before: 24,
};

export function useAutomationSettings() {
  const [settings, setSettings] = useState<AutomationSettings>(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchSettings = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("automation_settings")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!error && data) {
      setSettings({
        auto_cleaning_missions: data.auto_cleaning_missions,
        auto_link_cleaning_photos: data.auto_link_cleaning_photos,
        notifications_enabled: data.notifications_enabled,
        provider_reminders: data.provider_reminders,
        reminder_hours_before: data.reminder_hours_before,
      });
    } else if (!data) {
      // Initialize with defaults
      const { error: insertError } = await supabase
        .from("automation_settings")
        .insert({ user_id: user.id, ...defaults });
      
      if (!insertError) {
        setSettings(defaults);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSettings = async (values: Partial<AutomationSettings>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setSaving(true);
    const { error } = await supabase
      .from("automation_settings")
      .update(values)
      .eq("user_id", user.id);

    if (error) {
      toast.error("Erreur: " + error.message);
    } else {
      toast.success("Paramètres enregistrés");
      setSettings(prev => ({ ...prev, ...values }));
    }
    setSaving(false);
  };

  return { settings, loading, saving, updateSettings };
}
