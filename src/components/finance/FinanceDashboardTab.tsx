import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useInvoices } from "@/hooks/useInvoices";
import { useUnifiedExpenses } from "@/hooks/useUnifiedExpenses";
import { useFinancialSettings } from "@/hooks/useFinancialSettings";
import { useCashIncomes } from "@/hooks/useCashIncomes";
import { FileText, Receipt, ArrowUpRight, ArrowDownRight } from "lucide-react";
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

    // Receivables (unpaid invoices — not limited to period)
    const allActive = invoices.filter(i => i.type !== "credit_note");
    const sentInvoices = allActive.filter(i => i.status === "sent");
    const overdueInvoices = allActive.filter(i => i.status === "overdue");
    const draftInvoices = allActive.filter(i => i.status === "draft");
    const sentTotal = sentInvoices.reduce((s, i) => s + Number(i[amountField] || 0), 0);
    const overdueTotal = overdueInvoices.reduce((s, i) => s + Number(i[amountField] || 0), 0);
    const draftTotal = draftInvoices.reduce((s, i) => s + Number(i[amountField] || 0), 0);
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

  return (
    <div className="mt-6 space-y-10">
      {/* Header ribbon */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-foreground/10 pb-6">
        <div>
          <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-2">Vue d'ensemble</p>
          <h2 className="text-3xl font-serif tracking-tight">
            {format(dateRange.start, "MMMM yyyy", { locale: fr })}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground font-mono">
            {format(dateRange.start, "dd.MM.yyyy")} — {format(dateRange.end, "dd.MM.yyyy")}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-40 h-9 rounded-none border-foreground/20 text-xs uppercase tracking-wider">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-none">
              <SelectItem value="current">Ce mois</SelectItem>
              <SelectItem value="last">Mois dernier</SelectItem>
              <SelectItem value="quarter">Ce trimestre</SelectItem>
              <SelectItem value="year">Cette année</SelectItem>
            </SelectContent>
          </Select>
          {vatEnabled && (
            <Button
              variant="outline" size="sm"
              className="h-9 text-[11px] uppercase tracking-wider rounded-none border-foreground/20"
              onClick={() => setDisplayMode(displayMode === "ht" ? "ttc" : "ht")}
            >
              {displayMode === "ht" ? "HT" : "TTC"}
            </Button>
          )}
          <Button
            variant={cashOnly ? "default" : "outline"} size="sm"
            className="h-9 text-[11px] uppercase tracking-wider rounded-none border-foreground/20"
            onClick={() => setCashOnly(!cashOnly)}
          >
            Trésorerie
          </Button>
        </div>
      </div>

      {/* KPI editorial grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-foreground/10 border-y border-foreground/10">
        <KpiBlock
          label="Revenu brut"
          value={loading ? "—" : formatEUR(stats.grossRevenue)}
          hint={!loading ? `Payées ${formatEUR(stats.paidRevenue)} · Attente ${formatEUR(stats.pendingRevenue)}` : undefined}
          direction="up"
        />
        <KpiBlock
          label="Dépenses"
          value={loading ? "—" : formatEUR(stats.totalExpenses)}
          hint={!loading ? `Manuelles ${formatEUR(stats.expensesTotal)} · Missions ${formatEUR(stats.missionTotal)}` : undefined}
          direction="down"
        />
        <KpiBlock
          label="Profit net"
          value={loading ? "—" : formatEUR(stats.netProfit)}
          hint={!loading && stats.grossRevenue > 0 ? `Marge ${marginPercent(stats.netProfit, stats.grossRevenue)}` : undefined}
          direction={stats.netProfit >= 0 ? "up" : "down"}
          emphasis
        />
        <KpiBlock
          label="À recevoir"
          value={loading ? "—" : formatEUR(stats.receivable)}
          hint={!loading ? `Envoyées ${formatEUR(stats.sentTotal)} · Retard ${formatEUR(stats.overdueTotal)}${stats.draftTotal > 0 ? ` · Brouillons ${formatEUR(stats.draftTotal)}` : ""}` : undefined}
        />
      </div>

      {/* Margin bar */}
      {!loading && stats.grossRevenue > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            <span>Répartition</span>
            <span className="font-mono">{marginPct.toFixed(1)}% marge</span>
          </div>
          <div className="h-2 w-full bg-foreground/5 overflow-hidden flex">
            <div className="h-full bg-foreground" style={{ width: `${Math.min(100, Math.max(0, marginPct))}%` }} />
            <div className="h-full bg-foreground/25" style={{ width: `${Math.min(100, 100 - Math.max(0, marginPct))}%` }} />
          </div>
          <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono">
            <span>Profit {formatEUR(Math.max(0, stats.netProfit))}</span>
            <span>Coûts {formatEUR(stats.totalExpenses)}</span>
          </div>
        </div>
      )}

      {/* Chart */}
      {!loading && chartData.length > 1 && (
        <section className="border border-foreground/10 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Flux</p>
              <h3 className="text-lg font-serif mt-1">Revenus vs Dépenses</h3>
            </div>
            <div className="flex items-center gap-4 text-[11px] uppercase tracking-wider text-muted-foreground">
              <span className="flex items-center gap-2"><span className="w-3 h-[2px] bg-foreground" />Revenus</span>
              <span className="flex items-center gap-2"><span className="w-3 h-[2px] bg-foreground/40" style={{ borderTop: "1px dashed" }} />Dépenses</span>
            </div>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--foreground))" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="hsl(var(--foreground))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradExp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--foreground))" stopOpacity={0.1} />
                    <stop offset="100%" stopColor="hsl(var(--foreground))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--foreground))" strokeOpacity={0.08} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fontFamily: "monospace" }} tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 10, fontFamily: "monospace" }} tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" tickFormatter={v => v === 0 ? "0" : `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(v: number) => formatEUR(v)}
                  contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--foreground))", borderRadius: 0, fontSize: 11, fontFamily: "monospace" }}
                  cursor={{ stroke: "hsl(var(--foreground))", strokeWidth: 1, strokeDasharray: "2 2" }}
                />
                <Area type="monotone" dataKey="revenue" name="Revenus" stroke="hsl(var(--foreground))" strokeWidth={1.5} fill="url(#gradRev)" />
                <Area type="monotone" dataKey="expenses" name="Dépenses" stroke="hsl(var(--foreground))" strokeOpacity={0.5} strokeWidth={1.5} strokeDasharray="4 3" fill="url(#gradExp)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* Recent tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <ListSection
          icon={<FileText className="h-3.5 w-3.5" strokeWidth={1.5} />}
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
        <ListSection
          icon={<Receipt className="h-3.5 w-3.5" strokeWidth={1.5} />}
          eyebrow="Journal"
          title="Dernières dépenses"
          empty="Aucune dépense"
          items={recentExpenses.map(exp => ({
            id: exp.id,
            primary: exp.description,
            secondary: format(new Date(exp.date), "dd MMM yyyy", { locale: fr }),
            amount: `−${formatEUR(Number(exp.amount))}`,
            badgeLabel: expenseStatusLabels[exp.status] || exp.status,
            badgeClass: expenseStatusColors[exp.status] || "",
            negative: true,
          }))}
        />
      </div>
    </div>
  );
}

function KpiBlock({
  label, value, hint, direction, emphasis,
}: {
  label: string; value: string; hint?: string;
  direction?: "up" | "down"; emphasis?: boolean;
}) {
  return (
    <div className={`p-6 ${emphasis ? "bg-foreground text-background" : ""}`}>
      <div className="flex items-center justify-between mb-6">
        <span className={`text-[10px] uppercase tracking-[0.25em] ${emphasis ? "text-background/60" : "text-muted-foreground"}`}>
          {label}
        </span>
        {direction === "up" && <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={1.5} />}
        {direction === "down" && <ArrowDownRight className="h-3.5 w-3.5" strokeWidth={1.5} />}
      </div>
      <p className="text-3xl font-serif tracking-tight tabular-nums">{value}</p>
      {hint && (
        <p className={`mt-3 text-[11px] font-mono ${emphasis ? "text-background/60" : "text-muted-foreground"}`}>
          {hint}
        </p>
      )}
    </div>
  );
}

function ListSection({
  icon, eyebrow, title, empty, items,
}: {
  icon: React.ReactNode; eyebrow: string; title: string; empty: string;
  items: { id: string; primary: string; secondary: string; amount: string; badgeLabel: string; badgeClass: string; negative?: boolean }[];
}) {
  return (
    <section>
      <div className="flex items-end justify-between mb-4 border-b border-foreground/10 pb-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">{eyebrow}</p>
          <h3 className="text-base font-serif mt-1 flex items-center gap-2">{icon}{title}</h3>
        </div>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-10 uppercase tracking-wider">{empty}</p>
      ) : (
        <ul className="divide-y divide-foreground/10">
          {items.map(item => (
            <li key={item.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{item.primary}</p>
                <p className="text-[11px] text-muted-foreground truncate font-mono mt-0.5">{item.secondary}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-sm font-mono tabular-nums">{item.amount}</span>
                <Badge className={`text-[10px] rounded-none font-normal uppercase tracking-wider ${item.badgeClass}`}>
                  {item.badgeLabel}
                </Badge>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
