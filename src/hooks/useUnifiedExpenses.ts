import { useMemo, useState, useEffect, useCallback } from "react";
import { useExpenses, type Expense } from "@/hooks/useExpenses";
import { useVendorPayments, type VendorPayment } from "@/hooks/useVendorPayments";
import { supabase } from "@/integrations/supabase/client";

export type UnifiedExpenseType = "expense" | "vendor_payment" | "mission";

interface MissionExpense {
  id: string;
  title: string;
  payout_amount: number;
  status: string;
  start_at: string;
  property_id: string;
  selected_provider_id: string | null;
  property?: { name: string };
  selected_provider?: { first_name: string; last_name: string };
}

export interface UnifiedExpense {
  id: string;
  type: UnifiedExpenseType;
  date: string;
  description: string;
  amount: number;
  status: string; // "paid" | "to_pay" | "pending_payment"
  category: string | null;
  property_name: string | null;
  property_id: string | null;
  provider_name: string | null;
  owner_id: string | null;
  _source: Expense | VendorPayment | MissionExpense;
}

export function useUnifiedExpenses() {
  const { expenses, loading: eLoading, createExpense, updateExpenseStatus, deleteExpense, refetch: refetchExpenses } = useExpenses();
  const { payments: vendorPayments, loading: vpLoading, create: createVP, updateStatus: updateVPStatus, remove: removeVP, refetch: refetchVP } = useVendorPayments();

  // Fetch validated/paid missions as expense source
  const [missionExpenses, setMissionExpenses] = useState<MissionExpense[]>([]);
  const [mLoading, setMLoading] = useState(true);

  const fetchMissionExpenses = useCallback(async () => {
    setMLoading(true);
    const { data } = await (supabase as any)
      .from('missions')
      .select('id, title, payout_amount, status, start_at, property_id, selected_provider_id, property:property_id(name), selected_provider:selected_provider_id(first_name, last_name)')
      .in('status', ['validated', 'paid'])
      .gt('payout_amount', 0)
      .order('start_at', { ascending: false });
    setMissionExpenses(data || []);
    setMLoading(false);
  }, []);

  useEffect(() => { fetchMissionExpenses(); }, [fetchMissionExpenses]);

  // Realtime for missions
  useEffect(() => {
    const channel = supabase
      .channel('unified-missions-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'missions' }, () => fetchMissionExpenses())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchMissionExpenses]);

  const loading = eLoading || vpLoading || mLoading;

  const unified = useMemo<UnifiedExpense[]>(() => {
    const items: UnifiedExpense[] = [];

    // Manual expenses
    for (const e of expenses) {
      items.push({
        id: `exp-${e.id}`,
        type: "expense",
        date: e.expense_date,
        description: e.description,
        amount: Number(e.amount),
        status: e.status,
        category: e.category,
        property_name: (e.property as any)?.name || null,
        property_id: e.property_id,
        provider_name: null,
        owner_id: e.owner_id,
        _source: e,
      });
    }

    // Vendor payments
    for (const vp of vendorPayments) {
      items.push({
        id: `vp-${vp.id}`,
        type: "vendor_payment",
        date: vp.date,
        description: vp.description,
        amount: Number(vp.amount),
        status: vp.status,
        category: null,
        property_name: (vp.property as any)?.name || null,
        property_id: vp.property_id,
        provider_name: vp.provider ? `${(vp.provider as any).first_name} ${(vp.provider as any).last_name}` : null,
        owner_id: vp.owner_id,
        _source: vp,
      });
    }

    // Missions (validated = pending_payment, paid = paid)
    for (const m of missionExpenses) {
      const provName = m.selected_provider
        ? `${m.selected_provider.first_name} ${m.selected_provider.last_name}`
        : null;
      items.push({
        id: `mission-${m.id}`,
        type: "mission",
        date: m.start_at?.split('T')[0] || new Date().toISOString().split('T')[0],
        description: `Mission: ${m.title}`,
        amount: Number(m.payout_amount),
        status: m.status === 'paid' ? 'paid' : 'pending_payment',
        category: "mission",
        property_name: (m.property as any)?.name || null,
        property_id: m.property_id,
        provider_name: provName,
        owner_id: null,
        _source: m,
      });
    }

    items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return items;
  }, [expenses, vendorPayments, missionExpenses]);

  const totalPaid = useMemo(() => unified.filter(u => u.status === "paid").reduce((s, u) => s + u.amount, 0), [unified]);
  const totalToPay = useMemo(() => unified.filter(u => ["to_pay", "pending_payment", "pending"].includes(u.status)).reduce((s, u) => s + u.amount, 0), [unified]);

  const paidByType = useMemo(() => {
    const result: Record<string, number> = { expense: 0, vendor_payment: 0, mission: 0 };
    for (const u of unified) {
      if (u.status === "paid") result[u.type] = (result[u.type] || 0) + u.amount;
    }
    return result;
  }, [unified]);

  return {
    unified,
    loading,
    totalPaid,
    totalToPay,
    paidByType,
    createExpense,
    updateExpenseStatus,
    deleteExpense,
    createVP,
    updateVPStatus,
    removeVP,
    refetch: () => { refetchExpenses(); refetchVP(); fetchMissionExpenses(); },
  };
}
