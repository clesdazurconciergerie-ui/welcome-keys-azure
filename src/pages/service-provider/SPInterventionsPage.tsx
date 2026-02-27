import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, Camera, Upload, CheckCircle, X } from "lucide-react";
import { motion } from "framer-motion";
import { useCleaningInterventions, type CleaningIntervention } from "@/hooks/useCleaningInterventions";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  scheduled: { label: "Planifiée", variant: "outline" },
  in_progress: { label: "En cours", variant: "secondary" },
  completed: { label: "Terminée", variant: "default" },
  validated: { label: "Validée ✅", variant: "default" },
  redo: { label: "À refaire 🔁", variant: "destructive" },
  incident: { label: "Incident 🚨", variant: "destructive" },
};

export default function SPInterventionsPage() {
  const { interventions, isLoading, uploadPhoto, completeIntervention, refetch } = useCleaningInterventions('service_provider');
  const [selected, setSelected] = useState<CleaningIntervention | null>(null);
  const [uploading, setUploading] = useState(false);
  const [completing, setCompleting] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: string = 'after_cleaning') => {
    if (!selected || !e.target.files?.length) return;
    setUploading(true);
    for (const file of Array.from(e.target.files)) {
      await uploadPhoto(selected.id, file, type);
    }
    setUploading(false);
    await refetch();
    // Refresh selected
    const updated = interventions.find(i => i.id === selected.id);
    if (updated) setSelected({ ...updated });
  };

  const handleComplete = async () => {
    if (!selected) return;
    setCompleting(true);
    const result = await completeIntervention(selected.id);
    setCompleting(false);
    if (result?.success) {
      setSelected(null);
    }
  };

  const activeInterventions = interventions.filter(i => ['scheduled', 'in_progress', 'redo'].includes(i.status));
  const pastInterventions = interventions.filter(i => ['completed', 'validated', 'incident'].includes(i.status));

  return (
    <div className="space-y-6 max-w-6xl">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-foreground">Mes interventions</h1>
        <p className="text-muted-foreground mt-1">Gérez vos interventions et uploadez les photos</p>
      </motion.div>

      {/* Active interventions */}
      <div>
        <h2 className="text-lg font-semibold mb-3">À réaliser</h2>
        {activeInterventions.length === 0 ? (
          <Card className="text-center py-8">
            <CardContent>
              <ClipboardList className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">Aucune intervention en attente</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {activeInterventions.map(intervention => (
              <Card key={intervention.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelected(intervention)}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{intervention.property?.name || 'Bien'}</p>
                    <p className="text-sm text-muted-foreground">
                      📅 {new Date(intervention.scheduled_date).toLocaleDateString('fr-FR')} — {intervention.type === 'cleaning' ? '🧹 Ménage' : '🔧 Maintenance'}
                    </p>
                    {intervention.notes && <p className="text-sm text-muted-foreground mt-1">{intervention.notes}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={statusConfig[intervention.status]?.variant || "outline"}>
                      {statusConfig[intervention.status]?.label || intervention.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      📸 {intervention.photos?.length || 0}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Past interventions */}
      {pastInterventions.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Historique</h2>
          <div className="space-y-2">
            {pastInterventions.map(intervention => (
              <Card key={intervention.id} className="cursor-pointer opacity-80 hover:opacity-100 transition-opacity" onClick={() => setSelected(intervention)}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{intervention.property?.name || 'Bien'}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(intervention.scheduled_date).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <Badge variant={statusConfig[intervention.status]?.variant || "outline"}>
                    {statusConfig[intervention.status]?.label || intervention.status}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{selected.property?.name || 'Intervention'}</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Date :</span> {new Date(selected.scheduled_date).toLocaleDateString('fr-FR')}</div>
                  <div><span className="text-muted-foreground">Type :</span> {selected.type === 'cleaning' ? 'Ménage' : 'Maintenance'}</div>
                  <div><span className="text-muted-foreground">Statut :</span> <Badge variant={statusConfig[selected.status]?.variant || "outline"}>{statusConfig[selected.status]?.label || selected.status}</Badge></div>
                  <div><span className="text-muted-foreground">Adresse :</span> {selected.property?.address}</div>
                </div>

                {selected.notes && (
                  <div className="p-3 bg-muted/50 rounded-lg text-sm">
                    <p className="font-medium mb-1">Instructions :</p>
                    <p>{selected.notes}</p>
                  </div>
                )}

                {selected.concierge_notes && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
                    <p className="font-medium mb-1 text-amber-800">Note de la conciergerie :</p>
                    <p className="text-amber-700">{selected.concierge_notes}</p>
                  </div>
                )}

                {/* Photos */}
                <div>
                  <h3 className="font-semibold mb-2">📸 Photos ({selected.photos?.length || 0})</h3>
                  {selected.photos && selected.photos.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2">
                      {selected.photos.map(p => (
                        <div key={p.id} className="relative aspect-square rounded-lg overflow-hidden">
                          <img src={p.url} alt="" className="w-full h-full object-cover" />
                          {p.type === 'incident' && (
                            <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">Incident</span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Aucune photo uploadée</p>
                  )}
                </div>

                {/* Upload buttons (only for active interventions) */}
                {['scheduled', 'in_progress', 'redo'].includes(selected.status) && (
                  <div className="flex flex-col gap-2">
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, 'after_cleaning')}
                        disabled={uploading}
                      />
                      <div className="flex items-center justify-center gap-2 p-3 border-2 border-dashed border-primary/30 rounded-lg hover:bg-primary/5 transition-colors">
                        <Upload className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium text-primary">
                          {uploading ? 'Upload en cours...' : 'Uploader photos ménage'}
                        </span>
                      </div>
                    </label>

                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, 'incident')}
                        disabled={uploading}
                      />
                      <div className="flex items-center justify-center gap-2 p-2 border border-dashed border-destructive/30 rounded-lg hover:bg-destructive/5 transition-colors">
                        <Camera className="w-4 h-4 text-destructive" />
                        <span className="text-xs font-medium text-destructive">Signaler un incident (photo)</span>
                      </div>
                    </label>

                    <Button
                      onClick={handleComplete}
                      disabled={completing || !selected.photos?.length}
                      className="mt-2 bg-emerald-600 hover:bg-emerald-700"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      {completing ? 'Validation...' : 'Intervention terminée'}
                    </Button>
                    {!selected.photos?.length && (
                      <p className="text-xs text-destructive text-center">⚠️ Vous devez uploader au moins une photo avant de valider</p>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
