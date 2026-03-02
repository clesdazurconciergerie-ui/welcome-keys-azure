import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, List, LayoutGrid, Home, User, ExternalLink, Wrench, FileText } from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addMonths, subMonths, addWeeks, subWeeks, eachDayOfInterval, isSameMonth, isSameDay } from "date-fns";
import { fr } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

type EventKind = "booking" | "mission";

interface CalendarEvent {
  id: string;
  property_id: string;
  property_name: string;
  start_date: string;
  end_date: string;
  guest_name: string | null;
  platform: string;
  source: string;
  kind: EventKind;
  // mission-specific
  mission_type?: string;
  provider_name?: string;
  payout_amount?: number;
  instructions?: string;
  status?: string;
}

interface PropertyOption {
  id: string;
  name: string;
}

type FilterMode = "all" | "bookings" | "missions";

export default function GlobalCalendar() {
  const navigate = useNavigate();
  const [view, setView] = useState<"month" | "week" | "list">("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [properties, setProperties] = useState<PropertyOption[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<string>("all");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const rangeStart = useMemo(() => {
    if (view === "week") return startOfWeek(currentDate, { weekStartsOn: 1 });
    return startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 });
  }, [currentDate, view]);

  const rangeEnd = useMemo(() => {
    if (view === "week") return endOfWeek(currentDate, { weekStartsOn: 1 });
    return endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 });
  }, [currentDate, view]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: props } = await (supabase as any)
      .from("properties")
      .select("id, name")
      .eq("user_id", user.id)
      .order("name");
    setProperties(props || []);

    const propIds = (props || []).map((p: any) => p.id);
    if (!propIds.length) { setEvents([]); setLoading(false); return; }
    const propMap = Object.fromEntries((props || []).map((p: any) => [p.id, p.name]));

    const rangeStartStr = format(rangeStart, "yyyy-MM-dd");
    const rangeEndStr = format(rangeEnd, "yyyy-MM-dd");

    // Fetch bookings (exclude canceled)
    const { data: bookings } = await (supabase as any)
      .from("bookings")
      .select("id, property_id, check_in, check_out, guest_name, source, price_status")
      .in("property_id", propIds)
      .lt("check_in", rangeEndStr)
      .gt("check_out", rangeStartStr)
      .neq("price_status", "canceled");

    // Fetch calendar_events — only reservations (exclude blocked/canceled)
    const { data: calEvents } = await (supabase as any)
      .from("calendar_events")
      .select("id, property_id, start_date, end_date, guest_name, platform, event_type, status")
      .in("property_id", propIds)
      .lt("start_date", rangeEndStr)
      .gt("end_date", rangeStartStr)
      .neq("status", "cancelled");

    // Fetch missions with provider engagement
    const { data: missions } = await (supabase as any)
      .from("missions")
      .select("id, property_id, title, mission_type, start_at, end_at, payout_amount, instructions, status, selected_provider_id, service_providers:selected_provider_id(name)")
      .in("property_id", propIds)
      .gte("start_at", rangeStartStr)
      .lte("start_at", rangeEndStr)
      .in("status", ["assigned", "confirmed", "in_progress", "done", "approved"]);

    const merged: CalendarEvent[] = [];
    const seen = new Set<string>();

    // Add bookings from bookings table
    for (const b of (bookings || [])) {
      const key = `${b.property_id}-${b.check_in}-${b.check_out}`;
      seen.add(key);
      merged.push({
        id: b.id,
        property_id: b.property_id,
        property_name: propMap[b.property_id] || "—",
        start_date: b.check_in,
        end_date: b.check_out,
        guest_name: b.guest_name,
        platform: b.source || "manual",
        source: "booking",
        kind: "booking",
      });
    }

    // Add calendar_events that are reservations only (not blocked)
    for (const e of (calEvents || [])) {
      if (e.event_type === "manual_block" || e.event_type === "blocked") continue;
      const key = `${e.property_id}-${e.start_date}-${e.end_date}`;
      if (seen.has(key)) continue;
      merged.push({
        id: e.id,
        property_id: e.property_id,
        property_name: propMap[e.property_id] || "—",
        start_date: e.start_date,
        end_date: e.end_date,
        guest_name: e.guest_name,
        platform: e.platform || "ical",
        source: "calendar",
        kind: "booking",
      });
    }

    // Add missions
    for (const m of (missions || [])) {
      const providerName = m.service_providers?.name || null;
      const startDay = format(new Date(m.start_at), "yyyy-MM-dd");
      const endDay = m.end_at ? format(new Date(m.end_at), "yyyy-MM-dd") : startDay;
      merged.push({
        id: m.id,
        property_id: m.property_id,
        property_name: propMap[m.property_id] || "—",
        start_date: startDay,
        end_date: endDay,
        guest_name: null,
        platform: "",
        source: "mission",
        kind: "mission",
        mission_type: m.mission_type || m.title,
        provider_name: providerName,
        payout_amount: m.payout_amount,
        instructions: m.instructions,
        status: m.status,
      });
    }

    setEvents(merged);
    setLoading(false);
  }, [rangeStart, rangeEnd]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredEvents = useMemo(() => {
    let result = events;
    if (selectedProperty !== "all") result = result.filter(e => e.property_id === selectedProperty);
    if (filterMode === "bookings") result = result.filter(e => e.kind === "booking");
    if (filterMode === "missions") result = result.filter(e => e.kind === "mission");
    return result;
  }, [events, selectedProperty, filterMode]);

  const nav = (dir: number) => {
    if (view === "week") setCurrentDate(prev => dir > 0 ? addWeeks(prev, 1) : subWeeks(prev, 1));
    else setCurrentDate(prev => dir > 0 ? addMonths(prev, 1) : subMonths(prev, 1));
  };

  const days = useMemo(() => eachDayOfInterval({ start: rangeStart, end: rangeEnd }), [rangeStart, rangeEnd]);

  const getEventsForDay = (day: Date) => {
    return filteredEvents.filter(e => {
      const s = new Date(e.start_date);
      const end = new Date(e.end_date);
      if (e.kind === "mission") return isSameDay(day, s);
      return day >= s && day < end;
    });
  };

  const kindColor = (kind: EventKind) => {
    if (kind === "mission") return "bg-accent/15 text-accent-foreground";
    return "bg-primary/10 text-primary";
  };

  const kindBorder = (kind: EventKind) => {
    if (kind === "mission") return "border-l-orange-500";
    return "border-l-primary";
  };

  const missionLabel = (mt?: string) => {
    if (!mt) return "Mission";
    if (mt.includes("cleaning")) return "🧹 Ménage";
    if (mt.includes("checkin")) return "🔑 Check-in";
    if (mt.includes("maintenance")) return "🔧 Maintenance";
    return mt.charAt(0).toUpperCase() + mt.slice(1);
  };

  return (
    <Card>
      <CardContent className="pt-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Calendrier global</h2>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Filter: Réservations | Missions | Tout */}
            <ToggleGroup type="single" value={filterMode} onValueChange={(v) => v && setFilterMode(v as FilterMode)} size="sm">
              <ToggleGroupItem value="all" aria-label="Tout" className="text-xs px-2.5">Tout</ToggleGroupItem>
              <ToggleGroupItem value="bookings" aria-label="Réservations" className="text-xs px-2.5">Réservations</ToggleGroupItem>
              <ToggleGroupItem value="missions" aria-label="Missions" className="text-xs px-2.5">Missions</ToggleGroupItem>
            </ToggleGroup>
            <Select value={selectedProperty} onValueChange={setSelectedProperty}>
              <SelectTrigger className="w-[180px] h-8 text-xs">
                <Home className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                {selectedProperty === "all" ? "Tous les biens" : properties.find(p => p.id === selectedProperty)?.name || "—"}
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les biens</SelectItem>
                {properties.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ToggleGroup type="single" value={view} onValueChange={(v) => v && setView(v as any)} size="sm">
              <ToggleGroupItem value="month" aria-label="Mois"><LayoutGrid className="w-3.5 h-3.5" /></ToggleGroupItem>
              <ToggleGroupItem value="week" aria-label="Semaine"><CalendarIcon className="w-3.5 h-3.5" /></ToggleGroupItem>
              <ToggleGroupItem value="list" aria-label="Liste"><List className="w-3.5 h-3.5" /></ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="sm" onClick={() => nav(-1)}><ChevronLeft className="w-4 h-4" /></Button>
          <span className="text-sm font-medium capitalize">
            {view === "week"
              ? `${format(rangeStart, "d MMM", { locale: fr })} — ${format(rangeEnd, "d MMM yyyy", { locale: fr })}`
              : format(currentDate, "MMMM yyyy", { locale: fr })}
          </span>
          <Button variant="ghost" size="sm" onClick={() => nav(1)}><ChevronRight className="w-4 h-4" /></Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">Chargement…</div>
        ) : view === "list" ? (
          <ListView events={filteredEvents} onSelect={setSelectedEvent} kindColor={kindColor} kindBorder={kindBorder} missionLabel={missionLabel} />
        ) : (
          <GridView days={days} currentDate={currentDate} view={view} getEventsForDay={getEventsForDay} onSelect={setSelectedEvent} kindColor={kindColor} missionLabel={missionLabel} />
        )}

        {/* Detail Drawer */}
        <Sheet open={!!selectedEvent} onOpenChange={(o) => !o && setSelectedEvent(null)}>
          <SheetContent className="sm:max-w-md">
            {selectedEvent && (
              <>
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    {selectedEvent.kind === "mission" ? <Wrench className="w-4 h-4" /> : <User className="w-4 h-4" />}
                    {selectedEvent.kind === "mission"
                      ? missionLabel(selectedEvent.mission_type)
                      : selectedEvent.guest_name || "Réservation"}
                  </SheetTitle>
                </SheetHeader>
                <div className="space-y-4 mt-6">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><p className="text-muted-foreground text-xs">Bien</p><p className="font-medium">{selectedEvent.property_name}</p></div>
                    {selectedEvent.kind === "booking" && (
                      <div><p className="text-muted-foreground text-xs">Plateforme</p><Badge variant="outline" className="text-xs mt-0.5">{selectedEvent.platform}</Badge></div>
                    )}
                    <div><p className="text-muted-foreground text-xs">{selectedEvent.kind === "mission" ? "Date" : "Arrivée"}</p><p className="font-medium">{format(new Date(selectedEvent.start_date), "dd MMM yyyy", { locale: fr })}</p></div>
                    {selectedEvent.kind === "booking" && (
                      <div><p className="text-muted-foreground text-xs">Départ</p><p className="font-medium">{format(new Date(selectedEvent.end_date), "dd MMM yyyy", { locale: fr })}</p></div>
                    )}
                    <div><p className="text-muted-foreground text-xs">Type</p><Badge className={kindColor(selectedEvent.kind)}>{selectedEvent.kind === "booking" ? "Réservation" : missionLabel(selectedEvent.mission_type)}</Badge></div>
                    {selectedEvent.guest_name && <div><p className="text-muted-foreground text-xs">Voyageur</p><p className="font-medium">{selectedEvent.guest_name}</p></div>}
                    {selectedEvent.provider_name && <div><p className="text-muted-foreground text-xs">Prestataire</p><p className="font-medium">{selectedEvent.provider_name}</p></div>}
                    {selectedEvent.payout_amount != null && selectedEvent.payout_amount > 0 && (
                      <div><p className="text-muted-foreground text-xs">Montant</p><p className="font-medium">{selectedEvent.payout_amount} €</p></div>
                    )}
                    {selectedEvent.status && selectedEvent.kind === "mission" && (
                      <div><p className="text-muted-foreground text-xs">Statut</p><Badge variant="outline" className="text-xs capitalize">{selectedEvent.status}</Badge></div>
                    )}
                  </div>
                  {selectedEvent.instructions && (
                    <div className="border-t pt-3">
                      <p className="text-xs text-muted-foreground font-medium mb-1">Instructions</p>
                      <p className="text-sm whitespace-pre-wrap">{selectedEvent.instructions}</p>
                    </div>
                  )}
                  <div className="border-t pt-4 space-y-2">
                    <p className="text-xs text-muted-foreground font-medium mb-2">Actions rapides</p>
                    {selectedEvent.kind === "booking" && (
                      <Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={() => { setSelectedEvent(null); navigate("/dashboard/interventions"); }}>
                        <Wrench className="w-3.5 h-3.5" /> Créer mission ménage checkout
                      </Button>
                    )}
                    <Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={() => { setSelectedEvent(null); navigate("/dashboard/finance"); }}>
                      <FileText className="w-3.5 h-3.5" /> Créer facture
                    </Button>
                    <Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={() => { setSelectedEvent(null); navigate(`/dashboard/logements/${selectedEvent.property_id}`); }}>
                      <ExternalLink className="w-3.5 h-3.5" /> Voir le bien
                    </Button>
                  </div>
                </div>
              </>
            )}
          </SheetContent>
        </Sheet>
      </CardContent>
    </Card>
  );
}

function GridView({ days, currentDate, view, getEventsForDay, onSelect, kindColor, missionLabel }: {
  days: Date[];
  currentDate: Date;
  view: string;
  getEventsForDay: (d: Date) => CalendarEvent[];
  onSelect: (e: CalendarEvent) => void;
  kindColor: (k: EventKind) => string;
  missionLabel: (mt?: string) => string;
}) {
  const weekDays = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
  const today = new Date();

  return (
    <div>
      <div className="grid grid-cols-7 gap-px mb-1">
        {weekDays.map(d => (
          <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
        {days.map(day => {
          const dayEvents = getEventsForDay(day);
          const isToday = isSameDay(day, today);
          const inMonth = view === "week" || isSameMonth(day, currentDate);
          return (
            <div
              key={day.toISOString()}
              className={`min-h-[72px] p-1 bg-card ${!inMonth ? "opacity-40" : ""} ${isToday ? "ring-1 ring-primary/40" : ""}`}
            >
              <span className={`text-xs font-medium block mb-0.5 ${isToday ? "text-primary font-bold" : "text-foreground"}`}>
                {format(day, "d")}
              </span>
              <div className="space-y-0.5">
                {dayEvents.slice(0, 3).map(ev => (
                  <button
                    key={ev.id + ev.kind}
                    onClick={() => onSelect(ev)}
                    className={`w-full text-left text-[10px] leading-tight px-1 py-0.5 rounded truncate ${kindColor(ev.kind)} hover:opacity-80 transition-opacity`}
                  >
                    {ev.kind === "mission" ? "🔧 " : ""}{ev.property_name.slice(0, 12)}
                  </button>
                ))}
                {dayEvents.length > 3 && (
                  <span className="text-[10px] text-muted-foreground px-1">+{dayEvents.length - 3}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ListView({ events, onSelect, kindColor, kindBorder, missionLabel }: {
  events: CalendarEvent[];
  onSelect: (e: CalendarEvent) => void;
  kindColor: (k: EventKind) => string;
  kindBorder: (k: EventKind) => string;
  missionLabel: (mt?: string) => string;
}) {
  const sorted = useMemo(() => [...events].sort((a, b) => a.start_date.localeCompare(b.start_date)), [events]);

  if (!sorted.length) return <p className="text-sm text-muted-foreground text-center py-8">Aucun événement sur cette période</p>;

  return (
    <div className="space-y-2 max-h-[400px] overflow-y-auto">
      {sorted.map(ev => (
        <button
          key={ev.id + ev.kind}
          onClick={() => onSelect(ev)}
          className={`w-full text-left flex items-center justify-between p-3 rounded-lg border border-l-4 ${kindBorder(ev.kind)} hover:bg-accent/50 transition-colors`}
        >
          <div className="min-w-0">
            <p className="font-medium text-sm truncate">
              {ev.kind === "mission" && <Wrench className="w-3 h-3 inline mr-1" />}
              {ev.property_name}
            </p>
            <p className="text-xs text-muted-foreground">
              {ev.kind === "mission"
                ? `${format(new Date(ev.start_date), "dd MMM", { locale: fr })} · ${missionLabel(ev.mission_type)}${ev.provider_name ? ` · ${ev.provider_name}` : ""}`
                : `${format(new Date(ev.start_date), "dd MMM", { locale: fr })} → ${format(new Date(ev.end_date), "dd MMM", { locale: fr })}${ev.guest_name ? ` · ${ev.guest_name}` : ""}`
              }
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {ev.kind === "booking" && <Badge variant="outline" className="text-[10px]">{ev.platform}</Badge>}
            <Badge className={`text-[10px] ${kindColor(ev.kind)}`}>
              {ev.kind === "booking" ? "Réservation" : missionLabel(ev.mission_type)}
            </Badge>
          </div>
        </button>
      ))}
    </div>
  );
}
