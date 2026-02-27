import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardList, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import { useCleaningInterventions } from "@/hooks/useCleaningInterventions";

export default function SPDashboardHome() {
  const { interventions, isLoading } = useCleaningInterventions('service_provider');

  const scheduled = interventions.filter(i => i.status === 'scheduled').length;
  const completed = interventions.filter(i => i.status === 'completed' || i.status === 'validated').length;
  const today = interventions.filter(i => {
    const d = new Date(i.scheduled_date);
    const now = new Date();
    return d.toDateString() === now.toDateString() && i.status === 'scheduled';
  });

  const stats = [
    { label: "Aujourd'hui", value: today.length, icon: Clock, color: "text-amber-500" },
    { label: "Planifiées", value: scheduled, icon: ClipboardList, color: "text-blue-500" },
    { label: "Terminées", value: completed, icon: CheckCircle, color: "text-emerald-500" },
    { label: "À refaire", value: interventions.filter(i => i.status === 'redo').length, icon: AlertTriangle, color: "text-red-500" },
  ];

  return (
    <div className="space-y-6 max-w-6xl">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-foreground">Tableau de bord</h1>
        <p className="text-muted-foreground mt-1">Bienvenue dans votre espace prestataire</p>
      </motion.div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <s.icon className={`h-8 w-8 ${s.color}`} />
                  <div>
                    <p className="text-2xl font-bold">{isLoading ? '—' : s.value}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {today.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Interventions du jour</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {today.map(i => (
              <div key={i.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div>
                  <p className="font-medium">{i.property?.name || 'Bien'}</p>
                  <p className="text-sm text-muted-foreground">{i.property?.address}</p>
                </div>
                <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full">À faire</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
