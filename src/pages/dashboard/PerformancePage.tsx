import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  BarChart3, TrendingUp, TrendingDown, Euro, CalendarCheck, Wrench,
  Clock, Users, Target, Sparkles, ListTodo, Trash2, CheckCircle2,
  AlertTriangle, Info, ArrowUpRight, Loader2, RefreshCw, Shield,
  Zap, Activity, ChevronUp, ChevronDown, Minus, AlertCircle,
} from "lucide-react";
import { motion } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer,
  LineChart, Line, Legend, Area, AreaChart,
} from "recharts";
import { usePerformanceKPIs } from "@/hooks/usePerformanceKPIs";
import { useAiTasks } from "@/hooks/useAiTasks";
import { useAiInsights } from "@/hooks/useAiInsights";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatEUR } from "@/lib/finance-utils";

/* ── Helpers ── */
const scopeLabels: Record<string, string> = {
  finance: "Finance", operations: "Opérations", sales: "Commercial",
  listing: "Annonces", general: "Général",
};
const priorityColors: Record<string, string> = {
  high: "bg-destructive/10 text-destructive", medium: "bg-accent/15 text-accent-foreground",
  low: "bg-emerald-100 text-emerald-700",
};
const bulletIcons: Record<string, typeof TrendingUp> = {
  positive: TrendingUp, warning: AlertTriangle, action: Target, info: Info,
};

function pctChange(cur: number, prev: number): number | null {
  if (prev === 0) return cur > 0 ? 100 : null;
  return Math.round(((cur - prev) / prev) * 100);
}

function VariationBadge({ cur, prev, invert = false }: { cur: number; prev: number; invert?: boolean }) {
  const pct = pctChange(cur, prev);
  if (pct === null) return <span className="text-[10px] text-muted-foreground">—</span>;
  const isPositive = invert ? pct < 0 : pct > 0;
  const isNeutral = pct === 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[11px] font-semibold ${isNeutral ? "text-muted-foreground" : isPositive ? "text-emerald-600" : "text-destructive"}`}>
      {isNeutral ? <Minus className="w-3 h-3" /> : isPositive ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      {Math.abs(pct)}%
    </span>
  );
}

/* Mini sparkline using SVG */
function Sparkline({ data, color = "hsl(var(--primary))" }: { data: number[]; color?: string }) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const w = 80, h = 28;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`).join(" ");
  return (
    <svg width={w} height={h} className="opacity-60">
      <polyline fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" points={points} />
    </svg>
  );
}

/* ── Performance Score ── */
function computeScore(kpis: ReturnType<typeof usePerformanceKPIs>["kpis"]): number {
  let score = 50; // baseline
  // Margin component (0-25)
  const margin = kpis.grossRevenue > 0 ? (kpis.netProfit / kpis.grossRevenue) : 0;
  score += Math.min(25, Math.max(-10, margin * 50));
  // Payment delay (0-15): < 15 days = perfect
  score += Math.max(0, 15 - kpis.avgPaymentDelay);
  // Overdue invoices penalty
  score -= kpis.overdueInvoicesCount * 3;
  // Conversion rate bonus
  score += Math.min(10, kpis.conversionRate / 2);
  return Math.max(0, Math.min(100, Math.round(score)));
}

function scoreColor(s: number) {
  if (s >= 75) return "text-emerald-600";
  if (s >= 50) return "text-accent";
  return "text-destructive";
}

function scoreLabel(s: number) {
  if (s >= 80) return "Excellent";
  if (s >= 65) return "Bon";
  if (s >= 50) return "Correct";
  if (s >= 35) return "À améliorer";
  return "Critique";
}

/* ── Alerts ── */
interface Alert { severity: "critical" | "warning" | "info"; text: string }
function buildAlerts(kpis: ReturnType<typeof usePerformanceKPIs>["kpis"]): Alert[] {
  const alerts: Alert[] = [];
  if (kpis.overdueInvoicesCount > 0)
    alerts.push({ severity: "critical", text: `${kpis.overdueInvoicesCount} facture(s) en retard de paiement` });
  if (kpis.unpaidVendorsCount > 0)
    alerts.push({ severity: "warning", text: `${kpis.unpaidVendorsCount} paiement(s) prestataire en attente` });
  if (kpis.avgPaymentDelay > 30)
    alerts.push({ severity: "warning", text: `Délai moyen de paiement élevé : ${kpis.avgPaymentDelay} jours` });
  if (kpis.receivables > kpis.grossRevenue * 0.5 && kpis.grossRevenue > 0)
    alerts.push({ severity: "warning", text: `Créances élevées (${formatEUR(kpis.receivables)}) — risque de trésorerie` });
  if (kpis.conversionRate > 0 && kpis.conversionRate < 10)
    alerts.push({ severity: "info", text: `Taux de conversion faible (${kpis.conversionRate}%) — revoir le pipeline` });
  // Per-property vacancy alerts (next 30 days)
  for (const pv of kpis.propertyVacancies) {
    if (pv.bookedNights === 0) {
      alerts.push({ severity: "critical", text: `${pv.propertyName} : aucune réservation dans les 30 prochains jours` });
    } else if (pv.occupancyPct < 20) {
      alerts.push({ severity: "warning", text: `${pv.propertyName} : occupation faible (${pv.occupancyPct}% — ${pv.bookedNights} nuits / 30)` });
    }
  }
  if (alerts.length === 0)
    alerts.push({ severity: "info", text: "Aucune alerte — tout semble en ordre 👍" });
  return alerts;
}

const severityConfig = {
  critical: { bg: "bg-destructive/10 border-destructive/30", text: "text-destructive", icon: AlertCircle, label: "Critique" },
  warning: { bg: "bg-accent/10 border-accent/30", text: "text-accent-foreground", icon: AlertTriangle, label: "Attention" },
  info: { bg: "bg-primary/5 border-primary/20", text: "text-primary", icon: Info, label: "Info" },
};

/* ── Custom chart tooltip ── */
const ChartTooltipContent = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-card p-3 shadow-lg">
      <p className="text-xs font-semibold text-foreground mb-1">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.dataKey} className="flex items-center gap-2 text-xs">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-muted-foreground">{entry.name}</span>
          <span className="font-medium text-foreground ml-auto">{formatEUR(entry.value)}</span>
        </div>
      ))}
    </div>
  );
};

/* ══════════════════════════════════════════════ */
const PerformancePage = () => {
  const [chartPeriod, setChartPeriod] = useState<number>(6);
  const { kpis, loading: kpiLoading } = usePerformanceKPIs(chartPeriod);
  const { tasks, loading: tasksLoading, updateTaskStatus, deleteTask, refetch: refetchTasks } = useAiTasks();
  const { insights, loading: insightsLoading, refetch: refetchInsights } = useAiInsights();
  const { flags } = useFeatureFlags();
  const [analyzing, setAnalyzing] = useState(false);
  const [generatingTasks, setGeneratingTasks] = useState(false);
  const [taskFilter, setTaskFilter] = useState<string>("all");
  const [taskStatusFilter, setTaskStatusFilter] = useState<string>("all");

  const score = useMemo(() => computeScore(kpis), [kpis]);
  const alerts = useMemo(() => buildAlerts(kpis), [kpis]);

  const revenueSeries = useMemo(() => kpis.monthlySeries.map(m => m.revenue), [kpis.monthlySeries]);
  const expSeries = useMemo(() => kpis.monthlySeries.map(m => m.expenses), [kpis.monthlySeries]);
  const recSeries = useMemo(() => kpis.monthlySeries.map(m => m.receivables), [kpis.monthlySeries]);

  const runAnalysis = async () => {
    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-performance", { body: { mode: "both" } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Analyse terminée — ${data.tasks_count || 0} tâches suggérées`);
      await Promise.all([refetchInsights(), refetchTasks()]);
    } catch (e: any) { toast.error(e.message || "Erreur d'analyse"); }
    finally { setAnalyzing(false); }
  };

  const runRulesTasks = async () => {
    setGeneratingTasks(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-rules-tasks", {});
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`${data.generated} tâche(s) générée(s), ${data.skipped} ignorée(s)`);
      await refetchTasks();
    } catch (e: any) { toast.error(e.message || "Erreur de génération"); }
    finally { setGeneratingTasks(false); }
  };

  const filteredTasks = tasks.filter(t => {
    if (taskFilter !== "all" && t.scope !== taskFilter) return false;
    if (taskStatusFilter !== "all" && t.status !== taskStatusFilter) return false;
    return true;
  });

  const latestInsight = insights[0];

  const forecastData = (() => {
    const series = kpis.monthlySeries;
    if (series.length < 3) return null;
    const last3 = series.slice(-3);
    const avgRev = last3.reduce((s, m) => s + m.revenue, 0) / 3;
    const avgExp = last3.reduce((s, m) => s + m.expenses, 0) / 3;
    return { nextMonthRevenue: Math.round(avgRev), nextMonthExpenses: Math.round(avgExp), nextMonthProfit: Math.round(avgRev - avgExp), cashflowRisk: kpis.receivables > avgRev * 1.5 };
  })();

  return (
    <TooltipProvider>
      <div className="space-y-8 max-w-[1400px]">
        {/* ── Header ── */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Performance</h1>
            <p className="text-muted-foreground mt-1">Vue stratégique de votre activité</p>
          </div>
          <div className="flex items-center gap-2">
            {[3, 6, 12].map(p => (
              <Button key={p} size="sm" variant={chartPeriod === p ? "default" : "outline"} onClick={() => setChartPeriod(p)} className="text-xs h-8">
                {p} mois
              </Button>
            ))}
          </div>
        </motion.div>

        {/* ── Score + Primary KPIs row ── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Score Card */}
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.05 }}>
            <Card className="h-full border-2 border-primary/10 bg-gradient-to-br from-primary/[0.03] to-transparent">
              <CardContent className="p-5 flex flex-col items-center justify-center h-full text-center">
                <Shield className="w-5 h-5 text-muted-foreground mb-2" />
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-1">Score global</p>
                <p className={`text-5xl font-black tabular-nums ${scoreColor(score)}`}>{kpiLoading ? "—" : score}</p>
                <p className={`text-xs font-semibold mt-1 ${scoreColor(score)}`}>{kpiLoading ? "" : scoreLabel(score)}</p>
                <Progress value={score} className="mt-3 h-1.5" />
              </CardContent>
            </Card>
          </motion.div>

          {/* Primary Financial KPIs */}
          {([
            { label: "Revenu brut", value: kpis.grossRevenue, prev: kpis.prevGrossRevenue, icon: Euro, sparkData: revenueSeries, accent: "text-emerald-600" },
            { label: "Dépenses", value: kpis.expenses, prev: kpis.prevExpenses, icon: TrendingDown, sparkData: expSeries, accent: "text-destructive", invert: true },
            { label: "Profit net", value: kpis.netProfit, prev: kpis.prevNetProfit, icon: TrendingUp, sparkData: revenueSeries.map((r, i) => r - (expSeries[i] || 0)), accent: kpis.netProfit >= 0 ? "text-emerald-600" : "text-destructive" },
            { label: "À recevoir", value: kpis.receivables, prev: kpis.prevReceivables, icon: Clock, sparkData: recSeries, accent: "text-accent" },
          ] as const).map((kpi, i) => (
            <motion.div key={kpi.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 + i * 0.04 }}>
              <Card className="h-full">
                <CardContent className="p-5 flex flex-col justify-between h-full">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">{kpi.label}</p>
                      <p className={`text-2xl font-bold mt-1 tabular-nums ${kpi.accent}`}>
                        {kpiLoading ? "..." : formatEUR(kpi.value)}
                      </p>
                    </div>
                    <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <kpi.icon className={`w-4 h-4 ${kpi.accent}`} />
                    </div>
                  </div>
                  <div className="flex items-end justify-between mt-3">
                    <VariationBadge cur={kpi.value} prev={kpi.prev} invert={"invert" in kpi && kpi.invert === true} />
                    <Sparkline data={kpi.sparkData} />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* ── Secondary KPIs: 3 blocks ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Operations */}
          <Card>
            <CardHeader className="pb-2 pt-4 px-5">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" />
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Opérations</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="px-5 pb-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Réservations</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-foreground tabular-nums">{kpiLoading ? "..." : kpis.bookingsCount}</span>
                    <VariationBadge cur={kpis.bookingsCount} prev={kpis.prevBookingsCount} />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Interventions</span>
                  <span className="text-sm font-bold text-foreground tabular-nums">{kpiLoading ? "..." : kpis.interventionsCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Délai paiement</span>
                  <span className={`text-sm font-bold tabular-nums ${kpis.avgPaymentDelay > 30 ? "text-destructive" : "text-foreground"}`}>
                    {kpiLoading ? "..." : `${kpis.avgPaymentDelay}j`}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Finance */}
          <Card>
            <CardHeader className="pb-2 pt-4 px-5">
              <div className="flex items-center gap-2">
                <Euro className="w-4 h-4 text-primary" />
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Finance</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="px-5 pb-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Marge nette</span>
                  <span className={`text-sm font-bold tabular-nums ${kpis.netProfit >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                    {kpiLoading ? "..." : kpis.grossRevenue > 0 ? `${((kpis.netProfit / kpis.grossRevenue) * 100).toFixed(1)}%` : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Factures en retard</span>
                  <Badge variant={kpis.overdueInvoicesCount > 0 ? "destructive" : "secondary"} className="text-[10px]">
                    {kpiLoading ? "..." : kpis.overdueInvoicesCount}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Prestataires impayés</span>
                  <Badge variant={kpis.unpaidVendorsCount > 0 ? "destructive" : "secondary"} className="text-[10px]">
                    {kpiLoading ? "..." : kpis.unpaidVendorsCount}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Growth */}
          <Card>
            <CardHeader className="pb-2 pt-4 px-5">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" />
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Croissance</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="px-5 pb-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Leads</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-foreground tabular-nums">{kpiLoading ? "..." : kpis.leadsCount}</span>
                    <VariationBadge cur={kpis.leadsCount} prev={kpis.prevLeadsCount} />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Conversion</span>
                  <span className="text-sm font-bold text-foreground tabular-nums">{kpiLoading ? "..." : `${kpis.conversionRate}%`}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Pipeline</span>
                  <span className="text-sm font-bold text-foreground tabular-nums">{kpiLoading ? "..." : formatEUR(kpis.pipelineValue)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Alerts ── */}
        <Card>
          <CardHeader className="pb-2 pt-4 px-5">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> Alertes
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            <div className="space-y-2">
              {alerts.map((a, i) => {
                const cfg = severityConfig[a.severity];
                return (
                  <div key={i} className={`flex items-center gap-3 p-3 rounded-lg border ${cfg.bg}`}>
                    <cfg.icon className={`w-4 h-4 shrink-0 ${cfg.text}`} />
                    <span className="text-sm flex-1">{a.text}</span>
                    <Badge variant="outline" className={`text-[10px] ${cfg.text} border-current`}>{cfg.label}</Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* ── Charts ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold">Revenus vs Dépenses</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={kpis.monthlySeries} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <RechartsTooltip content={<ChartTooltipContent />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="revenue" name="Revenus" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" name="Dépenses" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Créances en cours</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={kpis.monthlySeries}>
                  <defs>
                    <linearGradient id="recGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <RechartsTooltip content={<ChartTooltipContent />} />
                  <Area type="monotone" dataKey="receivables" name="À recevoir" stroke="hsl(var(--accent))" fill="url(#recGrad)" strokeWidth={2} dot={{ r: 3, fill: "hsl(var(--accent))" }} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* ── AI Panels ── */}
        {flags.ai_enabled && (
          <Tabs defaultValue="analysis" className="space-y-4">
            <TabsList className="bg-muted/50">
              {flags.ai_analysis_enabled && <TabsTrigger value="analysis"><Sparkles className="w-4 h-4 mr-1.5" />Analyse IA</TabsTrigger>}
              {flags.ai_tasks_enabled && <TabsTrigger value="tasks"><ListTodo className="w-4 h-4 mr-1.5" />Smart To-Do</TabsTrigger>}
              {flags.ai_forecast_enabled && <TabsTrigger value="forecast"><BarChart3 className="w-4 h-4 mr-1.5" />Prévisionnel</TabsTrigger>}
            </TabsList>

            {/* AI Analysis */}
            {flags.ai_analysis_enabled && (
              <TabsContent value="analysis">
                <Card className="border-primary/10">
                  <CardHeader className="flex flex-row items-center justify-between bg-gradient-to-r from-primary/[0.04] to-transparent rounded-t-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Sparkles className="w-4 h-4 text-primary" />
                      </div>
                      <CardTitle className="text-lg">Analyse IA</CardTitle>
                    </div>
                    <Button onClick={runAnalysis} disabled={analyzing} size="sm">
                      {analyzing ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1.5" />}
                      {analyzing ? "Analyse..." : "Analyser"}
                    </Button>
                  </CardHeader>
                  <CardContent className="pt-4">
                    {insightsLoading ? (
                      <p className="text-muted-foreground">Chargement...</p>
                    ) : latestInsight ? (
                      <div className="space-y-4">
                        <div className="p-4 rounded-lg bg-primary/[0.03] border border-primary/10">
                          <p className="text-sm text-foreground leading-relaxed font-medium">{latestInsight.summary_text}</p>
                        </div>
                        {latestInsight.bullets_json && latestInsight.bullets_json.length > 0 && (
                          <div className="grid gap-2">
                            {(latestInsight.bullets_json as any[]).map((b: any, i: number) => {
                              const Icon = bulletIcons[b.type] || Info;
                              return (
                                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/40 border border-border/50">
                                  <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${b.type === "positive" ? "bg-emerald-100 text-emerald-600" : b.type === "warning" ? "bg-amber-100 text-amber-600" : "bg-primary/10 text-primary"}`}>
                                    <Icon className="w-3.5 h-3.5" />
                                  </div>
                                  <span className="text-sm leading-relaxed">{b.text}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                          Dernière analyse : {new Date(latestInsight.created_at).toLocaleString("fr-FR")}
                        </p>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Sparkles className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
                        <p className="text-muted-foreground text-sm">Cliquez sur "Analyser" pour obtenir un diagnostic complet.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {/* Smart To-Do */}
            {flags.ai_tasks_enabled && (
              <TabsContent value="tasks">
                <Card>
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <CardTitle className="text-lg">Tâches intelligentes</CardTitle>
                      <div className="flex gap-2 flex-wrap">
                        <Button onClick={runRulesTasks} disabled={generatingTasks} size="sm" variant="outline">
                          {generatingTasks ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />}
                          Règles auto
                        </Button>
                        <Button onClick={runAnalysis} disabled={analyzing} size="sm">
                          {analyzing ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1" />}
                          Suggestions IA
                        </Button>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Select value={taskFilter} onValueChange={setTaskFilter}>
                        <SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder="Scope" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tous</SelectItem>
                          {Object.entries(scopeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Select value={taskStatusFilter} onValueChange={setTaskStatusFilter}>
                        <SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder="Statut" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tous</SelectItem>
                          <SelectItem value="todo">À faire</SelectItem>
                          <SelectItem value="draft">Brouillon</SelectItem>
                          <SelectItem value="in_progress">En cours</SelectItem>
                          <SelectItem value="done">Terminé</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {tasksLoading ? (
                      <p className="text-muted-foreground">Chargement...</p>
                    ) : filteredTasks.length === 0 ? (
                      <div className="text-center py-8">
                        <ListTodo className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
                        <p className="text-muted-foreground text-sm">Aucune tâche. Générez-en avec les boutons ci-dessus.</p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                        {filteredTasks.map((task) => (
                          <div key={task.id} className="flex items-start gap-3 p-3 rounded-lg border border-border/60 hover:border-border hover:bg-muted/20 transition-all">
                            <button onClick={() => updateTaskStatus(task.id, task.status === "done" ? "todo" : "done")} className="mt-0.5 shrink-0">
                              <CheckCircle2 className={`w-5 h-5 transition-colors ${task.status === "done" ? "text-emerald-500" : "text-muted-foreground/25 hover:text-muted-foreground/50"}`} />
                            </button>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium ${task.status === "done" ? "line-through text-muted-foreground" : "text-foreground"}`}>{task.title}</p>
                              {task.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{task.description}</p>}
                              <div className="flex gap-1 mt-1.5 flex-wrap">
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0">{scopeLabels[task.scope] || task.scope}</Badge>
                                <Badge className={`text-[10px] px-1.5 py-0 ${priorityColors[task.priority] || ""}`}>{task.priority}</Badge>
                                {task.source === "ai" && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">IA</Badge>}
                                {task.source === "rules" && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Auto</Badge>}
                                {task.status === "draft" && <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-accent text-accent">Brouillon</Badge>}
                              </div>
                            </div>
                            <button onClick={() => deleteTask(task.id)} className="shrink-0 text-muted-foreground hover:text-destructive transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {/* Forecast */}
            {flags.ai_forecast_enabled && (
              <TabsContent value="forecast">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Prévisionnel (mois prochain)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {forecastData ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200/60">
                            <p className="text-[10px] uppercase tracking-wider text-emerald-600 font-semibold">Revenu estimé</p>
                            <p className="text-xl font-bold text-emerald-700 tabular-nums mt-1">{formatEUR(forecastData.nextMonthRevenue)}</p>
                          </div>
                          <div className="p-4 rounded-lg bg-red-50 border border-red-200/60">
                            <p className="text-[10px] uppercase tracking-wider text-red-600 font-semibold">Dépenses estimées</p>
                            <p className="text-xl font-bold text-red-700 tabular-nums mt-1">{formatEUR(forecastData.nextMonthExpenses)}</p>
                          </div>
                          <div className="p-4 rounded-lg bg-primary/[0.04] border border-primary/10">
                            <p className="text-[10px] uppercase tracking-wider text-primary font-semibold">Profit estimé</p>
                            <p className="text-xl font-bold text-primary tabular-nums mt-1">{formatEUR(forecastData.nextMonthProfit)}</p>
                          </div>
                        </div>
                        {forecastData.cashflowRisk && (
                          <div className="flex items-center gap-3 p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                            <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
                            <p className="text-sm"><strong>Risque trésorerie :</strong> créances ({formatEUR(kpis.receivables)}) élevées — relancez les impayés.</p>
                          </div>
                        )}
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                          ⚠️ Estimation basée sur la moyenne des 3 derniers mois — données indicatives.
                        </p>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <BarChart3 className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
                        <p className="text-muted-foreground text-sm">Minimum 3 mois de données requis.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>
        )}
      </div>
    </TooltipProvider>
  );
};

export default PerformancePage;
