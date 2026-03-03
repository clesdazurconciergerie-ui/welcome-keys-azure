import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useInvoices } from "@/hooks/useInvoices";
import { useUnifiedExpenses } from "@/hooks/useUnifiedExpenses";
import { useFinancialSettings } from "@/hooks/useFinancialSettings";
import {
  TrendingUp, TrendingDown, Euro, AlertCircle, FileText, Receipt,
  CheckCircle, Clock, ArrowUpRight
} from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths, startOfQuarter, endOfQuarter, startOfYear, endOfYear, eachMonthOfInterval, eachWeekOfInterval, eachDayOfInterval, isWithinInterval } from "date-fns";
import { fr } from "date-fns/locale";
import { formatEUR, marginPercent, invoiceStatusLabels, invoiceStatusColors, expenseStatusLabels, expenseStatusColors } from "@/lib/finance-utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

export function FinanceDashboardTab() {
  const [period, setPeriod] = useState("current");
  const [displayMode, setDisplayMode] = useState<"ht" | "ttc">("ttc");
  const [cashOnly, setCashOnly] = useState(false);

  const { invoices, loading: iLoading } = useInvoices();
  const { unified: allExpenses, loading: uLoading, paidByType } = useUnifiedExpenses();
  const { settings: fs } = useFinancialSettings();

  const vatEnabled = fs?.vat_enabled ?? true;
  const effectiveDisplayMode = vatEnabled ? displayMode : "ht";

  const loading = iLoading || uLoading;

  const dateRange = useMemo(() => {
    const now = new Date();
    if (period === "current") return { start: startOfMonth(now), end: endOfMonth(now) };
    if (period === "last") return { start: startOfMonth(subMonths(now, 1)), end: endOfMonth(subMonths(now, 1)) };
    if (period === "quarter") return { start: startOfQuarter(now), end: endOfQuarter(now) };
    return { start: startOfYear(now), end: endOfYear(now) };
  }, [period]);

  const stats = useMemo(() => {
    // Filter invoices by issue_date and type
    const activeInvoices = invoices.filter(inv => {
      const d = new Date(inv.issue_date || inv.invoice_date);
      const inRange = d >= dateRange.start && d <= dateRange.end;
      const validStatus = ["sent", "paid", "overdue"].includes(inv.status);
      const isInvoice = inv.type !== "credit_note";
      return inRange && validStatus && isInvoice;
    });

    const creditNotes = invoices.filter(inv => {
      const d = new Date(inv.issue_date || inv.invoice_date);
      const inRange = d >= dateRange.start && d <= dateRange.end;
      return inRange && inv.type === "credit_note" && ["sent", "paid"].includes(inv.status);
    });

    const amountField = effectiveDisplayMode === "ht" ? "subtotal" : "total";

    // Revenue
    const invoiceRevenue = activeInvoices.reduce((s, inv) => s + Number(inv[amountField] || 0), 0);
    const creditNoteTotal = creditNotes.reduce((s, inv) => s + Math.abs(Number(inv[amountField] || 0)), 0);
    
    const paidRevenue = activeInvoices.filter(i => i.status === "paid").reduce((s, i) => s + Number(i[amountField] || 0), 0);
    const pendingRevenue = activeInvoices.filter(i => ["sent", "overdue"].includes(i.status)).reduce((s, i) => s + Number(i[amountField] || 0), 0);

    const grossRevenue = cashOnly ? paidRevenue - creditNoteTotal : invoiceRevenue - creditNoteTotal;

    // Expenses (unified: manual expenses + vendor payments + paid interventions)
    const filteredUnified = allExpenses.filter(u => {
      const d = new Date(u.date);
      return d >= dateRange.start && d <= dateRange.end && u.status === "paid";
    });
    const totalExpenses = filteredUnified.reduce((s, u) => s + u.amount, 0);
    const expensesTotal = filteredUnified.filter(u => u.type === "expense").reduce((s, u) => s + u.amount, 0);
    const vpTotal = filteredUnified.filter(u => u.type === "vendor_payment").reduce((s, u) => s + u.amount, 0);
    const missionTotal = filteredUnified.filter(u => u.type === "mission").reduce((s, u) => s + u.amount, 0);

    // Profit
    const netProfit = grossRevenue - totalExpenses;

    // Receivables
    const sentInvoices = activeInvoices.filter(i => i.status === "sent");
    const overdueInvoices = activeInvoices.filter(i => i.status === "overdue");
    const sentTotal = sentInvoices.reduce((s, i) => s + Number(i[amountField] || 0), 0);
    const overdueTotal = overdueInvoices.reduce((s, i) => s + Number(i[amountField] || 0), 0);
    const receivable = sentTotal + overdueTotal;

    return {
      grossRevenue, paidRevenue, pendingRevenue,
      expensesTotal, vpTotal, missionTotal, totalExpenses,
      netProfit, receivable, sentTotal, overdueTotal,
    };
  }, [invoices, allExpenses, dateRange, effectiveDisplayMode, cashOnly]);

  // Chart data
  const chartData = useMemo(() => {
    const intervals = period === "year"
      ? eachMonthOfInterval(dateRange)
      : period === "quarter"
        ? eachWeekOfInterval(dateRange)
        : eachDayOfInterval(dateRange);

    return intervals.map((d, i) => {
      const nextD = intervals[i + 1] || dateRange.end;
      const interval = { start: d, end: nextD };

      const rev = invoices
        .filter(inv => {
          const id = new Date(inv.issue_date || inv.invoice_date);
          return isWithinInterval(id, interval) && ["sent", "paid", "overdue"].includes(inv.status) && inv.type !== "credit_note";
        })
        .reduce((s, inv) => s + Number(effectiveDisplayMode === "ht" ? inv.subtotal : inv.total), 0);

      const exp = allExpenses
        .filter(u => {
          const ud = new Date(u.date);
          return isWithinInterval(ud, interval) && u.status === "paid";
        })
        .reduce((s, u) => s + u.amount, 0);

      const label = period === "year"
        ? format(d, "MMM", { locale: fr })
        : period === "quarter"
          ? `S${format(d, "w")}`
          : format(d, "dd/MM");

      return { label, revenue: rev, expenses: exp };
    });
  }, [invoices, allExpenses, dateRange, period, effectiveDisplayMode]);

  // Recent items
  const recentInvoices = invoices
    .filter(i => i.type !== "credit_note")
    .slice(0, 5);
  const recentExpenses = allExpenses.slice(0, 5);

  return (
    <div className="space-y-6 mt-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Vue d'ensemble</h2>
          <p className="text-xs text-muted-foreground">
            {format(dateRange.start, "dd MMM yyyy", { locale: fr })} — {format(dateRange.end, "dd MMM yyyy", { locale: fr })}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-40 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="current">Ce mois</SelectItem>
              <SelectItem value="last">Mois dernier</SelectItem>
              <SelectItem value="quarter">Ce trimestre</SelectItem>
              <SelectItem value="year">Cette année</SelectItem>
            </SelectContent>
          </Select>
          {vatEnabled && (
            <Button
              variant={displayMode === "ht" ? "default" : "outline"}
              size="sm" className="h-9 text-xs"
              onClick={() => setDisplayMode(displayMode === "ht" ? "ttc" : "ht")}
            >
              {displayMode === "ht" ? "HT" : "TTC"}
            </Button>
          )}
          <Button
            variant={cashOnly ? "default" : "outline"}
            size="sm" className="h-9 text-xs"
            onClick={() => setCashOnly(!cashOnly)}
          >
            {cashOnly ? "💰 Trésorerie" : "Trésorerie"}
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Revenue */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Revenu brut</span>
              <Euro className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-bold text-emerald-600">
              {loading ? "—" : formatEUR(stats.grossRevenue)}
            </p>
            {!loading && (
              <div className="flex gap-3 mt-1.5 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-emerald-500" />Payées: {formatEUR(stats.paidRevenue)}</span>
                <span className="flex items-center gap-1"><Clock className="h-3 w-3 text-amber-500" />Attente: {formatEUR(stats.pendingRevenue)}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Expenses */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Dépenses</span>
              <TrendingDown className="h-4 w-4 text-red-500" />
            </div>
            <p className="text-2xl font-bold text-red-500">
              {loading ? "—" : formatEUR(stats.totalExpenses)}
            </p>
            {!loading && (
              <div className="flex gap-3 mt-1.5 text-[11px] text-muted-foreground flex-wrap">
                <span>Dépenses: {formatEUR(stats.expensesTotal)}</span>
                <span>Prestataires: {formatEUR(stats.vpTotal)}</span>
                <span>Missions: {formatEUR(stats.missionTotal)}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Profit */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Profit net</span>
              <TrendingUp className={`h-4 w-4 ${stats.netProfit >= 0 ? "text-emerald-600" : "text-red-500"}`} />
            </div>
            <p className={`text-2xl font-bold ${stats.netProfit >= 0 ? "text-emerald-600" : "text-red-500"}`}>
              {loading ? "—" : formatEUR(stats.netProfit)}
            </p>
            {!loading && stats.grossRevenue > 0 && (
              <p className="text-[11px] text-muted-foreground mt-1.5">
                Marge: {marginPercent(stats.netProfit, stats.grossRevenue)}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Receivable */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">À recevoir</span>
              <AlertCircle className="h-4 w-4 text-amber-500" />
            </div>
            <p className="text-2xl font-bold text-amber-600">
              {loading ? "—" : formatEUR(stats.receivable)}
            </p>
            {!loading && (
              <div className="flex gap-3 mt-1.5 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1"><Clock className="h-3 w-3 text-amber-500" />Attente: {formatEUR(stats.sentTotal)}</span>
                <span className="flex items-center gap-1"><AlertCircle className="h-3 w-3 text-red-500" />Retard: {formatEUR(stats.overdueTotal)}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      {!loading && chartData.length > 1 && (
        <Card>
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold mb-4">Revenus vs Dépenses</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => formatEUR(v)} />
                  <Legend />
                  <Bar dataKey="revenue" name="Revenus" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" name="Dépenses" fill="hsl(0, 84%, 60%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent invoices */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold flex items-center gap-2"><FileText className="h-4 w-4" />Dernières factures</h3>
            </div>
            {recentInvoices.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Aucune facture</p>
            ) : (
              <div className="space-y-2">
                {recentInvoices.map(inv => (
                  <div key={inv.id} className="flex items-center justify-between p-2.5 rounded-lg border">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{inv.invoice_number}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {inv.owner?.first_name} {inv.owner?.last_name}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{formatEUR(Number(inv.total))}</span>
                      <Badge className={`text-[10px] ${invoiceStatusColors[inv.status] || ""}`}>
                        {invoiceStatusLabels[inv.status] || inv.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent expenses */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold flex items-center gap-2"><Receipt className="h-4 w-4" />Dernières dépenses</h3>
            </div>
            {recentExpenses.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Aucune dépense</p>
            ) : (
              <div className="space-y-2">
                {recentExpenses.map(exp => (
                  <div key={exp.id} className="flex items-center justify-between p-2.5 rounded-lg border">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{exp.description}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(exp.date), "dd/MM/yyyy")}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-red-500">-{formatEUR(Number(exp.amount))}</span>
                      <Badge className={`text-[10px] ${expenseStatusColors[exp.status] || ""}`}>
                        {expenseStatusLabels[exp.status] || exp.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
