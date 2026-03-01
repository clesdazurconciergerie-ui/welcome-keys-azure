import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PerformanceKPIs {
  grossRevenue: number;
  expenses: number;
  netProfit: number;
  receivables: number;
  bookingsCount: number;
  interventionsCount: number;
  avgPaymentDelay: number;
  leadsCount: number;
  conversionRate: number;
  pipelineValue: number;
  // Previous period for MoM
  prevGrossRevenue: number;
  prevExpenses: number;
  prevNetProfit: number;
  prevReceivables: number;
  prevBookingsCount: number;
  prevLeadsCount: number;
  prevConversionRate: number;
  // Monthly series for charts
  monthlySeries: { month: string; revenue: number; expenses: number; receivables: number }[];
  // Overdue count for alerts/score
  overdueInvoicesCount: number;
  unpaidVendorsCount: number;
}

const EMPTY: PerformanceKPIs = {
  grossRevenue: 0, expenses: 0, netProfit: 0, receivables: 0,
  bookingsCount: 0, interventionsCount: 0, avgPaymentDelay: 0,
  leadsCount: 0, conversionRate: 0, pipelineValue: 0,
  prevGrossRevenue: 0, prevExpenses: 0, prevNetProfit: 0, prevReceivables: 0,
  prevBookingsCount: 0, prevLeadsCount: 0, prevConversionRate: 0,
  monthlySeries: [], overdueInvoicesCount: 0, unpaidVendorsCount: 0,
};

export function usePerformanceKPIs(monthsBack: number = 6) {
  const [kpis, setKpis] = useState<PerformanceKPIs>(EMPTY);
  const [loading, setLoading] = useState(true);

  const fetchKPIs = useCallback(async () => {
    setLoading(true);
    try {
      // Invoices
      const { data: invoices } = await (supabase as any)
        .from("invoices")
        .select("total, status, invoice_date, due_date, created_at");

      const inv = (invoices || []) as any[];
      const revenueStatuses = ["sent", "paid", "overdue"];

      const now = new Date();
      const curMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const prevMonthKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;

      const sumByMonth = (items: any[], key: string, statusFilter: string[], monthKey: string) =>
        items.filter((i: any) => statusFilter.includes(i.status) && i[key]?.startsWith(monthKey))
          .reduce((s: number, i: any) => s + (Number(i.total || i.amount) || 0), 0);

      const grossRevenue = inv.filter((i: any) => revenueStatuses.includes(i.status))
        .reduce((s: number, i: any) => s + (Number(i.total) || 0), 0);
      const receivables = inv.filter((i: any) => ["sent", "overdue"].includes(i.status))
        .reduce((s: number, i: any) => s + (Number(i.total) || 0), 0);
      const overdueInvoicesCount = inv.filter((i: any) => i.status === "overdue").length;

      const prevGrossRevenue = sumByMonth(inv, "invoice_date", revenueStatuses, prevMonthKey);
      const curGrossRevenue = sumByMonth(inv, "invoice_date", revenueStatuses, curMonthKey);
      const prevReceivables = sumByMonth(inv, "invoice_date", ["sent", "overdue"], prevMonthKey);

      // Payment delay
      const paidInvoices = inv.filter((i: any) => i.status === "paid" && i.due_date && i.invoice_date);
      const avgDelay = paidInvoices.length > 0
        ? paidInvoices.reduce((s: number, i: any) => {
            const d = (new Date(i.due_date).getTime() - new Date(i.invoice_date).getTime()) / 86400000;
            return s + d;
          }, 0) / paidInvoices.length
        : 0;

      // Expenses
      const { data: expenses } = await (supabase as any).from("expenses").select("amount, status, expense_date");
      const { data: vendorPayments } = await (supabase as any).from("vendor_payments").select("amount, status, created_at");
      const { data: interventions } = await (supabase as any)
        .from("cleaning_interventions").select("mission_amount, payment_done, status");

      const expArr = (expenses || []) as any[];
      const vpArr = (vendorPayments || []) as any[];
      const ciArr = (interventions || []) as any[];

      const expTotal = expArr.filter((e: any) => e.status === "paid").reduce((s: number, e: any) => s + (Number(e.amount) || 0), 0);
      const vpTotal = vpArr.filter((v: any) => v.status === "paid").reduce((s: number, v: any) => s + (Number(v.amount) || 0), 0);
      const ciTotal = ciArr.filter((c: any) => c.payment_done).reduce((s: number, c: any) => s + (Number(c.mission_amount) || 0), 0);
      const totalExpenses = expTotal + vpTotal + ciTotal;

      const unpaidVendorsCount = vpArr.filter((v: any) => v.status !== "paid").length;

      const prevExpTotal = expArr.filter((e: any) => e.status === "paid" && e.expense_date?.startsWith(prevMonthKey))
        .reduce((s: number, e: any) => s + (Number(e.amount) || 0), 0);
      const curExpTotal = expArr.filter((e: any) => e.status === "paid" && e.expense_date?.startsWith(curMonthKey))
        .reduce((s: number, e: any) => s + (Number(e.amount) || 0), 0);

      // Bookings
      const { data: bookingsAll } = await (supabase as any).from("bookings").select("id, check_in");
      const bkAll = (bookingsAll || []) as any[];
      const bookingsCount = bkAll.length;
      const prevBookingsCount = bkAll.filter((b: any) => b.check_in?.startsWith(prevMonthKey)).length;

      // Interventions count
      const { count: interventionsCount } = await (supabase as any)
        .from("cleaning_interventions").select("id", { count: "exact", head: true });

      // Prospects
      const { data: prospects } = await (supabase as any)
        .from("prospects").select("pipeline_status, estimated_monthly_revenue, created_at");
      const prosp = (prospects || []) as any[];
      const leadsCount = prosp.length;
      const signed = prosp.filter((p: any) => p.pipeline_status === "signed").length;
      const conversionRate = leadsCount > 0 ? (signed / leadsCount) * 100 : 0;
      const pipelineValue = prosp
        .filter((p: any) => !["signed", "lost"].includes(p.pipeline_status))
        .reduce((s: number, p: any) => s + (Number(p.estimated_monthly_revenue) || 0), 0);

      const prevLeads = prosp.filter((p: any) => p.created_at?.startsWith(prevMonthKey));
      const prevLeadsCount = prevLeads.length;
      const prevSigned = prevLeads.filter((p: any) => p.pipeline_status === "signed").length;
      const prevConversionRate = prevLeadsCount > 0 ? (prevSigned / prevLeadsCount) * 100 : 0;

      // Monthly series
      const monthlySeries: PerformanceKPIs["monthlySeries"] = [];
      for (let i = monthsBack - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = d.toISOString().slice(0, 7);
        const monthLabel = d.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
        const mRev = inv.filter((inv: any) => revenueStatuses.includes(inv.status) && inv.invoice_date?.startsWith(monthKey))
          .reduce((s: number, inv: any) => s + (Number(inv.total) || 0), 0);
        const mExp = expArr.filter((e: any) => e.status === "paid" && e.expense_date?.startsWith(monthKey))
          .reduce((s: number, e: any) => s + (Number(e.amount) || 0), 0);
        const mRec = inv.filter((inv: any) => ["sent", "overdue"].includes(inv.status) && inv.invoice_date?.startsWith(monthKey))
          .reduce((s: number, inv: any) => s + (Number(inv.total) || 0), 0);
        monthlySeries.push({ month: monthLabel, revenue: mRev, expenses: mExp, receivables: mRec });
      }

      setKpis({
        grossRevenue, expenses: totalExpenses, netProfit: grossRevenue - totalExpenses, receivables,
        bookingsCount, interventionsCount: interventionsCount || 0, avgPaymentDelay: Math.round(avgDelay),
        leadsCount, conversionRate: Math.round(conversionRate * 10) / 10, pipelineValue,
        prevGrossRevenue, prevExpenses: prevExpTotal, prevNetProfit: prevGrossRevenue - prevExpTotal,
        prevReceivables, prevBookingsCount, prevLeadsCount, prevConversionRate: Math.round(prevConversionRate * 10) / 10,
        monthlySeries, overdueInvoicesCount, unpaidVendorsCount,
      });
    } catch (err) {
      console.error("[PerformanceKPIs] error:", err);
    } finally {
      setLoading(false);
    }
  }, [monthsBack]);

  useEffect(() => { fetchKPIs(); }, [fetchKPIs]);

  return { kpis, loading, refetch: fetchKPIs };
}
