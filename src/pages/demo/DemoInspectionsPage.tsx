import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClipboardCheck, Plus, Home, Calendar, User } from "lucide-react";
import { motion } from "framer-motion";
import { useDemoContext } from "@/contexts/DemoContext";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const statusMap: Record<string, { label: string; color: string }> = {
  draft: { label: "Brouillon", color: "" },
  completed: { label: "Complété", color: "bg-emerald-100 text-emerald-700 border-0" },
  pending: { label: "En attente", color: "bg-amber-100 text-amber-700 border-0" },
};

export default function DemoInspectionsPage() {
  const demo = useDemoContext();
  if (!demo) return null;

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold text-foreground">États des lieux</h1>
          <p className="text-sm text-muted-foreground mt-1">Entrées, sorties et inspections documentées.</p>
        </motion.div>
        <Button onClick={demo.blockAction} className="bg-[hsl(var(--gold))] hover:bg-[hsl(var(--gold-dark))] text-primary font-semibold" data-tour="add-inspection">
          <Plus className="w-4 h-4 mr-2" />
          Nouvel état des lieux
        </Button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {demo.demoInspections.map((insp, i) => {
          const cfg = statusMap[insp.status] || statusMap.draft;
          return (
            <motion.div key={insp.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={demo.blockAction}>
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">{insp.inspection_type === "entry" ? "Entrée" : "Sortie"}</Badge>
                    <Badge variant="secondary" className={cfg.color}>{cfg.label}</Badge>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                      <Home className="w-4 h-4 text-muted-foreground" />
                      {insp.property?.name}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {insp.guest_name || "—"}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(insp.inspection_date), "d MMM yyyy", { locale: fr })}
                    </p>
                  </div>
                  {insp.damage_notes && (
                    <p className="text-xs text-amber-600 bg-amber-50 rounded-md p-2">{insp.damage_notes}</p>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
