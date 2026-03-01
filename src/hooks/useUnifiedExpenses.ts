import { useMemo } from "react";
import { useExpenses, type Expense } from "@/hooks/useExpenses";
import { useVendorPayments, type VendorPayment } from "@/hooks/useVendorPayments";
import { useCleaningInterventions, type CleaningIntervention } from "@/hooks/useCleaningInterventions";

export type UnifiedExpenseType = "expense" | "vendor_payment" | "intervention";

export interface UnifiedExpense {
  id: string;
  type: UnifiedExpenseType;
  date: string;
  description: string;
  amount: number;
  status: string; // "paid" | "to_pay"
  category: string | null;
  property_name: string | null;
  property_id: string | null;
  provider_name: string | null;
  owner_id: string | null;
  // Original source for actions
  _source: Expense | VendorPayment | CleaningIntervention;
}

export function useUnifiedExpenses() {
  const { expenses, loading: eLoading, createExpense, updateExpenseStatus, deleteExpense, refetch: refetchExpenses } = useExpenses();
  const { payments: vendorPayments, loading: vpLoading, create: createVP, updateStatus: updateVPStatus, remove: removeVP, refetch: refetchVP } = useVendorPayments();
  const { interventions, isLoading: ciLoading, markPaymentDone, refetch: refetchCI } = useCleaningInterventions();

  const loading = eLoading || vpLoading || ciLoading;

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

    // Paid interventions (payment_done = true AND mission_amount > 0)
    for (const ci of interventions) {
      if (!ci.payment_done || !ci.mission_amount || Number(ci.mission_amount) <= 0) continue;
      const provName = ci.service_provider
        ? `${ci.service_provider.first_name} ${ci.service_provider.last_name}`
        : null;
      items.push({
        id: `ci-${ci.id}`,
        type: "intervention",
        date: ci.scheduled_date,
        description: `${ci.mission_type === "cleaning" ? "Ménage" : ci.mission_type} — ${(ci.property as any)?.name || "Bien"}`,
        amount: Number(ci.mission_amount),
        status: "paid",
        category: ci.mission_type || "cleaning",
        property_name: (ci.property as any)?.name || null,
        property_id: ci.property_id,
        provider_name: provName,
        owner_id: null, // Could be derived via property->owner if needed
        _source: ci,
      });
    }

    // Sort by date descending
    items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return items;
  }, [expenses, vendorPayments, interventions]);

  // Totals
  const totalPaid = useMemo(() => unified.filter(u => u.status === "paid").reduce((s, u) => s + u.amount, 0), [unified]);
  const totalToPay = useMemo(() => unified.filter(u => u.status === "to_pay").reduce((s, u) => s + u.amount, 0), [unified]);

  // Breakdown by type (paid only)
  const paidByType = useMemo(() => {
    const result = { expense: 0, vendor_payment: 0, intervention: 0 };
    for (const u of unified) {
      if (u.status === "paid") result[u.type] += u.amount;
    }
    return result;
  }, [unified]);

  return {
    unified,
    loading,
    totalPaid,
    totalToPay,
    paidByType,
    // Pass through action functions
    createExpense,
    updateExpenseStatus,
    deleteExpense,
    createVP,
    updateVPStatus,
    removeVP,
    markPaymentDone,
    refetch: () => { refetchExpenses(); refetchVP(); refetchCI(); },
  };
}
