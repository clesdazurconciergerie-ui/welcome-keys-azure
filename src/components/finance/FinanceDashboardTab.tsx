import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBookings } from "@/hooks/useBookings";
import { useExpenses } from "@/hooks/useExpenses";
import { useInvoices } from "@/hooks/useInvoices";
import { TrendingUp, TrendingDown, Euro, FileText, Clock, CheckCircle } from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { fr } from "date-fns/locale";

export function FinanceDashboardTab() {
  const [period, setPeriod] = useState("current");
  const { bookings, loading: bLoading } = useBookings();
  const { expenses, loading: eLoading } = useExpenses();
  const { invoices, loading: iLoading } = useInvoices();

  const dateRange = useMemo(() => {
    const now = new Date();
    if (period === "current") return { start: startOfMonth(now), end: endOfMonth(now) };
    if (period === "last") return { start: startOfMonth(subMonths(now, 1)), end: endOfMonth(subMonths(now, 1)) };
    if (period === "last3") return { start: startOfMonth(subMonths(now, 2)), end: endOfMonth(now) };
    return { start: startOfMonth(subMonths(now, 11)), end: endOfMonth(now) };
  }, [period]);

  const stats = useMemo(() => {
    const filteredBookings = bookings.filter(b => {
      const d = new Date(b.check_in);
      return d >= dateRange.start && d <= dateRange.end;
    });
    const filteredExpenses = expenses.filter(e => {
      const d = new Date(e.expense_date);
      return d >= dateRange.start && d <= dateRange.end;
    });

    const grossRevenue = filteredBookings.reduce((s, b) => s + (Number(b.gross_amount) || 0), 0);
    const totalCommissions = filteredBookings.reduce((s, b) => s + (Number(b.concierge_revenue) || 0), 0);
    const totalExpenses = filteredExpenses.reduce((s, e) => s + Number(e.amount), 0);
    const netProfit = totalCommissions - totalExpenses;
    const pendingPayouts = filteredBookings.filter(b => b.financial_status !== "paid").reduce((s, b) => s + (Number(b.owner_net) || 0), 0);

    const pendingInvoices = invoices.filter(i => i.status === "pending").length;
    const paidInvoices = invoices.filter(i => i.status === "paid").length;

    return { grossRevenue, totalCommissions, totalExpenses, netProfit, pendingPayouts, pendingInvoices, paidInvoices, bookingCount: filteredBookings.length };
  }, [bookings, expenses, invoices, dateRange]);

  const loading = bLoading || eLoading || iLoading;

  const cards = [
    { label: "Revenu Brut", value: stats.grossRevenue, icon: Euro, color: "text-emerald-600" },
    { label: "Commissions", value: stats.totalCommissions, icon: TrendingUp, color: "text-blue-600" },
    { label: "Dépenses", value: stats.totalExpenses, icon: TrendingDown, color: "text-red-500" },
    { label: "Profit Net", value: stats.netProfit, icon: Euro, color: stats.netProfit >= 0 ? "text-emerald-600" : "text-red-500" },
  ];

  return (
    <div className="space-y-6 mt-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Vue d'ensemble</h2>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="current">Ce mois</SelectItem>
            <SelectItem value="last">Mois dernier</SelectItem>
            <SelectItem value="last3">3 derniers mois</SelectItem>
            <SelectItem value="year">12 derniers mois</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(c => (
          <Card key={c.label}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">{c.label}</span>
                <c.icon className={`h-4 w-4 ${c.color}`} />
              </div>
              <p className={`text-2xl font-bold ${c.color}`}>
                {loading ? "—" : `${c.value.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €`}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-amber-500" />
              <div>
                <p className="text-sm text-muted-foreground">Versements en attente</p>
                <p className="text-xl font-bold">{loading ? "—" : `${stats.pendingPayouts.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €`}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-amber-500" />
              <div>
                <p className="text-sm text-muted-foreground">Factures en attente</p>
                <p className="text-xl font-bold">{loading ? "—" : stats.pendingInvoices}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-emerald-500" />
              <div>
                <p className="text-sm text-muted-foreground">Factures payées</p>
                <p className="text-xl font-bold">{loading ? "—" : stats.paidInvoices}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Réservations de la période</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {loading ? "Chargement..." : `${stats.bookingCount} réservation(s) — Revenu brut total : ${stats.grossRevenue.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €`}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
