import { useState, useEffect } from "react";
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
  // Monthly series for charts
  monthlySeries: { month: string; revenue: number; expenses: number; receivables: number }[];
}

const EMPTY: PerformanceKPIs = {
  grossRevenue: 0, expenses: 0, netProfit: 0, receivables: 0,
  bookingsCount: 0, interventionsCount: 0, avgPaymentDelay: 0,
  leadsCount: 0, conversionRate: 0, pipelineValue: 0, monthlySeries: [],
};

export function usePerformanceKPIs() {
  const [kpis, setKpis] = useState<PerformanceKPIs>(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        // Invoices
        const { data: invoices } = await (supabase as any)
          .from("invoices")
          .select("total, status, invoice_date, due_date, created_at");

        const inv = (invoices || []) as any[];
        const revenueStatuses = ["sent", "paid", "overdue"];
        const grossRevenue = inv
          .filter((i: any) => revenueStatuses.includes(i.status))
          .reduce((s: number, i: any) => s + (Number(i.total) || 0), 0);
        const receivables = inv
          .filter((i: any) => ["sent", "overdue"].includes(i.status))
          .reduce((s: number, i: any) => s + (Number(i.total) || 0), 0);

        // Payment delay (paid invoices only)
        const paidInvoices = inv.filter((i: any) => i.status === "paid" && i.due_date && i.invoice_date);
        const avgDelay = paidInvoices.length > 0
          ? paidInvoices.reduce((s: number, i: any) => {
              const d = (new Date(i.due_date).getTime() - new Date(i.invoice_date).getTime()) / 86400000;
              return s + d;
            }, 0) / paidInvoices.length
          : 0;

        // Expenses
        const { data: expenses } = await (supabase as any)
          .from("expenses")
          .select("amount, status");
        const { data: vendorPayments } = await (supabase as any)
          .from("vendor_payments")
          .select("amount, status");
        const { data: interventions } = await (supabase as any)
          .from("cleaning_interventions")
          .select("mission_amount, payment_done, status");

        const expTotal = ((expenses || []) as any[])
          .filter((e: any) => e.status === "paid")
          .reduce((s: number, e: any) => s + (Number(e.amount) || 0), 0);
        const vpTotal = ((vendorPayments || []) as any[])
          .filter((v: any) => v.status === "paid")
          .reduce((s: number, v: any) => s + (Number(v.amount) || 0), 0);
        const ciTotal = ((interventions || []) as any[])
          .filter((c: any) => c.payment_done)
          .reduce((s: number, c: any) => s + (Number(c.mission_amount) || 0), 0);
        const totalExpenses = expTotal + vpTotal + ciTotal;

        // Bookings count
        const { count: bookingsCount } = await (supabase as any)
          .from("bookings")
          .select("id", { count: "exact", head: true });

        // Interventions count
        const { count: interventionsCount } = await (supabase as any)
          .from("cleaning_interventions")
          .select("id", { count: "exact", head: true });

        // Prospects / leads
        const { data: prospects } = await (supabase as any)
          .from("prospects")
          .select("pipeline_status, estimated_monthly_revenue");
        const prosp = (prospects || []) as any[];
        const leadsCount = prosp.length;
        const signed = prosp.filter((p: any) => p.pipeline_status === "signed").length;
        const conversionRate = leadsCount > 0 ? (signed / leadsCount) * 100 : 0;
        const pipelineValue = prosp
          .filter((p: any) => !["signed", "lost"].includes(p.pipeline_status))
          .reduce((s: number, p: any) => s + (Number(p.estimated_monthly_revenue) || 0), 0);

        // Monthly series (last 6 months)
        const now = new Date();
        const monthlySeries: PerformanceKPIs["monthlySeries"] = [];
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const monthKey = d.toISOString().slice(0, 7);
          const monthLabel = d.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
          const mRev = inv
            .filter((inv: any) => revenueStatuses.includes(inv.status) && inv.invoice_date?.startsWith(monthKey))
            .reduce((s: number, inv: any) => s + (Number(inv.total) || 0), 0);
          const mExp = ((expenses || []) as any[])
            .filter((e: any) => e.status === "paid" && e.expense_date?.startsWith(monthKey))
            .reduce((s: number, e: any) => s + (Number(e.amount) || 0), 0);
          const mRec = inv
            .filter((inv: any) => ["sent", "overdue"].includes(inv.status) && inv.invoice_date?.startsWith(monthKey))
            .reduce((s: number, inv: any) => s + (Number(inv.total) || 0), 0);
          monthlySeries.push({ month: monthLabel, revenue: mRev, expenses: mExp, receivables: mRec });
        }

        setKpis({
          grossRevenue,
          expenses: totalExpenses,
          netProfit: grossRevenue - totalExpenses,
          receivables,
          bookingsCount: bookingsCount || 0,
          interventionsCount: interventionsCount || 0,
          avgPaymentDelay: Math.round(avgDelay),
          leadsCount,
          conversionRate: Math.round(conversionRate * 10) / 10,
          pipelineValue,
          monthlySeries,
        });
      } catch (err) {
        console.error("[PerformanceKPIs] error:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return { kpis, loading };
}
