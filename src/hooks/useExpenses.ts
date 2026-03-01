import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Expense {
  id: string;
  user_id: string;
  property_id: string | null;
  category: string;
  description: string;
  amount: number;
  expense_date: string;
  file_url: string | null;
  created_at: string;
  property?: { name: string };
}

const expenseCategories = [
  { value: "cleaning_supplies", label: "Produits ménage" },
  { value: "maintenance", label: "Maintenance" },
  { value: "furniture", label: "Mobilier" },
  { value: "linen", label: "Linge" },
  { value: "consumables", label: "Consommables" },
  { value: "marketing", label: "Marketing" },
  { value: "insurance", label: "Assurance" },
  { value: "software", label: "Logiciel" },
  { value: "transport", label: "Transport" },
  { value: "other", label: "Autre" },
];

export { expenseCategories };

export function useExpenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchExpenses = useCallback(async () => {
    const { data, error } = await supabase
      .from("expenses" as any)
      .select("*, property:properties(name)")
      .order("expense_date", { ascending: false });
    if (!error) setExpenses((data as any) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

  const createExpense = async (values: Partial<Expense>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase
      .from("expenses" as any)
      .insert({ ...values, user_id: user.id });
    if (error) { toast.error("Erreur création dépense"); return; }
    toast.success("Dépense ajoutée");
    await fetchExpenses();
  };

  const deleteExpense = async (id: string) => {
    const { error } = await supabase
      .from("expenses" as any)
      .delete()
      .eq("id", id);
    if (error) { toast.error("Erreur suppression"); return; }
    toast.success("Dépense supprimée");
    await fetchExpenses();
  };

  return { expenses, loading, createExpense, deleteExpense, refetch: fetchExpenses };
}
