import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, ClipboardList, CheckCircle, RefreshCw, AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { useCleaningInterventions, type CleaningIntervention } from "@/hooks/useCleaningInterventions";
import { useServiceProviders } from "@/hooks/useServiceProviders";
import { useProperties } from "@/hooks/useProperties";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; color: string }> = {
  scheduled: { label: "Planifiée", variant: "outline", color: "text-blue-600" },
  in_progress: { label: "En cours", variant: "secondary", color: "text-amber-600" },
  completed: { label: "En attente validation", variant: "secondary", color: "text-purple-600" },
  validated: { label: "Validée ✅", variant: "default", color: "text-emerald-600" },
  refused: { label: "Refusée ❌", variant: "destructive", color: "text-red-600" },
  redo: { label: "À refaire 🔁", variant: "destructive", color: "text-orange-600" },
  incident: { label: "Incident 🚨", variant: "destructive", color: "text-red-600" },
};

const missionTypes = [
  { value: 'cleaning', label: '🧹 Ménage' },
  { value: 'checkin', label: '🔑 Check-in' },
  { value: 'checkout', label: '🚪 Check-out' },
  { value: 'maintenance', label: '🔧 Intervention' },
];

const InterventionsPage = () => {
  const { interventions, isLoading, createIntervention, updateStatus, deleteIntervention } = useCleaningInterventions('concierge');
  const { providers } = useServiceProviders();
  const { properties } = useProperties();
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<CleaningIntervention | null>(null);
  const [creating, setCreating] = useState(false);
  const [adminComment, setAdminComment] = useState('');
  const [internalScore, setInternalScore] = useState('');
  const [form, setForm] = useState({
    property_id: '', service_provider_id: '', scheduled_date: '', type: 'cleaning',
    mission_type: 'cleaning', notes: '', mission_amount: '',
    scheduled_start_time: '', scheduled_end_time: '',
  });

  const handleCreate = async () => {
    if (!form.property_id || !form.service_provider_id || !form.scheduled_date) return;
    setCreating(true);
    const ok = await createIntervention({
      property_id: form.property_id,
      service_provider_id: form.service_provider_id,
      scheduled_date: form.scheduled_date,
      type: form.type,
      notes: form.notes,
    });
    setCreating(false);
    if (ok) {
      setCreateOpen(false);
      setForm({ property_id: '', service_provider_id: '', scheduled_date: '', type: 'cleaning', mission_type: 'cleaning', notes: '', mission_amount: '', scheduled_start_time: '', scheduled_end_time: '' });
    }
  };

  const handleValidate = async (id: string) => {
    // Update with score
    await updateStatus(id, 'validated', adminComment || undefined);
    setSelected(null);
    setAdminComment('');
    setInternalScore('');
  };

  const handleRefuse = async (id: string) => {
    if (!adminComment) return; // comment required for refusal
    await updateStatus(id, 'refused', adminComment);
    setSelected(null);
    setAdminComment('');
  };

  const pending = interventions.filter(i => i.status === 'completed');
  const active = interventions.filter(i => ['scheduled', 'in_progress', 'redo'].includes(i.status));
  const history = interventions.filter(i => ['validated', 'refused', 'incident'].includes(i.status));

  return (
    <div className="space-y-6 max-w-6xl">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Interventions</h1>
            <p className="text-muted-foreground mt-1">Planifiez et validez les missions</p>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                <Plus className="w-4 h-4 mr-2" /> Planifier
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nouvelle mission</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Bien *</Label>
                  <Select value={form.property_id} onValueChange={v => setForm(p => ({ ...p, property_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Choisir un bien" /></SelectTrigger>
                    <SelectContent>
                      {properties.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Prestataire *</Label>
                  <Select value={form.service_provider_id} onValueChange={v => setForm(p => ({ ...p, service_provider_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
                    <SelectContent>
                      {providers.filter(p => p.status === 'active').map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.first_name} {p.last_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Date *</Label>
                    <Input type="date" value={form.scheduled_date} onChange={e => setForm(p => ({ ...p, scheduled_date: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Type mission</Label>
                    <Select value={form.mission_type} onValueChange={v => setForm(p => ({ ...p, mission_type: v, type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {missionTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Montant mission (€)</Label>
                  <Input type="number" min={0} value={form.mission_amount} onChange={e => setForm(p => ({ ...p, mission_amount: e.target.value }))} placeholder="0" />
                </div>
                <div>
                  <Label>Instructions</Label>
                  <Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Instructions pour le prestataire..." />
                </div>
                <Button onClick={handleCreate} disabled={creating} className="w-full">
                  {creating && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Planifier la mission
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </motion.div>

      {/* Pending validation */}
      {pending.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            En attente de validation ({pending.length})
          </h2>
          <div className="space-y-3">
            {pending.map(i => (
              <Card key={i.id} className="border-amber-200 bg-amber-50/50 cursor-pointer" onClick={() => { setSelected(i); setAdminComment(''); setInternalScore(''); }}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-semibold">{i.property?.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(i.scheduled_date).toLocaleDateString('fr-FR')} — {i.service_provider?.first_name} {i.service_provider?.last_name}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">📸 {i.photos?.length || 0} photos</span>
                  </div>
                  {i.photos && i.photos.length > 0 && (
                    <div className="grid grid-cols-4 gap-2 mb-3">
                      {i.photos.slice(0, 8).map(p => (
                        <img key={p.id} src={p.url} alt="" className="w-full aspect-square object-cover rounded-lg" />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Validation dialog */}
      <Dialog open={!!selected && selected.status === 'completed'} onOpenChange={o => { if (!o) setSelected(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
          {selected && (
            <>
              <DialogHeader><DialogTitle>Valider : {selected.property?.name}</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="text-sm grid grid-cols-2 gap-2">
                  <div>📅 {new Date(selected.scheduled_date).toLocaleDateString('fr-FR')}</div>
                  <div>👤 {selected.service_provider?.first_name} {selected.service_provider?.last_name}</div>
                </div>

                {selected.photos && selected.photos.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {selected.photos.map(p => (
                      <div key={p.id} className="relative aspect-square rounded-lg overflow-hidden">
                        <img src={p.url} alt="" className="w-full h-full object-cover" />
                        {p.type === 'incident' && (
                          <span className="absolute top-1 right-1 bg-destructive text-destructive-foreground text-[10px] px-1.5 py-0.5 rounded-full">🚨</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div>
                  <Label>Note interne (0-10)</Label>
                  <Input type="number" min={0} max={10} value={internalScore} onChange={e => setInternalScore(e.target.value)} placeholder="Note sur 10" />
                </div>

                <div>
                  <Label>Commentaire admin</Label>
                  <Textarea value={adminComment} onChange={e => setAdminComment(e.target.value)} placeholder="Commentaire (obligatoire si refus)..." />
                </div>

                <div className="flex gap-2">
                  <Button onClick={() => handleValidate(selected.id)} className="flex-1 bg-emerald-600 hover:bg-emerald-700">
                    <CheckCircle className="w-4 h-4 mr-1" /> Valider
                  </Button>
                  <Button variant="outline" onClick={() => updateStatus(selected.id, 'redo', adminComment || 'À refaire')} className="flex-1">
                    <RefreshCw className="w-4 h-4 mr-1" /> À refaire
                  </Button>
                  <Button variant="destructive" onClick={() => handleRefuse(selected.id)} disabled={!adminComment} className="flex-1">
                    <AlertTriangle className="w-4 h-4 mr-1" /> Refuser
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Active */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Planifiées ({active.length})</h2>
        {active.length === 0 && !isLoading ? (
          <Card className="text-center py-8">
            <CardContent>
              <ClipboardList className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">Aucune mission planifiée</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {active.map(i => (
              <Card key={i.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{i.property?.name}</p>
                    <p className="text-sm text-muted-foreground">
                      📅 {new Date(i.scheduled_date).toLocaleDateString('fr-FR')} — 👤 {i.service_provider?.first_name} {i.service_provider?.last_name}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={statusConfig[i.status]?.variant || "outline"}>
                      {statusConfig[i.status]?.label || i.status}
                    </Badge>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteIntervention(i.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* History */}
      {history.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Historique</h2>
          <div className="space-y-2">
            {history.slice(0, 20).map(i => (
              <Card key={i.id} className="opacity-80">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{i.property?.name}</p>
                    <p className="text-sm text-muted-foreground">{new Date(i.scheduled_date).toLocaleDateString('fr-FR')}</p>
                  </div>
                  <Badge variant={statusConfig[i.status]?.variant || "outline"}>
                    {statusConfig[i.status]?.label || i.status}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default InterventionsPage;
