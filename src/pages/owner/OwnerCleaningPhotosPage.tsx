import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Camera, Calendar, Home, CheckCircle, RefreshCw, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import { useCleaningInterventions, type CleaningIntervention } from "@/hooks/useCleaningInterventions";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const statusConfig: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  scheduled: { label: "Planifiée", icon: Calendar, color: "text-blue-600", bg: "bg-blue-50" },
  completed: { label: "En attente", icon: Camera, color: "text-amber-600", bg: "bg-amber-50" },
  validated: { label: "Validé ✅", icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50" },
  redo: { label: "À refaire", icon: RefreshCw, color: "text-orange-600", bg: "bg-orange-50" },
  incident: { label: "Incident", icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50" },
};

export default function OwnerCleaningPhotosPage() {
  const { interventions, isLoading } = useCleaningInterventions('owner');
  const [selected, setSelected] = useState<CleaningIntervention | null>(null);

  // Only show completed/validated/redo/incident interventions (not scheduled)
  const visible = interventions.filter(i => ['completed', 'validated', 'redo', 'incident'].includes(i.status));

  return (
    <div className="space-y-6 max-w-6xl">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-foreground">Photos ménage</h1>
        <p className="text-muted-foreground mt-1">Photos des interventions ménage pour vos biens</p>
      </motion.div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : visible.length === 0 ? (
        <Card className="text-center py-16 border-border">
          <CardContent className="pt-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[hsl(var(--gold))]/10 flex items-center justify-center">
              <Camera className="w-8 h-8 text-[hsl(var(--gold))]" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">Aucune photo pour le moment</h3>
            <p className="text-muted-foreground mb-2 max-w-md mx-auto">
              Les photos des interventions ménage apparaîtront ici dès qu'elles seront réalisées.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {visible.map((intervention, idx) => {
            const st = statusConfig[intervention.status] || statusConfig.completed;
            const StatusIcon = st.icon;
            return (
              <motion.div
                key={intervention.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Card
                  className="cursor-pointer hover:shadow-md transition-shadow overflow-hidden"
                  onClick={() => setSelected(intervention)}
                >
                  <CardContent className="p-0">
                    <div className="flex flex-col md:flex-row">
                      {/* Thumbnail */}
                      {intervention.photos && intervention.photos.length > 0 ? (
                        <div className="w-full md:w-48 h-32 md:h-auto relative">
                          <img
                            src={intervention.photos[0].url}
                            alt="Photo ménage"
                            className="w-full h-full object-cover"
                          />
                          <span className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">
                            📸 {intervention.photos.length}
                          </span>
                        </div>
                      ) : (
                        <div className="w-full md:w-48 h-32 md:h-auto bg-muted flex items-center justify-center">
                          <Camera className="w-8 h-8 text-muted-foreground" />
                        </div>
                      )}

                      {/* Info */}
                      <div className="flex-1 p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Home className="w-4 h-4 text-muted-foreground" />
                              <span className="font-semibold">{intervention.property?.name || 'Bien'}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Calendar className="w-3.5 h-3.5" />
                              <span>{new Date(intervention.scheduled_date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
                            </div>
                          </div>
                          <Badge className={`${st.bg} ${st.color} border-0`}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {st.label}
                          </Badge>
                        </div>

                        <p className="text-xs text-muted-foreground">
                          {intervention.type === 'cleaning' ? '🧹 Ménage' : '🔧 Maintenance'}
                          {intervention.completed_at && ` — Terminé le ${new Date(intervention.completed_at).toLocaleDateString('fr-FR')}`}
                        </p>

                        {intervention.concierge_notes && (
                          <p className="mt-2 text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded">
                            {intervention.concierge_notes}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Photo gallery dialog */}
      <Dialog open={!!selected} onOpenChange={o => !o && setSelected(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Home className="w-5 h-5" />
                  {selected.property?.name} — {new Date(selected.scheduled_date).toLocaleDateString('fr-FR')}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Badge className={`${(statusConfig[selected.status] || statusConfig.completed).bg} ${(statusConfig[selected.status] || statusConfig.completed).color} border-0`}>
                    {(statusConfig[selected.status] || statusConfig.completed).label}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {selected.type === 'cleaning' ? '🧹 Ménage' : '🔧 Maintenance'}
                  </span>
                </div>

                {selected.concierge_notes && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                    {selected.concierge_notes}
                  </div>
                )}

                {selected.photos && selected.photos.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {selected.photos.map(p => (
                      <div key={p.id} className="relative group">
                        <img
                          src={p.url}
                          alt=""
                          className="w-full aspect-square object-cover rounded-xl"
                        />
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 rounded-b-xl">
                          <p className="text-white text-[10px]">
                            {new Date(p.uploaded_at).toLocaleString('fr-FR')}
                          </p>
                        </div>
                        {p.type === 'incident' && (
                          <span className="absolute top-2 right-2 bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-medium">
                            🚨 Incident
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">Aucune photo</p>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
