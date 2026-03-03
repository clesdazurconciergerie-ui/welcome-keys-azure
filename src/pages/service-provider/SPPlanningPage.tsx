import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, MapPin, Clock, Euro } from "lucide-react";
import { motion } from "framer-motion";
import { useNewMissions, type NewMission } from "@/hooks/useNewMissions";
import { useIsMobile } from "@/hooks/use-mobile";
import { useNavigate } from "react-router-dom";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ViewMode = "week" | "month" | "list";

const GOLD = "#C8A24D";
const BLUE = "#3B82F6";

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function startOfWeek(d: Date) {
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  const start = new Date(d);
  start.setDate(d.getDate() + diff);
  start.setHours(0, 0, 0, 0);
  return start;
}

function MissionDetailDialog({ mission, open, onClose }: { mission: NewMission | null; open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  if (!mission) return null;

  const isOpen = mission.status === "open";
  const statusLabel = isOpen ? "Mission disponible" : "Mission confirmée";
  const statusColor = isOpen ? "bg-blue-100 text-blue-800" : "bg-amber-100 text-amber-800";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg">{mission.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Badge className={statusColor}>{statusLabel}</Badge>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4 shrink-0" />
            <span>{mission.property?.name} — {mission.property?.address}</span>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4 shrink-0" />
            <span>
              {new Date(mission.start_at).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
              {" · "}
              {formatTime(mission.start_at)}
              {mission.end_at && ` — ${formatTime(mission.end_at)}`}
            </span>
          </div>

          {mission.payout_amount > 0 && (
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Euro className="w-4 h-4 shrink-0" />
              <span>{mission.payout_amount} €</span>
            </div>
          )}

          {mission.instructions && (
            <div className="text-sm bg-muted/50 rounded-lg p-3 mt-2">
              <p className="font-medium mb-1">Instructions</p>
              <p className="text-muted-foreground whitespace-pre-wrap">{mission.instructions}</p>
            </div>
          )}

          <Button
            className="w-full mt-2"
            onClick={() => {
              onClose();
              navigate("/prestataire/missions");
            }}
          >
            {isOpen ? "Postuler" : "Voir la mission"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MissionPill({ mission, onClick }: { mission: NewMission; onClick: () => void }) {
  const isOpen = mission.status === "open";
  const bg = isOpen ? "bg-blue-100 border-blue-300 text-blue-800" : "bg-amber-100 border-amber-300 text-amber-800";

  return (
    <button
      onClick={onClick}
      className={`text-[10px] leading-tight px-1.5 py-0.5 rounded border truncate w-full text-left ${bg} hover:opacity-80 transition-opacity`}
      title={`${mission.property?.name} · ${formatTime(mission.start_at)}`}
    >
      {isOpen ? "📢" : "✅"} {mission.property?.name?.substring(0, 12) || "Mission"}
    </button>
  );
}

export default function SPPlanningPage() {
  const { missions, isLoading } = useNewMissions("provider");
  const isMobile = useIsMobile();
  const [view, setView] = useState<ViewMode>(isMobile ? "week" : "month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedMission, setSelectedMission] = useState<NewMission | null>(null);
  const navigate = useNavigate();

  // Filter: exclude canceled, exclude paid/done older than 30 days
  const filtered = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    return missions.filter((m) => {
      if (m.status === "canceled") return false;
      if (["paid", "done"].includes(m.status) && new Date(m.start_at) < cutoff) return false;
      return true;
    });
  }, [missions]);

  const getMissionsForDay = (date: Date) =>
    filtered.filter((m) => isSameDay(new Date(m.start_at), date));

  const today = new Date();

  // Navigation
  const navigate_period = (dir: number) => {
    const d = new Date(currentDate);
    if (view === "week") d.setDate(d.getDate() + dir * 7);
    else d.setMonth(d.getMonth() + dir);
    setCurrentDate(d);
  };

  // Period label
  const periodLabel = useMemo(() => {
    if (view === "week") {
      const ws = startOfWeek(currentDate);
      const we = new Date(ws);
      we.setDate(ws.getDate() + 6);
      return `${ws.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} — ${we.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}`;
    }
    return currentDate.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  }, [currentDate, view]);

  // Generate calendar days
  const calendarDays = useMemo(() => {
    if (view === "week") {
      const ws = startOfWeek(currentDate);
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(ws);
        d.setDate(ws.getDate() + i);
        return d;
      });
    }
    // Month
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const offset = (first.getDay() + 6) % 7;
    const days: (Date | null)[] = [];
    for (let i = 0; i < offset; i++) days.push(null);
    for (let d = 1; d <= last.getDate(); d++) days.push(new Date(year, month, d));
    return days;
  }, [currentDate, view]);

  // List view: group by date
  const listItems = useMemo(() => {
    const sorted = [...filtered].sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());
    const groups: Record<string, NewMission[]> = {};
    sorted.forEach((m) => {
      const key = new Date(m.start_at).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
      if (!groups[key]) groups[key] = [];
      groups[key].push(m);
    });
    return groups;
  }, [filtered]);

  const dayHeaders = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

  return (
    <div className="space-y-5 max-w-6xl">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Mon planning</h1>
        <p className="text-muted-foreground mt-1 text-sm">Vue calendrier de vos missions</p>
      </motion.div>

      <Card>
        <CardContent className="pt-6">
          {/* Controls */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => navigate_period(-1)}>
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <h2 className="text-base sm:text-lg font-semibold capitalize min-w-[180px] text-center">{periodLabel}</h2>
              <Button variant="ghost" size="icon" onClick={() => navigate_period(1)}>
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>

            <ToggleGroup type="single" value={view} onValueChange={(v) => v && setView(v as ViewMode)} size="sm">
              <ToggleGroupItem value="week" className="text-xs px-3">Semaine</ToggleGroupItem>
              <ToggleGroupItem value="month" className="text-xs px-3">Mois</ToggleGroupItem>
              <ToggleGroupItem value="list" className="text-xs px-3">Liste</ToggleGroupItem>
            </ToggleGroup>
          </div>

          {/* Calendar grid (week & month) */}
          {view !== "list" && (
            <>
              <div className="grid grid-cols-7 gap-1 mb-2">
                {dayHeaders.map((d) => (
                  <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1.5">{d}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((date, i) => {
                  if (!date) return <div key={`e-${i}`} className={view === "month" ? "min-h-[70px] sm:min-h-[90px]" : "min-h-[100px]"} />;

                  const dayMissions = getMissionsForDay(date);
                  const isToday_ = isSameDay(date, today);
                  const maxShow = view === "week" ? 5 : 3;

                  return (
                    <div
                      key={date.toISOString()}
                      className={`${view === "month" ? "min-h-[70px] sm:min-h-[90px]" : "min-h-[100px]"} p-1 rounded-lg border transition-colors ${
                        isToday_ ? "ring-2 ring-primary border-primary/30 bg-primary/5" : "border-border/50 hover:bg-muted/30"
                      }`}
                    >
                      <p className={`text-xs font-medium mb-1 ${isToday_ ? "text-primary font-bold" : "text-muted-foreground"}`}>
                        {view === "week"
                          ? date.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" })
                          : date.getDate()}
                      </p>
                      <div className="space-y-0.5">
                        {dayMissions.slice(0, maxShow).map((m) => (
                          <MissionPill key={m.id} mission={m} onClick={() => setSelectedMission(m)} />
                        ))}
                        {dayMissions.length > maxShow && (
                          <p className="text-[10px] text-muted-foreground text-center">+{dayMissions.length - maxShow} autres</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* List view */}
          {view === "list" && (
            <div className="space-y-4">
              {Object.keys(listItems).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">Aucune mission à afficher</p>
              )}
              {Object.entries(listItems).map(([dateLabel, items]) => (
                <div key={dateLabel}>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{dateLabel}</p>
                  <div className="space-y-2">
                    {items.map((m) => {
                      const isOpen = m.status === "open";
                      return (
                        <button
                          key={m.id}
                          onClick={() => setSelectedMission(m)}
                          className="w-full text-left flex items-center gap-3 p-3 rounded-xl border border-border/50 hover:bg-muted/50 transition-colors"
                        >
                          <div
                            className="w-1 h-10 rounded-full shrink-0"
                            style={{ backgroundColor: isOpen ? BLUE : GOLD }}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{m.property?.name || m.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatTime(m.start_at)}
                              {m.end_at && ` — ${formatTime(m.end_at)}`}
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
                </div>
              ))}
            </div>
          )}

          {/* Legend */}
          <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: GOLD }} />
              Mission confirmée
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: BLUE }} />
              Mission disponible
            </div>
          </div>
        </CardContent>
      </Card>

      <MissionDetailDialog mission={selectedMission} open={!!selectedMission} onClose={() => setSelectedMission(null)} />
    </div>
  );
}
