import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ClipboardList, Play, CheckCircle, Upload, Camera, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import { useMissions, useChecklistItems, type Mission } from "@/hooks/useMissions";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  scheduled: { label: "Assignée", variant: "outline" },
  in_progress: { label: "En cours", variant: "secondary" },
  completed: { label: "En attente validation", variant: "default" },
  validated: { label: "Validée ✅", variant: "default" },
  redo: { label: "À refaire 🔁", variant: "destructive" },
  refused: { label: "Refusée ❌", variant: "destructive" },
};

const missionTypeLabels: Record<string, string> = {
  cleaning: "🧹 Ménage",
  checkin: "🔑 Check-in",
  checkout: "🚪 Check-out",
  maintenance: "🔧 Intervention",
};

export default function SPMissionsPage() {
  const { missions, isLoading, startMission, completeMission, uploadPhoto, refetch } = useMissions('service_provider');
  const [selected, setSelected] = useState<Mission | null>(null);
  const [uploading, setUploading] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [providerComment, setProviderComment] = useState('');
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  const { items: checklistItems } = useChecklistItems(selected?.property_id);

  const activeMissions = missions.filter(i =>
    ['scheduled', 'in_progress', 'redo'].includes(i.status) &&
    new Date(i.scheduled_date) >= new Date(new Date().toDateString())
  );

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: string = 'after_cleaning') => {
    if (!selected || !e.target.files?.length) return;
    setUploading(true);
    for (const file of Array.from(e.target.files)) {
      await uploadPhoto(selected.id, file, type);
    }
    setUploading(false);
    await refetch();
    const updated = missions.find(i => i.id === selected.id);
    if (updated) setSelected({ ...updated });
  };

  const handleStart = async () => {
    if (!selected) return;
    await startMission(selected.id);
    await refetch();
    const updated = missions.find(i => i.id === selected.id);
    if (updated) setSelected({ ...updated });
  };

  const handleComplete = async () => {
    if (!selected) return;

    // Check mandatory checklist items
    const mandatoryItems = checklistItems.filter(i => i.is_mandatory);
    const allMandatoryChecked = mandatoryItems.every(i => checkedItems[i.id]);
    if (!allMandatoryChecked && mandatoryItems.length > 0) {
      return; // blocked
    }

    // Check minimum photos
    if (!selected.photos || selected.photos.length < 4) {
      return; // blocked
    }

    setCompleting(true);
    const result = await completeMission(selected.id, providerComment || undefined);
    setCompleting(false);
    if (result?.success) {
      setSelected(null);
      setProviderComment('');
      setCheckedItems({});
    }
  };

  const photoCount = selected?.photos?.length || 0;
  const mandatoryItems = checklistItems.filter(i => i.is_mandatory);
  const allMandatoryChecked = mandatoryItems.length === 0 || mandatoryItems.every(i => checkedItems[i.id]);
  const canComplete = selected?.status === 'in_progress' && photoCount >= 4 && allMandatoryChecked;

  return (
    <div className="space-y-6 max-w-6xl">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-foreground">Mes missions</h1>
        <p className="text-muted-foreground mt-1">Missions à réaliser et en cours</p>
      </motion.div>

      {activeMissions.length === 0 && !isLoading ? (
        <Card className="text-center py-12">
          <CardContent>
            <ClipboardList className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <h3 className="font-semibold text-lg">Aucune mission en attente</h3>
            <p className="text-muted-foreground text-sm">Vos prochaines missions apparaîtront ici</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {activeMissions.map((m, idx) => (
            <motion.div key={m.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}>
              <Card
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => { setSelected(m); setCheckedItems({}); setProviderComment(''); }}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{m.property?.name || 'Bien'}</p>
                      <p className="text-sm text-muted-foreground">{m.property?.address}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <span>📅 {new Date(m.scheduled_date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                        <span>{missionTypeLabels[m.mission_type] || m.mission_type}</span>
                        {m.mission_amount > 0 && <span>💰 {m.mission_amount}€</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={statusConfig[m.status]?.variant || "outline"}>
                        {statusConfig[m.status]?.label || m.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">📸 {m.photos?.length || 0}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Mission Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={(open) => { if (!open) { setSelected(null); setCheckedItems({}); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{selected.property?.name || 'Mission'}</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                {/* Info */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Date :</span> {new Date(selected.scheduled_date).toLocaleDateString('fr-FR')}</div>
                  <div><span className="text-muted-foreground">Type :</span> {missionTypeLabels[selected.mission_type] || selected.mission_type}</div>
                  <div><span className="text-muted-foreground">Statut :</span> <Badge variant={statusConfig[selected.status]?.variant || "outline"}>{statusConfig[selected.status]?.label || selected.status}</Badge></div>
                  <div><span className="text-muted-foreground">Montant :</span> {selected.mission_amount}€</div>
                </div>

                {selected.notes && (
                  <div className="p-3 bg-muted/50 rounded-lg text-sm">
                    <p className="font-medium mb-1">Instructions :</p>
                    <p>{selected.notes}</p>
                  </div>
                )}

                {selected.concierge_notes && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
                    <p className="font-medium mb-1 text-amber-800">Note admin :</p>
                    <p className="text-amber-700">{selected.concierge_notes}</p>
                  </div>
                )}

                {/* Start button */}
                {selected.status === 'scheduled' && (
                  <Button onClick={handleStart} className="w-full bg-blue-600 hover:bg-blue-700">
                    <Play className="w-4 h-4 mr-2" /> Démarrer la mission
                  </Button>
                )}

                {/* In progress: show checklist + upload + complete */}
                {(selected.status === 'in_progress' || selected.status === 'redo') && (
                  <>
                    {/* Checklist */}
                    {checklistItems.length > 0 && (
                      <div className="space-y-2">
                        <h3 className="font-semibold text-sm">✅ Checklist</h3>
                        {checklistItems.map(item => (
                          <label key={item.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer">
                            <Checkbox
                              checked={!!checkedItems[item.id]}
                              onCheckedChange={(checked) =>
                                setCheckedItems(prev => ({ ...prev, [item.id]: !!checked }))
                              }
                            />
                            <span className="text-sm flex-1">{item.task_text}</span>
                            {item.is_mandatory && <span className="text-[10px] text-destructive font-medium">Obligatoire</span>}
                          </label>
                        ))}
                        {!allMandatoryChecked && (
                          <p className="text-xs text-destructive">⚠️ Tous les éléments obligatoires doivent être cochés</p>
                        )}
                      </div>
                    )}

                    {/* Photos */}
                    <div>
                      <h3 className="font-semibold text-sm mb-2">📸 Photos ({photoCount}/4 minimum)</h3>
                      {selected.photos && selected.photos.length > 0 && (
                        <div className="grid grid-cols-4 gap-2 mb-3">
                          {selected.photos.map(p => (
                            <div key={p.id} className="relative aspect-square rounded-lg overflow-hidden">
                              <img src={p.url} alt="" className="w-full h-full object-cover" />
                              {p.type === 'incident' && (
                                <span className="absolute top-1 right-1 bg-destructive text-destructive-foreground text-[10px] px-1 py-0.5 rounded-full">🚨</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      <label className="cursor-pointer block">
                        <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFileUpload(e, 'after_cleaning')} disabled={uploading} />
                        <div className="flex items-center justify-center gap-2 p-3 border-2 border-dashed border-primary/30 rounded-lg hover:bg-primary/5 transition-colors">
                          <Upload className="w-4 h-4 text-primary" />
                          <span className="text-sm font-medium text-primary">
                            {uploading ? 'Upload en cours...' : 'Uploader photos ménage'}
                          </span>
                        </div>
                      </label>

                      <label className="cursor-pointer block mt-2">
                        <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFileUpload(e, 'incident')} disabled={uploading} />
                        <div className="flex items-center justify-center gap-2 p-2 border border-dashed border-destructive/30 rounded-lg hover:bg-destructive/5 transition-colors">
                          <Camera className="w-4 h-4 text-destructive" />
                          <span className="text-xs font-medium text-destructive">Signaler un incident (photo)</span>
                        </div>
                      </label>

                      {photoCount < 4 && (
                        <p className="text-xs text-destructive mt-2">⚠️ Minimum 4 photos requises avant de pouvoir valider</p>
                      )}
                    </div>

                    {/* Comment */}
                    <div>
                      <h3 className="font-semibold text-sm mb-2">💬 Commentaire (optionnel)</h3>
                      <Textarea
                        value={providerComment}
                        onChange={(e) => setProviderComment(e.target.value)}
                        placeholder="Observations, remarques..."
                        rows={3}
                      />
                    </div>

                    {/* Complete */}
                    <Button
                      onClick={handleComplete}
                      disabled={completing || !canComplete}
                      className="w-full bg-emerald-600 hover:bg-emerald-700"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      {completing ? 'Validation...' : 'Mission terminée'}
                    </Button>
                  </>
                )}

                {/* Completed / validated: read only */}
                {['completed', 'validated', 'refused'].includes(selected.status) && (
                  <>
                    {selected.photos && selected.photos.length > 0 && (
                      <div>
                        <h3 className="font-semibold text-sm mb-2">📸 Photos</h3>
                        <div className="grid grid-cols-3 gap-2">
                          {selected.photos.map(p => (
                            <img key={p.id} src={p.url} alt="" className="w-full aspect-square object-cover rounded-lg" />
                          ))}
                        </div>
                      </div>
                    )}
                    {selected.admin_comment && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm">
                        <p className="font-medium text-red-800">Commentaire admin :</p>
                        <p className="text-red-700">{selected.admin_comment}</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
