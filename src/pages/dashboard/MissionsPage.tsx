import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { RadioCardGroup } from "@/components/ui/radio-card-group";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Plus, Send, Eye, CheckCircle, XCircle, Loader2, Star, Ban, CalendarIcon, Users, UserCheck, RefreshCw, Trash2, Home, MessageSquare, Phone, Mail } from "lucide-react";
import { motion } from "framer-motion";
import { useNewMissions, type CreateMissionData, type NewMission } from "@/hooks/useNewMissions";
import { useProperties } from "@/hooks/useProperties";
import { useServiceProviders } from "@/hooks/useServiceProviders";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ContextualTip } from "@/components/onboarding/ContextualTip";

const statusConfig: Record<string, { label: string; color: string }> = {
  draft: { label: "Brouillon", color: "bg-muted text-muted-foreground" },
  open: { label: "Ouverte", color: "bg-blue-100 text-blue-800" },
  assigned: { label: "Assignée", color: "bg-amber-100 text-amber-800" },
  confirmed: { label: "Confirmée", color: "bg-emerald-100 text-emerald-800" },
  in_progress: { label: "En cours", color: "bg-cyan-100 text-cyan-800" },
  done: { label: "Terminée", color: "bg-purple-100 text-purple-800" },
  validated: { label: "Validée ✅", color: "bg-green-100 text-green-800" },
  paid: { label: "Payée 💰", color: "bg-emerald-200 text-emerald-900" },
  approved: { label: "Approuvée ✅", color: "bg-green-100 text-green-800" },
  canceled: { label: "Annulée", color: "bg-red-100 text-red-800" },
};

const missionTypeLabels: Record<string, string> = {
  cleaning: "🧹 Ménage",
  checkin: "🔑 Check-in",
  checkout: "🚪 Check-out",
  maintenance: "🔧 Maintenance",
};

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = ["00", "15", "30", "45"];

export default function MissionsPage() {
  const { missions, isLoading, createMission, publishMission, cancelMission, deleteMission, validateMission, markAsPaid, sendMissionEmail, refetch } = useNewMissions('concierge');
  const { properties } = useProperties();
  const { providers } = useServiceProviders();
  const [createOpen, setCreateOpen] = useState(false);
  const [detailMission, setDetailMission] = useState<NewMission | null>(null);
  const [syncOpen, setSyncOpen] = useState(false);
  const [syncPropertyId, setSyncPropertyId] = useState("all");
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    total_events_found: number;
    eligible_count: number;
    created: number;
    updated: number;
    skipped: number;
    ignored: number;
    errors: number;
    errors_list: string[];
    ignored_items: Array<{
      id: string;
      property_name: string;
      start_date: string;
      end_date: string;
      event_type: string | null;
      status: string;
      platform: string;
      reason: string;
    }>;
    window: { start: string; end: string };
  } | null>(null);

  const activeMissions = useMemo(() => missions.filter(m => !['canceled', 'paid'].includes(m.status)), [missions]);
  const archivedMissions = useMemo(() => missions.filter(m => ['canceled', 'paid'].includes(m.status)), [missions]);
  const currentDetail = detailMission ? missions.find(m => m.id === detailMission.id) || detailMission : null;

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const body: any = { window_days: 31 };
      if (syncPropertyId !== "all") body.property_id = syncPropertyId;
      const { data, error } = await supabase.functions.invoke("sync-cleaning-missions", { body });
      if (error) throw error;
      setSyncResult(data);
      toast.success(`${data.created} mission(s) créée(s), ${data.updated} mise(s) à jour`);
      if (refetch) refetch();
    } catch (err: any) {
      toast.error(err.message || "Erreur de synchronisation");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <ContextualTip tipId="missions-intro" title="💡 Astuce">
        Les missions sont envoyées aux prestataires. Un prestataire peut accepter ou refuser la mission directement depuis son espace.
      </ContextualTip>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Missions</h1>
            <p className="text-muted-foreground mt-1">Publiez des missions — vos prestataires les prennent instantanément</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Test Email Button - DEV */}
            <TestEmailButton providers={providers.filter(p => p.status === 'active')} />
            
            <Dialog open={syncOpen} onOpenChange={(v) => { setSyncOpen(v); if (!v) setSyncResult(null); }}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <RefreshCw className="w-4 h-4" /> Sync ménage (1 mois)
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Synchroniser les missions ménage</DialogTitle></DialogHeader>
                <p className="text-sm text-muted-foreground">
                  Scanne les événements calendrier (réservations iCal) des 30 prochains jours
                  et crée une mission ménage pour chaque checkout éligible.
                </p>
                <div className="space-y-3 mt-2">
                  <div>
                    <Label>Logement</Label>
                    <Select value={syncPropertyId} onValueChange={setSyncPropertyId}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous les logements</SelectItem>
                        {properties.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleSync} disabled={syncing} className="w-full gap-2">
                    {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    Lancer la synchronisation
                  </Button>
                  {syncResult && (
                    <div className="p-3 rounded-lg border bg-muted/50 space-y-2 text-sm">
                      <p className="font-medium">📊 Rapport de synchronisation</p>
                      <p className="text-xs text-muted-foreground">
                        Fenêtre : {syncResult.window.start} → {syncResult.window.end}
                      </p>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                        <span>📅 Événements trouvés :</span><span className="font-semibold">{syncResult.total_events_found}</span>
                        <span>✅ Éligibles :</span><span className="font-semibold">{syncResult.eligible_count}</span>
                        <span>🆕 Créées :</span><span className="font-semibold text-green-700">{syncResult.created}</span>
                        <span>🔄 Mises à jour :</span><span className="font-semibold">{syncResult.updated}</span>
                        <span>⏭️ Déjà assignées :</span><span className="font-semibold">{syncResult.skipped}</span>
                        <span>🚫 Non éligibles :</span><span className="font-semibold">{syncResult.ignored}</span>
                        {syncResult.errors > 0 && <><span>❌ Erreurs :</span><span className="font-semibold text-destructive">{syncResult.errors}</span></>}
                      </div>

                      {syncResult.errors_list.length > 0 && (
                        <div className="mt-2">
                          <p className="font-medium text-destructive">Erreurs :</p>
                          <ul className="text-xs space-y-1 mt-1">
                            {syncResult.errors_list.map((e, i) => (
                              <li key={i} className="text-destructive">• {e}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {syncResult.ignored_items.length > 0 && (
                        <div className="mt-2">
                          <p className="font-medium">Détail des ignorés ({syncResult.ignored} total) :</p>
                          <div className="max-h-48 overflow-y-auto mt-1 space-y-1">
                            {syncResult.ignored_items.map((item, i) => (
                              <div key={i} className="text-xs p-2 rounded border bg-background">
                                <span className="font-medium">{item.property_name}</span>
                                {" "}{item.start_date} → {item.end_date}
                                {" "}({item.platform})
                                <br />
                                <span className="text-muted-foreground">Raison : {item.reason}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
                  <Plus className="w-4 h-4 mr-2" /> Nouvelle mission
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Créer une mission</DialogTitle></DialogHeader>
                <CreateMissionForm
                  properties={properties}
                  providers={providers.filter(p => p.status === 'active')}
                  onSubmit={async (data) => {
                    await createMission(data);
                    setCreateOpen(false);
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>
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
              <MissionCard key={m.id} mission={m} index={i} onView={() => setDetailMission(m)} onPublish={publishMission} onCancel={cancelMission} onDelete={deleteMission} onValidate={validateMission} onMarkPaid={markAsPaid} onSendEmail={sendMissionEmail} />
            ))}
          </TabsContent>
          <TabsContent value="archived" className="space-y-3 mt-4">
            {archivedMissions.map((m, i) => (
              <MissionCard key={m.id} mission={m} index={i} onView={() => setDetailMission(m)} onPublish={publishMission} onCancel={cancelMission} onDelete={deleteMission} onValidate={validateMission} onMarkPaid={markAsPaid} onSendEmail={sendMissionEmail} />
            ))}
          </TabsContent>
        </Tabs>
      )}

      <Dialog open={!!detailMission} onOpenChange={open => { if (!open) setDetailMission(null); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-auto">
          {currentDetail && (
            <MissionDetail mission={currentDetail} onPublish={publishMission} onCancel={cancelMission} onDelete={async (id) => { await deleteMission(id); setDetailMission(null); }} onValidate={validateMission} onMarkPaid={markAsPaid} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─── Create Mission Form ─── */

interface CreateMissionFormProps {
  properties: Array<{ id: string; name: string }>;
  providers: Array<{ id: string; first_name: string; last_name: string }>;
  onSubmit: (data: CreateMissionData) => Promise<void>;
}

function CreateMissionForm({ properties, providers, onSubmit }: CreateMissionFormProps) {
  const [propertyId, setPropertyId] = useState("");
  const [missionType, setMissionType] = useState("cleaning");
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [date, setDate] = useState<Date | undefined>();
  const [hour, setHour] = useState("10");
  const [minute, setMinute] = useState("00");
  const [payoutAmount, setPayoutAmount] = useState(0);
  const [assignMode, setAssignMode] = useState<"open" | "direct">("open");
  const [selectedProviderId, setSelectedProviderId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState(false);

  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    if (!propertyId) e.property = "Logement requis";
    if (!title.trim()) e.title = "Titre requis";
    if (!date) e.date = "Date requise";
    if (assignMode === "direct" && !selectedProviderId) e.provider = "Prestataire requis";
    return e;
  }, [propertyId, title, date, assignMode, selectedProviderId]);

  const isValid = Object.keys(errors).length === 0;

  const handleSubmit = useCallback(async () => {
    setTouched(true);
    if (!isValid || !date) return;

    const dateObj = new Date(date);
    dateObj.setHours(parseInt(hour), parseInt(minute), 0, 0);

    setSubmitting(true);
    try {
      await onSubmit({
        property_id: propertyId,
        mission_type: missionType,
        title: title.trim(),
        instructions: instructions.trim(),
        start_at: dateObj.toISOString(),
        payout_amount: payoutAmount,
        is_open_to_all: assignMode === "open",
        selected_provider_id: assignMode === "direct" ? selectedProviderId : null,
      });
      toast.success("Mission créée avec succès");
    } catch (err: any) {
      toast.error(err?.message || "Erreur lors de la création de la mission");
    } finally {
      setSubmitting(false);
    }
  }, [isValid, date, hour, minute, propertyId, missionType, title, instructions, payoutAmount, assignMode, selectedProviderId, onSubmit]);

  return (
    <div className="space-y-4">
      {/* Property */}
      <div>
        <Label>Logement *</Label>
        <Select value={propertyId} onValueChange={setPropertyId}>
          <SelectTrigger><SelectValue placeholder="Choisir un logement" /></SelectTrigger>
          <SelectContent>
            {properties.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
        {touched && errors.property && <p className="text-xs text-destructive mt-1">{errors.property}</p>}
      </div>

      {/* Type */}
      <div>
        <Label>Type</Label>
        <Select value={missionType} onValueChange={setMissionType}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="cleaning">Ménage</SelectItem>
            <SelectItem value="checkin">Check-in</SelectItem>
            <SelectItem value="checkout">Check-out</SelectItem>
            <SelectItem value="maintenance">Maintenance</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Title */}
      <div>
        <Label>Titre *</Label>
        <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Ménage après départ" />
        {touched && errors.title && <p className="text-xs text-destructive mt-1">{errors.title}</p>}
      </div>

      {/* Date + Time */}
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-3 items-end">
        <div>
          <Label>Date *</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "d MMMM yyyy", { locale: fr }) : "Choisir une date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
          {touched && errors.date && <p className="text-xs text-destructive mt-1">{errors.date}</p>}
        </div>
        <div>
          <Label>Heure</Label>
          <Select value={hour} onValueChange={setHour}>
            <SelectTrigger className="w-[72px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {HOURS.map(h => <SelectItem key={h} value={h}>{h}h</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Min</Label>
          <Select value={minute} onValueChange={setMinute}>
            <SelectTrigger className="w-[72px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MINUTES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Payout */}
      <div>
        <Label>Montant prestataire (€)</Label>
        <Input type="number" value={payoutAmount} onChange={e => setPayoutAmount(parseFloat(e.target.value) || 0)} />
      </div>

      {/* Instructions */}
      <div>
        <Label>Instructions</Label>
        <Textarea value={instructions} onChange={e => setInstructions(e.target.value)} placeholder="Détails pour le prestataire..." />
      </div>

      {/* Assignment mode */}
      <div className="space-y-2">
        <Label className="font-semibold">Choisir un prestataire maintenant ?</Label>
        <RadioCardGroup
          value={assignMode}
          onValueChange={(v) => {
            setAssignMode(v as "open" | "direct");
            if (v === "open") setSelectedProviderId("");
          }}
          options={[
            {
              value: "open",
              icon: <Users className="w-4 h-4" />,
              title: "Mission ouverte",
              subtitle: "Les prestataires voient la mission et postulent",
            },
            {
              value: "direct",
              icon: <UserCheck className="w-4 h-4" />,
              title: "Assigner directement",
              subtitle: "Choisissez un prestataire maintenant",
            },
          ]}
        />
      </div>

      {assignMode === "direct" && (
        <div>
          <Label>Prestataire *</Label>
          <Select value={selectedProviderId} onValueChange={setSelectedProviderId}>
            <SelectTrigger><SelectValue placeholder="Choisir un prestataire" /></SelectTrigger>
            <SelectContent>
              {providers.map(p => <SelectItem key={p.id} value={p.id}>{p.first_name} {p.last_name}</SelectItem>)}
            </SelectContent>
          </Select>
          {touched && errors.provider && <p className="text-xs text-destructive mt-1">{errors.provider}</p>}
        </div>
      )}

      {/* Submit */}
      <Button onClick={handleSubmit} disabled={submitting || (touched && !isValid)} className="w-full">
        {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
        {assignMode === "open" ? "Créer & publier la mission" : "Créer & assigner"}
      </Button>
    </div>
  );
}

/* ─── Helpers ─── */

function getPropertyPhoto(mission: NewMission): string | null {
  const photos = mission.property?.property_photos;
  if (!photos || photos.length === 0) return null;
  const main = photos.find(p => p.is_main);
  if (main) return main.url;
  const sorted = [...photos].sort((a, b) => (a.order_index ?? 999) - (b.order_index ?? 999));
  return sorted[0]?.url || null;
}

/* ─── Mission Card ─── */

function MissionCard({ mission: m, index, onView, onPublish, onCancel, onDelete, onValidate, onMarkPaid, onSendEmail }: {
  mission: NewMission; index: number;
  onView: () => void; onPublish: (id: string) => void; onCancel: (id: string) => void; onDelete: (id: string) => void; onValidate: (id: string) => void; onMarkPaid: (id: string) => void;
  onSendEmail: (mission: NewMission) => Promise<{ sent: number; failed: number; providers: string[] }>;
}) {
  const [emailConfirmOpen, setEmailConfirmOpen] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [lastEmailSent, setLastEmailSent] = useState<string | null>(null);
  const cfg = statusConfig[m.status] || statusConfig.draft;
  const photoUrl = getPropertyPhoto(m);

  const handleSendEmail = async () => {
    setEmailSending(true);
    try {
      const result = await onSendEmail(m);
      if (result.sent === 0 && result.providers.length === 0) {
        toast.warning('Aucun email prestataire trouvé');
      } else if (result.sent > 0) {
        toast.success(`Mission envoyée à ${result.sent} prestataire(s)`);
        setLastEmailSent(new Date().toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }));
      }
      if (result.failed > 0) {
        toast.error(`${result.failed} email(s) échoué(s) — voir les logs`);
      }
    } catch (err: any) {
      console.error('❌ Send email error:', err);
      toast.error(err.message || "Erreur d'envoi");
    } finally {
      setEmailSending(false);
      setEmailConfirmOpen(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03 }}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={onView}>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            {/* Property thumbnail */}
            <div className="shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden border border-border shadow-sm bg-muted">
              {photoUrl ? (
                <img src={photoUrl} alt={m.property?.name || 'Logement'} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Home className="w-6 h-6 text-muted-foreground/50" />
                </div>
              )}
            </div>

            {/* Center info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="font-semibold truncate">{m.title}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.color}`}>{cfg.label}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                <span>{m.property?.name}</span>
                <span>{missionTypeLabels[m.mission_type] || m.mission_type}</span>
                <span>📅 {new Date(m.start_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                {m.payout_amount > 0 && <span className="font-semibold text-emerald-600">💰 {m.payout_amount}€</span>}
              </div>
              {m.selected_provider && (
                <p className="text-xs text-primary mt-1 font-medium">
                  👤 Assignée à : {m.selected_provider.first_name} {m.selected_provider.last_name}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 ml-auto shrink-0" onClick={e => e.stopPropagation()}>
              
              {m.status === 'draft' && (
                <Button size="sm" variant="outline" onClick={() => onPublish(m.id)}>
                  <Send className="w-3 h-3 mr-1" /> Publier
                </Button>
              )}
              {m.status === 'done' && (
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => onValidate(m.id)}>
                  <CheckCircle className="w-3 h-3 mr-1" /> Valider
                </Button>
              )}
              {m.status === 'validated' && (
                <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => onMarkPaid(m.id)}>
                  💰 Marquer payée
                </Button>
              )}
              {/* Manual email send for open missions */}
              {m.status === 'open' && !m.selected_provider_id && (
                <AlertDialog open={emailConfirmOpen} onOpenChange={setEmailConfirmOpen}>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="outline" className="gap-1.5 text-primary border-primary/30 hover:bg-primary/10" disabled={emailSending}>
                      {emailSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                      {lastEmailSent ? '' : 'Notifier'}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Envoyer la mission par email ?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Cette action enverra un email de notification aux prestataires actifs pour la mission « {m.title} ».
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={emailSending}>Annuler</AlertDialogCancel>
                      <AlertDialogAction onClick={handleSendEmail} disabled={emailSending} className="gap-2">
                        {emailSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        Envoyer
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              {/* Email sent badge */}
              {lastEmailSent && (
                <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                  ✉️ {lastEmailSent}
                </span>
              )}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Supprimer cette mission ?</AlertDialogTitle>
                    <AlertDialogDescription>Cette action est irréversible. La mission sera supprimée.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction onClick={() => onDelete(m.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Supprimer</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button size="sm" variant="ghost">
                <Eye className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

    </motion.div>
  );
}

/* ─── Mission Detail ─── */

function MissionDetail({ mission: m, onAccept, onReject, onPublish, onCancel, onDelete, onValidate, onMarkPaid }: {
  mission: NewMission;
  onAccept: (missionId: string, appId: string, providerId: string) => void;
  onReject: (appId: string) => void;
  onPublish: (id: string) => void;
  onCancel: (id: string) => void;
  onDelete: (id: string) => void;
  onValidate: (id: string) => void;
  onMarkPaid: (id: string) => void;
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

        <div className="flex gap-2">
          {m.status === 'draft' && (
            <Button onClick={() => onPublish(m.id)} className="flex-1">
              <Send className="w-4 h-4 mr-2" /> Publier la mission
            </Button>
          )}
          {m.status === 'done' && (
            <Button onClick={() => onValidate(m.id)} className="flex-1 bg-emerald-600 hover:bg-emerald-700">
              <CheckCircle className="w-4 h-4 mr-2" /> Valider la mission
            </Button>
          )}
          {m.status === 'validated' && (
            <Button onClick={() => onMarkPaid(m.id)} className="flex-1">
              💰 Marquer comme payée
            </Button>
          )}
          {!['canceled', 'validated', 'paid'].includes(m.status) && (
            <Button variant="outline" onClick={() => onCancel(m.id)} className="text-destructive">
              <Ban className="w-4 h-4 mr-2" /> Annuler
            </Button>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="w-4 h-4 mr-2" /> Supprimer
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Supprimer cette mission ?</AlertDialogTitle>
                <AlertDialogDescription>Cette action est irréversible. La mission et ses candidatures seront supprimées.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(m.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Supprimer</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

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

/* ─── Test Email Button (for debugging) ─── */

interface TestEmailButtonProps {
  providers: Array<{ id: string; first_name: string; last_name: string; email: string }>;
}

function TestEmailButton({ providers }: TestEmailButtonProps) {
  const [open, setOpen] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; details?: any } | null>(null);

  const handleSendTest = async () => {
    if (!selectedEmail) {
      toast.error("Sélectionnez un email");
      return;
    }
    
    setSending(true);
    setResult(null);
    
    try {
      console.log("🧪 Sending test email to:", selectedEmail);
      
      const { data, error } = await supabase.functions.invoke('send-provider-notification', {
        body: {
          provider_email: selectedEmail,
          mission_title: "Mission test — Email de vérification",
          property_name: "Propriété Test",
          mission_date: new Date().toLocaleString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
          }),
          mission_amount: 50,
          mission_instructions: "Ceci est un email de test pour vérifier que les notifications fonctionnent.",
          mission_id: "test-" + Date.now(),
          notification_type: 'test'
        }
      });
      
      console.log("🧪 Test email result:", { data, error });
      
      if (error) {
        setResult({ 
          success: false, 
          message: `Erreur: ${error.message}`,
          details: error
        });
        toast.error("Échec de l'envoi");
      } else if (data?.success) {
        setResult({ 
          success: true, 
          message: `✅ Email envoyé à ${selectedEmail}`,
          details: data
        });
        toast.success("Email de test envoyé !");
      } else {
        setResult({ 
          success: false, 
          message: data?.error || "Erreur inconnue",
          details: data
        });
        toast.error(data?.error || "Échec de l'envoi");
      }
    } catch (err: any) {
      console.error("🧪 Test email exception:", err);
      setResult({ 
        success: false, 
        message: err.message,
        details: err
      });
      toast.error("Exception: " + err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 text-amber-600 border-amber-300 hover:bg-amber-50">
          <Mail className="w-4 h-4" /> Test Email
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>🧪 Tester l'envoi d'email</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Envoyez un email de test pour vérifier que Resend fonctionne correctement.
          </p>
          
          <div>
            <Label>Email destinataire</Label>
            <Select value={selectedEmail} onValueChange={setSelectedEmail}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir un prestataire" />
              </SelectTrigger>
              <SelectContent>
                {providers.map(p => (
                  <SelectItem key={p.id} value={p.email}>
                    {p.first_name} {p.last_name} ({p.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              Ou entrez manuellement :
            </p>
            <Input 
              type="email" 
              placeholder="email@exemple.com" 
              value={selectedEmail}
              onChange={(e) => setSelectedEmail(e.target.value)}
              className="mt-1"
            />
          </div>

          <Button 
            onClick={handleSendTest} 
            disabled={sending || !selectedEmail}
            className="w-full gap-2"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Envoyer l'email de test
          </Button>

          {result && (
            <div className={cn(
              "p-3 rounded-lg border text-sm",
              result.success ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"
            )}>
              <p className="font-medium">{result.message}</p>
              {result.details && (
                <pre className="mt-2 text-xs overflow-auto max-h-32 bg-background/50 p-2 rounded">
                  {JSON.stringify(result.details, null, 2)}
                </pre>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
