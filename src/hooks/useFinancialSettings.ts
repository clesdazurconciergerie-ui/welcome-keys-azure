import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface FinancialSettings {
  id: string;
  user_id: string;
  company_name: string | null;
  logo_url: string | null;
  address: string | null;
  vat_number: string | null;
  default_vat_rate: number;
  invoice_prefix: string;
  next_invoice_number: number;
  iban: string | null;
  legal_footer: string | null;
}

export interface PropertyFinancialSettings {
  id: string;
  property_id: string;
  user_id: string;
  compensation_model: string;
  commission_rate: number;
  cleaning_fee: number;
  checkin_fee: number;
  maintenance_rate: number;
  ota_payout_recipient: string;
  pricing_source: string;
}

export function useFinancialSettings() {
  const [settings, setSettings] = useState<FinancialSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase
      .from("financial_settings" as any)
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!error && data) setSettings(data as any);
    setLoading(false);
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const saveSettings = async (values: Partial<FinancialSettings>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const payload = { ...values, user_id: user.id };
    if (settings?.id) {
      const { error } = await supabase
        .from("financial_settings" as any)
        .update(payload)
        .eq("id", settings.id);
      if (error) { toast.error("Erreur de sauvegarde"); return; }
    } else {
      const { error } = await supabase
        .from("financial_settings" as any)
        .insert(payload);
      if (error) { toast.error("Erreur de création"); return; }
    }
    toast.success("Paramètres financiers enregistrés");
    await fetchSettings();
  };

  return { settings, loading, saveSettings, refetch: fetchSettings };
}

export function usePropertyFinancialSettings(propertyId: string | undefined) {
  const [settings, setSettings] = useState<PropertyFinancialSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    if (!propertyId) return;
    const { data, error } = await supabase
      .from("property_financial_settings" as any)
      .select("*")
      .eq("property_id", propertyId)
      .maybeSingle();
    if (!error && data) setSettings(data as any);
    setLoading(false);
  }, [propertyId]);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const saveSettings = async (values: Partial<PropertyFinancialSettings>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !propertyId) return;
    const payload = { ...values, user_id: user.id, property_id: propertyId };
    if (settings?.id) {
      const { error } = await supabase
        .from("property_financial_settings" as any)
        .update(payload)
        .eq("id", settings.id);
      if (error) { toast.error("Erreur"); return; }
    } else {
      const { error } = await supabase
        .from("property_financial_settings" as any)
        .insert(payload);
      if (error) { toast.error("Erreur"); return; }
    }
    toast.success("Configuration financière enregistrée");
    await fetchSettings();
  };

  return { settings, loading, saveSettings };
}
