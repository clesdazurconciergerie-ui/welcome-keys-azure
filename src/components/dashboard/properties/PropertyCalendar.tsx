import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ChevronLeft, ChevronRight, Plus, RefreshCw, Trash2, Link2, Loader2, Calendar,
} from "lucide-react";
import { useICalCalendar, type CalendarEvent } from "@/hooks/useICalCalendar";

const platformColors: Record<string, string> = {
  airbnb: "bg-[#FF5A5F]/10 text-[#FF5A5F] border-[#FF5A5F]/20",
  booking: "bg-[#003580]/10 text-[#003580] border-[#003580]/20",
  vrbo: "bg-[#3B5998]/10 text-[#3B5998] border-[#3B5998]/20",
  manual: "bg-muted text-muted-foreground border-border",
  other: "bg-accent/50 text-accent-foreground border-accent",
};

const eventTypeStyles: Record<string, { bg: string; label: string; icon: string }> = {
  reservation: { bg: "", label: "Réservation", icon: "●" },
  manual_block: { bg: "bg-amber-100 text-amber-700 border-amber-300 border-dashed", label: "Date bloquée", icon: "▧" },
  unknown: { bg: "bg-amber-100 text-amber-700 border-amber-300 border-dashed", label: "Date bloquée", icon: "▧" },
};

const platformLabels: Record<string, string> = {
  airbnb: "Airbnb",
  booking: "Booking.com",
  vrbo: "VRBO",
  manual: "Manuel",
  other: "Autre",
};

interface Props {
  propertyId: string;
}

export function PropertyCalendar({ propertyId }: Props) {
  const {
    calendars, events, isSyncing, addCalendar, removeCalendar, syncAll, deleteEvent,
  } = useICalCalendar(propertyId);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"month" | "week">("month");
  const [addCalOpen, setAddCalOpen] = useState(false);
  const [calName, setCalName] = useState("");
  const [calUrl, setCalUrl] = useState("");
  const [calPlatform, setCalPlatform] = useState("airbnb");
  const [deleteCalId, setDeleteCalId] = useState<string | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Generate calendar days
  const calendarDays = useMemo(() => {
    if (viewMode === "month") {
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const startOffset = (firstDay.getDay() + 6) % 7;
      const days: (Date | null)[] = [];
      for (let i = 0; i < startOffset; i++) days.push(null);
      for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(year, month, d));
      return days;
    } else {
      // Week view - get current week
      const day = currentDate.getDay();
      const mondayOffset = day === 0 ? -6 : 1 - day;
      const monday = new Date(year, month, currentDate.getDate() + mondayOffset);
      const days: (Date | null)[] = [];
      for (let i = 0; i < 7; i++) {
        days.push(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i));
      }
      return days;
    }
  }, [year, month, currentDate, viewMode]);

  const getEventsForDay = (date: Date): CalendarEvent[] => {
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    return events.filter(e => e.start_date <= dateStr && e.end_date > dateStr);
  };

  const today = new Date();
  const isToday = (d: Date) =>
    d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();

  const monthName = currentDate.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  const navigate = (dir: number) => {
    if (viewMode === "month") {
      setCurrentDate(new Date(year, month + dir, 1));
    } else {
      setCurrentDate(new Date(year, month, currentDate.getDate() + dir * 7));
    }
  };

  const handleAddCalendar = async () => {
    if (!calUrl.trim()) return;
    await addCalendar(calName || platformLabels[calPlatform] || "Calendrier", calUrl, calPlatform);
    setAddCalOpen(false);
    setCalName("");
    setCalUrl("");
  };

  return (
    <div className="space-y-4">
      {/* Connected calendars */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          {calendars.map(cal => (
            <Badge key={cal.id} variant="outline" className={`gap-1.5 py-1 px-2.5 ${platformColors[cal.platform] || platformColors.other}`}>
              <span className="text-xs font-medium">{cal.name || platformLabels[cal.platform]}</span>
              {cal.last_synced_at && (
                <span className="text-[9px] opacity-60">
                  {new Date(cal.last_synced_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
              <button onClick={() => setDeleteCalId(cal.id)} className="ml-1 opacity-50 hover:opacity-100">
                <Trash2 className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {calendars.length > 0 && (
            <Button variant="outline" size="sm" onClick={syncAll} disabled={isSyncing}>
              {isSyncing ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
              Synchroniser
            </Button>
          )}
          <Button size="sm" onClick={() => setAddCalOpen(true)} className="bg-[hsl(var(--gold))] hover:bg-[hsl(var(--gold))]/90 text-[hsl(var(--brand-blue))] font-semibold">
            <Link2 className="h-3.5 w-3.5 mr-1.5" />
            Connecter iCal
          </Button>
        </div>
      </div>

      {/* Calendar header */}
      <Card>
        <CardContent className="pt-5">
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold capitalize">{monthName}</h2>
              <div className="flex rounded-lg border border-border overflow-hidden">
                <button
                  className={`px-3 py-1 text-xs font-medium transition-colors ${viewMode === "month" ? "bg-primary text-primary-foreground" : "bg-transparent text-muted-foreground hover:bg-muted"}`}
                  onClick={() => setViewMode("month")}
                >
                  Mois
                </button>
                <button
                  className={`px-3 py-1 text-xs font-medium transition-colors ${viewMode === "week" ? "bg-primary text-primary-foreground" : "bg-transparent text-muted-foreground hover:bg-muted"}`}
                  onClick={() => setViewMode("week")}
                >
                  Semaine
                </button>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => navigate(1)}>
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map(d => (
              <div key={d} className="text-center text-[11px] font-medium text-muted-foreground py-1.5">{d}</div>
            ))}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((date, i) => {
              if (!date) return <div key={`e-${i}`} className={viewMode === "week" ? "min-h-[120px]" : "min-h-[72px]"} />;
              const dayEvents = getEventsForDay(date);
              const todayCls = isToday(date) ? "ring-2 ring-primary ring-offset-1" : "";

              return (
                <div
                  key={date.toISOString()}
                  className={`${viewMode === "week" ? "min-h-[120px]" : "min-h-[72px]"} p-1 rounded-xl border border-border/40 ${todayCls} hover:bg-muted/20 transition-colors`}
                >
                  <p className={`text-[11px] font-medium mb-0.5 ${isToday(date) ? "text-primary font-bold" : "text-muted-foreground"}`}>
                    {date.getDate()}
                  </p>
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, viewMode === "week" ? 5 : 2).map(ev => {
                      const evType = ev.event_type || "unknown";
                      const typeStyle = eventTypeStyles[evType] || eventTypeStyles.unknown;
                      const colorCls = evType === "unknown" ? typeStyle.bg : (platformColors[ev.platform] || platformColors.other);
                      return (
                        <div
                          key={ev.id}
                          className={`text-[9px] leading-tight px-1.5 py-0.5 rounded-md truncate border ${colorCls} ${typeStyle.bg}`}
                          title={`${typeStyle.label}: ${ev.summary || "Réservation"} ${ev.guest_name ? `- ${ev.guest_name}` : ""}`}
                        >
                          {evType === "reservation" ? (ev.guest_name || ev.summary || "Réservation") : "Date bloquée"}
                        </div>
                      );
                    })}
                    {dayEvents.length > (viewMode === "week" ? 5 : 2) && (
                      <p className="text-[9px] text-muted-foreground text-center">+{dayEvents.length - (viewMode === "week" ? 5 : 2)}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 mt-4 pt-3 border-t">
            <div className="flex flex-wrap gap-3">
              {Object.entries(eventTypeStyles).map(([key, style]) => (
                <div key={key} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span className="text-xs">{style.icon}</span>
                  {style.label}
                </div>
              ))}
            </div>
            <div className="w-px bg-border" />
            <div className="flex flex-wrap gap-3">
              {Object.entries(platformLabels).map(([key, label]) => {
                const hasEvents = events.some(e => e.platform === key) || calendars.some(c => c.platform === key);
                if (!hasEvents && key !== "manual") return null;
                return (
                  <div key={key} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span className={`w-3 h-3 rounded-sm border ${platformColors[key]}`} />
                    {label}
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upcoming events list */}
      {events.length > 0 && (
        <Card>
          <CardContent className="pt-5">
            <h3 className="text-sm font-semibold text-foreground mb-3">Réservations à venir</h3>
            <div className="space-y-2">
              {events
                .filter(e => e.end_date >= new Date().toISOString().substring(0, 10))
                .slice(0, 10)
                .map(ev => (
                  <div key={ev.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 border border-border/40">
                    <div className="flex items-center gap-3 min-w-0">
                      <Badge variant="outline" className={`shrink-0 text-[9px] ${platformColors[ev.platform] || platformColors.other}`}>
                        {platformLabels[ev.platform] || ev.platform}
                      </Badge>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{ev.guest_name || ev.summary || "Réservation"}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {new Date(ev.start_date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                          {" → "}
                          {new Date(ev.end_date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                        </p>
                      </div>
                    </div>
                    {ev.platform === "manual" && (
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteEvent(ev.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add calendar dialog */}
      <Dialog open={addCalOpen} onOpenChange={setAddCalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connecter un calendrier iCal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Plateforme</Label>
              <Select value={calPlatform} onValueChange={setCalPlatform}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="airbnb">Airbnb</SelectItem>
                  <SelectItem value="booking">Booking.com</SelectItem>
                  <SelectItem value="vrbo">VRBO</SelectItem>
                  <SelectItem value="other">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Nom (optionnel)</Label>
              <Input value={calName} onChange={e => setCalName(e.target.value)} placeholder="Ex: Airbnb - Appt Paris" />
            </div>
            <div>
              <Label>Lien iCal</Label>
              <Input value={calUrl} onChange={e => setCalUrl(e.target.value)} placeholder="https://www.airbnb.com/calendar/ical/..." />
              <p className="text-[11px] text-muted-foreground mt-1">
                {calPlatform === "airbnb" && "Airbnb → Annonce → Disponibilité → Exporter le calendrier"}
                {calPlatform === "booking" && "Booking → Tarifs et disponibilités → Synchroniser les calendriers → Copier le lien"}
                {calPlatform === "vrbo" && "VRBO → Calendrier → Importer/Exporter → Copier le lien iCal"}
                {calPlatform === "other" && "Collez le lien iCal de votre calendrier externe"}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddCalOpen(false)}>Annuler</Button>
            <Button onClick={handleAddCalendar} disabled={!calUrl.trim()}>Connecter</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete calendar dialog */}
      <AlertDialog open={!!deleteCalId} onOpenChange={() => setDeleteCalId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce calendrier ?</AlertDialogTitle>
            <AlertDialogDescription>
              Toutes les réservations importées depuis ce calendrier seront supprimées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => { if (deleteCalId) removeCalendar(deleteCalId); setDeleteCalId(null); }}>
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
