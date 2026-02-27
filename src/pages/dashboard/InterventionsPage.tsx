import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  completed: { label: "Terminée - En attente", variant: "secondary", color: "text-purple-600" },
  validated: { label: "Validée ✅", variant: "default", color: "text-emerald-600" },
  redo: { label: "À refaire 🔁", variant: "destructive", color: "text-orange-600" },
  incident: { label: "Incident 🚨", variant: "destructive", color: "text-red-600" },
};

const InterventionsPage = () => {
  const { interventions, isLoading, createIntervention, updateStatus, deleteIntervention } = useCleaningInterventions('concierge');
  const { providers } = useServiceProviders();
  const { properties } = useProperties();
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<CleaningIntervention | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    property_id: '', service_provider_id: '', scheduled_date: '', type: 'cleaning', notes: '',
  });

  const handleCreate = async () => {
    if (!form.property_id || !form.service_provider_id || !form.scheduled_date) return;
    setCreating(true);
    const ok = await createIntervention(form);
    setCreating(false);
    if (ok) {
      setCreateOpen(false);
      setForm({ property_id: '', service_provider_id: '', scheduled_date: '', type: 'cleaning', notes: '' });
    }
  };

  const pending = interventions.filter(i => i.status === 'completed');
  const active = interventions.filter(i => ['scheduled', 'in_progress', 'redo'].includes(i.status));
  const history = interventions.filter(i => ['validated', 'incident'].includes(i.status));

  return (
    <div className="space-y-6 max-w-6xl">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Interventions</h1>
            <p className="text-muted-foreground mt-1">Planifiez et suivez les interventions ménage</p>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                <Plus className="w-4 h-4 mr-2" /> Planifier
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nouvelle intervention</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Bien *</Label>
                  <Select value={form.property_id} onValueChange={v => setForm(p => ({ ...p, property_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Choisir un bien" /></SelectTrigger>
                    <SelectContent>
                      {properties.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Prestataire *</Label>
                  <Select value={form.service_provider_id} onValueChange={v => setForm(p => ({ ...p, service_provider_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Choisir un prestataire" /></SelectTrigger>
                    <SelectContent>
                      {providers.filter(p => p.status === 'active').map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.first_name} {p.last_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Date *</Label>
                  <Input type="date" value={form.scheduled_date} onChange={e => setForm(p => ({ ...p, scheduled_date: e.target.value }))} />
                </div>
                <div>
                  <Label>Type</Label>
                  <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cleaning">🧹 Ménage</SelectItem>
                      <SelectItem value="maintenance">🔧 Maintenance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Instructions</Label>
                  <Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Instructions pour le prestataire..." />
                </div>
                <Button onClick={handleCreate} disabled={creating} className="w-full">
                  {creating && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Planifier l'intervention
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
              <Card key={i.id} className="border-amber-200 bg-amber-50/50">
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
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => updateStatus(i.id, 'validated')} className="bg-emerald-600 hover:bg-emerald-700">
                      <CheckCircle className="w-4 h-4 mr-1" /> Valider
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => updateStatus(i.id, 'redo', 'Ménage à refaire - non conforme')}>
                      <RefreshCw className="w-4 h-4 mr-1" /> À refaire
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => updateStatus(i.id, 'incident', 'Incident signalé')}>
                      <AlertTriangle className="w-4 h-4 mr-1" /> Incident
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Active */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Planifiées ({active.length})</h2>
        {active.length === 0 && !isLoading ? (
          <Card className="text-center py-8">
            <CardContent>
              <ClipboardList className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">Aucune intervention planifiée</p>
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
              <Card key={i.id} className="opacity-80" onClick={() => setSelected(i)}>
                <CardContent className="p-4 flex items-center justify-between cursor-pointer hover:opacity-100">
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

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={o => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          {selected && (
            <>
              <DialogHeader><DialogTitle>{selected.property?.name}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="text-sm grid grid-cols-2 gap-2">
                  <div>📅 {new Date(selected.scheduled_date).toLocaleDateString('fr-FR')}</div>
                  <div>👤 {selected.service_provider?.first_name} {selected.service_provider?.last_name}</div>
                  <div>Statut : <Badge variant={statusConfig[selected.status]?.variant}>{statusConfig[selected.status]?.label}</Badge></div>
                </div>
                {selected.photos && selected.photos.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {selected.photos.map(p => (
                      <div key={p.id} className="relative aspect-square rounded-lg overflow-hidden">
                        <img src={p.url} alt="" className="w-full h-full object-cover" />
                        {p.type === 'incident' && (
                          <span className="absolute top-1 right-1 bg-destructive text-destructive-foreground text-[10px] px-1.5 py-0.5 rounded-full">Incident</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InterventionsPage;
