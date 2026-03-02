import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, List, LayoutGrid, Home, User, ExternalLink, Wrench, FileText, Lock } from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addMonths, subMonths, addWeeks, subWeeks, eachDayOfInterval, isSameMonth, isSameDay, isWithinInterval } from "date-fns";
import { fr } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

interface CalendarEvent {
  id: string;
  property_id: string;
  property_name: string;
  start_date: string;
  end_date: string;
  guest_name: string | null;
  platform: string;
  source: string;
  type: "booking" | "blocked" | "canceled";
}

interface PropertyOption {
  id: string;
  name: string;
}

export default function GlobalCalendar() {
  const navigate = useNavigate();
  const [view, setView] = useState<"month" | "week" | "list">("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [properties, setProperties] = useState<PropertyOption[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<string>("all");
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

    // Fetch properties
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

    // Fetch bookings overlapping range
    const { data: bookings } = await (supabase as any)
      .from("bookings")
      .select("id, property_id, check_in, check_out, guest_name, source, price_status")
      .in("property_id", propIds)
      .lt("check_in", rangeEndStr)
      .gt("check_out", rangeStartStr);

    // Fetch calendar_events overlapping range
    const { data: calEvents } = await (supabase as any)
      .from("calendar_events")
      .select("id, property_id, start_date, end_date, guest_name, platform, event_type, status")
      .in("property_id", propIds)
      .lt("start_date", rangeEndStr)
      .gt("end_date", rangeStartStr);

    const merged: CalendarEvent[] = [];
    const seen = new Set<string>();

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
        type: b.price_status === "canceled" ? "canceled" : "booking",
      });
    }

    for (const e of (calEvents || [])) {
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
        type: e.event_type === "manual_block" || e.event_type === "blocked" ? "blocked" : e.status === "cancelled" ? "canceled" : "booking",
      });
    }

    setEvents(merged);
    setLoading(false);
  }, [rangeStart, rangeEnd]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredEvents = useMemo(() => {
    if (selectedProperty === "all") return events;
    return events.filter(e => e.property_id === selectedProperty);
  }, [events, selectedProperty]);

  const navigate_ = (dir: number) => {
    if (view === "week") setCurrentDate(prev => dir > 0 ? addWeeks(prev, 1) : subWeeks(prev, 1));
    else setCurrentDate(prev => dir > 0 ? addMonths(prev, 1) : subMonths(prev, 1));
  };

  const days = useMemo(() => eachDayOfInterval({ start: rangeStart, end: rangeEnd }), [rangeStart, rangeEnd]);

  const getEventsForDay = (day: Date) => {
    return filteredEvents.filter(e => {
      const s = new Date(e.start_date);
      const end = new Date(e.end_date);
      return day >= s && day < end;
    });
  };

  const typeColor = (type: CalendarEvent["type"]) => {
    if (type === "blocked") return "bg-muted text-muted-foreground";
    if (type === "canceled") return "bg-destructive/10 text-destructive";
    return "bg-primary/10 text-primary";
  };

  const typeBorder = (type: CalendarEvent["type"]) => {
    if (type === "blocked") return "border-l-muted-foreground";
    if (type === "canceled") return "border-l-destructive";
    return "border-l-primary";
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
          <Button variant="ghost" size="sm" onClick={() => navigate_(-1)}><ChevronLeft className="w-4 h-4" /></Button>
          <span className="text-sm font-medium capitalize">
            {view === "week"
              ? `${format(rangeStart, "d MMM", { locale: fr })} — ${format(rangeEnd, "d MMM yyyy", { locale: fr })}`
              : format(currentDate, "MMMM yyyy", { locale: fr })}
          </span>
          <Button variant="ghost" size="sm" onClick={() => navigate_(1)}><ChevronRight className="w-4 h-4" /></Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">Chargement…</div>
        ) : view === "list" ? (
          <ListView events={filteredEvents} onSelect={setSelectedEvent} typeColor={typeColor} typeBorder={typeBorder} />
        ) : (
          <GridView days={days} currentDate={currentDate} view={view} getEventsForDay={getEventsForDay} onSelect={setSelectedEvent} typeColor={typeColor} />
        )}

        {/* Detail Drawer */}
        <Sheet open={!!selectedEvent} onOpenChange={(o) => !o && setSelectedEvent(null)}>
          <SheetContent className="sm:max-w-md">
            {selectedEvent && (
              <>
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    {selectedEvent.type === "blocked" ? <Lock className="w-4 h-4" /> : <User className="w-4 h-4" />}
                    {selectedEvent.type === "blocked" ? "Dates bloquées" : selectedEvent.guest_name || "Réservation"}
                  </SheetTitle>
                </SheetHeader>
                <div className="space-y-4 mt-6">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><p className="text-muted-foreground text-xs">Bien</p><p className="font-medium">{selectedEvent.property_name}</p></div>
                    <div><p className="text-muted-foreground text-xs">Plateforme</p><Badge variant="outline" className="text-xs mt-0.5">{selectedEvent.platform}</Badge></div>
                    <div><p className="text-muted-foreground text-xs">Arrivée</p><p className="font-medium">{format(new Date(selectedEvent.start_date), "dd MMM yyyy", { locale: fr })}</p></div>
                    <div><p className="text-muted-foreground text-xs">Départ</p><p className="font-medium">{format(new Date(selectedEvent.end_date), "dd MMM yyyy", { locale: fr })}</p></div>
                    <div><p className="text-muted-foreground text-xs">Type</p><Badge className={typeColor(selectedEvent.type)}>{selectedEvent.type === "booking" ? "Réservé" : selectedEvent.type === "blocked" ? "Bloqué" : "Annulé"}</Badge></div>
                    {selectedEvent.guest_name && <div><p className="text-muted-foreground text-xs">Voyageur</p><p className="font-medium">{selectedEvent.guest_name}</p></div>}
                  </div>
                  <div className="border-t pt-4 space-y-2">
                    <p className="text-xs text-muted-foreground font-medium mb-2">Actions rapides</p>
                    <Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={() => { setSelectedEvent(null); navigate("/dashboard/interventions"); }}>
                      <Wrench className="w-3.5 h-3.5" /> Créer mission ménage checkout
                    </Button>
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

function GridView({ days, currentDate, view, getEventsForDay, onSelect, typeColor }: {
  days: Date[];
  currentDate: Date;
  view: string;
  getEventsForDay: (d: Date) => CalendarEvent[];
  onSelect: (e: CalendarEvent) => void;
  typeColor: (t: CalendarEvent["type"]) => string;
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
                    key={ev.id}
                    onClick={() => onSelect(ev)}
                    className={`w-full text-left text-[10px] leading-tight px-1 py-0.5 rounded truncate ${typeColor(ev.type)} hover:opacity-80 transition-opacity`}
                  >
                    {ev.type === "blocked" ? "🔒" : ""}{ev.property_name.slice(0, 12)}
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

function ListView({ events, onSelect, typeColor, typeBorder }: {
  events: CalendarEvent[];
  onSelect: (e: CalendarEvent) => void;
  typeColor: (t: CalendarEvent["type"]) => string;
  typeBorder: (t: CalendarEvent["type"]) => string;
}) {
  const sorted = useMemo(() => [...events].sort((a, b) => a.start_date.localeCompare(b.start_date)), [events]);

  if (!sorted.length) return <p className="text-sm text-muted-foreground text-center py-8">Aucune réservation sur cette période</p>;

  return (
    <div className="space-y-2 max-h-[400px] overflow-y-auto">
      {sorted.map(ev => (
        <button
          key={ev.id}
          onClick={() => onSelect(ev)}
          className={`w-full text-left flex items-center justify-between p-3 rounded-lg border border-l-4 ${typeBorder(ev.type)} hover:bg-accent/50 transition-colors`}
        >
          <div className="min-w-0">
            <p className="font-medium text-sm truncate">{ev.property_name}</p>
            <p className="text-xs text-muted-foreground">
              {format(new Date(ev.start_date), "dd MMM", { locale: fr })} → {format(new Date(ev.end_date), "dd MMM", { locale: fr })}
              {ev.guest_name ? ` · ${ev.guest_name}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant="outline" className="text-[10px]">{ev.platform}</Badge>
            <Badge className={`text-[10px] ${typeColor(ev.type)}`}>
              {ev.type === "booking" ? "Réservé" : ev.type === "blocked" ? "Bloqué" : "Annulé"}
            </Badge>
          </div>
        </button>
      ))}
    </div>
  );
}
