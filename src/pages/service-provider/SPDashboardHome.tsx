import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ClipboardList, CheckCircle, Clock, DollarSign, Star, TrendingUp,
  ChevronLeft, ChevronRight, MapPin, Euro,
} from "lucide-react";
import { motion } from "framer-motion";
import { useNewMissions, type NewMission } from "@/hooks/useNewMissions";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

// ─── Helpers ──────────────────────────────────────────
type ViewMode = "week" | "month";
const GOLD = "#C8A24D";
const BLUE = "#3B82F6";

function fmt(d: string) {
  return new Date(d).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}
function same(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function weekStart(d: Date) {
  const day = d.getDay();
  const s = new Date(d);
  s.setDate(d.getDate() + ((day === 0 ? -6 : 1) - day));
  s.setHours(0, 0, 0, 0);
  return s;
}

// ─── Mission Detail Dialog ────────────────────────────
function MissionDetailDialog({ mission, open, onClose }: { mission: NewMission | null; open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  if (!mission) return null;
  const isOpen = mission.status === "open";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle className="text-lg">{mission.title}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Badge className={isOpen ? "bg-blue-100 text-blue-800" : "bg-amber-100 text-amber-800"}>
            {isOpen ? "Mission disponible" : "Mission confirmée"}
          </Badge>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4 shrink-0" />
            <span>{mission.property?.name} — {mission.property?.address}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4 shrink-0" />
            <span>
              {new Date(mission.start_at).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
              {" · "}{fmt(mission.start_at)}
              {mission.end_at && ` — ${fmt(mission.end_at)}`}
            </span>
          </div>
          {mission.payout_amount > 0 && (
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Euro className="w-4 h-4 shrink-0" /><span>{mission.payout_amount} €</span>
            </div>
          )}
          {mission.instructions && (
            <div className="text-sm bg-muted/50 rounded-lg p-3 mt-2">
              <p className="font-medium mb-1">Instructions</p>
              <p className="text-muted-foreground whitespace-pre-wrap">{mission.instructions}</p>
            </div>
          )}
          <Button className="w-full mt-2" onClick={() => { onClose(); navigate("/prestataire/missions"); }}>
            {isOpen ? "Postuler" : "Voir la mission"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Pill on calendar cell ────────────────────────────
function Pill({ m, onClick }: { m: NewMission; onClick: () => void }) {
  const isOpen = m.status === "open";
  const bg = isOpen ? "bg-blue-100 border-blue-300 text-blue-800" : "bg-amber-100 border-amber-300 text-amber-800";
  return (
    <button
      onClick={onClick}
      className={`text-[10px] leading-tight px-1.5 py-0.5 rounded border truncate w-full text-left ${bg} hover:opacity-80 transition-opacity`}
      title={`${m.property?.name} · ${fmt(m.start_at)}`}
    >
      {isOpen ? "📢" : "✅"} {m.property?.name?.substring(0, 12) || "Mission"}
    </button>
  );
}

// ─── Main Component ───────────────────────────────────
export default function SPDashboardHome() {
  const { missions, isLoading } = useNewMissions("provider");
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  // Calendar state
  const [view, setView] = useState<ViewMode>(isMobile ? "week" : "month");
  const [curDate, setCurDate] = useState(new Date());
  const [selectedMission, setSelectedMission] = useState<NewMission | null>(null);

  // ── KPI data ────────────────────────────────────────
  const today = new Date();
  const curMonth = today.getMonth();
  const curYear = today.getFullYear();

  const active = missions.filter(m => ["assigned", "confirmed", "in_progress"].includes(m.status));
  const validated = missions.filter(m => m.status === "validated");
  const paid = missions.filter(m => m.status === "paid");

  const pendingPayment = validated.reduce((s, m) => s + (m.payout_amount || 0), 0);
  const totalPaid = paid
    .filter(m => { const d = new Date(m.start_at); return d.getMonth() === curMonth && d.getFullYear() === curYear; })
    .reduce((s, m) => s + (m.payout_amount || 0), 0);

  const stats = [
    { label: "Missions en cours", value: active.length, icon: Clock, color: "text-amber-500", bg: "bg-amber-50" },
    { label: "Missions validées", value: validated.length + paid.length, icon: CheckCircle, color: "text-emerald-500", bg: "bg-emerald-50" },
    { label: "Paiements en attente", value: `${pendingPayment}€`, icon: DollarSign, color: "text-blue-500", bg: "bg-blue-50" },
    { label: "Total payé (mois)", value: `${totalPaid}€`, icon: TrendingUp, color: "text-[hsl(var(--gold))]", bg: "bg-amber-50" },
  ];

  // ── Calendar data ───────────────────────────────────
  const cutoff = useMemo(() => { const d = new Date(); d.setDate(d.getDate() - 30); return d; }, []);
  const calMissions = useMemo(() =>
    missions.filter(m => {
      if (m.status === "canceled") return false;
      if (["paid", "done"].includes(m.status) && new Date(m.start_at) < cutoff) return false;
      return true;
    }),
  [missions, cutoff]);

  const forDay = (d: Date) => calMissions.filter(m => same(new Date(m.start_at), d));

  const navPeriod = (dir: number) => {
    const d = new Date(curDate);
    if (view === "week") d.setDate(d.getDate() + dir * 7);
    else d.setMonth(d.getMonth() + dir);
    setCurDate(d);
  };

  const label = useMemo(() => {
    if (view === "week") {
      const ws = weekStart(curDate);
      const we = new Date(ws); we.setDate(ws.getDate() + 6);
      return `${ws.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} — ${we.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}`;
    }
    return curDate.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  }, [curDate, view]);

  const days = useMemo(() => {
    if (view === "week") {
      const ws = weekStart(curDate);
      return Array.from({ length: 7 }, (_, i) => { const d = new Date(ws); d.setDate(ws.getDate() + i); return d; });
    }
    const y = curDate.getFullYear(), mo = curDate.getMonth();
    const first = new Date(y, mo, 1);
    const last = new Date(y, mo + 1, 0);
    const off = (first.getDay() + 6) % 7;
    const arr: (Date | null)[] = [];
    for (let i = 0; i < off; i++) arr.push(null);
    for (let d = 1; d <= last.getDate(); d++) arr.push(new Date(y, mo, d));
    return arr;
  }, [curDate, view]);

  const dayHeaders = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

  // ── Upcoming missions ───────────────────────────────
  const upcoming = useMemo(() =>
    calMissions
      .filter(m => new Date(m.start_at) >= today)
      .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())
      .slice(0, 5),
  [calMissions, today]);

  return (
    <div className="space-y-5 sm:space-y-6 max-w-6xl">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Tableau de bord</h1>
        <p className="text-muted-foreground mt-1 text-sm sm:text-base">Bienvenue dans votre espace prestataire</p>
      </motion.div>

      {/* ── KPI Cards ─────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {stats.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
            <Card className="border-border hover:shadow-md transition-shadow">
              <CardContent className="p-4 sm:pt-6">
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 sm:w-10 sm:h-10 rounded-xl ${s.bg} flex items-center justify-center shrink-0`}>
                    <s.icon className={`h-5 w-5 ${s.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-2xl font-bold">{isLoading ? "—" : s.value}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* ── Integrated Calendar ───────────────────────── */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => navPeriod(-1)}><ChevronLeft className="w-5 h-5" /></Button>
              <h2 className="text-base sm:text-lg font-semibold capitalize min-w-[180px] text-center">{label}</h2>
              <Button variant="ghost" size="icon" onClick={() => navPeriod(1)}><ChevronRight className="w-5 h-5" /></Button>
            </div>
            <ToggleGroup type="single" value={view} onValueChange={(v) => v && setView(v as ViewMode)} size="sm">
              <ToggleGroupItem value="week" className="text-xs px-3">Semaine</ToggleGroupItem>
              <ToggleGroupItem value="month" className="text-xs px-3">Mois</ToggleGroupItem>
            </ToggleGroup>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {dayHeaders.map(d => <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1.5">{d}</div>)}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((date, i) => {
              if (!date) return <div key={`e-${i}`} className={view === "month" ? "min-h-[70px] sm:min-h-[90px]" : "min-h-[100px]"} />;
              const dm = forDay(date);
              const isT = same(date, today);
              const max = view === "week" ? 5 : 3;
              return (
                <div
                  key={date.toISOString()}
                  className={`${view === "month" ? "min-h-[70px] sm:min-h-[90px]" : "min-h-[100px]"} p-1 rounded-lg border transition-colors ${
                    isT ? "ring-2 ring-primary border-primary/30 bg-primary/5" : "border-border/50 hover:bg-muted/30"
                  }`}
                >
                  <p className={`text-xs font-medium mb-1 ${isT ? "text-primary font-bold" : "text-muted-foreground"}`}>
                    {view === "week" ? date.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" }) : date.getDate()}
                  </p>
                  <div className="space-y-0.5">
                    {dm.slice(0, max).map(m => <Pill key={m.id} m={m} onClick={() => setSelectedMission(m)} />)}
                    {dm.length > max && <p className="text-[10px] text-muted-foreground text-center">+{dm.length - max} autres</p>}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: GOLD }} /> Mission confirmée
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: BLUE }} /> Mission disponible
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Upcoming missions list ────────────────────── */}
      {upcoming.length > 0 && (
        <Card>
          <CardContent className="p-4 sm:pt-6">
            <h2 className="text-base sm:text-lg font-semibold mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              Prochaines missions
            </h2>
            <div className="space-y-2">
              {upcoming.map(m => {
                const isOpen = m.status === "open";
                return (
                  <button
                    key={m.id}
                    onClick={() => setSelectedMission(m)}
                    className="w-full text-left flex items-center gap-3 p-3 rounded-xl border border-border/50 hover:bg-muted/50 transition-colors"
                  >
                    <div className="w-1 h-10 rounded-full shrink-0" style={{ backgroundColor: isOpen ? BLUE : GOLD }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{m.property?.name || m.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(m.start_at).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })}
                        {" · "}{fmt(m.start_at)}
                        {m.payout_amount > 0 && ` · ${m.payout_amount} €`}
                      </p>
                    </div>
                    <Badge variant="secondary" className={`text-[10px] shrink-0 ${isOpen ? "bg-blue-100 text-blue-800" : "bg-amber-100 text-amber-800"}`}>
                      {isOpen ? "Disponible" : "Confirmée"}
                    </Badge>
                  </button>
                );
              })}
            </div>
            <Button variant="outline" className="w-full sm:w-auto mt-3 h-11 sm:h-9" onClick={() => navigate("/prestataire/missions")}>
              <ClipboardList className="w-4 h-4 mr-2" /> Voir toutes les missions
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Mobile FAB */}
      <div className="fixed bottom-6 right-6 sm:hidden z-50">
        <Button size="lg" className="rounded-full w-14 h-14 shadow-lg bg-primary hover:bg-primary/90 p-0" onClick={() => navigate("/prestataire/missions")}>
          <ClipboardList className="w-6 h-6" />
        </Button>
      </div>

      <MissionDetailDialog mission={selectedMission} open={!!selectedMission} onClose={() => setSelectedMission(null)} />
    </div>
  );
}
