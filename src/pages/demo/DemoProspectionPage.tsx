import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, MapPin, Star, Target, TrendingUp, Users, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import { useDemoContext } from "@/contexts/DemoContext";
import { PIPELINE_STATUSES } from "@/hooks/useProspects";
import { cn } from "@/lib/utils";

export default function DemoProspectionPage() {
  const demo = useDemoContext();
  if (!demo) return null;

  const prospects = demo.demoProspects;
  const signedCount = prospects.filter(p => p.pipeline_status === "signed").length;
  const totalPipeline = prospects.reduce((s, p) => s + p.estimated_monthly_revenue, 0);

  const kpis = [
    { label: "Prospects actifs", value: prospects.length, icon: Target, color: "text-primary", bg: "bg-primary/10" },
    { label: "Signés ce mois", value: signedCount, icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Valeur pipeline", value: `${totalPipeline.toLocaleString("fr-FR")} €/mois`, icon: Users, color: "text-violet-600", bg: "bg-violet-50" },
  ];

  // Group by pipeline status
  const byStatus = PIPELINE_STATUSES.reduce<Record<string, typeof prospects>>((acc, s) => {
    acc[s.value] = prospects.filter(p => p.pipeline_status === s.value);
    return acc;
  }, {});

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold text-foreground">Prospection</h1>
          <p className="text-sm text-muted-foreground mt-1">Pipeline commercial et suivi des prospects.</p>
        </motion.div>
        <Button onClick={demo.blockAction} className="bg-[hsl(var(--gold))] hover:bg-[hsl(var(--gold-dark))] text-primary font-semibold">
          <Plus className="w-4 h-4 mr-2" />
          Nouveau prospect
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {kpis.map((kpi, i) => (
          <motion.div key={kpi.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-3", kpi.bg)}>
                  <kpi.icon className={cn("w-5 h-5", kpi.color)} />
                </div>
                <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{kpi.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Pipeline Kanban */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {PIPELINE_STATUSES.filter(s => ["new_contact", "to_contact", "contacted", "interested", "meeting_scheduled", "proposal_sent"].includes(s.value)).map((stage) => (
          <div key={stage.value} className="min-w-[260px] flex-shrink-0">
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="outline" className={stage.color}>{stage.label}</Badge>
              <span className="text-xs text-muted-foreground">{byStatus[stage.value]?.length || 0}</span>
            </div>
            <div className="space-y-2">
              {(byStatus[stage.value] || []).map((p) => (
                <Card key={p.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={demo.blockAction}>
                  <CardContent className="p-4">
                    <p className="font-medium text-sm text-foreground">{p.first_name} {p.last_name}</p>
                    {p.city && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3" />{p.city}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="secondary" className="text-[10px]">{p.source}</Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                        <Star className="w-3 h-3 text-amber-500" />{p.score}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {(!byStatus[stage.value] || byStatus[stage.value].length === 0) && (
                <div className="border border-dashed border-border rounded-xl p-4 text-center">
                  <p className="text-xs text-muted-foreground">Aucun prospect</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
