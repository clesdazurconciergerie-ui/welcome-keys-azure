import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ServiceCatalogItem {
  id: string;
  user_id: string;
  name: string;
  default_unit_price: number;
  default_vat_rate: number;
  unit_label: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export function useServicesCatalog() {
  const [services, setServices] = useState<ServiceCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    const { data, error } = await supabase
      .from("services_catalog" as any)
      .select("*")
      .order("name");
    if (!error) setServices((data as any) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const create = async (values: Partial<ServiceCatalogItem>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase
      .from("services_catalog" as any)
      .insert({ ...values, user_id: user.id });
    if (error) { toast.error("Erreur création service"); return; }
    toast.success("Service ajouté");
    await fetch();
  };

  const update = async (id: string, values: Partial<ServiceCatalogItem>) => {
    const { error } = await supabase
      .from("services_catalog" as any)
      .update(values)
      .eq("id", id);
    if (error) { toast.error("Erreur mise à jour"); return; }
    toast.success("Service mis à jour");
    await fetch();
  };

  const remove = async (id: string) => {
    const { error } = await supabase
      .from("services_catalog" as any)
      .delete()
      .eq("id", id);
    if (error) { toast.error("Erreur suppression"); return; }
    toast.success("Service supprimé");
    await fetch();
  };

  return { services, loading, create, update, remove, refetch: fetch };
}
