import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, ClipboardList, CheckCircle, RefreshCw, AlertTriangle, Loader2, Trash2, DollarSign } from "lucide-react";
import { motion } from "framer-motion";
import { useCleaningInterventions, type CleaningIntervention } from "@/hooks/useCleaningInterventions";
import { useServiceProviders } from "@/hooks/useServiceProviders";
import { useProperties } from "@/hooks/useProperties";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; color: string }> = {
  scheduled: { label: "Assignée", variant: "outline", color: "text-blue-600" },
  in_progress: { label: "En cours", variant: "secondary", color: "text-amber-600" },
  completed: { label: "En attente validation", variant: "secondary", color: "text-purple-600" },
  validated: { label: "Validée ✅", variant: "default", color: "text-emerald-600" },
  refused: { label: "Refusée ❌", variant: "destructive", color: "text-red-600" },
  redo: { label: "À refaire 🔁", variant: "destructive", color: "text-orange-600" },
};

const missionTypes = [
  { value: 'cleaning', label: '🧹 Ménage' },
  { value: 'checkin', label: '🔑 Check-in' },
  { value: 'checkout', label: '🚪 Check-out' },
  { value: 'maintenance', label: '🔧 Intervention' },
];

const InterventionsPage = () => {
  const { interventions, isLoading, createIntervention, updateStatus, markPaymentDone, deleteIntervention } = useCleaningInterventions('concierge');
  const { providers } = useServiceProviders();
  const { properties } = useProperties();
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<CleaningIntervention | null>(null);
  const [creating, setCreating] = useState(false);
  const [adminComment, setAdminComment] = useState('');
  const [internalScore, setInternalScore] = useState('');
  const [form, setForm] = useState({
    property_id: '', service_provider_id: '', scheduled_date: '',
    mission_type: 'cleaning', notes: '', mission_amount: '',
    concierge_notes: '',
  });

  const handleCreate = async () => {
    if (!form.property_id || !form.service_provider_id || !form.scheduled_date) return;
    setCreating(true);
    const ok = await createIntervention({
      property_id: form.property_id,
      service_provider_id: form.service_provider_id,
      scheduled_date: form.scheduled_date,
      type: form.mission_type,
      mission_type: form.mission_type,
      notes: form.notes,
      mission_amount: form.mission_amount ? parseFloat(form.mission_amount) : 0,
      concierge_notes: form.concierge_notes,
    });
    setCreating(false);
    if (ok) {
      setCreateOpen(false);
      setForm({ property_id: '', service_provider_id: '', scheduled_date: '', mission_type: 'cleaning', notes: '', mission_amount: '', concierge_notes: '' });
    }
  };

  const handleValidate = async (id: string) => {
    const score = internalScore ? parseFloat(internalScore) : undefined;
    await updateStatus(id, 'validated', adminComment || undefined, score);
    setSelected(null);
    setAdminComment('');
    setInternalScore('');
  };

  const handleRefuse = async (id: string) => {
    if (!adminComment) return;
    const score = internalScore ? parseFloat(internalScore) : undefined;
    await updateStatus(id, 'refused', adminComment, score);
    setSelected(null);
    setAdminComment('');
    setInternalScore('');
  };

  const pending = interventions.filter(i => i.status === 'completed');
  const active = interventions.filter(i => ['scheduled', 'in_progress', 'redo'].includes(i.status));
  const validated = interventions.filter(i => i.status === 'validated');
  const history = interventions.filter(i => ['validated', 'refused'].includes(i.status));

  // Payment KPIs
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const monthlyValidated = validated.filter(i => {
    const d = new Date(i.scheduled_date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });
  const totalToPay = monthlyValidated.filter(m => !m.payment_done).reduce((s, m) => s + (m.mission_amount || 0), 0);
  const totalPaid = monthlyValidated.filter(m => m.payment_done).reduce((s, m) => s + (m.mission_amount || 0), 0);

  return (
    <div className="space-y-6 max-w-6xl">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Interventions</h1>
            <p className="text-muted-foreground mt-1">Planifiez, validez et gérez les paiements</p>
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
                        <SelectItem key={p.id} value={p.id}>
                          {p.first_name} {p.last_name} {p.score_global > 0 && `⭐ ${p.score_global}`}
                        </SelectItem>
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
                    <Select value={form.mission_type} onValueChange={v => setForm(p => ({ ...p, mission_type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {missionTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Montant mission (€) *</Label>
                  <Input type="number" min={0} value={form.mission_amount} onChange={e => setForm(p => ({ ...p, mission_amount: e.target.value }))} placeholder="0" />
                </div>
                <div>
                  <Label>Instructions pour le prestataire</Label>
                  <Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Consignes spécifiques..." />
                </div>
                <div>
                  <Label>Notes internes (non visibles par le prestataire)</Label>
                  <Textarea value={form.concierge_notes} onChange={e => setForm(p => ({ ...p, concierge_notes: e.target.value }))} placeholder="Notes internes..." />
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

      {/* Payment KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-emerald-600">{totalPaid}€</p>
              <p className="text-xs text-muted-foreground">Payé ce mois</p>
            </div>
          </CardContent>
        </Card>
        <Card className={totalToPay > 0 ? "border-amber-200" : ""}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-amber-600">{totalToPay}€</p>
              <p className="text-xs text-muted-foreground">À payer ce mois</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-lg font-bold">{monthlyValidated.length}</p>
              <p className="text-xs text-muted-foreground">Validées ce mois</p>
            </div>
          </CardContent>
        </Card>
      </div>

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
                        {i.service_provider?.score_global != null && ` ⭐ ${i.service_provider.score_global}`}
                      </p>
                      {i.provider_comment && <p className="text-xs text-muted-foreground mt-1">💬 {i.provider_comment}</p>}
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-muted-foreground">📸 {i.photos?.length || 0} photos</span>
                      <p className="text-sm font-semibold">{i.mission_amount}€</p>
                    </div>
                  </div>
                  {i.photos && i.photos.length > 0 && (
                    <div className="grid grid-cols-4 gap-2">
                      {i.photos.slice(0, 8).map(p => (
                        <div key={p.id} className="relative aspect-square rounded-lg overflow-hidden">
                          <img src={p.url} alt="" className="w-full h-full object-cover" />
                          {p.type === 'incident' && (
                            <span className="absolute top-1 right-1 bg-destructive text-destructive-foreground text-[10px] px-1.5 py-0.5 rounded-full">🚨</span>
                          )}
                        </div>
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
                  <div>👤 {selected.service_provider?.first_name} {selected.service_provider?.last_name} {selected.service_provider?.score_global != null && `⭐ ${selected.service_provider.score_global}`}</div>
                  <div>💰 {selected.mission_amount}€</div>
                  <div>📸 {selected.photos?.length || 0} photos</div>
                </div>

                {selected.provider_comment && (
                  <div className="p-3 bg-muted/50 rounded-lg text-sm">
                    <p className="font-medium mb-1">Commentaire prestataire :</p>
                    <p>{selected.provider_comment}</p>
                  </div>
                )}

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
                  <Button variant="outline" onClick={() => { updateStatus(selected.id, 'redo', adminComment || 'À refaire'); setSelected(null); }} className="flex-1">
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
        <h2 className="text-lg font-semibold mb-3">Planifiées & en cours ({active.length})</h2>
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
              <Card key={i.id} className={i.status === 'in_progress' ? 'border-blue-200 bg-blue-50/30' : ''}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{i.property?.name}</p>
                    <p className="text-sm text-muted-foreground">
                      📅 {new Date(i.scheduled_date).toLocaleDateString('fr-FR')} — 👤 {i.service_provider?.first_name} {i.service_provider?.last_name}
                      {i.mission_amount > 0 && ` — 💰 ${i.mission_amount}€`}
                    </p>
                    {i.status === 'in_progress' && i.actual_start_time && (
                      <p className="text-xs text-blue-600 mt-0.5">
                        🕐 Démarré à {new Date(i.actual_start_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={statusConfig[i.status]?.variant || "outline"}>
                      {statusConfig[i.status]?.label || i.status}
                    </Badge>
                    {['scheduled', 'in_progress', 'redo'].includes(i.status) && (
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={(e) => { e.stopPropagation(); if (confirm('Supprimer cette intervention ?')) deleteIntervention(i.id); }}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Validated - Payment management */}
      {validated.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Paiements — Missions validées</h2>
          <div className="space-y-2">
            {validated.slice(0, 30).map(i => (
              <Card key={i.id} className={i.payment_done ? "opacity-70" : ""}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{i.property?.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(i.scheduled_date).toLocaleDateString('fr-FR')} — {i.service_provider?.first_name} {i.service_provider?.last_name}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">{i.mission_amount}€</span>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={i.payment_done}
                        onCheckedChange={(checked) => markPaymentDone(i.id, !!checked)}
                      />
                      <span className="text-xs text-muted-foreground">
                        {i.payment_done ? 'Payé ✅' : 'Marquer payé'}
                      </span>
                    </label>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* History */}
      {history.filter(i => i.status === 'refused').length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Refusées</h2>
          <div className="space-y-2">
            {history.filter(i => i.status === 'refused').slice(0, 10).map(i => (
              <Card key={i.id} className="opacity-80">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{i.property?.name}</p>
                    <p className="text-sm text-muted-foreground">{new Date(i.scheduled_date).toLocaleDateString('fr-FR')}</p>
                    {i.admin_comment && <p className="text-xs text-destructive mt-0.5">💬 {i.admin_comment}</p>}
                  </div>
                  <Badge variant="destructive">Refusée</Badge>
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
