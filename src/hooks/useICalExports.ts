// MODULE 7 — Channel Manager Lite : exports iCal sortants
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ICalExport {
  id: string;
  user_id: string;
  property_id: string;
  feed_token: string;
  is_active: boolean;
  include_blocked: boolean;
  include_manual: boolean;
  last_accessed_at: string | null;
  access_count: number;
  created_at: string;
  updated_at: string;
}

export function useICalExports() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["ical-exports"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("property_ical_exports")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ICalExport[];
    },
  });

  const createExport = useMutation({
    mutationFn: async (property_id: string) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Non connecté");
      const { error } = await (supabase as any)
        .from("property_ical_exports")
        .insert({ user_id: u.user.id, property_id });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ical-exports"] });
      toast.success("Lien iCal généré");
    },
    onError: (e: any) => toast.error(e.message ?? "Erreur"),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...patch }: Partial<ICalExport> & { id: string }) => {
      const { error } = await (supabase as any)
        .from("property_ical_exports")
        .update(patch)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ical-exports"] }),
    onError: (e: any) => toast.error(e.message ?? "Erreur"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("property_ical_exports").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ical-exports"] });
      toast.success("Lien supprimé");
    },
    onError: (e: any) => toast.error(e.message ?? "Erreur"),
  });

  const regenerateToken = useMutation({
    mutationFn: async (id: string) => {
      // Régénère via delete+insert (simple)
      const { data: existing } = await (supabase as any)
        .from("property_ical_exports")
        .select("property_id")
        .eq("id", id)
        .single();
      if (!existing) throw new Error("Introuvable");
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Non connecté");
      await (supabase as any).from("property_ical_exports").delete().eq("id", id);
      const { error } = await (supabase as any)
        .from("property_ical_exports")
        .insert({ user_id: u.user.id, property_id: existing.property_id });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ical-exports"] });
      toast.success("Nouveau token généré");
    },
    onError: (e: any) => toast.error(e.message ?? "Erreur"),
  });

  return {
    exports: query.data ?? [],
    isLoading: query.isLoading,
    createExport: createExport.mutate,
    update: update.mutate,
    remove: remove.mutate,
    regenerateToken: regenerateToken.mutate,
  };
}

export function getICalUrl(token: string): string {
  const base = import.meta.env.VITE_SUPABASE_URL || "https://otxnzjkyzkpoymeypmef.supabase.co";
  return `${base}/functions/v1/ical-export?token=${token}`;
}
