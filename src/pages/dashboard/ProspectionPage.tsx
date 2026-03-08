import { useState, useMemo, useCallback } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { motion, AnimatePresence } from "framer-motion";
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
  Flame, Snowflake, Sun, Star, Trash2, UserPlus, X, BarChart3, GripVertical
} from "lucide-react";
import {
  useProspects, useProspectInteractions, useProspectFollowups,
  PIPELINE_STATUSES, SOURCES, WARMTH_LEVELS,
  type Prospect, type ProspectFollowup
} from "@/hooks/useProspects";
import { supabase } from "@/integrations/supabase/client";

const SCORE_BONUSES: Record<string, number> = {
  meeting_scheduled: 20,
  proposal_sent: 30,
  signed: 50,
};

// Premium column color system
const COLUMN_STYLES: Record<string, { dot: string; bg: string; headerBg: string; dragBg: string; ring: string }> = {
  new_contact:     { dot: "bg-blue-400",    bg: "from-blue-500/[0.03] to-transparent",    headerBg: "bg-blue-500/8",    dragBg: "bg-blue-500/[0.06]",  ring: "ring-blue-400/30" },
  to_contact:      { dot: "bg-cyan-400",    bg: "from-cyan-500/[0.03] to-transparent",    headerBg: "bg-cyan-500/8",    dragBg: "bg-cyan-500/[0.06]",  ring: "ring-cyan-400/30" },
  contacted:       { dot: "bg-purple-400",  bg: "from-purple-500/[0.03] to-transparent",  headerBg: "bg-purple-500/8",  dragBg: "bg-purple-500/[0.06]", ring: "ring-purple-400/30" },
  interested:      { dot: "bg-violet-400",  bg: "from-violet-500/[0.03] to-transparent",  headerBg: "bg-violet-500/8",  dragBg: "bg-violet-500/[0.06]", ring: "ring-violet-400/30" },
  meeting_scheduled: { dot: "bg-amber-400", bg: "from-amber-500/[0.03] to-transparent",   headerBg: "bg-amber-500/8",   dragBg: "bg-amber-500/[0.06]",  ring: "ring-amber-400/30" },
  proposal_sent:   { dot: "bg-[hsl(var(--gold))]", bg: "from-[hsl(var(--gold))]/[0.04] to-transparent", headerBg: "bg-[hsl(var(--gold))]/8", dragBg: "bg-[hsl(var(--gold))]/[0.06]", ring: "ring-[hsl(var(--gold))]/30" },
  negotiation:     { dot: "bg-pink-400",    bg: "from-pink-500/[0.03] to-transparent",    headerBg: "bg-pink-500/8",    dragBg: "bg-pink-500/[0.06]",  ring: "ring-pink-400/30" },
  signed:          { dot: "bg-emerald-400", bg: "from-emerald-500/[0.03] to-transparent",  headerBg: "bg-emerald-500/8", dragBg: "bg-emerald-500/[0.06]", ring: "ring-emerald-400/30" },
  lost:            { dot: "bg-red-400",     bg: "from-red-500/[0.03] to-transparent",      headerBg: "bg-red-500/8",     dragBg: "bg-red-500/[0.06]",   ring: "ring-red-400/30" },
};

const WarmthIcon = ({ warmth }: { warmth: string }) => {
  if (warmth === "hot") return <Flame className="w-3.5 h-3.5 text-red-500" />;
  if (warmth === "warm") return <Sun className="w-3.5 h-3.5 text-amber-500" />;
  return <Snowflake className="w-3.5 h-3.5 text-blue-400" />;
};

// Animated number component
function AnimatedNumber({ value, suffix = "" }: { value: number | string; suffix?: string }) {
  const numericValue = typeof value === "string" ? parseInt(value) || 0 : value;
  return (
    <motion.span
      key={numericValue}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="tabular-nums"
    >
      {typeof value === "string" ? value : value.toLocaleString()}{suffix}
    </motion.span>
  );
}

export default function ProspectionPage() {
  const { prospects, isLoading, createProspect, updateProspect, deleteProspect } = useProspects();
  const { followups: allFollowups } = useProspectFollowups();
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterWarmth, setFilterWarmth] = useState<string>("all");
  const [filterCity, setFilterCity] = useState<string>("all");

  // KPIs
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

  // Filtered prospects
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

  // Drag & drop
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
    <div className="space-y-6 max-w-[1600px] relative">
      {/* Subtle page background depth */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[radial-gradient(circle,hsl(var(--primary)/0.03)_0%,transparent_70%)]" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[radial-gradient(circle,hsl(var(--gold)/0.04)_0%,transparent_70%)]" />
      </div>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4"
      >
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <Target className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
                Prospection
              </h1>
              <div className="h-0.5 w-12 bg-gradient-to-r from-violet-500 to-purple-500 rounded-full mt-1" />
            </div>
          </div>
          <p className="text-muted-foreground text-sm mt-2 ml-[52px]">
            Gérez votre pipeline commercial et convertissez vos prospects.
          </p>
        </div>
        <Button
          onClick={() => setShowCreateDialog(true)}
          className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 rounded-xl h-11 px-6 font-semibold"
        >
          <Plus className="w-4 h-4 mr-2" /> Nouveau prospect
        </Button>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: "Prospects actifs", value: kpis.active, icon: Users, gradient: "from-blue-500 to-cyan-500", glow: "shadow-blue-500/10" },
          { label: "Signés ce mois", value: kpis.signedThisMonth, icon: CheckCircle, gradient: "from-emerald-500 to-green-500", glow: "shadow-emerald-500/10" },
          { label: "Taux conversion", value: `${kpis.conversionRate}%`, icon: TrendingUp, gradient: "from-violet-500 to-purple-500", glow: "shadow-violet-500/10" },
          { label: "Valeur pipeline", value: `${kpis.pipelineValue.toLocaleString()}€`, icon: BarChart3, gradient: "from-amber-500 to-orange-500", glow: "shadow-amber-500/10" },
          { label: "Relances en retard", value: kpis.overdueFollowups, icon: AlertTriangle, gradient: kpis.overdueFollowups > 0 ? "from-red-500 to-rose-500" : "from-muted-foreground/40 to-muted-foreground/60", glow: kpis.overdueFollowups > 0 ? "shadow-red-500/10" : "" },
        ].map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className={cn(
              "group relative rounded-xl border border-border/60 bg-card p-4 transition-all duration-300 hover:border-border hover:-translate-y-0.5 cursor-default overflow-hidden",
              "shadow-xs hover:shadow-elevated",
              kpi.glow && `hover:${kpi.glow}`
            )}>
              {/* Subtle glow background */}
              <div className={cn("absolute -top-6 -right-6 w-20 h-20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-2xl bg-gradient-to-br", kpi.gradient)} />

              <div className="relative z-10">
                <div className={cn("w-9 h-9 rounded-lg bg-gradient-to-br flex items-center justify-center mb-3 shadow-sm", kpi.gradient)}>
                  <kpi.icon className="w-4 h-4 text-white" />
                </div>
                <p className="text-2xl font-bold text-foreground leading-none mb-1">
                  <AnimatedNumber value={kpi.value} />
                </p>
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{kpi.label}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="flex flex-wrap items-center gap-3"
      >
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un prospect..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9 bg-card border-border/60 rounded-xl h-10 focus:border-violet-400 focus:ring-violet-400/20"
          />
        </div>
        <Select value={filterWarmth} onValueChange={setFilterWarmth}>
          <SelectTrigger className="w-[140px] bg-card border-border/60 rounded-xl h-10">
            <SelectValue placeholder="Chaleur" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            {WARMTH_LEVELS.map(w => <SelectItem key={w.value} value={w.value}>{w.emoji} {w.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterCity} onValueChange={setFilterCity}>
          <SelectTrigger className="w-[140px] bg-card border-border/60 rounded-xl h-10">
            <SelectValue placeholder="Ville" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes</SelectItem>
            {cities.map(c => <SelectItem key={c} value={c!}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </motion.div>

      {/* Kanban Board */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-6 -mx-2 px-2 scrollbar-thin">
          {PIPELINE_STATUSES.map((status, colIdx) => {
            const columnProspects = filteredProspects.filter(p => p.pipeline_status === status.value);
            const colStyle = COLUMN_STYLES[status.value] || COLUMN_STYLES.new_contact;
            return (
              <Droppable key={status.value} droppableId={status.value}>
                {(provided, snapshot) => (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + colIdx * 0.04, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      "min-w-[270px] w-[270px] rounded-2xl p-3 transition-all duration-300 border shrink-0",
                      snapshot.isDraggingOver
                        ? `${colStyle.dragBg} border-border ${colStyle.ring} ring-2`
                        : "bg-gradient-to-b border-border/40 bg-muted/20"
                    )}
                  >
                    {/* Column header */}
                    <div className="flex items-center justify-between mb-3 px-0.5">
                      <div className="flex items-center gap-2">
                        <div className={cn("w-2 h-2 rounded-full", colStyle.dot)} />
                        <span className="text-[13px] font-semibold text-foreground">
                          {status.label}
                        </span>
                      </div>
                      <span className={cn(
                        "text-[11px] font-bold rounded-full min-w-[22px] h-[22px] flex items-center justify-center",
                        columnProspects.length > 0
                          ? "bg-foreground/8 text-foreground"
                          : "bg-muted text-muted-foreground"
                      )}>
                        {columnProspects.length}
                      </span>
                    </div>

                    {/* Cards */}
                    <div className="space-y-2 min-h-[80px]">
                      <AnimatePresence mode="popLayout">
                        {columnProspects.map((prospect, index) => (
                          <Draggable key={prospect.id} draggableId={prospect.id} index={index}>
                            {(provided, snapshot) => (
                              <motion.div
                                layout
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.2 }}
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={cn(
                                  "group bg-card rounded-xl p-3.5 border border-border/50 cursor-pointer transition-all duration-200",
                                  snapshot.isDragging
                                    ? "shadow-premium ring-2 ring-violet-400/40 rotate-[1.5deg] scale-[1.02]"
                                    : "shadow-xs hover:shadow-elevated hover:-translate-y-0.5 hover:border-border"
                                )}
                                onClick={() => setSelectedProspect(prospect)}
                              >
                                {/* Drag handle */}
                                <div {...provided.dragHandleProps} className="absolute top-2 right-2 opacity-0 group-hover:opacity-40 transition-opacity">
                                  <GripVertical className="w-3.5 h-3.5 text-muted-foreground" />
                                </div>

                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-400/80 to-purple-500/80 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                                      {prospect.first_name[0]}{prospect.last_name[0]}
                                    </div>
                                    <p className="font-semibold text-sm text-foreground leading-tight">
                                      {prospect.first_name} {prospect.last_name}
                                    </p>
                                  </div>
                                  <WarmthIcon warmth={prospect.warmth} />
                                </div>

                                {prospect.city && (
                                  <p className="text-[11px] text-muted-foreground flex items-center gap-1 mb-1.5 ml-9">
                                    <MapPin className="w-3 h-3 shrink-0" /> {prospect.city}
                                  </p>
                                )}

                                {prospect.estimated_monthly_revenue > 0 && (
                                  <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mb-2 ml-9">
                                    ~{prospect.estimated_monthly_revenue.toLocaleString()}€/mois
                                  </p>
                                )}

                                <div className="flex items-center justify-between ml-9">
                                  <Badge variant="outline" className="text-[10px] h-5 rounded-md border-border/60 font-medium">
                                    {SOURCES.find(s => s.value === prospect.source)?.label || prospect.source}
                                  </Badge>
                                  {prospect.score > 0 && (
                                    <span className="flex items-center gap-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> {prospect.score}
                                    </span>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </Draggable>
                        ))}
                      </AnimatePresence>

                      {/* Empty state */}
                      {columnProspects.length === 0 && !snapshot.isDraggingOver && (
                        <div className="flex flex-col items-center justify-center py-8 px-3">
                          <div className="w-10 h-10 rounded-xl bg-muted/60 flex items-center justify-center mb-2">
                            <Users className="w-4 h-4 text-muted-foreground/50" />
                          </div>
                          <p className="text-[11px] text-muted-foreground/60 text-center">
                            Aucun prospect
                          </p>
                        </div>
                      )}
                      {provided.placeholder}
                    </div>
                  </motion.div>
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
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <UserPlus className="w-4 h-4 text-white" />
            </div>
            Nouveau prospect
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Prénom *</Label><Input value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} className="rounded-xl" /></div>
          <div><Label>Nom *</Label><Input value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} className="rounded-xl" /></div>
          <div><Label>Téléphone</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="rounded-xl" /></div>
          <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="rounded-xl" /></div>
          <div className="col-span-2"><Label>Adresse du bien</Label><Input value={form.property_address} onChange={e => setForm(f => ({ ...f, property_address: e.target.value }))} className="rounded-xl" /></div>
          <div><Label>Ville</Label><Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} className="rounded-xl" /></div>
          <div>
            <Label>Type de bien</Label>
            <Select value={form.property_type} onValueChange={v => setForm(f => ({ ...f, property_type: v }))}>
              <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="apartment">Appartement</SelectItem>
                <SelectItem value="house">Maison</SelectItem>
                <SelectItem value="villa">Villa</SelectItem>
                <SelectItem value="studio">Studio</SelectItem>
                <SelectItem value="other">Autre</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Revenus mensuels estimés (€)</Label><Input type="number" value={form.estimated_monthly_revenue} onChange={e => setForm(f => ({ ...f, estimated_monthly_revenue: Number(e.target.value) }))} className="rounded-xl" /></div>
          <div>
            <Label>Source</Label>
            <Select value={form.source} onValueChange={v => setForm(f => ({ ...f, source: v }))}>
              <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                {SOURCES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Label>Niveau de chaleur</Label>
            <div className="flex gap-2 mt-1.5">
              {WARMTH_LEVELS.map(w => (
                <button key={w.value} onClick={() => setForm(f => ({ ...f, warmth: w.value }))} className={cn("px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200", form.warmth === w.value ? w.color + " ring-2 ring-offset-1 shadow-sm" : "bg-muted text-muted-foreground hover:bg-muted/80")}>
                  {w.emoji} {w.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="rounded-xl">Annuler</Button>
          <Button onClick={handleSubmit} className="bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl hover:shadow-lg hover:shadow-violet-500/25 transition-all">Créer</Button>
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
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto border-l border-border/60">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-violet-500/20">
              {prospect.first_name[0]}{prospect.last_name[0]}
            </div>
            <div>
              <p className="text-lg font-bold">{prospect.first_name} {prospect.last_name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={cn("px-2.5 py-0.5 rounded-full text-[11px] font-semibold border", statusInfo?.color)}>{statusInfo?.label}</span>
                <span className={cn("px-2.5 py-0.5 rounded-full text-[11px] font-medium", warmthInfo?.color)}>{warmthInfo?.emoji} {warmthInfo?.label}</span>
              </div>
            </div>
          </SheetTitle>
        </SheetHeader>

        <Tabs defaultValue="info" className="mt-6">
          <TabsList className="w-full grid grid-cols-4 rounded-xl bg-muted/50 p-1">
            <TabsTrigger value="info" className="rounded-lg text-xs">Infos</TabsTrigger>
            <TabsTrigger value="interactions" className="rounded-lg text-xs">Historique</TabsTrigger>
            <TabsTrigger value="followups" className="rounded-lg text-xs">Relances</TabsTrigger>
            <TabsTrigger value="notes" className="rounded-lg text-xs">Notes</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-3">
              {prospect.phone && (
                <a href={`tel:${prospect.phone}`} className="flex items-center gap-2 p-3 rounded-xl bg-muted/30 border border-border/40 hover:bg-muted/50 hover:border-border transition-all duration-200">
                  <Phone className="w-4 h-4 text-emerald-500" /><span className="text-sm">{prospect.phone}</span>
                </a>
              )}
              {prospect.email && (
                <a href={`mailto:${prospect.email}`} className="flex items-center gap-2 p-3 rounded-xl bg-muted/30 border border-border/40 hover:bg-muted/50 hover:border-border transition-all duration-200">
                  <Mail className="w-4 h-4 text-blue-500" /><span className="text-sm truncate">{prospect.email}</span>
                </a>
              )}
            </div>
            {prospect.property_address && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/30 border border-border/40">
                <MapPin className="w-4 h-4 text-violet-500" /><span className="text-sm">{prospect.property_address}, {prospect.city}</span>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-center border border-emerald-200/50 dark:border-emerald-500/20">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-1">Revenus estimés</p>
                <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400">{prospect.estimated_monthly_revenue?.toLocaleString()}€<span className="text-xs font-normal">/mois</span></p>
              </div>
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-center border border-amber-200/50 dark:border-amber-500/20">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-1">Score</p>
                <p className="text-xl font-bold text-amber-700 dark:text-amber-400 flex items-center justify-center gap-1"><Star className="w-4 h-4 fill-amber-400 text-amber-400" />{prospect.score}</p>
              </div>
            </div>
            <Separator className="bg-border/40" />
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => setShowAddInteraction(true)} className="rounded-xl">
                <MessageSquare className="w-3.5 h-3.5 mr-1" /> Interaction
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowAddFollowup(true)} className="rounded-xl">
                <Clock className="w-3.5 h-3.5 mr-1" /> Relance
              </Button>
              {prospect.pipeline_status !== "signed" && prospect.pipeline_status !== "lost" && (
                <Button size="sm" onClick={handleConvert} disabled={converting} className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow-sm">
                  <ArrowRightLeft className="w-3.5 h-3.5 mr-1" /> Convertir
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={() => onUpdate({ pipeline_status: "lost" })} className="text-red-500 hover:text-red-600 rounded-xl">
                <X className="w-3.5 h-3.5 mr-1" /> Perdu
              </Button>
              <Button size="sm" variant="ghost" onClick={onDelete} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl">
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="interactions" className="mt-4 space-y-3">
            <Button size="sm" onClick={() => setShowAddInteraction(true)} className="w-full rounded-xl" variant="outline">
              <Plus className="w-3.5 h-3.5 mr-1" /> Ajouter une interaction
            </Button>
            {interactions.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">Aucune interaction enregistrée</p>}
            {interactions.map(i => (
              <div key={i.id} className="p-3 rounded-xl bg-muted/20 border border-border/40">
                <div className="flex items-center justify-between mb-1">
                  <Badge variant="outline" className="text-[10px] rounded-md">{i.interaction_type === "call" ? "📞 Appel" : i.interaction_type === "email" ? "📧 Email" : i.interaction_type === "meeting" ? "🤝 RDV" : "🏠 Visite"}</Badge>
                  <span className="text-[10px] text-muted-foreground">{format(new Date(i.interaction_date), "dd MMM yyyy", { locale: fr })}</span>
                </div>
                {i.summary && <p className="text-sm mt-1">{i.summary}</p>}
                {i.result && <p className="text-xs text-muted-foreground mt-1">→ {i.result}</p>}
              </div>
            ))}
          </TabsContent>

          <TabsContent value="followups" className="mt-4 space-y-3">
            <Button size="sm" onClick={() => setShowAddFollowup(true)} className="w-full rounded-xl" variant="outline">
              <Plus className="w-3.5 h-3.5 mr-1" /> Programmer une relance
            </Button>
            {followups.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">Aucune relance programmée</p>}
            {followups.map(f => {
              const isOverdue = f.status === "todo" && new Date(f.scheduled_date) < new Date();
              return (
                <div key={f.id} className={cn("p-3 rounded-xl border transition-all duration-200", f.status === "done" ? "bg-emerald-50/50 dark:bg-emerald-500/5 border-emerald-200/60 dark:border-emerald-500/20" : isOverdue ? "bg-red-50/50 dark:bg-red-500/5 border-red-200/60 dark:border-red-500/20" : "bg-muted/20 border-border/40")}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {f.status === "done" ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : isOverdue ? <AlertTriangle className="w-4 h-4 text-red-500" /> : <Clock className="w-4 h-4 text-blue-500" />}
                      <span className="text-sm font-medium">{format(new Date(f.scheduled_date), "dd MMM yyyy", { locale: fr })}</span>
                    </div>
                    {f.status === "todo" && (
                      <Button size="sm" variant="ghost" onClick={() => markFollowupDone(f)} className="text-xs h-7 rounded-lg">
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
              className="min-h-[200px] rounded-xl"
            />
          </TabsContent>
        </Tabs>

        {/* Add Interaction Dialog */}
        <Dialog open={showAddInteraction} onOpenChange={setShowAddInteraction}>
          <DialogContent className="rounded-2xl">
            <DialogHeader><DialogTitle>Nouvelle interaction</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Type</Label>
                <Select value={interactionForm.interaction_type} onValueChange={v => setInteractionForm(f => ({ ...f, interaction_type: v }))}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="call">📞 Appel</SelectItem>
                    <SelectItem value="email">📧 Email</SelectItem>
                    <SelectItem value="meeting">🤝 RDV</SelectItem>
                    <SelectItem value="visit">🏠 Visite</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Résumé</Label><Textarea value={interactionForm.summary} onChange={e => setInteractionForm(f => ({ ...f, summary: e.target.value }))} className="rounded-xl" /></div>
              <div><Label>Résultat</Label><Input value={interactionForm.result} onChange={e => setInteractionForm(f => ({ ...f, result: e.target.value }))} className="rounded-xl" /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddInteraction(false)} className="rounded-xl">Annuler</Button>
              <Button onClick={handleAddInteraction} className="rounded-xl">Ajouter</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Followup Dialog */}
        <Dialog open={showAddFollowup} onOpenChange={setShowAddFollowup}>
          <DialogContent className="rounded-2xl">
            <DialogHeader><DialogTitle>Programmer une relance</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Date de relance</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start rounded-xl", !followupDate && "text-muted-foreground")}>
                      <CalendarIcon className="w-4 h-4 mr-2" />
                      {followupDate ? format(followupDate, "PPP", { locale: fr }) : "Choisir une date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={followupDate} onSelect={setFollowupDate} className="p-3 pointer-events-auto" /></PopoverContent>
                </Popover>
              </div>
              <div><Label>Commentaire</Label><Input value={followupComment} onChange={e => setFollowupComment(e.target.value)} className="rounded-xl" /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddFollowup(false)} className="rounded-xl">Annuler</Button>
              <Button onClick={handleAddFollowup} disabled={!followupDate} className="rounded-xl">Programmer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SheetContent>
    </Sheet>
  );
}
