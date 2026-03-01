import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { History } from "lucide-react";
import { motion } from "framer-motion";
import { useMissions } from "@/hooks/useMissions";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  completed: { label: "En attente", variant: "secondary" },
  validated: { label: "Validée ✅", variant: "default" },
  refused: { label: "Refusée ❌", variant: "destructive" },
  redo: { label: "À refaire", variant: "destructive" },
  incident: { label: "Incident", variant: "destructive" },
};

export default function SPHistoryPage() {
  const { missions, isLoading } = useMissions('service_provider');

  const history = missions.filter(m => ['completed', 'validated', 'refused', 'incident'].includes(m.status))
    .sort((a, b) => new Date(b.scheduled_date).getTime() - new Date(a.scheduled_date).getTime());

  return (
    <div className="space-y-6 max-w-6xl">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-foreground">Historique</h1>
        <p className="text-muted-foreground mt-1">Toutes vos missions passées</p>
      </motion.div>

      {history.length === 0 && !isLoading ? (
        <Card className="text-center py-12">
          <CardContent>
            <History className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <h3 className="font-semibold text-lg">Aucun historique</h3>
            <p className="text-muted-foreground text-sm">Vos missions terminées apparaîtront ici</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {history.map((m, idx) => (
            <motion.div key={m.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }}>
              <Card className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{m.property?.name || 'Bien'}</p>
                      {m.internal_score != null && (
                        <span className="text-xs text-muted-foreground">⭐ {m.internal_score}/10</span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      📅 {new Date(m.scheduled_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                      {m.mission_amount > 0 && ` — 💰 ${m.mission_amount}€`}
                    </p>
                    {m.admin_comment && (
                      <p className="text-xs text-amber-600 mt-1">💬 {m.admin_comment}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={statusConfig[m.status]?.variant || "outline"}>
                      {statusConfig[m.status]?.label || m.status}
                    </Badge>
                    {m.payment_done && <span className="text-xs text-emerald-600">✅ Payé</span>}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
