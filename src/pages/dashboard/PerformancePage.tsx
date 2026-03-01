import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BarChart3, TrendingUp, TrendingDown, Euro, CalendarCheck, Wrench,
  Clock, Users, Target, Sparkles, ListTodo, Trash2, CheckCircle2,
  AlertTriangle, Info, ArrowUpRight, Loader2, RefreshCw,
} from "lucide-react";
import { motion } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend,
} from "recharts";
import { usePerformanceKPIs } from "@/hooks/usePerformanceKPIs";
import { useAiTasks } from "@/hooks/useAiTasks";
import { useAiInsights } from "@/hooks/useAiInsights";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatEUR } from "@/lib/finance-utils";

const scopeLabels: Record<string, string> = {
  finance: "Finance", operations: "Opérations", sales: "Commercial",
  listing: "Annonces", general: "Général",
};
const priorityColors: Record<string, string> = {
  high: "bg-red-100 text-red-700", medium: "bg-amber-100 text-amber-700",
  low: "bg-emerald-100 text-emerald-700",
};
const bulletIcons: Record<string, typeof TrendingUp> = {
  positive: TrendingUp, warning: AlertTriangle, action: Target, info: Info,
};

const PerformancePage = () => {
  const { kpis, loading: kpiLoading } = usePerformanceKPIs();
  const { tasks, loading: tasksLoading, updateTaskStatus, deleteTask, refetch: refetchTasks } = useAiTasks();
  const { insights, loading: insightsLoading, refetch: refetchInsights } = useAiInsights();
  const { flags } = useFeatureFlags();
  const [analyzing, setAnalyzing] = useState(false);
  const [generatingTasks, setGeneratingTasks] = useState(false);
  const [taskFilter, setTaskFilter] = useState<string>("all");
  const [taskStatusFilter, setTaskStatusFilter] = useState<string>("all");

  const runAnalysis = async () => {
    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-performance", {
        body: { mode: "both" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Analyse terminée — ${data.tasks_count || 0} tâches suggérées`);
      await Promise.all([refetchInsights(), refetchTasks()]);
    } catch (e: any) {
      toast.error(e.message || "Erreur d'analyse");
    } finally {
      setAnalyzing(false);
    }
  };

  const runRulesTasks = async () => {
    setGeneratingTasks(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-rules-tasks", {});
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`${data.generated} tâche(s) générée(s), ${data.skipped} ignorée(s)`);
      await refetchTasks();
    } catch (e: any) {
      toast.error(e.message || "Erreur de génération");
    } finally {
      setGeneratingTasks(false);
    }
  };

  const filteredTasks = tasks.filter(t => {
    if (taskFilter !== "all" && t.scope !== taskFilter) return false;
    if (taskStatusFilter !== "all" && t.status !== taskStatusFilter) return false;
    return true;
  });

  const latestInsight = insights[0];

  // Forecast: simple linear projection from last 3 months
  const forecastData = (() => {
    const series = kpis.monthlySeries;
    if (series.length < 3) return null;
    const last3 = series.slice(-3);
    const avgRev = last3.reduce((s, m) => s + m.revenue, 0) / 3;
    const avgExp = last3.reduce((s, m) => s + m.expenses, 0) / 3;
    return {
      nextMonthRevenue: Math.round(avgRev),
      nextMonthExpenses: Math.round(avgExp),
      nextMonthProfit: Math.round(avgRev - avgExp),
      cashflowRisk: kpis.receivables > avgRev * 1.5,
    };
  })();

  return (
    <div className="space-y-6 max-w-7xl">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-foreground">Performance</h1>
        <p className="text-muted-foreground mt-1">KPIs, analyses IA et tâches intelligentes</p>
      </motion.div>

      {/* ===== FINANCIAL KPIs ===== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Revenu brut", value: formatEUR(kpis.grossRevenue), icon: Euro, color: "text-emerald-600" },
          { label: "Dépenses", value: formatEUR(kpis.expenses), icon: TrendingDown, color: "text-red-500" },
          { label: "Profit net", value: formatEUR(kpis.netProfit), icon: TrendingUp, color: kpis.netProfit >= 0 ? "text-emerald-600" : "text-red-500" },
          { label: "À recevoir", value: formatEUR(kpis.receivables), icon: Clock, color: "text-amber-600" },
        ].map((kpi, i) => (
          <motion.div key={kpi.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{kpi.label}</p>
                    <p className={`text-2xl font-bold mt-1 ${kpi.color}`}>{kpiLoading ? "..." : kpi.value}</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                    <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* ===== OPERATIONAL + SALES KPIs ===== */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: "Réservations", value: kpis.bookingsCount, icon: CalendarCheck },
          { label: "Interventions", value: kpis.interventionsCount, icon: Wrench },
          { label: "Délai paiement", value: `${kpis.avgPaymentDelay}j`, icon: Clock },
          { label: "Leads", value: kpis.leadsCount, icon: Users },
          { label: "Taux conversion", value: `${kpis.conversionRate}%`, icon: Target },
          { label: "Pipeline", value: formatEUR(kpis.pipelineValue), icon: ArrowUpRight },
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="p-4 text-center">
              <item.icon className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
              <p className="text-lg font-bold text-foreground">{kpiLoading ? "..." : item.value}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{item.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ===== CHARTS ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Revenus vs Dépenses (6 mois)</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={kpis.monthlySeries}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip formatter={(v: number) => formatEUR(v)} />
                <Legend />
                <Bar dataKey="revenue" name="Revenus" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" name="Dépenses" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Créances (6 mois)</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={kpis.monthlySeries}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip formatter={(v: number) => formatEUR(v)} />
                <Line type="monotone" dataKey="receivables" name="À recevoir" stroke="hsl(var(--chart-4))" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* ===== AI PANELS ===== */}
      {flags.ai_enabled && (
        <Tabs defaultValue="analysis" className="space-y-4">
          <TabsList>
            {flags.ai_analysis_enabled && <TabsTrigger value="analysis"><Sparkles className="w-4 h-4 mr-1" />Analyse IA</TabsTrigger>}
            {flags.ai_tasks_enabled && <TabsTrigger value="tasks"><ListTodo className="w-4 h-4 mr-1" />Smart To-Do</TabsTrigger>}
            {flags.ai_forecast_enabled && <TabsTrigger value="forecast"><BarChart3 className="w-4 h-4 mr-1" />Prévisionnel</TabsTrigger>}
          </TabsList>

          {/* AI Analysis */}
          {flags.ai_analysis_enabled && (
            <TabsContent value="analysis">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg">Analyse IA</CardTitle>
                  <Button onClick={runAnalysis} disabled={analyzing} size="sm">
                    {analyzing ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1" />}
                    {analyzing ? "Analyse en cours..." : "Analyser ma performance"}
                  </Button>
                </CardHeader>
                <CardContent>
                  {insightsLoading ? (
                    <p className="text-muted-foreground">Chargement...</p>
                  ) : latestInsight ? (
                    <div className="space-y-4">
                      <p className="text-sm text-foreground leading-relaxed">{latestInsight.summary_text}</p>
                      {latestInsight.bullets_json && latestInsight.bullets_json.length > 0 && (
                        <div className="space-y-2">
                          {(latestInsight.bullets_json as any[]).map((b: any, i: number) => {
                            const Icon = bulletIcons[b.type] || Info;
                            return (
                              <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-muted/50">
                                <Icon className="w-4 h-4 mt-0.5 shrink-0 text-muted-foreground" />
                                <span className="text-sm">{b.text}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Dernière analyse: {new Date(latestInsight.created_at).toLocaleString("fr-FR")}
                      </p>
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">
                      Aucune analyse disponible. Cliquez sur "Analyser ma performance" pour commencer.
                    </p>
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
                    <p className="text-muted-foreground text-sm">Aucune tâche. Générez-en avec les boutons ci-dessus.</p>
                  ) : (
                    <div className="space-y-2 max-h-[500px] overflow-y-auto">
                      {filteredTasks.map((task) => (
                        <div key={task.id} className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                          <button
                            onClick={() => updateTaskStatus(task.id, task.status === "done" ? "todo" : "done")}
                            className="mt-0.5 shrink-0"
                          >
                            <CheckCircle2 className={`w-5 h-5 ${task.status === "done" ? "text-emerald-500" : "text-muted-foreground/30"}`} />
                          </button>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium ${task.status === "done" ? "line-through text-muted-foreground" : "text-foreground"}`}>
                              {task.title}
                            </p>
                            {task.description && (
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{task.description}</p>
                            )}
                            <div className="flex gap-1 mt-1 flex-wrap">
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">{scopeLabels[task.scope] || task.scope}</Badge>
                              <Badge className={`text-[10px] px-1.5 py-0 ${priorityColors[task.priority] || ""}`}>{task.priority}</Badge>
                              {task.source === "ai" && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">IA</Badge>}
                              {task.source === "rules" && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Auto</Badge>}
                              {task.status === "draft" && <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-300 text-amber-600">Brouillon</Badge>}
                            </div>
                          </div>
                          <button onClick={() => deleteTask(task.id)} className="shrink-0 text-muted-foreground hover:text-destructive">
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
                        <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200">
                          <p className="text-xs text-emerald-600 font-medium">Revenu estimé</p>
                          <p className="text-xl font-bold text-emerald-700">{formatEUR(forecastData.nextMonthRevenue)}</p>
                        </div>
                        <div className="p-4 rounded-lg bg-red-50 border border-red-200">
                          <p className="text-xs text-red-600 font-medium">Dépenses estimées</p>
                          <p className="text-xl font-bold text-red-700">{formatEUR(forecastData.nextMonthExpenses)}</p>
                        </div>
                        <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                          <p className="text-xs text-blue-600 font-medium">Profit estimé</p>
                          <p className="text-xl font-bold text-blue-700">{formatEUR(forecastData.nextMonthProfit)}</p>
                        </div>
                      </div>
                      {forecastData.cashflowRisk && (
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
                          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                          <p className="text-sm text-amber-700">
                            <strong>Risque trésorerie :</strong> vos créances ({formatEUR(kpis.receivables)}) sont élevées par rapport au revenu moyen. Pensez à relancer les factures impayées.
                          </p>
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground">
                        ⚠️ Estimation basée sur la moyenne des 3 derniers mois. Données indicatives uniquement.
                      </p>
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">
                      Pas assez de données (minimum 3 mois) pour générer des prévisions.
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      )}
    </div>
  );
};

export default PerformancePage;
