import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Calendar, Euro, CheckCircle, ClipboardList, Loader2, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { useNewMissions, type NewMission } from "@/hooks/useNewMissions";
import { useIsServiceProvider } from "@/hooks/useIsServiceProvider";

const statusLabels: Record<string, string> = {
  open: "Disponible",
  assigned: "Assignée à vous",
  confirmed: "Confirmée",
  done: "Terminée",
  approved: "Approuvée ✅",
};

const missionTypeLabels: Record<string, string> = {
  cleaning: "🧹 Ménage",
  checkin: "🔑 Check-in",
  checkout: "🚪 Check-out",
  maintenance: "🔧 Maintenance",
};

export default function SPOpenMissionsPage() {
  const { missions, isLoading, claimMission, confirmMission, markDone } = useNewMissions('provider');
  const { spId } = useIsServiceProvider();
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const openMissions = missions.filter(m => m.status === 'open');
  const myMissions = missions.filter(m =>
    m.selected_provider_id === spId &&
    ['assigned', 'confirmed', 'done', 'approved'].includes(m.status)
  );

  const handleClaim = async (missionId: string) => {
    setClaimingId(missionId);
    await claimMission(missionId);
    setClaimingId(null);
  };

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-foreground">Missions disponibles</h1>
        <p className="text-muted-foreground mt-1">Prenez une mission instantanément — premier arrivé, premier servi</p>
      </motion.div>

      {/* My assigned missions */}
      {myMissions.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3 text-foreground">Mes missions assignées</h2>
          <div className="space-y-3">
            {myMissions.map((m, i) => (
              <motion.div key={m.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{m.title}</p>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{m.property?.name}</span>
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(m.start_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                          {m.payout_amount > 0 && <span className="flex items-center gap-1"><Euro className="w-3 h-3" />{m.payout_amount}€</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={m.status === 'confirmed' ? 'default' : 'secondary'}>
                          {statusLabels[m.status] || m.status}
                        </Badge>
                        {m.status === 'assigned' && (
                          <Button size="sm" onClick={() => confirmMission(m.id)}>
                            <CheckCircle className="w-3 h-3 mr-1" /> Confirmer
                          </Button>
                        )}
                        {m.status === 'confirmed' && (
                          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => markDone(m.id)}>
                            <CheckCircle className="w-3 h-3 mr-1" /> Terminée
                          </Button>
                        )}
                      </div>
                    </div>
                    {m.instructions && (
                      <p className="text-sm text-muted-foreground mt-2 bg-muted/50 p-2 rounded">{m.instructions}</p>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Open missions */}
      <div>
        <h2 className="text-lg font-semibold mb-3 text-foreground">Missions ouvertes ({openMissions.length})</h2>
        {openMissions.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <ClipboardList className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <h3 className="font-semibold text-lg">Aucune mission disponible</h3>
              <p className="text-muted-foreground text-sm">Les nouvelles missions apparaîtront ici en temps réel</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {openMissions.map((m, i) => (
              <motion.div key={m.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold">{m.title}</p>
                          <span className="text-xs">{missionTypeLabels[m.mission_type]}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{m.property?.name}</span>
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(m.start_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                          {m.payout_amount > 0 && <span className="flex items-center gap-1 font-medium text-emerald-600"><Euro className="w-3 h-3" />{m.payout_amount}€</span>}
                        </div>
                      </div>
                      <div>
                        <Button
                          size="sm"
                          className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                          disabled={claimingId === m.id}
                          onClick={() => handleClaim(m.id)}
                        >
                          {claimingId === m.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Zap className="w-3.5 h-3.5" />
                          )}
                          Prendre la mission
                        </Button>
                      </div>
                    </div>
                    {m.instructions && (
                      <p className="text-sm text-muted-foreground mt-2 bg-muted/50 p-2 rounded line-clamp-2">{m.instructions}</p>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
