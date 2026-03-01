import { Card, CardContent } from "@/components/ui/card";
import { ClipboardList, CheckCircle, Clock, AlertTriangle, DollarSign, Star, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { useMissions } from "@/hooks/useMissions";

export default function SPDashboardHome() {
  const { missions, isLoading } = useMissions('service_provider');

  const today = missions.filter(i => {
    const d = new Date(i.scheduled_date);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  });

  const thisWeek = missions.filter(i => {
    const d = new Date(i.scheduled_date);
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);
    return d >= weekStart && d < weekEnd && ['scheduled', 'in_progress'].includes(i.status);
  });

  const validated = missions.filter(i => i.status === 'validated');
  const pendingValidation = missions.filter(i => i.status === 'completed');
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const monthlyValidated = validated.filter(i => {
    const d = new Date(i.scheduled_date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const monthlyRevenue = monthlyValidated.reduce((sum, m) => sum + (m.mission_amount || 0), 0);
  const pendingRevenue = pendingValidation.reduce((sum, m) => sum + (m.mission_amount || 0), 0);

  const totalMissions = missions.length;
  const validationRate = totalMissions > 0 ? Math.round((validated.length / totalMissions) * 100) : 0;

  const avgScore = validated.length > 0
    ? (validated.reduce((sum, m) => sum + (m.internal_score || 0), 0) / validated.filter(m => m.internal_score != null).length).toFixed(1)
    : '—';

  const stats = [
    { label: "Aujourd'hui", value: today.filter(t => ['scheduled', 'in_progress'].includes(t.status)).length, sub: `${thisWeek.length} cette semaine`, icon: Clock, color: "text-amber-500", bg: "bg-amber-50" },
    { label: "Revenus du mois", value: `${monthlyRevenue}€`, sub: `${pendingRevenue}€ en attente`, icon: DollarSign, color: "text-emerald-500", bg: "bg-emerald-50" },
    { label: "Taux validation", value: `${validationRate}%`, sub: `${validated.length}/${totalMissions} missions`, icon: TrendingUp, color: "text-blue-500", bg: "bg-blue-50" },
    { label: "Note moyenne", value: avgScore, sub: "Note interne", icon: Star, color: "text-[hsl(var(--gold))]", bg: "bg-amber-50" },
  ];

  const todayMissions = today.filter(t => ['scheduled', 'in_progress'].includes(t.status));

  return (
    <div className="space-y-6 max-w-6xl">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-foreground">Tableau de bord</h1>
        <p className="text-muted-foreground mt-1">Bienvenue dans votre espace prestataire</p>
      </motion.div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <Card className="border-border hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center`}>
                    <s.icon className={`h-5 w-5 ${s.color}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{isLoading ? '—' : s.value}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                    <p className="text-[10px] text-muted-foreground/70 mt-0.5">{s.sub}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Today's missions */}
      {todayMissions.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              Missions du jour
            </h2>
            <div className="space-y-3">
              {todayMissions.map(m => (
                <div key={m.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                  <div>
                    <p className="font-medium">{m.property?.name || 'Bien'}</p>
                    <p className="text-sm text-muted-foreground">{m.property?.address}</p>
                    {m.scheduled_start_time && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        🕐 {new Date(m.scheduled_start_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        {m.scheduled_end_time && ` — ${new Date(m.scheduled_end_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`}
                      </p>
                    )}
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    m.status === 'in_progress' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {m.status === 'in_progress' ? 'En cours' : 'À faire'}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending validation */}
      {pendingValidation.length > 0 && (
        <Card className="border-amber-200">
          <CardContent className="pt-6">
            <h2 className="text-lg font-semibold mb-3 text-amber-700">⏳ En attente de validation ({pendingValidation.length})</h2>
            <div className="space-y-2">
              {pendingValidation.slice(0, 5).map(m => (
                <div key={m.id} className="flex items-center justify-between p-2 rounded bg-amber-50">
                  <span className="text-sm">{m.property?.name} — {new Date(m.scheduled_date).toLocaleDateString('fr-FR')}</span>
                  <span className="text-xs text-amber-600">{m.mission_amount}€</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
