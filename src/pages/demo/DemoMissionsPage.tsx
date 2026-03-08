import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Briefcase, Plus } from "lucide-react";
import { motion } from "framer-motion";
import { useDemoContext } from "@/contexts/DemoContext";

const statusConfig: Record<string, { label: string; color: string }> = {
  draft: { label: "Brouillon", color: "bg-muted text-muted-foreground" },
  open: { label: "Ouverte", color: "bg-blue-100 text-blue-800" },
  confirmed: { label: "Confirmée", color: "bg-emerald-100 text-emerald-700" },
  in_progress: { label: "En cours", color: "bg-amber-100 text-amber-700" },
};

export default function DemoMissionsPage() {
  const demo = useDemoContext();
  if (!demo) return null;

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold text-foreground">Missions</h1>
          <p className="text-sm text-muted-foreground mt-1">Planification et suivi des interventions.</p>
        </motion.div>
        <Button onClick={demo.blockAction} className="bg-[hsl(var(--gold))] hover:bg-[hsl(var(--gold-dark))] text-primary font-semibold" data-tour="add-mission">
          <Plus className="w-4 h-4 mr-2" />
          Créer une mission
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {demo.demoMissions.map((m, i) => {
              const cfg = statusConfig[m.status] || statusConfig.draft;
              return (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={demo.blockAction}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Briefcase className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{m.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {m.selected_provider ? `${m.selected_provider.first_name} ${m.selected_provider.last_name}` : "Non assigné"}
                        {" · "}{m.payout_amount} €
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className={cfg.color}>{cfg.label}</Badge>
                </motion.div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
