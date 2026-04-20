// MODULE 3 — Dynamic Pricing Engine
// Hook React Query pour gérer pricing_rules + pricing_suggestions.

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type RuleType = "seasonal" | "weekday" | "min_nights" | "lastminute" | "longstay";
export type AdjustmentType = "percent" | "fixed";

export interface PricingRule {
  id: string;
  user_id: string;
  property_id: string | null;
  name: string;
  rule_type: RuleType;
  date_start: string | null;
  date_end: string | null;
  day_of_week: number[] | null;
  min_nights: number | null;
  base_price: number | null;
  adjustment_type: AdjustmentType;
  adjustment_value: number;
  priority: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PricingSuggestion {
  id: string;
  user_id: string;
  property_id: string;
  for_date: string;
  current_price: number | null;
  suggested_price: number;
  reasoning: string | null;
  confidence: number;
  status: "pending" | "applied" | "rejected";
  applied_at: string | null;
  created_at: string;
}

export function usePricingRules() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["pricing-rules"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("pricing_rules")
        .select("*")
        .order("priority", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as PricingRule[];
    },
  });

  const create = useMutation({
    mutationFn: async (payload: Partial<PricingRule>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non connecté");
      const { error } = await (supabase as any)
        .from("pricing_rules")
        .insert({ ...payload, user_id: user.id });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pricing-rules"] });
      toast.success("Règle créée");
    },
    onError: (e: any) => toast.error(e.message ?? "Erreur"),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...patch }: Partial<PricingRule> & { id: string }) => {
      const { error } = await (supabase as any).from("pricing_rules").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pricing-rules"] });
      toast.success("Règle mise à jour");
    },
    onError: (e: any) => toast.error(e.message ?? "Erreur"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("pricing_rules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pricing-rules"] });
      toast.success("Règle supprimée");
    },
    onError: (e: any) => toast.error(e.message ?? "Erreur"),
  });

  return {
    rules: query.data ?? [],
    isLoading: query.isLoading,
    create: create.mutate,
    update: update.mutate,
    remove: remove.mutate,
  };
}

export function usePricingSuggestions(propertyId?: string) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["pricing-suggestions", propertyId],
    queryFn: async () => {
      let q = (supabase as any).from("pricing_suggestions").select("*").order("for_date");
      if (propertyId) q = q.eq("property_id", propertyId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as PricingSuggestion[];
    },
  });

  const apply = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("pricing_suggestions")
        .update({ status: "applied", applied_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pricing-suggestions"] });
      toast.success("Suggestion appliquée");
    },
    onError: (e: any) => toast.error(e.message ?? "Erreur"),
  });

  const reject = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("pricing_suggestions")
        .update({ status: "rejected" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pricing-suggestions"] }),
    onError: (e: any) => toast.error(e.message ?? "Erreur"),
  });

  return {
    suggestions: query.data ?? [],
    pending: (query.data ?? []).filter((s) => s.status === "pending"),
    isLoading: query.isLoading,
    apply: apply.mutate,
    reject: reject.mutate,
  };
}
