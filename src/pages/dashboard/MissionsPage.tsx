import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Plus, Send, Eye, CheckCircle, XCircle, Loader2, Star, Ban } from "lucide-react";
import { motion } from "framer-motion";
import { useNewMissions, type CreateMissionData, type NewMission } from "@/hooks/useNewMissions";
import { useProperties } from "@/hooks/useProperties";
import { useServiceProviders } from "@/hooks/useServiceProviders";

const statusConfig: Record<string, { label: string; color: string }> = {
  draft: { label: "Brouillon", color: "bg-muted text-muted-foreground" },
  open: { label: "Ouverte", color: "bg-blue-100 text-blue-800" },
  assigned: { label: "Assignée", color: "bg-amber-100 text-amber-800" },
  confirmed: { label: "Confirmée", color: "bg-emerald-100 text-emerald-800" },
  done: { label: "Terminée", color: "bg-purple-100 text-purple-800" },
  approved: { label: "Approuvée ✅", color: "bg-green-100 text-green-800" },
  canceled: { label: "Annulée", color: "bg-red-100 text-red-800" },
};

const missionTypeLabels: Record<string, string> = {
  cleaning: "🧹 Ménage",
  checkin: "🔑 Check-in",
  checkout: "🚪 Check-out",
  maintenance: "🔧 Maintenance",
};

export default function MissionsPage() {
  const { missions, isLoading, createMission, publishMission, cancelMission, acceptApplication, rejectApplication, approveMission } = useNewMissions('concierge');
  const { properties } = useProperties();
  const { providers } = useServiceProviders();
  const [createOpen, setCreateOpen] = useState(false);
  const [detailMission, setDetailMission] = useState<NewMission | null>(null);
  const [creating, setCreating] = useState(false);
  const [assignMode, setAssignMode] = useState<'open' | 'direct'>('open');
  const [form, setForm] = useState<CreateMissionData>({
    property_id: '', mission_type: 'cleaning', title: '', instructions: '', start_at: '', payout_amount: 0,
  });

  const handleCreate = async () => {
    if (!form.property_id || !form.title || !form.start_at) return;
    if (assignMode === 'direct' && !form.selected_provider_id) return;
    setCreating(true);
    await createMission({
      ...form,
      is_open_to_all: assignMode === 'open',
      selected_provider_id: assignMode === 'open' ? null : form.selected_provider_id,
    });
    setCreating(false);
    setCreateOpen(false);
    setAssignMode('open');
    setForm({ property_id: '', mission_type: 'cleaning', title: '', instructions: '', start_at: '', payout_amount: 0, selected_provider_id: null });
  };

  const activeMissions = useMemo(() => missions.filter(m => !['canceled', 'approved'].includes(m.status)), [missions]);
  const archivedMissions = useMemo(() => missions.filter(m => ['canceled', 'approved'].includes(m.status)), [missions]);

  // Sync detail view with realtime data
  const currentDetail = detailMission ? missions.find(m => m.id === detailMission.id) || detailMission : null;

  return (
    <div className="space-y-6 max-w-6xl">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Missions</h1>
            <p className="text-muted-foreground mt-1">Publiez des missions — vos prestataires postulent</p>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
                <Plus className="w-4 h-4 mr-2" /> Nouvelle mission
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Créer une mission</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Logement *</Label>
                  <Select value={form.property_id} onValueChange={v => setForm(p => ({ ...p, property_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Choisir un logement" /></SelectTrigger>
                    <SelectContent>
                      {properties.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Type</Label>
                  <Select value={form.mission_type} onValueChange={v => setForm(p => ({ ...p, mission_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cleaning">Ménage</SelectItem>
                      <SelectItem value="checkin">Check-in</SelectItem>
                      <SelectItem value="checkout">Check-out</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Titre *</Label>
                  <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Ex: Ménage après départ" />
                </div>
                <div>
                  <Label>Date & heure *</Label>
                  <Input type="datetime-local" value={form.start_at} onChange={e => setForm(p => ({ ...p, start_at: e.target.value }))} />
                </div>
                <div>
                  <Label>Montant prestataire (€)</Label>
                  <Input type="number" value={form.payout_amount} onChange={e => setForm(p => ({ ...p, payout_amount: parseFloat(e.target.value) || 0 }))} />
                </div>
                <div>
                  <Label>Instructions</Label>
                  <Textarea value={form.instructions} onChange={e => setForm(p => ({ ...p, instructions: e.target.value }))} placeholder="Détails pour le prestataire..." />
                </div>

                {/* Assignment mode toggle */}
                <div className="p-3 border rounded-lg space-y-3">
                  <Label className="font-semibold">Choisir un prestataire maintenant ?</Label>
                  <RadioGroup value={assignMode} onValueChange={(v) => { setAssignMode(v as 'open' | 'direct'); if (v === 'open') setForm(p => ({ ...p, selected_provider_id: null })); }}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="open" id="mode-open" />
                      <Label htmlFor="mode-open" className="font-normal cursor-pointer">Non — mission ouverte (les prestataires postulent)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="direct" id="mode-direct" />
                      <Label htmlFor="mode-direct" className="font-normal cursor-pointer">Oui — assigner directement</Label>
                    </div>
                  </RadioGroup>

                  {assignMode === 'direct' && (
                    <div>
                      <Label>Prestataire *</Label>
                      <Select value={form.selected_provider_id || ''} onValueChange={v => setForm(p => ({ ...p, selected_provider_id: v }))}>
                        <SelectTrigger><SelectValue placeholder="Choisir un prestataire" /></SelectTrigger>
                        <SelectContent>
                          {providers.filter(p => p.status === 'active').map(p => (
                            <SelectItem key={p.id} value={p.id}>{p.first_name} {p.last_name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <Button onClick={handleCreate} disabled={creating} className="w-full">
                  {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                  {assignMode === 'open' ? 'Créer & publier la mission' : 'Créer & assigner'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </motion.div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : (
        <Tabs defaultValue="active">
          <TabsList>
            <TabsTrigger value="active">Actives ({activeMissions.length})</TabsTrigger>
            <TabsTrigger value="archived">Archivées ({archivedMissions.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-3 mt-4">
            {activeMissions.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent><p className="text-muted-foreground">Aucune mission active. Créez-en une !</p></CardContent>
              </Card>
            ) : activeMissions.map((m, i) => (
              <MissionCard key={m.id} mission={m} index={i} onView={() => setDetailMission(m)} onPublish={publishMission} onCancel={cancelMission} onApprove={approveMission} />
            ))}
          </TabsContent>

          <TabsContent value="archived" className="space-y-3 mt-4">
            {archivedMissions.map((m, i) => (
              <MissionCard key={m.id} mission={m} index={i} onView={() => setDetailMission(m)} onPublish={publishMission} onCancel={cancelMission} onApprove={approveMission} />
            ))}
          </TabsContent>
        </Tabs>
      )}

      {/* Detail dialog */}
      <Dialog open={!!detailMission} onOpenChange={open => { if (!open) setDetailMission(null); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-auto">
          {currentDetail && (
            <MissionDetail mission={currentDetail} onAccept={acceptApplication} onReject={rejectApplication} onPublish={publishMission} onCancel={cancelMission} onApprove={approveMission} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MissionCard({ mission: m, index, onView, onPublish, onCancel, onApprove }: {
  mission: NewMission; index: number;
  onView: () => void; onPublish: (id: string) => void; onCancel: (id: string) => void; onApprove: (id: string) => void;
}) {
  const cfg = statusConfig[m.status] || statusConfig.draft;
  const appCount = m.applications?.filter(a => a.status === 'pending').length || 0;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03 }}>
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold truncate">{m.title}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.color}`}>{cfg.label}</span>
                {appCount > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500 text-white font-medium">
                    {appCount} candidature{appCount > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span>{m.property?.name}</span>
                <span>{missionTypeLabels[m.mission_type] || m.mission_type}</span>
                <span>📅 {new Date(m.start_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                {m.payout_amount > 0 && <span>💰 {m.payout_amount}€</span>}
                {m.selected_provider && <span>👤 {m.selected_provider.first_name} {m.selected_provider.last_name}</span>}
              </div>
            </div>
            <div className="flex items-center gap-2 ml-4">
              {m.status === 'draft' && (
                <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); onPublish(m.id); }}>
                  <Send className="w-3 h-3 mr-1" /> Publier
                </Button>
              )}
              {m.status === 'done' && (
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={(e) => { e.stopPropagation(); onApprove(m.id); }}>
                  <CheckCircle className="w-3 h-3 mr-1" /> Approuver
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={onView}>
                <Eye className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function MissionDetail({ mission: m, onAccept, onReject, onPublish, onCancel, onApprove }: {
  mission: NewMission;
  onAccept: (missionId: string, appId: string, providerId: string) => void;
  onReject: (appId: string) => void;
  onPublish: (id: string) => void;
  onCancel: (id: string) => void;
  onApprove: (id: string) => void;
}) {
  const cfg = statusConfig[m.status] || statusConfig.draft;
  const pendingApps = m.applications?.filter(a => a.status === 'pending') || [];
  const allApps = m.applications || [];

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          {m.title}
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.color}`}>{cfg.label}</span>
        </DialogTitle>
      </DialogHeader>

      <div className="space-y-5">
        {/* Info */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><span className="text-muted-foreground">Logement :</span> {m.property?.name}</div>
          <div><span className="text-muted-foreground">Type :</span> {missionTypeLabels[m.mission_type]}</div>
          <div><span className="text-muted-foreground">Date :</span> {new Date(m.start_at).toLocaleString('fr-FR')}</div>
          <div><span className="text-muted-foreground">Montant :</span> {m.payout_amount}€</div>
        </div>

        {m.instructions && (
          <div className="p-3 bg-muted/50 rounded-lg text-sm">
            <p className="font-medium mb-1">Instructions :</p>
            <p className="whitespace-pre-wrap">{m.instructions}</p>
          </div>
        )}

        {m.selected_provider && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm">
            <p className="font-medium text-emerald-800">Prestataire assigné : {m.selected_provider.first_name} {m.selected_provider.last_name}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {m.status === 'draft' && (
            <Button onClick={() => onPublish(m.id)} className="flex-1">
              <Send className="w-4 h-4 mr-2" /> Publier la mission
            </Button>
          )}
          {m.status === 'done' && (
            <Button onClick={() => onApprove(m.id)} className="flex-1 bg-emerald-600 hover:bg-emerald-700">
              <CheckCircle className="w-4 h-4 mr-2" /> Approuver & créer paiement
            </Button>
          )}
          {!['canceled', 'approved'].includes(m.status) && (
            <Button variant="outline" onClick={() => onCancel(m.id)} className="text-destructive">
              <Ban className="w-4 h-4 mr-2" /> Annuler
            </Button>
          )}
        </div>

        {/* Applications */}
        {allApps.length > 0 && (
          <div>
            <h3 className="font-semibold mb-3">Candidatures ({allApps.length})</h3>
            <div className="space-y-3">
              {allApps.map(app => (
                <div key={app.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{app.provider?.first_name} {app.provider?.last_name}</span>
                      {app.provider?.score_global != null && (
                        <span className="flex items-center gap-0.5 text-xs text-amber-600">
                          <Star className="w-3 h-3 fill-amber-500" /> {app.provider.score_global}
                        </span>
                      )}
                      <Badge variant={app.status === 'accepted' ? 'default' : app.status === 'rejected' ? 'destructive' : 'secondary'}>
                        {app.status === 'pending' ? 'En attente' : app.status === 'accepted' ? 'Acceptée' : 'Refusée'}
                      </Badge>
                    </div>
                    {app.message && <p className="text-sm text-muted-foreground mt-1">{app.message}</p>}
                  </div>
                  {app.status === 'pending' && m.status === 'open' && (
                    <div className="flex gap-2 ml-3">
                      <Button size="sm" onClick={() => onAccept(m.id, app.id, app.provider_id)}>
                        <CheckCircle className="w-3 h-3 mr-1" /> Accepter
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => onReject(app.id)}>
                        <XCircle className="w-3 h-3 mr-1" /> Refuser
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {m.status === 'open' && pendingApps.length === 0 && (
          <div className="text-center py-6 text-muted-foreground text-sm">
            <p>En attente de candidatures...</p>
            <p className="text-xs mt-1">Les prestataires actifs verront cette mission dans leur espace.</p>
          </div>
        )}
      </div>
    </>
  );
}
