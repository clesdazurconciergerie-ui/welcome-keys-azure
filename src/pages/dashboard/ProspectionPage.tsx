import { useState, useMemo, useCallback } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import {
  Plus, Search, Phone, Mail, MapPin, CalendarIcon, MessageSquare,
  TrendingUp, Users, Target, AlertTriangle, CheckCircle, Clock, ArrowRightLeft,
  Flame, Snowflake, Sun, Star, Trash2, UserPlus, X, BarChart3
} from "lucide-react";
import {
  useProspects, useProspectInteractions, useProspectFollowups,
  PIPELINE_STATUSES, SOURCES, WARMTH_LEVELS,
  type Prospect, type ProspectFollowup
} from "@/hooks/useProspects";
import { useEmailTemplates } from "@/hooks/useEmailTemplates";
import { supabase } from "@/integrations/supabase/client";

const SCORE_BONUSES: Record<string, number> = {
  meeting_scheduled: 20,
  proposal_sent: 30,
  signed: 50,
};

const WarmthIcon = ({ warmth }: { warmth: string }) => {
  if (warmth === "hot") return <Flame className="w-3.5 h-3.5 text-red-500" />;
  if (warmth === "warm") return <Sun className="w-3.5 h-3.5 text-amber-500" />;
  return <Snowflake className="w-3.5 h-3.5 text-blue-400" />;
};

export default function ProspectionPage() {
  const { prospects, isLoading, createProspect, updateProspect, deleteProspect } = useProspects();
  const { followups: allFollowups } = useProspectFollowups();
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterWarmth, setFilterWarmth] = useState<string>("all");
  const [filterCity, setFilterCity] = useState<string>("all");

  const kpis = useMemo(() => {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    const active = prospects.filter(p => p.pipeline_status !== "lost" && p.pipeline_status !== "signed");
    const signedThisMonth = prospects.filter(p => {
      if (p.pipeline_status !== "signed") return false;
      const d = new Date(p.updated_at);
      return d.getMonth() === month && d.getFullYear() === year;
    });
    const totalSigned = prospects.filter(p => p.pipeline_status === "signed").length;
    const conversionRate = prospects.length > 0 ? Math.round((totalSigned / prospects.length) * 100) : 0;
    const pipelineValue = active.reduce((s, p) => s + (p.estimated_monthly_revenue || 0), 0);
    const overdueFollowups = allFollowups.filter(f => f.status === "todo" && new Date(f.scheduled_date) < now);
    return { active: active.length, signedThisMonth: signedThisMonth.length, conversionRate, pipelineValue, overdueFollowups: overdueFollowups.length };
  }, [prospects, allFollowups]);

  const filteredProspects = useMemo(() => {
    return prospects.filter(p => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!`${p.first_name} ${p.last_name} ${p.email} ${p.city}`.toLowerCase().includes(q)) return false;
      }
      if (filterWarmth !== "all" && p.warmth !== filterWarmth) return false;
      if (filterCity !== "all" && p.city !== filterCity) return false;
      return true;
    });
  }, [prospects, searchQuery, filterWarmth, filterCity]);

  const cities = useMemo(() => [...new Set(prospects.map(p => p.city).filter(Boolean))], [prospects]);

  const onDragEnd = useCallback((result: DropResult) => {
    if (!result.destination) return;
    const prospectId = result.draggableId;
    const newStatus = result.destination.droppableId;
    const prospect = prospects.find(p => p.id === prospectId);
    if (!prospect || prospect.pipeline_status === newStatus) return;
    const scoreBonus = SCORE_BONUSES[newStatus] || 0;
    updateProspect.mutate({
      id: prospectId,
      pipeline_status: newStatus,
      ...(scoreBonus > 0 ? { score: (prospect.score || 0) + scoreBonus } : {}),
    });
    toast.success(`Prospect déplacé vers "${PIPELINE_STATUSES.find(s => s.value === newStatus)?.label}"`);
  }, [prospects, updateProspect]);

  return (
    <div className="space-y-6 max-w-[1600px]">
      {/* Header — same pattern as LogementsPage / DashboardHome */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Prospection</h1>
            <p className="text-muted-foreground mt-1">
              Gérez votre pipeline commercial et convertissez vos prospects.
            </p>
          </div>
          <Button
            onClick={() => setShowCreateDialog(true)}
            className="bg-[hsl(var(--gold))] hover:bg-[hsl(var(--gold))]/90 text-[hsl(var(--brand-blue))] font-semibold"
          >
            <Plus className="w-4 h-4 mr-2" /> Nouveau prospect
          </Button>
        </div>
      </motion.div>

      {/* KPI Cards — same Card/CardContent pattern as DashboardHome stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {[
          { label: "Prospects actifs", value: kpis.active, icon: Users, color: "text-primary", bg: "bg-primary/10" },
          { label: "Signés ce mois", value: kpis.signedThisMonth, icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-100" },
          { label: "Taux conversion", value: `${kpis.conversionRate}%`, icon: TrendingUp, color: "text-[hsl(var(--gold))]", bg: "bg-[hsl(var(--gold))]/10" },
          { label: "Valeur pipeline", value: `${kpis.pipelineValue.toLocaleString()}€`, icon: BarChart3, color: "text-amber-600", bg: "bg-amber-100" },
          { label: "Relances en retard", value: kpis.overdueFollowups, icon: AlertTriangle, color: kpis.overdueFollowups > 0 ? "text-red-600" : "text-muted-foreground", bg: kpis.overdueFollowups > 0 ? "bg-red-100" : "bg-muted" },
        ].map((kpi, i) => (
          <motion.div key={kpi.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-3", kpi.bg)}>
                  <kpi.icon className={cn("w-5 h-5", kpi.color)} />
                </div>
                <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
                <p className="text-sm text-muted-foreground">{kpi.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Rechercher un prospect..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterWarmth} onValueChange={setFilterWarmth}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Chaleur" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            {WARMTH_LEVELS.map(w => <SelectItem key={w.value} value={w.value}>{w.emoji} {w.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterCity} onValueChange={setFilterCity}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Ville" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes</SelectItem>
            {cities.map(c => <SelectItem key={c} value={c!}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Kanban Board */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-4 -mx-2 px-2">
          {PIPELINE_STATUSES.map((status) => {
            const columnProspects = filteredProspects.filter(p => p.pipeline_status === status.value);
            return (
              <Droppable key={status.value} droppableId={status.value}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      "min-w-[260px] w-[260px] rounded-xl border border-border bg-card p-3 transition-shadow shrink-0",
                      snapshot.isDraggingOver ? "shadow-md ring-1 ring-primary/20" : "shadow-xs"
                    )}
                  >
                    {/* Column header */}
                    <div className="flex items-center justify-between mb-3">
                      <Badge variant="outline" className="text-xs font-semibold">
                        {status.label}
                      </Badge>
                      <span className="text-xs font-bold text-muted-foreground bg-muted rounded-full w-6 h-6 flex items-center justify-center">
                        {columnProspects.length}
                      </span>
                    </div>

                    {/* Cards */}
                    <div className="space-y-2 min-h-[60px]">
                      {columnProspects.map((prospect, index) => (
                        <Draggable key={prospect.id} draggableId={prospect.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={cn(
                                "bg-background rounded-xl p-3 border border-border cursor-pointer transition-shadow",
                                snapshot.isDragging ? "shadow-elevated ring-1 ring-primary/20" : "shadow-xs hover:shadow-subtle"
                              )}
                              onClick={() => setSelectedProspect(prospect)}
                            >
                              <div className="flex items-start justify-between mb-1.5">
                                <p className="font-semibold text-sm text-foreground leading-tight">
                                  {prospect.first_name} {prospect.last_name}
                                </p>
                                <WarmthIcon warmth={prospect.warmth} />
                              </div>
                              {prospect.city && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                                  <MapPin className="w-3 h-3" /> {prospect.city}
                                </p>
                              )}
                              {prospect.estimated_monthly_revenue > 0 && (
                                <p className="text-xs font-medium text-emerald-600 mb-2">
                                  ~{prospect.estimated_monthly_revenue.toLocaleString()}€/mois
                                </p>
                              )}
                              <div className="flex items-center justify-between">
                                <Badge variant="outline" className="text-[10px] h-5">
                                  {SOURCES.find(s => s.value === prospect.source)?.label || prospect.source}
                                </Badge>
                                {prospect.score > 0 && (
                                  <span className="flex items-center gap-0.5 text-[10px] font-bold text-amber-600">
                                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> {prospect.score}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}

                      {/* Empty state */}
                      {columnProspects.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-8">
                          <p className="text-xs text-muted-foreground text-center">
                            Aucun prospect dans cette étape.
                          </p>
                        </div>
                      )}
                      {provided.placeholder}
                    </div>
                  </div>
                )}
              </Droppable>
            );
          })}
        </div>
      </DragDropContext>

      {/* Create Dialog */}
      <CreateProspectDialog open={showCreateDialog} onClose={() => setShowCreateDialog(false)} onCreate={createProspect.mutate} />

      {/* Prospect Detail Sheet */}
      {selectedProspect && (
        <ProspectDetailSheet
          prospect={selectedProspect}
          onClose={() => setSelectedProspect(null)}
          onUpdate={(updates) => {
            updateProspect.mutate({ id: selectedProspect.id, ...updates });
            setSelectedProspect({ ...selectedProspect, ...updates });
          }}
          onDelete={() => {
            deleteProspect.mutate(selectedProspect.id);
            setSelectedProspect(null);
          }}
        />
      )}
    </div>
  );
}

// ─── Create Prospect Dialog ───
function CreateProspectDialog({ open, onClose, onCreate }: { open: boolean; onClose: () => void; onCreate: (p: any) => void }) {
  const [form, setForm] = useState({
    first_name: "", last_name: "", phone: "", email: "", property_address: "", city: "",
    property_type: "apartment", estimated_monthly_revenue: 0, source: "other", warmth: "cold",
  });

  const handleSubmit = () => {
    if (!form.first_name || !form.last_name) { toast.error("Nom et prénom requis"); return; }
    onCreate(form);
    setForm({ first_name: "", last_name: "", phone: "", email: "", property_address: "", city: "", property_type: "apartment", estimated_monthly_revenue: 0, source: "other", warmth: "cold" });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" /> Nouveau prospect
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Prénom *</Label><Input value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} /></div>
          <div><Label>Nom *</Label><Input value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} /></div>
          <div><Label>Téléphone</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
          <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
          <div className="col-span-2"><Label>Adresse du bien</Label><Input value={form.property_address} onChange={e => setForm(f => ({ ...f, property_address: e.target.value }))} /></div>
          <div><Label>Ville</Label><Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} /></div>
          <div>
            <Label>Type de bien</Label>
            <Select value={form.property_type} onValueChange={v => setForm(f => ({ ...f, property_type: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="apartment">Appartement</SelectItem>
                <SelectItem value="house">Maison</SelectItem>
                <SelectItem value="villa">Villa</SelectItem>
                <SelectItem value="studio">Studio</SelectItem>
                <SelectItem value="other">Autre</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Revenus mensuels estimés (€)</Label><Input type="number" value={form.estimated_monthly_revenue} onChange={e => setForm(f => ({ ...f, estimated_monthly_revenue: Number(e.target.value) }))} /></div>
          <div>
            <Label>Source</Label>
            <Select value={form.source} onValueChange={v => setForm(f => ({ ...f, source: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SOURCES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Label>Niveau de chaleur</Label>
            <div className="flex gap-2 mt-1">
              {WARMTH_LEVELS.map(w => (
                <button key={w.value} onClick={() => setForm(f => ({ ...f, warmth: w.value }))} className={cn("px-3 py-1.5 rounded-lg text-sm font-medium transition-colors", form.warmth === w.value ? w.color + " ring-2 ring-offset-1" : "bg-muted text-muted-foreground")}>
                  {w.emoji} {w.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={handleSubmit}>Créer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Prospect Detail Sheet ───
function ProspectDetailSheet({ prospect, onClose, onUpdate, onDelete }: {
  prospect: Prospect;
  onClose: () => void;
  onUpdate: (updates: Partial<Prospect>) => void;
  onDelete: () => void;
}) {
  const { interactions, createInteraction } = useProspectInteractions(prospect.id);
  const { followups, createFollowup, updateFollowup } = useProspectFollowups(prospect.id);
  const [showAddInteraction, setShowAddInteraction] = useState(false);
  const [showAddFollowup, setShowAddFollowup] = useState(false);
  const [interactionForm, setInteractionForm] = useState({ interaction_type: "call", summary: "", result: "" });
  const [followupDate, setFollowupDate] = useState<Date>();
  const [followupComment, setFollowupComment] = useState("");
  const [converting, setConverting] = useState(false);

  const warmthInfo = WARMTH_LEVELS.find(w => w.value === prospect.warmth);
  const statusInfo = PIPELINE_STATUSES.find(s => s.value === prospect.pipeline_status);

  const handleConvert = async () => {
    setConverting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");
      const { data: owner, error } = await supabase.from("owners").insert({
        first_name: prospect.first_name,
        last_name: prospect.last_name,
        email: prospect.email || "",
        phone: prospect.phone,
        concierge_user_id: user.id,
        status: "active",
      }).select("id").single();
      if (error) throw error;
      onUpdate({ pipeline_status: "signed", converted_owner_id: owner.id, score: (prospect.score || 0) + 50 });
      toast.success("Prospect converti en propriétaire !");
    } catch (err) {
      toast.error("Erreur lors de la conversion");
    } finally {
      setConverting(false);
    }
  };

  const handleAddInteraction = () => {
    createInteraction.mutate({ prospect_id: prospect.id, ...interactionForm });
    setInteractionForm({ interaction_type: "call", summary: "", result: "" });
    setShowAddInteraction(false);
  };

  const handleAddFollowup = () => {
    if (!followupDate) return;
    createFollowup.mutate({ prospect_id: prospect.id, scheduled_date: format(followupDate, "yyyy-MM-dd"), comment: followupComment, status: "todo" });
    setFollowupDate(undefined);
    setFollowupComment("");
    setShowAddFollowup(false);
  };

  const markFollowupDone = (followup: ProspectFollowup) => {
    updateFollowup.mutate({ id: followup.id, status: "done", completed_date: new Date().toISOString().split('T')[0] });
    onUpdate({ last_contact_date: new Date().toISOString().split('T')[0] });
  };

  return (
    <Sheet open={true} onOpenChange={() => onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
              {prospect.first_name[0]}{prospect.last_name[0]}
            </div>
            <div>
              <p className="text-lg font-bold">{prospect.first_name} {prospect.last_name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant="outline" className="text-[11px]">{statusInfo?.label}</Badge>
                <span className={cn("px-2 py-0.5 rounded-lg text-[11px] font-medium", warmthInfo?.color)}>{warmthInfo?.emoji} {warmthInfo?.label}</span>
              </div>
            </div>
          </SheetTitle>
        </SheetHeader>

        <Tabs defaultValue="info" className="mt-6">
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="info">Infos</TabsTrigger>
            <TabsTrigger value="interactions">Historique</TabsTrigger>
            <TabsTrigger value="followups">Relances</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-3">
              {prospect.phone && (
                <a href={`tel:${prospect.phone}`} className="flex items-center gap-2 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors">
                  <Phone className="w-4 h-4 text-emerald-500" /><span className="text-sm">{prospect.phone}</span>
                </a>
              )}
              {prospect.email && (
                <a href={`mailto:${prospect.email}`} className="flex items-center gap-2 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors">
                  <Mail className="w-4 h-4 text-blue-500" /><span className="text-sm truncate">{prospect.email}</span>
                </a>
              )}
            </div>
            {prospect.property_address && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/50">
                <MapPin className="w-4 h-4 text-primary" /><span className="text-sm">{prospect.property_address}, {prospect.city}</span>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-xs text-muted-foreground">Revenus estimés</p>
                  <p className="text-lg font-bold text-emerald-600">{prospect.estimated_monthly_revenue?.toLocaleString()}€<span className="text-xs font-normal">/mois</span></p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-xs text-muted-foreground">Score</p>
                  <p className="text-lg font-bold text-amber-600 flex items-center justify-center gap-1"><Star className="w-4 h-4 fill-amber-400 text-amber-400" />{prospect.score}</p>
                </CardContent>
              </Card>
            </div>
            <Separator />
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => setShowAddInteraction(true)}>
                <MessageSquare className="w-3.5 h-3.5 mr-1" /> Interaction
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowAddFollowup(true)}>
                <Clock className="w-3.5 h-3.5 mr-1" /> Relance
              </Button>
              {prospect.pipeline_status !== "signed" && prospect.pipeline_status !== "lost" && (
                <Button size="sm" onClick={handleConvert} disabled={converting} className="bg-emerald-500 hover:bg-emerald-600 text-white">
                  <ArrowRightLeft className="w-3.5 h-3.5 mr-1" /> Convertir
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={() => onUpdate({ pipeline_status: "lost" })} className="text-red-500 hover:text-red-600">
                <X className="w-3.5 h-3.5 mr-1" /> Perdu
              </Button>
              <Button size="sm" variant="ghost" onClick={onDelete} className="text-red-500 hover:bg-red-50">
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="interactions" className="mt-4 space-y-3">
            <Button size="sm" onClick={() => setShowAddInteraction(true)} className="w-full" variant="outline">
              <Plus className="w-3.5 h-3.5 mr-1" /> Ajouter une interaction
            </Button>
            {interactions.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">Aucune interaction enregistrée</p>}
            {interactions.map(i => (
              <div key={i.id} className="p-3 rounded-xl bg-muted/30 border border-border/50">
                <div className="flex items-center justify-between mb-1">
                  <Badge variant="outline" className="text-[10px]">{i.interaction_type === "call" ? "📞 Appel" : i.interaction_type === "email" ? "📧 Email" : i.interaction_type === "meeting" ? "🤝 RDV" : "🏠 Visite"}</Badge>
                  <span className="text-[10px] text-muted-foreground">{format(new Date(i.interaction_date), "dd MMM yyyy", { locale: fr })}</span>
                </div>
                {i.summary && <p className="text-sm mt-1">{i.summary}</p>}
                {i.result && <p className="text-xs text-muted-foreground mt-1">→ {i.result}</p>}
              </div>
            ))}
          </TabsContent>

          <TabsContent value="followups" className="mt-4 space-y-3">
            <Button size="sm" onClick={() => setShowAddFollowup(true)} className="w-full" variant="outline">
              <Plus className="w-3.5 h-3.5 mr-1" /> Programmer une relance
            </Button>
            {followups.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">Aucune relance programmée</p>}
            {followups.map(f => {
              const isOverdue = f.status === "todo" && new Date(f.scheduled_date) < new Date();
              return (
                <div key={f.id} className={cn("p-3 rounded-xl border", f.status === "done" ? "bg-emerald-50/50 border-emerald-200" : isOverdue ? "bg-red-50/50 border-red-200" : "bg-muted/30 border-border/50")}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {f.status === "done" ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : isOverdue ? <AlertTriangle className="w-4 h-4 text-red-500" /> : <Clock className="w-4 h-4 text-blue-500" />}
                      <span className="text-sm font-medium">{format(new Date(f.scheduled_date), "dd MMM yyyy", { locale: fr })}</span>
                    </div>
                    {f.status === "todo" && (
                      <Button size="sm" variant="ghost" onClick={() => markFollowupDone(f)} className="text-xs h-7">
                        <CheckCircle className="w-3 h-3 mr-1" /> Fait
                      </Button>
                    )}
                  </div>
                  {f.comment && <p className="text-xs text-muted-foreground mt-1 ml-6">{f.comment}</p>}
                </div>
              );
            })}
          </TabsContent>

          <TabsContent value="notes" className="mt-4">
            <Textarea
              placeholder="Notes internes sur ce prospect..."
              value={prospect.internal_notes || ""}
              onChange={e => onUpdate({ internal_notes: e.target.value })}
              className="min-h-[200px]"
            />
          </TabsContent>
        </Tabs>

        {/* Add Interaction Dialog */}
        <Dialog open={showAddInteraction} onOpenChange={setShowAddInteraction}>
          <DialogContent>
            <DialogHeader><DialogTitle>Nouvelle interaction</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Type</Label>
                <Select value={interactionForm.interaction_type} onValueChange={v => setInteractionForm(f => ({ ...f, interaction_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="call">📞 Appel</SelectItem>
                    <SelectItem value="email">📧 Email</SelectItem>
                    <SelectItem value="meeting">🤝 RDV</SelectItem>
                    <SelectItem value="visit">🏠 Visite</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Résumé</Label><Textarea value={interactionForm.summary} onChange={e => setInteractionForm(f => ({ ...f, summary: e.target.value }))} /></div>
              <div><Label>Résultat</Label><Input value={interactionForm.result} onChange={e => setInteractionForm(f => ({ ...f, result: e.target.value }))} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddInteraction(false)}>Annuler</Button>
              <Button onClick={handleAddInteraction}>Ajouter</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Followup Dialog */}
        <Dialog open={showAddFollowup} onOpenChange={setShowAddFollowup}>
          <DialogContent>
            <DialogHeader><DialogTitle>Programmer une relance</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Date de relance</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start", !followupDate && "text-muted-foreground")}>
                      <CalendarIcon className="w-4 h-4 mr-2" />
                      {followupDate ? format(followupDate, "PPP", { locale: fr }) : "Choisir une date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={followupDate} onSelect={setFollowupDate} className="p-3 pointer-events-auto" /></PopoverContent>
                </Popover>
              </div>
              <div><Label>Commentaire</Label><Input value={followupComment} onChange={e => setFollowupComment(e.target.value)} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddFollowup(false)}>Annuler</Button>
              <Button onClick={handleAddFollowup} disabled={!followupDate}>Programmer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SheetContent>
    </Sheet>
  );
}
