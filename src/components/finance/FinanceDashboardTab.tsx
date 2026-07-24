import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useInvoices } from "@/hooks/useInvoices";
import { useUnifiedExpenses } from "@/hooks/useUnifiedExpenses";
import { useFinancialSettings } from "@/hooks/useFinancialSettings";
import { useCashIncomes } from "@/hooks/useCashIncomes";
import {
  format, startOfMonth, endOfMonth, subMonths, startOfQuarter, endOfQuarter,
  startOfYear, endOfYear, eachMonthOfInterval, eachWeekOfInterval, eachDayOfInterval, isWithinInterval,
} from "date-fns";
import { fr } from "date-fns/locale";
import { formatEUR, marginPercent, invoiceStatusLabels, invoiceStatusColors, expenseStatusLabels, expenseStatusColors } from "@/lib/finance-utils";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export function FinanceDashboardTab() {
  const [period, setPeriod] = useState("current");
  const [displayMode, setDisplayMode] = useState<"ht" | "ttc">("ttc");
  const [cashOnly, setCashOnly] = useState(false);

  const { invoices, loading: iLoading } = useInvoices();
  const { unified: allExpenses, loading: uLoading } = useUnifiedExpenses();
  const { settings: fs } = useFinancialSettings();
  const { incomes: cashIncomes, loading: cLoading } = useCashIncomes();

  const vatEnabled = fs?.vat_enabled ?? true;
  const effectiveDisplayMode = vatEnabled ? displayMode : "ht";
  const loading = iLoading || uLoading || cLoading;

  const dateRange = useMemo(() => {
    const now = new Date();
    if (period === "current") return { start: startOfMonth(now), end: endOfMonth(now) };
    if (period === "last") return { start: startOfMonth(subMonths(now, 1)), end: endOfMonth(subMonths(now, 1)) };
    if (period === "quarter") return { start: startOfQuarter(now), end: endOfQuarter(now) };
    return { start: startOfYear(now), end: endOfYear(now) };
  }, [period]);

  const stats = useMemo(() => {
    const activeInvoices = invoices.filter(inv => {
      const d = new Date(inv.issue_date || inv.invoice_date);
      const inRange = d >= dateRange.start && d <= dateRange.end;
      return inRange && ["draft", "sent", "paid", "overdue"].includes(inv.status) && inv.type !== "credit_note";
    });
    const creditNotes = invoices.filter(inv => {
      const d = new Date(inv.issue_date || inv.invoice_date);
      return d >= dateRange.start && d <= dateRange.end && inv.type === "credit_note" && ["sent", "paid"].includes(inv.status);
    });
    const amountField = effectiveDisplayMode === "ht" ? "subtotal" : "total";

    const invoiceRevenue = activeInvoices.reduce((s, inv) => s + Number(inv[amountField] || 0), 0);
    const creditNoteTotal = creditNotes.reduce((s, inv) => s + Math.abs(Number(inv[amountField] || 0)), 0);
    const paidRevenue = activeInvoices.filter(i => i.status === "paid").reduce((s, i) => s + Number(i[amountField] || 0), 0);
    const pendingRevenue = activeInvoices.filter(i => ["draft", "sent", "overdue"].includes(i.status)).reduce((s, i) => s + Number(i[amountField] || 0), 0);

    const cashInPeriod = cashIncomes.filter(ci => {
      const d = new Date(ci.income_date);
      return d >= dateRange.start && d <= dateRange.end;
    });
    const cashTotal = cashInPeriod.reduce((s, ci) => s + Number(ci.amount), 0);
    const grossRevenue = (cashOnly ? paidRevenue - creditNoteTotal : invoiceRevenue - creditNoteTotal) + cashTotal;

    const filteredUnified = allExpenses.filter(u => {
      const d = new Date(u.date);
      return d >= dateRange.start && d <= dateRange.end && u.status === "paid";
    });
    const totalExpenses = filteredUnified.reduce((s, u) => s + u.amount, 0);
    const expensesTotal = filteredUnified.filter(u => u.type === "expense").reduce((s, u) => s + u.amount, 0);
    const vpTotal = filteredUnified.filter(u => u.type === "vendor_payment").reduce((s, u) => s + u.amount, 0);
    const missionTotal = filteredUnified.filter(u => u.type === "mission").reduce((s, u) => s + u.amount, 0);

    const netProfit = grossRevenue - totalExpenses;

    // Receivables — all unpaid invoices regardless of period
    const allActive = invoices.filter(i => i.type !== "credit_note");
    const sentTotal = allActive.filter(i => i.status === "sent").reduce((s, i) => s + Number(i[amountField] || 0), 0);
    const overdueTotal = allActive.filter(i => i.status === "overdue").reduce((s, i) => s + Number(i[amountField] || 0), 0);
    const draftTotal = allActive.filter(i => i.status === "draft").reduce((s, i) => s + Number(i[amountField] || 0), 0);
    const receivable = sentTotal + overdueTotal + draftTotal;

    return {
      grossRevenue, paidRevenue, pendingRevenue, cashTotal,
      expensesTotal, vpTotal, missionTotal, totalExpenses,
      netProfit, receivable, sentTotal, overdueTotal, draftTotal,
    };
  }, [invoices, allExpenses, cashIncomes, dateRange, effectiveDisplayMode, cashOnly]);

  const chartData = useMemo(() => {
    const intervals = period === "year"
      ? eachMonthOfInterval(dateRange)
      : period === "quarter"
        ? eachWeekOfInterval(dateRange)
        : eachDayOfInterval(dateRange);

    return intervals.map((d, i) => {
      const nextD = intervals[i + 1] || dateRange.end;
      const interval = { start: d, end: nextD };
      const rev = invoices.filter(inv => {
        const id = new Date(inv.issue_date || inv.invoice_date);
        return isWithinInterval(id, interval) && ["draft", "sent", "paid", "overdue"].includes(inv.status) && inv.type !== "credit_note";
      }).reduce((s, inv) => s + Number(effectiveDisplayMode === "ht" ? inv.subtotal : inv.total), 0);
      const exp = allExpenses.filter(u => {
        const ud = new Date(u.date);
        return isWithinInterval(ud, interval) && u.status === "paid";
      }).reduce((s, u) => s + u.amount, 0);
      const label = period === "year" ? format(d, "MMM", { locale: fr })
        : period === "quarter" ? `S${format(d, "w")}`
        : format(d, "dd/MM");
      return { label, revenue: rev, expenses: exp };
    });
  }, [invoices, allExpenses, dateRange, period, effectiveDisplayMode]);

  const recentInvoices = invoices.filter(i => i.type !== "credit_note").slice(0, 5);
  const recentExpenses = allExpenses.slice(0, 5);
  const marginPct = stats.grossRevenue > 0 ? (stats.netProfit / stats.grossRevenue) * 100 : 0;

  const kpis = [
    { label: "Revenu brut", value: stats.grossRevenue, hint: !loading ? `Payées ${formatEUR(stats.paidRevenue)} · Attente ${formatEUR(stats.pendingRevenue)}` : "" },
    { label: "Dépenses", value: stats.totalExpenses, hint: !loading ? `Manuelles ${formatEUR(stats.expensesTotal)} · Missions ${formatEUR(stats.missionTotal)}` : "" },
    { label: "Profit net", value: stats.netProfit, hint: !loading && stats.grossRevenue > 0 ? `Marge ${marginPercent(stats.netProfit, stats.grossRevenue)}` : "" },
    { label: "À recevoir", value: stats.receivable, hint: !loading ? `Envoyées ${formatEUR(stats.sentTotal)} · Retard ${formatEUR(stats.overdueTotal)}${stats.draftTotal > 0 ? ` · Brouillons ${formatEUR(stats.draftTotal)}` : ""}` : "" },
  ];

  return (
    <div className="mt-8 space-y-16 animate-fade-in">
      {/* Header ribbon */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-3">Vue d'ensemble</p>
          <h2 className="text-4xl font-light tracking-tight capitalize">
            {format(dateRange.start, "MMMM yyyy", { locale: fr })}
          </h2>
          <p className="mt-2 text-[11px] tracking-wider text-muted-foreground font-mono">
            {format(dateRange.start, "dd.MM.yyyy")} — {format(dateRange.end, "dd.MM.yyyy")}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-44 h-9 rounded-none border-0 border-b border-foreground/30 bg-transparent text-[11px] uppercase tracking-widest focus:ring-0 focus-visible:ring-0 focus:border-foreground shadow-none">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current">Ce mois</SelectItem>
              <SelectItem value="last">Mois dernier</SelectItem>
              <SelectItem value="quarter">Ce trimestre</SelectItem>
              <SelectItem value="year">Cette année</SelectItem>
            </SelectContent>
          </Select>
          {vatEnabled && (
            <button
              className="h-9 px-3 text-[11px] uppercase tracking-widest border-b border-foreground/30 hover:border-foreground transition-colors"
              onClick={() => setDisplayMode(displayMode === "ht" ? "ttc" : "ht")}
            >
              {displayMode === "ht" ? "HT" : "TTC"}
            </button>
          )}
          <button
            className={`h-9 px-3 text-[11px] uppercase tracking-widest border-b transition-colors ${cashOnly ? "border-foreground text-foreground" : "border-foreground/30 text-muted-foreground hover:border-foreground hover:text-foreground"}`}
            onClick={() => setCashOnly(!cashOnly)}
          >
            Trésorerie
          </button>
        </div>
      </div>

      {/* KPI editorial row — no cards, no walls */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-12">
        {kpis.map((k, i) => (
          <div
            key={k.label}
            className="group animate-fade-in"
            style={{ animationDelay: `${i * 80}ms`, animationFillMode: "backwards" }}
          >
            <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-3">
              {k.label}
            </p>
            <p className="text-4xl font-light tracking-tight tabular-nums transition-transform duration-300 group-hover:-translate-y-0.5">
              {loading ? "—" : formatEUR(k.value)}
            </p>
            <div className="mt-3 w-8 h-px bg-foreground/60 transition-all duration-500 group-hover:w-16" />
            {k.hint && (
              <p className="mt-3 text-[11px] font-mono text-muted-foreground">{k.hint}</p>
            )}
          </div>
        ))}
      </div>

      {/* Margin bar */}
      {!loading && stats.grossRevenue > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            <span>Répartition</span>
            <span className="font-mono">{marginPct.toFixed(1)}% marge</span>
          </div>
          <div className="h-[3px] w-full bg-foreground/5 overflow-hidden flex">
            <div
              className="h-full bg-foreground transition-[width] duration-1000 ease-out"
              style={{ width: `${Math.min(100, Math.max(0, marginPct))}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono">
            <span>Profit {formatEUR(Math.max(0, stats.netProfit))}</span>
            <span>Coûts {formatEUR(stats.totalExpenses)}</span>
          </div>
        </div>
      )}

      {/* Chart */}
      {!loading && chartData.length > 1 && (
        <section className="space-y-6 animate-fade-in">
          <div className="flex items-end justify-between border-b border-foreground/10 pb-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Flux</p>
              <h3 className="text-lg font-light mt-1">Revenus vs Dépenses</h3>
            </div>
            <div className="flex items-center gap-5 text-[10px] uppercase tracking-widest text-muted-foreground">
              <span className="flex items-center gap-2"><span className="w-4 h-px bg-foreground" />Revenus</span>
              <span className="flex items-center gap-2"><span className="w-4 border-t border-dashed border-foreground/50" />Dépenses</span>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--foreground))" stopOpacity={0.22} />
                    <stop offset="100%" stopColor="hsl(var(--foreground))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--foreground))" strokeOpacity={0.06} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fontFamily: "monospace" }} tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 10, fontFamily: "monospace" }} tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" tickFormatter={v => v === 0 ? "0" : `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(v: number) => formatEUR(v)}
                  contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--foreground))", borderRadius: 0, fontSize: 11, fontFamily: "monospace" }}
                  cursor={{ stroke: "hsl(var(--foreground))", strokeWidth: 1, strokeDasharray: "2 2" }}
                />
                <Area type="monotone" dataKey="revenue" name="Revenus" stroke="hsl(var(--foreground))" strokeWidth={1.5} fill="url(#gradRev)" />
                <Area type="monotone" dataKey="expenses" name="Dépenses" stroke="hsl(var(--foreground))" strokeOpacity={0.5} strokeWidth={1.5} strokeDasharray="4 3" fill="transparent" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* Recent journals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <JournalList
          eyebrow="Journal"
          title="Dernières factures"
          empty="Aucune facture"
          items={recentInvoices.map(inv => ({
            id: inv.id,
            primary: inv.invoice_number,
            secondary: `${inv.owner?.first_name ?? ""} ${inv.owner?.last_name ?? ""}`.trim() || "—",
            amount: formatEUR(Number(inv.total)),
            badgeLabel: invoiceStatusLabels[inv.status] || inv.status,
            badgeClass: invoiceStatusColors[inv.status] || "",
          }))}
        />
        <JournalList
          eyebrow="Journal"
          title="Dernières dépenses"
          empty="Aucune dépense"
          items={recentExpenses.map(exp => ({
            id: exp.id,
            primary: exp.description,
            secondary: format(new Date(exp.date), "dd MMM yyyy", { locale: fr }),
            amount: `− ${formatEUR(Number(exp.amount))}`,
            badgeLabel: expenseStatusLabels[exp.status] || exp.status,
            badgeClass: expenseStatusColors[exp.status] || "",
          }))}
        />
      </div>
    </div>
  );
}

function JournalList({
  eyebrow, title, empty, items,
}: {
  eyebrow: string; title: string; empty: string;
  items: { id: string; primary: string; secondary: string; amount: string; badgeLabel: string; badgeClass: string }[];
}) {
  return (
    <section className="animate-fade-in">
      <div className="flex items-end justify-between mb-5 border-b border-foreground/10 pb-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">{eyebrow}</p>
          <h3 className="text-lg font-light mt-1">{title}</h3>
        </div>
      </div>
      {items.length === 0 ? (
        <p className="text-[11px] text-muted-foreground text-center py-12 uppercase tracking-widest">{empty}</p>
      ) : (
        <ul>
          {items.map((item, i) => (
            <li
              key={item.id}
              className="group flex items-center justify-between gap-4 py-4 border-b border-foreground/10 hover:pl-2 transition-all duration-300 animate-fade-in"
              style={{ animationDelay: `${i * 40}ms`, animationFillMode: "backwards" }}
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm truncate">{item.primary}</p>
                <p className="text-[11px] text-muted-foreground truncate font-mono mt-1">{item.secondary}</p>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <span className="text-sm font-mono tabular-nums">{item.amount}</span>
                <span className={`text-[9px] px-2 py-0.5 tracking-widest uppercase ${item.badgeClass}`}>
                  {item.badgeLabel}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
