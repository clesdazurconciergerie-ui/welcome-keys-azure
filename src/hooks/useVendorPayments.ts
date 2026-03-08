import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface VendorPayment {
  id: string;
  user_id: string;
  provider_id: string | null;
  date: string;
  description: string;
  amount: number;
  vat_rate: number;
  vat_amount: number;
  status: string;
  owner_id: string | null;
  property_id: string | null;
  created_at: string;
  provider?: { first_name: string; last_name: string };
  property?: { name: string };
}

export function useVendorPayments() {
  const [payments, setPayments] = useState<VendorPayment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    const { data, error } = await supabase
      .from("vendor_payments" as any)
      .select("*, provider:service_providers(first_name, last_name), property:properties(name)")
      .order("date", { ascending: false });
    if (!error) setPayments((data as any) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const create = async (values: Partial<VendorPayment>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Vous devez être connecté");
      return;
    }
    const payload = { ...values, user_id: user.id };
    console.log('[useVendorPayments] Insert payload:', payload);
    
    const { error } = await supabase
      .from("vendor_payments" as any)
      .insert(payload);
    
    if (error) {
      console.error('[useVendorPayments] Insert error:', error);
      toast.error(`Erreur création paiement : ${error.message}`);
      return;
    }
    toast.success("Paiement ajouté");
    await fetch();
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from("vendor_payments" as any)
      .update({ status })
      .eq("id", id);
    if (error) { toast.error("Erreur"); return; }
    toast.success("Statut mis à jour");
    await fetch();
  };

  const remove = async (id: string) => {
    const { error } = await supabase
      .from("vendor_payments" as any)
      .delete()
      .eq("id", id);
    if (error) { toast.error("Erreur suppression"); return; }
    toast.success("Paiement supprimé");
    await fetch();
  };

  return { payments, loading, create, updateStatus, remove, refetch: fetch };
}
