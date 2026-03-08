import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  ClipboardList, Play, CheckCircle, Upload, Camera, AlertTriangle,
  Send, MapPin, Calendar, Euro, Loader2, List, CalendarDays, ChevronLeft, ChevronRight,
  AlertCircle, Clock, Briefcase, TrendingUp,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";
import { useNewMissions, type NewMission } from "@/hooks/useNewMissions";
import { useMissions, useChecklistItems, type Mission } from "@/hooks/useMissions";
import { useIsServiceProvider } from "@/hooks/useIsServiceProvider";
import { useMissionPhotos } from "@/hooks/useMissionPhotos";

function getPropertyPhoto(mission: NewMission): string | null {
  const photos = mission.property?.property_photos;
  if (!photos || photos.length === 0) return null;
  const main = photos.find(p => p.is_main);
  if (main) return main.url;
  const sorted = [...photos].sort((a, b) => (a.order_index ?? 999) - (b.order_index ?? 999));
  return sorted[0]?.url || null;
}

/* ── Config ───────────────────────────────────────────────────── */

const missionTypeLabels: Record<string, string> = {
  cleaning: "🧹 Ménage",
  cleaning_checkout: "🧹 Ménage",
  checkin: "🔑 Check-in",
  checkout: "🚪 Check-out",
  maintenance: "🔧 Maintenance",
};

const statusConfig: Record<string, { label: string; pillClass: string }> = {
  open: { label: "Ouverte", pillClass: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  assigned: { label: "Acceptée", pillClass: "bg-blue-100 text-blue-700 border-blue-200" },
  confirmed: { label: "Confirmée", pillClass: "bg-blue-100 text-blue-700 border-blue-200" },
  scheduled: { label: "Assignée", pillClass: "bg-blue-100 text-blue-700 border-blue-200" },
  in_progress: { label: "En cours", pillClass: "bg-amber-100 text-amber-700 border-amber-200" },
  done: { label: "Terminée", pillClass: "bg-muted text-muted-foreground border-border" },
  approved: { label: "Approuvée", pillClass: "bg-muted text-muted-foreground border-border" },
  completed: { label: "En attente", pillClass: "bg-amber-100 text-amber-700 border-amber-200" },
  validated: { label: "Validée", pillClass: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  redo: { label: "À refaire", pillClass: "bg-orange-100 text-orange-700 border-orange-200" },
  refused: { label: "Refusée", pillClass: "bg-red-100 text-red-700 border-red-200" },
};

/* ── Urgency helper ───────────────────────────────────────────── */

function getUrgencyInfo(dateStr: string): { label: string; isUrgent: boolean } | null {
  const missionDate = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const mDay = new Date(missionDate.getFullYear(), missionDate.getMonth(), missionDate.getDate());
  const diffDays = Math.round((mDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return null;
  if (diffDays === 0) return { label: "Aujourd'hui", isUrgent: true };
  if (diffDays === 1) return { label: "Demain", isUrgent: true };
  if (diffDays <= 3) return { label: `Dans ${diffDays} jours`, isUrgent: false };
  return null;
}

/* ── Stat Card ────────────────────────────────────────────────── */

function StatCard({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string | number; accent?: string }) {
  return (
    <Card className="border-border/60">
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${accent || "bg-primary/10"}`}>
          <Icon className={`w-5 h-5 ${accent ? "text-white" : "text-primary"}`} />
        </div>
        <div className="min-w-0">
          <p className="text-2xl font-bold text-foreground leading-none">{value}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

/* ── Mission Card ─────────────────────────────────────────────── */

interface MissionCardProps {
  title: string;
  propertyName?: string;
  propertyAddress?: string;
  dateStr: string;
  rawDate: string;
  missionType: string;
  payoutAmount: number;
  instructions?: string | null;
  status: string;
  photoCount?: number;
  actions?: React.ReactNode;
  onClick?: () => void;
  applied?: boolean;
  conflictWarning?: string | null;
  propertyPhotoUrl?: string | null;
}

function MissionCard({
  title, propertyName, propertyAddress, dateStr, rawDate, missionType, payoutAmount,
  instructions, status, photoCount, actions, onClick, applied, conflictWarning, propertyPhotoUrl,
}: MissionCardProps) {
  const cfg = statusConfig[status] || { label: status, pillClass: "bg-muted text-muted-foreground border-border" };
  const urgency = getUrgencyInfo(rawDate);

  return (
    <Card
      className={`transition-all cursor-pointer border hover:shadow-md hover:border-primary/20 hover:-translate-y-0.5 active:scale-[0.99] ${
        applied ? "border-primary/30 bg-primary/5" : urgency?.isUrgent ? "border-amber-200 bg-amber-50/30" : "border-border"
      }`}
      onClick={onClick}
    >
      <CardContent className="p-0">
        <div className="flex flex-col sm:flex-row">
          {/* Property image */}
          <div className="shrink-0 w-full sm:w-20 h-36 sm:h-auto sm:min-h-[100px] overflow-hidden sm:rounded-l-lg bg-muted">
            {propertyPhotoUrl ? (
              <img src={propertyPhotoUrl} alt={propertyName || 'Logement'} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <MapPin className="w-6 h-6 text-muted-foreground/40" />
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 p-4">
            {/* Top row: title + badge + urgency */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-foreground text-sm sm:text-base truncate">{title}</p>
                <span className="text-xs text-muted-foreground">{missionTypeLabels[missionType] || missionType}</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {urgency && (
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                    urgency.isUrgent ? "bg-amber-100 text-amber-700 border-amber-200" : "bg-muted text-muted-foreground border-border"
                  }`}>
                    <Clock className="w-2.5 h-2.5 inline mr-0.5 -mt-0.5" />
                    {urgency.label}
                  </span>
                )}
                <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full border ${cfg.pillClass}`}>
                  {cfg.label}
                </span>
              </div>
            </div>

            {/* Info row */}
            <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-1.5 sm:gap-x-4 sm:gap-y-1 text-sm text-muted-foreground mb-2">
              {propertyName && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  {propertyName}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 shrink-0" />
                {dateStr}
              </span>
              {payoutAmount > 0 && (
                <span className="flex items-center gap-1.5 text-emerald-600 font-bold text-base">
                  <Euro className="w-4 h-4" />
                  {payoutAmount} €
                </span>
              )}
              {photoCount !== undefined && photoCount > 0 && (
                <span className="text-xs flex items-center gap-1"><Camera className="w-3 h-3" /> {photoCount}</span>
              )}
            </div>

            {instructions && (
              <p className="text-sm text-muted-foreground bg-muted/50 p-2 rounded-lg line-clamp-2 mb-2">{instructions}</p>
            )}

            {conflictWarning && (
              <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 mb-2">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {conflictWarning}
              </div>
            )}

            {/* Actions */}
            {actions && (
              <div className="mt-2 [&>*]:w-full sm:[&>*]:w-auto [&>*]:h-11 sm:[&>*]:h-9">
                {actions}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ── Calendar View ────────────────────────────────────────────── */

function MiniCalendar({ missions, onSelect }: { missions: NewMission[]; onSelect: (m: NewMission) => void }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = (firstDay.getDay() + 6) % 7;

  const days: (Date | null)[] = [];
  for (let i = 0; i < startOffset; i++) days.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(year, month, d));

  const getMissionsForDay = (date: Date) =>
    missions.filter(m => {
      const d = new Date(m.start_at);
      return d.getFullYear() === date.getFullYear() && d.getMonth() === date.getMonth() && d.getDate() === date.getDate();
    });

  const today = new Date();
  const isToday = (d: Date) => d.toDateString() === today.toDateString();
  const monthName = currentDate.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="icon" onClick={() => setCurrentDate(new Date(year, month - 1))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h3 className="font-semibold capitalize">{monthName}</h3>
          <Button variant="ghost" size="icon" onClick={() => setCurrentDate(new Date(year, month + 1))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <div className="grid grid-cols-7 gap-1 mb-1">
          {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map(d => (
            <div key={d} className="text-center text-[10px] font-medium text-muted-foreground py-1">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((date, i) => {
            if (!date) return <div key={`e-${i}`} className="min-h-[72px]" />;
            const dayMissions = getMissionsForDay(date);
            return (
              <div
                key={date.toISOString()}
                className={`min-h-[72px] p-1 rounded-lg border transition-colors hover:bg-muted/30 ${isToday(date) ? "ring-2 ring-primary border-primary/30" : "border-border/50"}`}
              >
                <p className={`text-[11px] font-medium mb-0.5 ${isToday(date) ? "text-primary font-bold" : "text-muted-foreground"}`}>{date.getDate()}</p>
                {dayMissions.slice(0, 2).map(m => {
                  const cfg = statusConfig[m.status];
                  return (
                    <div
                      key={m.id}
                      onClick={() => onSelect(m)}
                      className={`text-[10px] px-1 py-0.5 rounded truncate cursor-pointer mb-0.5 ${cfg?.pillClass || "bg-muted"}`}
                      title={m.title}
                    >
                      {missionTypeLabels[m.mission_type]?.charAt(0) || "📋"} {m.property?.name?.substring(0, 8) || "…"}
                    </div>
                  );
                })}
                {dayMissions.length > 2 && <p className="text-[10px] text-muted-foreground text-center">+{dayMissions.length - 2}</p>}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

/* ── Main Page ────────────────────────────────────────────────── */

export default function SPMissionsUnifiedPage() {
  const { missions: newMissions, isLoading: loadingNew, applyToMission, confirmMission, markDone } = useNewMissions("provider");
  const { missions: legacyMissions, isLoading: loadingLegacy, startMission, completeMission, uploadPhoto, refetch } = useMissions("service_provider");
  const { spId } = useIsServiceProvider();

  const [myView, setMyView] = useState<"list" | "calendar">("list");
  const [applyTarget, setApplyTarget] = useState<NewMission | null>(null);
  const [applyMessage, setApplyMessage] = useState("");
  const [applying, setApplying] = useState(false);

  const [selectedNewMission, setSelectedNewMission] = useState<NewMission | null>(null);
  const [legacySelected, setLegacySelected] = useState<Mission | null>(null);
  const [uploading, setUploading] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [providerComment, setProviderComment] = useState("");
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const { items: checklistItems } = useChecklistItems(legacySelected?.property_id);
  const { photos: missionPhotos, uploading: uploadingNewPhoto, uploadProgress, uploadPhoto: uploadMissionPhoto } = useMissionPhotos(selectedNewMission?.id || null);

  const isLoading = loadingNew || loadingLegacy;

  const openMissions = newMissions.filter(m => m.status === "open");
  const myNewMissions = newMissions.filter(
    m => m.selected_provider_id && spId && ["assigned", "confirmed", "done", "approved"].includes(m.status)
  );
  const myLegacyMissions = legacyMissions.filter(m =>
    ["scheduled", "in_progress", "redo", "completed", "validated"].includes(m.status)
  );

  const estimatedRevenue = useMemo(() => {
    const fromNew = myNewMissions
      .filter(m => ["assigned", "confirmed"].includes(m.status))
      .reduce((sum, m) => sum + (m.payout_amount || 0), 0);
    const fromLegacy = myLegacyMissions
      .filter(m => ["scheduled", "in_progress"].includes(m.status))
      .reduce((sum, m) => sum + (m.mission_amount || 0), 0);
    return fromNew + fromLegacy;
  }, [myNewMissions, myLegacyMissions]);

  const myMissionsCount = myNewMissions.filter(m => ["assigned", "confirmed"].includes(m.status)).length
    + myLegacyMissions.filter(m => ["scheduled", "in_progress"].includes(m.status)).length;

  const hasApplied = (m: NewMission) => m.applications?.some(a => a.provider_id === spId) || false;

  const getConflict = (mission: NewMission): string | null => {
    const mStart = new Date(mission.start_at);
    const mEnd = mission.end_at ? new Date(mission.end_at) : new Date(mStart.getTime() + (mission.duration_minutes || 120) * 60000);
    for (const my of myNewMissions) {
      if (["assigned", "confirmed"].includes(my.status)) {
        const s = new Date(my.start_at);
        const e = my.end_at ? new Date(my.end_at) : new Date(s.getTime() + (my.duration_minutes || 120) * 60000);
        if (mStart < e && mEnd > s) {
          return `Conflit avec "${my.title}" le ${s.toLocaleDateString("fr-FR")}`;
        }
      }
    }
    return null;
  };

  const handleApply = async () => {
    if (!applyTarget) return;
    setApplying(true);
    await applyToMission(applyTarget.id, applyMessage);
    setApplying(false);
    setApplyMessage("");
    setApplyTarget(null);
  };

  const handleNewMissionPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, kind: string = 'after') => {
    if (!selectedNewMission || !spId || !e.target.files?.length) return;
    for (const file of Array.from(e.target.files)) {
      await uploadMissionPhoto(file, selectedNewMission.user_id, spId, kind);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: string = "after_cleaning") => {
    if (!legacySelected || !e.target.files?.length) return;
    setUploading(true);
    for (const file of Array.from(e.target.files)) {
      await uploadPhoto(legacySelected.id, file, type);
    }
    setUploading(false);
    await refetch();
  };

  const handleLegacyStart = async () => {
    if (!legacySelected) return;
    await startMission(legacySelected.id);
    await refetch();
    setLegacySelected(null);
  };

  const handleLegacyComplete = async () => {
    if (!legacySelected) return;
    const mandatoryItems = checklistItems.filter(i => i.is_mandatory);
    if (mandatoryItems.length > 0 && !mandatoryItems.every(i => checkedItems[i.id])) return;
    if (!legacySelected.photos || legacySelected.photos.length < 4) return;
    setCompleting(true);
    const result = await completeMission(legacySelected.id, providerComment || undefined);
    setCompleting(false);
    if (result?.success) {
      setLegacySelected(null);
      setProviderComment("");
      setCheckedItems({});
    }
  };

  const photoCount = legacySelected?.photos?.length || 0;
  const mandatoryItems = checklistItems.filter(i => i.is_mandatory);
  const allMandatoryChecked = mandatoryItems.length === 0 || mandatoryItems.every(i => checkedItems[i.id]);
  const canComplete = legacySelected?.status === "in_progress" && photoCount >= 4 && allMandatoryChecked;

  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-5 sm:space-y-6 max-w-6xl">
      {/* ── Header ─────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Missions</h1>
        <p className="text-muted-foreground mt-1 text-sm sm:text-base">
          Postulez aux missions ouvertes ou gérez vos missions acceptées.
        </p>
      </motion.div>

      {/* ── Stats Cards ────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="grid grid-cols-3 gap-3"
      >
        <StatCard icon={Send} label="Missions ouvertes" value={openMissions.length} accent="bg-emerald-600" />
        <StatCard icon={Briefcase} label="Mes missions" value={myMissionsCount} accent="bg-[hsl(var(--brand-blue))]" />
        <StatCard icon={TrendingUp} label="Revenus estimés" value={`${estimatedRevenue}€`} accent="bg-[hsl(var(--gold-dark))]" />
      </motion.div>

      {/* ── Tabs ───────────────────────────────────────────────── */}
      <Tabs defaultValue="ouvertes" className="w-full">
        <TabsList className="w-full h-12 sm:h-11 sm:max-w-md p-1 bg-muted">
          <TabsTrigger value="ouvertes" className="flex-1 h-10 sm:h-9 data-[state=active]:bg-emerald-600 data-[state=active]:text-white gap-1.5 text-sm">
            <Send className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
            Ouvertes
            {openMissions.length > 0 && (
              <span className="ml-1 bg-white/20 text-[11px] px-1.5 py-0.5 rounded-full">{openMissions.length}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="mes-missions" className="flex-1 h-10 sm:h-9 data-[state=active]:bg-[hsl(var(--brand-blue))] data-[state=active]:text-white gap-1.5 text-sm">
            <ClipboardList className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
            Mes missions
          </TabsTrigger>
        </TabsList>

        {/* ── Tab: Ouvertes ────────────────────────────────────── */}
        <TabsContent value="ouvertes" className="mt-4">
          {openMissions.length === 0 ? (
            <Card className="border-dashed border-2 border-border">
              <CardContent className="py-16 text-center">
                <div className="w-16 h-16 rounded-full bg-muted mx-auto flex items-center justify-center mb-4">
                  <Send className="w-7 h-7 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-lg text-foreground mb-1">Aucune mission disponible</h3>
                <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                  Les nouvelles missions apparaîtront ici dès qu'elles seront publiées par votre conciergerie.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {openMissions.map((m, i) => {
                const applied = hasApplied(m);
                const conflict = getConflict(m);
                return (
                  <motion.div key={m.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                    <MissionCard
                      title={m.title}
                      propertyName={m.property?.name}
                      dateStr={fmtDate(m.start_at)}
                      rawDate={m.start_at}
                      missionType={m.mission_type}
                      payoutAmount={m.payout_amount}
                      instructions={m.instructions}
                      status={m.status}
                      propertyPhotoUrl={getPropertyPhoto(m)}
                      applied={applied}
                      conflictWarning={conflict}
                      actions={
                        applied ? (
                          <Badge className="bg-primary/10 text-primary border-primary/20 text-[11px] px-3 py-1.5" variant="outline">
                            ✓ Candidature envoyée
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={(e) => { e.stopPropagation(); setApplyTarget(m); setApplyMessage(""); }}
                          >
                            <Send className="w-3.5 h-3.5" />
                            Postuler
                          </Button>
                        )
                      }
                    />
                  </motion.div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── Tab: Mes missions ────────────────────────────────── */}
        <TabsContent value="mes-missions" className="mt-4 space-y-4">
          <div className="flex items-center gap-2">
            <Button
              variant={myView === "list" ? "default" : "outline"}
              size="sm"
              onClick={() => setMyView("list")}
              className={myView === "list" ? "bg-[hsl(var(--brand-blue))] text-white" : ""}
            >
              <List className="w-3.5 h-3.5 mr-1" /> Liste
            </Button>
            <Button
              variant={myView === "calendar" ? "default" : "outline"}
              size="sm"
              onClick={() => setMyView("calendar")}
              className={myView === "calendar" ? "bg-[hsl(var(--brand-blue))] text-white" : ""}
            >
              <CalendarDays className="w-3.5 h-3.5 mr-1" /> Calendrier
            </Button>
          </div>

          {myView === "calendar" ? (
            <MiniCalendar missions={myNewMissions} onSelect={() => {}} />
          ) : (
            <>
              {myNewMissions.length > 0 && (
                <div className="space-y-3">
                  {myNewMissions.map((m, i) => (
                    <motion.div key={m.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                      <MissionCard
                        title={m.title}
                        propertyName={m.property?.name}
                        dateStr={fmtDate(m.start_at)}
                        rawDate={m.start_at}
                        missionType={m.mission_type}
                        payoutAmount={m.payout_amount}
                        instructions={m.instructions}
                        status={m.status}
                        propertyPhotoUrl={getPropertyPhoto(m)}
                        onClick={() => setSelectedNewMission(m)}
                        actions={
                          <>
                            {m.status === "assigned" && (
                              <Button size="sm" onClick={(e) => { e.stopPropagation(); confirmMission(m.id); }}>
                                <CheckCircle className="w-3.5 h-3.5 mr-1" /> Confirmer
                              </Button>
                            )}
                            {m.status === "confirmed" && (
                              <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setSelectedNewMission(m); }}>
                                <Camera className="w-3.5 h-3.5 mr-1" /> Détail & Photos
                              </Button>
                            )}
                          </>
                        }
                      />
                    </motion.div>
                  ))}
                </div>
              )}

              {myLegacyMissions.length > 0 && (
                <div className="space-y-3">
                  {myNewMissions.length > 0 && (
                    <p className="text-xs text-muted-foreground uppercase tracking-widest pt-2">Interventions (ancien système)</p>
                  )}
                  {myLegacyMissions.map((m, i) => (
                    <motion.div key={m.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                      <MissionCard
                        title={m.property?.name || "Mission"}
                        propertyName={m.property?.address}
                        dateStr={new Date(m.scheduled_date).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })}
                        rawDate={m.scheduled_date}
                        missionType={m.mission_type}
                        payoutAmount={m.mission_amount}
                        instructions={m.notes}
                        status={m.status}
                        photoCount={m.photos?.length || 0}
                        onClick={() => { setLegacySelected(m); setCheckedItems({}); setProviderComment(""); }}
                      />
                    </motion.div>
                  ))}
                </div>
              )}

              {myNewMissions.length === 0 && myLegacyMissions.length === 0 && (
                <Card className="border-dashed border-2 border-border">
                  <CardContent className="py-16 text-center">
                    <div className="w-16 h-16 rounded-full bg-muted mx-auto flex items-center justify-center mb-4">
                      <ClipboardList className="w-7 h-7 text-muted-foreground" />
                    </div>
                    <h3 className="font-semibold text-lg text-foreground mb-1">Aucune mission en cours</h3>
                    <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                      Postulez aux missions ouvertes pour recevoir du travail.
                    </p>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Apply Dialog ──────────────────────────────────────── */}
      <Dialog open={!!applyTarget} onOpenChange={open => { if (!open) setApplyTarget(null); }}>
        <DialogContent>
          {applyTarget && (
            <>
              <DialogHeader>
                <DialogTitle>Postuler : {applyTarget.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="text-sm space-y-1">
                  <p><span className="text-muted-foreground">Logement :</span> {applyTarget.property?.name}</p>
                  <p><span className="text-muted-foreground">Date :</span> {fmtDate(applyTarget.start_at)}</p>
                  <p><span className="text-muted-foreground">Montant :</span> <span className="font-bold text-emerald-600">{applyTarget.payout_amount}€</span></p>
                </div>
                {applyTarget.instructions && (
                  <div className="p-3 bg-muted/50 rounded-lg text-sm">
                    <p className="font-medium mb-1">Instructions :</p>
                    <p className="whitespace-pre-wrap">{applyTarget.instructions}</p>
                  </div>
                )}
                {getConflict(applyTarget) && (
                  <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{getConflict(applyTarget)}</span>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium mb-2">Message (optionnel)</p>
                  <Textarea value={applyMessage} onChange={e => setApplyMessage(e.target.value)} placeholder="Précisez vos disponibilités…" rows={3} />
                </div>
                <Button onClick={handleApply} disabled={applying} className="w-full gap-2">
                  {applying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Envoyer ma candidature
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Legacy Mission Detail Dialog ──────────────────────── */}
      <Dialog open={!!legacySelected} onOpenChange={open => { if (!open) { setLegacySelected(null); setCheckedItems({}); } }}>
        <DialogContent className="max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-auto w-[calc(100vw-2rem)] sm:w-auto">
          {legacySelected && (
            <>
              <DialogHeader>
                <DialogTitle>{legacySelected.property?.name || "Mission"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Date :</span> {new Date(legacySelected.scheduled_date).toLocaleDateString("fr-FR")}</div>
                  <div><span className="text-muted-foreground">Type :</span> {missionTypeLabels[legacySelected.mission_type] || legacySelected.mission_type}</div>
                  <div>
                    <span className="text-muted-foreground">Statut : </span>
                    <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full border ${statusConfig[legacySelected.status]?.pillClass || "bg-muted"}`}>
                      {statusConfig[legacySelected.status]?.label || legacySelected.status}
                    </span>
                  </div>
                  <div><span className="text-muted-foreground">Montant :</span> <span className="font-bold text-emerald-600">{legacySelected.mission_amount}€</span></div>
                </div>

                {legacySelected.notes && (
                  <div className="p-3 bg-muted/50 rounded-lg text-sm">
                    <p className="font-medium mb-1">Instructions :</p>
                    <p>{legacySelected.notes}</p>
                  </div>
                )}

                {legacySelected.status === "scheduled" && (
                  <Button onClick={handleLegacyStart} className="w-full bg-[hsl(var(--brand-blue))]">
                    <Play className="w-4 h-4 mr-2" /> Démarrer la mission
                  </Button>
                )}

                {(legacySelected.status === "in_progress" || legacySelected.status === "redo") && (
                  <>
                    {checklistItems.length > 0 && (
                      <div className="space-y-2">
                        <h3 className="font-semibold text-sm">✅ Checklist</h3>
                        {checklistItems.map(item => (
                          <label key={item.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer">
                            <Checkbox checked={!!checkedItems[item.id]} onCheckedChange={checked => setCheckedItems(prev => ({ ...prev, [item.id]: !!checked }))} />
                            <span className="text-sm flex-1">{item.task_text}</span>
                            {item.is_mandatory && <span className="text-[10px] text-destructive font-medium">Obligatoire</span>}
                          </label>
                        ))}
                      </div>
                    )}

                    <div>
                      <h3 className="font-semibold text-sm mb-2">📸 Photos ({photoCount}/4 minimum)</h3>
                      {legacySelected.photos && legacySelected.photos.length > 0 && (
                        <div className="grid grid-cols-4 gap-2 mb-3">
                          {legacySelected.photos.map(p => (
                            <div key={p.id} className="relative aspect-square rounded-lg overflow-hidden">
                              <img src={p.url} alt="" className="w-full h-full object-cover" />
                            </div>
                          ))}
                        </div>
                      )}
                      <label className="cursor-pointer block">
                        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => handleFileUpload(e, "after_cleaning")} disabled={uploading} />
                        <div className="flex items-center justify-center gap-2 p-3 border-2 border-dashed border-primary/30 rounded-lg hover:bg-primary/5 bg-primary/5 min-h-[48px]">
                          <Camera className="w-5 h-5 text-primary" />
                          <span className="text-sm font-medium text-primary">{uploading ? "Upload…" : "📷 Prendre une photo"}</span>
                        </div>
                      </label>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <label className="cursor-pointer block">
                          <input type="file" accept="image/*" multiple className="hidden" onChange={e => handleFileUpload(e, "after_cleaning")} disabled={uploading} />
                          <div className="flex items-center justify-center gap-2 p-2.5 border border-dashed border-primary/30 rounded-lg hover:bg-primary/5 min-h-[44px]">
                            <Upload className="w-4 h-4 text-primary" />
                            <span className="text-xs font-medium text-primary">Galerie</span>
                          </div>
                        </label>
                        <label className="cursor-pointer block">
                          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => handleFileUpload(e, "incident")} disabled={uploading} />
                          <div className="flex items-center justify-center gap-2 p-2.5 border border-dashed border-destructive/30 rounded-lg hover:bg-destructive/5 min-h-[44px]">
                            <AlertTriangle className="w-4 h-4 text-destructive" />
                            <span className="text-xs font-medium text-destructive">Incident</span>
                          </div>
                        </label>
                      </div>
                      {photoCount < 4 && <p className="text-xs text-destructive mt-2">⚠️ Minimum 4 photos requises</p>}
                    </div>

                    <div>
                      <h3 className="font-semibold text-sm mb-2">💬 Commentaire (optionnel)</h3>
                      <Textarea value={providerComment} onChange={e => setProviderComment(e.target.value)} placeholder="Observations…" rows={3} />
                    </div>

                    <Button onClick={handleLegacyComplete} disabled={completing || !canComplete} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      {completing ? "Validation…" : "Mission terminée"}
                    </Button>
                  </>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── New Mission Detail Dialog ─────────────────────────── */}
      <Dialog open={!!selectedNewMission} onOpenChange={open => { if (!open) setSelectedNewMission(null); }}>
        <DialogContent className="max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-auto w-[calc(100vw-2rem)] sm:w-auto">
          {selectedNewMission && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedNewMission.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Logement :</span> {selectedNewMission.property?.name}</div>
                  <div><span className="text-muted-foreground">Date :</span> {fmtDate(selectedNewMission.start_at)}</div>
                  <div><span className="text-muted-foreground">Type :</span> {missionTypeLabels[selectedNewMission.mission_type] || selectedNewMission.mission_type}</div>
                  <div><span className="text-muted-foreground">Montant :</span> <span className="font-bold text-emerald-600">{selectedNewMission.payout_amount}€</span></div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Statut : </span>
                    <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full border ${statusConfig[selectedNewMission.status]?.pillClass || "bg-muted"}`}>
                      {statusConfig[selectedNewMission.status]?.label || selectedNewMission.status}
                    </span>
                  </div>
                </div>

                {selectedNewMission.instructions && (
                  <div className="p-3 bg-muted/50 rounded-lg text-sm">
                    <p className="font-medium mb-1">Instructions :</p>
                    <p className="whitespace-pre-wrap">{selectedNewMission.instructions}</p>
                  </div>
                )}

                {selectedNewMission.status === "assigned" && (
                  <Button
                    onClick={() => { confirmMission(selectedNewMission.id); setSelectedNewMission(null); }}
                    className="w-full"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" /> Confirmer la mission
                  </Button>
                )}

                {(selectedNewMission.status === "confirmed" || selectedNewMission.status === "done") && (
                  <>
                    <div>
                      <h3 className="font-semibold text-sm mb-2">📸 Photos de preuve ({missionPhotos.length})</h3>
                      {missionPhotos.length > 0 && (
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-3">
                          {missionPhotos.map(p => (
                            <div key={p.id} className="relative aspect-square rounded-lg overflow-hidden border border-border">
                              <img src={p.url} alt="" className="w-full h-full object-cover" />
                              <span className="absolute bottom-0 left-0 right-0 text-[10px] bg-black/60 text-white text-center py-0.5">
                                {p.kind === 'before' ? 'Avant' : p.kind === 'incident' ? '⚠️ Incident' : 'Après'}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {uploadingNewPhoto && (
                        <div className="mb-3">
                          <Progress value={uploadProgress} className="h-2" />
                          <p className="text-xs text-muted-foreground mt-1">Upload en cours…</p>
                        </div>
                      )}

                      <label className="cursor-pointer block">
                        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => handleNewMissionPhotoUpload(e, 'after')} disabled={uploadingNewPhoto} />
                        <div className="flex items-center justify-center gap-2 p-3 border-2 border-dashed border-primary/30 rounded-lg hover:bg-primary/5 bg-primary/5 min-h-[48px]">
                          <Camera className="w-5 h-5 text-primary" />
                          <span className="text-sm font-medium text-primary">{uploadingNewPhoto ? "Upload…" : "📷 Prendre une photo"}</span>
                        </div>
                      </label>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <label className="cursor-pointer block">
                          <input type="file" accept="image/*" multiple className="hidden" onChange={e => handleNewMissionPhotoUpload(e, 'after')} disabled={uploadingNewPhoto} />
                          <div className="flex items-center justify-center gap-2 p-2.5 border border-dashed border-primary/30 rounded-lg hover:bg-primary/5 min-h-[44px]">
                            <Upload className="w-4 h-4 text-primary" />
                            <span className="text-xs font-medium text-primary">Galerie</span>
                          </div>
                        </label>
                        <label className="cursor-pointer block">
                          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => handleNewMissionPhotoUpload(e, 'incident')} disabled={uploadingNewPhoto} />
                          <div className="flex items-center justify-center gap-2 p-2.5 border border-dashed border-destructive/30 rounded-lg hover:bg-destructive/5 min-h-[44px]">
                            <AlertTriangle className="w-4 h-4 text-destructive" />
                            <span className="text-xs font-medium text-destructive">Incident</span>
                          </div>
                        </label>
                      </div>
                    </div>

                    {selectedNewMission.status === "confirmed" && (
                      <Button
                        onClick={() => { markDone(selectedNewMission.id); setSelectedNewMission(null); }}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                        disabled={missionPhotos.length < 1}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" /> Mission terminée
                      </Button>
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
