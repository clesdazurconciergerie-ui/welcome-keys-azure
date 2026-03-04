import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CashIncome {
  id: string;
  user_id: string;
  property_id: string | null;
  amount: number;
  description: string;
  income_date: string;
  category: string | null;
  notes: string | null;
  created_at: string;
}

export function useCashIncomes() {
  const [incomes, setIncomes] = useState<CashIncome[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("cash_incomes")
      .select("*")
      .order("income_date", { ascending: false });
    setIncomes(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const addIncome = async (income: {
    property_id?: string;
    amount: number;
    description: string;
    income_date: string;
    category?: string;
    notes?: string;
  }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await (supabase as any).from("cash_incomes").insert({
      user_id: user.id,
      ...income,
    });
    if (error) {
      toast.error("Erreur: " + error.message);
      return;
    }
    toast.success("Encaissement ajouté");
    await fetch();
  };

  const deleteIncome = async (id: string) => {
    const { error } = await (supabase as any).from("cash_incomes").delete().eq("id", id);
    if (error) {
      toast.error("Erreur lors de la suppression");
      return;
    }
    toast.success("Encaissement supprimé");
    await fetch();
  };

  return { incomes, loading, addIncome, deleteIncome, refresh: fetch };
}
