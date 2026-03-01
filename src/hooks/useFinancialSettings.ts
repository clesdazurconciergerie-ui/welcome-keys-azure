import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface FinancialSettings {
  id: string;
  user_id: string;
  company_name: string | null;
  logo_url: string | null;
  address: string | null;
  org_phone: string | null;
  org_postal_code: string | null;
  org_city: string | null;
  vat_number: string | null;
  default_vat_rate: number;
  invoice_prefix: string;
  next_invoice_number: number;
  iban: string | null;
  bic: string | null;
  legal_footer: string | null;
  default_due_days: number;
  vat_enabled: boolean;
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
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data, error } = await supabase
        .from("financial_settings" as any)
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) {
        console.error("[FinancialSettings] fetch error:", error);
      }
      if (data) setSettings(data as any);
      setLoading(false);
    } catch (e) {
      console.error("[FinancialSettings] unexpected error:", e);
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const saveSettings = async (values: Partial<FinancialSettings>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Non authentifié");
      return;
    }

    // Validate
    if (values.default_due_days !== undefined && (!Number.isInteger(values.default_due_days) || values.default_due_days < 0)) {
      toast.error("Le délai de paiement doit être un entier positif");
      return;
    }

    const payload: any = { ...values, user_id: user.id };
    // Remove id from payload to avoid conflict
    delete payload.id;

    // Use upsert with onConflict on user_id
    const { data, error } = await supabase
      .from("financial_settings" as any)
      .upsert(payload, { onConflict: "user_id" })
      .select()
      .single();

    if (error) {
      console.error("[FinancialSettings] save error:", error);
      toast.error(`Erreur de sauvegarde: ${error.message}`);
      return;
    }

    toast.success("Paramètres financiers enregistrés");
    if (data) setSettings(data as any);
    else await fetchSettings();
  };

  const cleanupVatData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: userInvoices } = await supabase
      .from("invoices" as any)
      .select("id")
      .eq("user_id", user.id);

    if (userInvoices && userInvoices.length > 0) {
      const invoiceIds = (userInvoices as any[]).map((i: any) => i.id);
      for (const invId of invoiceIds) {
        await supabase
          .from("invoice_items" as any)
          .update({ vat_rate: 0 })
          .eq("invoice_id", invId);
      }
      for (const invId of invoiceIds) {
        const { data: inv } = await supabase
          .from("invoices" as any)
          .select("subtotal")
          .eq("id", invId)
          .single();
        if (inv) {
          await supabase
            .from("invoices" as any)
            .update({ vat_rate: 0, vat_amount: 0, total: (inv as any).subtotal })
            .eq("id", invId);
        }
      }
    }

    await supabase
      .from("expenses" as any)
      .update({ vat_rate: 0, vat_amount: 0 })
      .eq("user_id", user.id);

    toast.success("Données TVA nettoyées");
  };

  return { settings, loading, saveSettings, refetch: fetchSettings, cleanupVatData };
}

export function usePropertyFinancialSettings(propertyId: string | undefined) {
  const [settings, setSettings] = useState<PropertyFinancialSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    if (!propertyId) { setLoading(false); return; }
    const { data, error } = await supabase
      .from("property_financial_settings" as any)
      .select("*")
      .eq("property_id", propertyId)
      .maybeSingle();
    if (error) console.error("[PropertyFinancialSettings] fetch error:", error);
    if (data) setSettings(data as any);
    setLoading(false);
  }, [propertyId]);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const saveSettings = async (values: Partial<PropertyFinancialSettings>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !propertyId) return;
    const payload: any = { ...values, user_id: user.id, property_id: propertyId };
    delete payload.id;

    const { data, error } = await supabase
      .from("property_financial_settings" as any)
      .upsert(payload, { onConflict: "property_id" })
      .select()
      .single();

    if (error) {
      console.error("[PropertyFinancialSettings] save error:", error);
      toast.error(`Erreur: ${error.message}`);
      return;
    }
    toast.success("Configuration financière enregistrée");
    if (data) setSettings(data as any);
    else await fetchSettings();
  };

  return { settings, loading, saveSettings };
}
