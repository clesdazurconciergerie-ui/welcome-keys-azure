import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, List, LayoutGrid, Home, User, ExternalLink, Wrench, FileText, Phone, Target, CheckCircle } from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addMonths, subMonths, addWeeks, subWeeks, eachDayOfInterval, isSameMonth, isSameDay, addDays, isBefore, isToday as isDateToday } from "date-fns";
import { fr } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

type EventKind = "booking" | "mission" | "followup";

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
  mission_type?: string;
  provider_name?: string;
  payout_amount?: number;
  instructions?: string;
  status?: string;
  // followup-specific
  prospect_name?: string;
  prospect_phone?: string;
  prospect_email?: string;
  followup_comment?: string;
  followup_status?: string;
  prospect_id?: string;
}

interface PropertyOption {
  id: string;
  name: string;
}

type FilterMode = "all" | "bookings" | "missions" | "followups";

const EVENT_COLORS: Record<EventKind, { bg: string; text: string; border: string; dot: string }> = {
  booking: { bg: "bg-blue-500/10", text: "text-blue-700", border: "border-l-blue-500", dot: "bg-blue-500" },
  mission: { bg: "bg-[#C8A24D]/10", text: "text-[#C8A24D]", border: "border-l-[#C8A24D]", dot: "bg-[#C8A24D]" },
  followup: { bg: "bg-violet-500/10", text: "text-violet-700", border: "border-l-violet-500", dot: "bg-violet-500" },
};

const FILTER_OPTIONS: { value: FilterMode; label: string; icon: string }[] = [
  { value: "all", label: "Tout", icon: "" },
  { value: "bookings", label: "Réservations", icon: "🏠" },
  { value: "missions", label: "Missions", icon: "🛠" },
  { value: "followups", label: "Relances", icon: "📞" },
];

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

    const rangeStartStr = format(rangeStart, "yyyy-MM-dd");
    const rangeEndStr = format(rangeEnd, "yyyy-MM-dd");

    // Parallel fetches
    const [propsRes, bookingsRes, calEventsRes, missionsRes, followupsRes] = await Promise.all([
      (supabase as any).from("properties").select("id, name").eq("user_id", user.id).order("name"),
      (supabase as any).from("bookings").select("id, property_id, check_in, check_out, guest_name, source, price_status").eq("user_id", user.id).lt("check_in", rangeEndStr).gt("check_out", rangeStartStr).neq("price_status", "canceled"),
      (supabase as any).from("calendar_events").select("id, property_id, start_date, end_date, guest_name, platform, event_type, status").eq("user_id", user.id).lt("start_date", rangeEndStr).gt("end_date", rangeStartStr).neq("status", "cancelled"),
      (supabase as any).from("missions").select("id, property_id, title, mission_type, start_at, end_at, payout_amount, instructions, status, selected_provider_id").eq("user_id", user.id).gte("start_at", rangeStartStr + "T00:00:00").lte("start_at", rangeEndStr + "T23:59:59").in("status", ["assigned", "confirmed", "in_progress", "done", "approved"]),
      (supabase as any).from("prospect_followups").select("id, prospect_id, scheduled_date, status, comment, prospect:prospects(first_name, last_name, phone, email, pipeline_status)").eq("user_id", user.id).gte("scheduled_date", rangeStartStr).lte("scheduled_date", rangeEndStr),
    ]);

    const props = propsRes.data || [];
    setProperties(props);
    const propIds = props.map((p: any) => p.id);
    const propMap = Object.fromEntries(props.map((p: any) => [p.id, p.name]));

    // Fetch provider names for missions
    const providerIds = (missionsRes.data || []).map((m: any) => m.selected_provider_id).filter(Boolean);
    let providerMap: Record<string, string> = {};
    if (providerIds.length) {
      const { data: providers } = await (supabase as any).from("service_providers").select("id, name").in("id", providerIds);
      providerMap = Object.fromEntries((providers || []).map((p: any) => [p.id, p.name]));
    }

    const merged: CalendarEvent[] = [];
    const seen = new Set<string>();

    // Bookings
    for (const b of (bookingsRes.data || [])) {
      if (!propIds.includes(b.property_id)) continue;
      const key = `${b.property_id}-${b.check_in}-${b.check_out}`;
      seen.add(key);
      merged.push({
        id: b.id, property_id: b.property_id, property_name: propMap[b.property_id] || "—",
        start_date: b.check_in, end_date: b.check_out, guest_name: b.guest_name,
        platform: b.source || "manual", source: "booking", kind: "booking",
      });
    }

    // Calendar events (reservations only)
    for (const e of (calEventsRes.data || [])) {
      if (!propIds.includes(e.property_id)) continue;
      if (e.event_type === "manual_block" || e.event_type === "blocked") continue;
      const key = `${e.property_id}-${e.start_date}-${e.end_date}`;
      if (seen.has(key)) continue;
      merged.push({
        id: e.id, property_id: e.property_id, property_name: propMap[e.property_id] || "—",
        start_date: e.start_date, end_date: e.end_date, guest_name: e.guest_name,
        platform: e.platform || "ical", source: "calendar", kind: "booking",
      });
    }

    // Missions
    for (const m of (missionsRes.data || [])) {
      if (!propIds.includes(m.property_id)) continue;
      const startDay = format(new Date(m.start_at), "yyyy-MM-dd");
      const endDay = m.end_at ? format(new Date(m.end_at), "yyyy-MM-dd") : startDay;
      merged.push({
        id: m.id, property_id: m.property_id, property_name: propMap[m.property_id] || "—",
        start_date: startDay, end_date: endDay, guest_name: null,
        platform: "", source: "mission", kind: "mission",
        mission_type: m.mission_type || m.title,
        provider_name: providerMap[m.selected_provider_id] || null,
        payout_amount: m.payout_amount, instructions: m.instructions, status: m.status,
      });
    }

    // Prospect followups
    for (const f of (followupsRes.data || [])) {
      if (f.prospect?.pipeline_status === "lost" && f.status === "done") continue;
      merged.push({
        id: f.id, property_id: "", property_name: "",
        start_date: f.scheduled_date, end_date: f.scheduled_date,
        guest_name: null, platform: "", source: "followup", kind: "followup",
        prospect_name: f.prospect ? `${f.prospect.first_name} ${f.prospect.last_name}` : "Prospect",
        prospect_phone: f.prospect?.phone, prospect_email: f.prospect?.email,
        followup_comment: f.comment, followup_status: f.status,
        prospect_id: f.prospect_id,
      });
    }

    setEvents(merged);
    setLoading(false);
  }, [rangeStart, rangeEnd]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredEvents = useMemo(() => {
    let result = events;
    if (selectedProperty !== "all") result = result.filter(e => e.property_id === selectedProperty || e.kind === "followup");
    if (filterMode === "bookings") result = result.filter(e => e.kind === "booking");
    if (filterMode === "missions") result = result.filter(e => e.kind === "mission");
    if (filterMode === "followups") result = result.filter(e => e.kind === "followup");
    return result;
  }, [events, selectedProperty, filterMode]);

  const nav = (dir: number) => {
    if (view === "week") setCurrentDate(prev => dir > 0 ? addWeeks(prev, 1) : subWeeks(prev, 1));
    else setCurrentDate(prev => dir > 0 ? addMonths(prev, 1) : subMonths(prev, 1));
  };

  const days = useMemo(() => eachDayOfInterval({ start: rangeStart, end: rangeEnd }), [rangeStart, rangeEnd]);

  const getEventsForDay = useCallback((day: Date) => {
    return filteredEvents.filter(e => {
      const s = new Date(e.start_date);
      const end = new Date(e.end_date);
      if (e.kind === "mission" || e.kind === "followup") return isSameDay(day, s);
      return day >= s && day < end;
    });
  }, [filteredEvents]);

  const missionLabel = (mt?: string) => {
    if (!mt) return "Mission";
    if (mt.includes("cleaning")) return "Ménage";
    if (mt.includes("checkin")) return "Check-in";
    if (mt.includes("maintenance")) return "Maintenance";
    return mt.charAt(0).toUpperCase() + mt.slice(1);
  };

  const kindIcon = (kind: EventKind) => {
    if (kind === "booking") return "🏠";
    if (kind === "mission") return "🛠";
    return "📞";
  };

  // List view: sort by date, urgency for overdue followups first
  const listEvents = useMemo(() => {
    const today = new Date();
    const listEnd = view === "list" ? addDays(today, 14) : rangeEnd;
    const listStart = view === "list" ? today : rangeStart;
    const filtered = filteredEvents.filter(e => {
      const s = new Date(e.start_date);
      if (view === "list") return s >= listStart && s <= listEnd;
      return true;
    });
    return [...filtered].sort((a, b) => {
      // Overdue followups first
      const aOverdue = a.kind === "followup" && a.followup_status === "todo" && isBefore(new Date(a.start_date), today) && !isSameDay(new Date(a.start_date), today);
      const bOverdue = b.kind === "followup" && b.followup_status === "todo" && isBefore(new Date(b.start_date), today) && !isSameDay(new Date(b.start_date), today);
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;
      return a.start_date.localeCompare(b.start_date);
    });
  }, [filteredEvents, view, rangeStart, rangeEnd]);

  return (
    <Card className="overflow-hidden">
      <CardContent className="pt-6">
        {/* Header */}
        <div className="flex flex-col gap-4 mb-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <CalendarIcon className="w-4.5 h-4.5 text-primary" />
              </div>
              <h2 className="text-lg font-bold text-foreground">Calendrier global</h2>
            </div>
            {/* View toggle */}
            <div className="flex items-center bg-muted rounded-lg p-0.5 gap-0.5">
              {[
                { v: "month" as const, icon: LayoutGrid, label: "Mois" },
                { v: "week" as const, icon: CalendarIcon, label: "Semaine" },
                { v: "list" as const, icon: List, label: "Liste" },
              ].map(({ v, icon: Icon, label }) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${view === v ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Filters row */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Kind filter pills */}
            <div className="flex items-center bg-muted/50 rounded-lg p-0.5 gap-0.5">
              {FILTER_OPTIONS.map(f => (
                <button
                  key={f.value}
                  onClick={() => setFilterMode(f.value)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${filterMode === f.value ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {f.icon && <span className="mr-1">{f.icon}</span>}{f.label}
                </button>
              ))}
            </div>

            {/* Property filter */}
            <Select value={selectedProperty} onValueChange={setSelectedProperty}>
              <SelectTrigger className="w-[180px] h-8 text-xs border-border/50">
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
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Réservation</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#C8A24D]" /> Mission</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-violet-500" /> Relance</span>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="sm" onClick={() => nav(-1)} className="h-8 w-8 p-0">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold capitalize">
              {view === "week"
                ? `${format(rangeStart, "d MMM", { locale: fr })} — ${format(rangeEnd, "d MMM yyyy", { locale: fr })}`
                : view === "list"
                ? "Prochains 14 jours"
                : format(currentDate, "MMMM yyyy", { locale: fr })}
            </span>
            <Button variant="ghost" size="sm" className="text-xs h-6 px-2" onClick={() => setCurrentDate(new Date())}>
              Aujourd'hui
            </Button>
          </div>
          <Button variant="ghost" size="sm" onClick={() => nav(1)} className="h-8 w-8 p-0">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
            <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin mr-2" />
            Chargement…
          </div>
        ) : view === "list" ? (
          <ListView events={listEvents} onSelect={setSelectedEvent} missionLabel={missionLabel} kindIcon={kindIcon} />
        ) : (
          <TooltipProvider delayDuration={200}>
            <GridView days={days} currentDate={currentDate} view={view} getEventsForDay={getEventsForDay} onSelect={setSelectedEvent} missionLabel={missionLabel} kindIcon={kindIcon} />
          </TooltipProvider>
        )}

        {/* Detail Drawer */}
        <Sheet open={!!selectedEvent} onOpenChange={(o) => !o && setSelectedEvent(null)}>
          <SheetContent className="sm:max-w-md">
            {selectedEvent && (
              <EventDrawer event={selectedEvent} missionLabel={missionLabel} navigate={navigate} onClose={() => setSelectedEvent(null)} />
            )}
          </SheetContent>
        </Sheet>
      </CardContent>
    </Card>
  );
}

/* ── Grid View ─────────────────────────────── */

function GridView({ days, currentDate, view, getEventsForDay, onSelect, missionLabel, kindIcon }: {
  days: Date[];
  currentDate: Date;
  view: string;
  getEventsForDay: (d: Date) => CalendarEvent[];
  onSelect: (e: CalendarEvent) => void;
  missionLabel: (mt?: string) => string;
  kindIcon: (k: EventKind) => string;
}) {
  const weekDays = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
  const today = new Date();

  return (
    <div>
      <div className="grid grid-cols-7 gap-px mb-1">
        {weekDays.map(d => (
          <div key={d} className="text-center text-[11px] font-semibold text-muted-foreground py-1.5 uppercase tracking-wide">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px bg-border/50 rounded-xl overflow-hidden">
        {days.map(day => {
          const dayEvents = getEventsForDay(day);
          const isToday = isDateToday(day);
          const isPast = isBefore(day, today) && !isToday;
          const inMonth = view === "week" || isSameMonth(day, currentDate);
          const hasOverdueFollowup = dayEvents.some(e => e.kind === "followup" && e.followup_status === "todo" && isBefore(new Date(e.start_date), today));
          const hasTodayMission = isToday && dayEvents.some(e => e.kind === "mission");

          return (
            <div
              key={day.toISOString()}
              className={`min-h-[80px] p-1.5 bg-card transition-colors ${!inMonth ? "opacity-30" : ""} ${isPast && inMonth ? "bg-muted/30" : ""} ${isToday ? "ring-2 ring-emerald-400/50 ring-inset bg-emerald-50/30" : ""} ${hasTodayMission ? "shadow-[inset_0_0_12px_rgba(200,162,77,0.1)]" : ""}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full ${isToday ? "bg-emerald-500 text-white" : "text-foreground"}`}>
                  {format(day, "d")}
                </span>
                {dayEvents.length > 3 && (
                  <span className="text-[10px] text-muted-foreground font-medium bg-muted rounded-full px-1.5">
                    {dayEvents.length}
                  </span>
                )}
              </div>
              <div className="space-y-0.5">
                <AnimatePresence>
                  {dayEvents.slice(0, 3).map(ev => (
                    <EventPill key={ev.id + ev.kind} event={ev} onSelect={onSelect} missionLabel={missionLabel} kindIcon={kindIcon} hasOverdueFollowup={hasOverdueFollowup && ev.kind === "followup" && ev.followup_status === "todo"} />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Event Pill (with tooltip) ─────────────── */

function EventPill({ event, onSelect, missionLabel, kindIcon, hasOverdueFollowup }: {
  event: CalendarEvent;
  onSelect: (e: CalendarEvent) => void;
  missionLabel: (mt?: string) => string;
  kindIcon: (k: EventKind) => string;
  hasOverdueFollowup: boolean;
}) {
  const colors = EVENT_COLORS[event.kind];
  const label = event.kind === "mission"
    ? missionLabel(event.mission_type)
    : event.kind === "followup"
    ? (event.prospect_name || "Relance")
    : event.property_name.slice(0, 14);

  const tooltipContent = event.kind === "booking"
    ? `${event.property_name}\n${event.guest_name || "—"}\n${format(new Date(event.start_date), "dd/MM")} → ${format(new Date(event.end_date), "dd/MM")}\n${event.platform}`
    : event.kind === "mission"
    ? `${missionLabel(event.mission_type)}\n${event.property_name}\n${event.provider_name || "—"}${event.payout_amount ? `\n${event.payout_amount}€` : ""}`
    : `${event.prospect_name}\n${event.followup_comment || "Relance"}\n${event.followup_status === "todo" ? "À faire" : "Fait"}`;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <motion.button
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          onClick={() => onSelect(event)}
          className={`w-full text-left text-[10px] leading-tight px-1.5 py-1 rounded-md truncate font-medium transition-all hover:shadow-sm hover:scale-[1.02] ${colors.bg} ${colors.text} ${hasOverdueFollowup ? "border-l-2 border-l-red-500" : ""}`}
        >
          <span className="mr-0.5">{kindIcon(event.kind)}</span>
          {label}
        </motion.button>
      </TooltipTrigger>
      <TooltipContent side="right" className="text-xs whitespace-pre-line max-w-[200px]">
        {tooltipContent}
      </TooltipContent>
    </Tooltip>
  );
}

/* ── List View ─────────────────────────────── */

function ListView({ events, onSelect, missionLabel, kindIcon }: {
  events: CalendarEvent[];
  onSelect: (e: CalendarEvent) => void;
  missionLabel: (mt?: string) => string;
  kindIcon: (k: EventKind) => string;
}) {
  const today = new Date();

  if (!events.length) return (
    <p className="text-sm text-muted-foreground text-center py-12">Aucun événement sur cette période</p>
  );

  return (
    <div className="space-y-1.5 max-h-[450px] overflow-y-auto pr-1">
      {events.map(ev => {
        const colors = EVENT_COLORS[ev.kind];
        const isOverdue = ev.kind === "followup" && ev.followup_status === "todo" && isBefore(new Date(ev.start_date), today) && !isSameDay(new Date(ev.start_date), today);
        const isTodayEvent = isSameDay(new Date(ev.start_date), today);

        return (
          <motion.button
            key={ev.id + ev.kind}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => onSelect(ev)}
            className={`w-full text-left flex items-center justify-between p-3 rounded-xl border ${colors.border} border-l-4 hover:shadow-md transition-all group ${isOverdue ? "bg-red-50/50 border-l-red-500" : isTodayEvent ? "bg-accent/5" : "bg-card"}`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-base shrink-0">{kindIcon(ev.kind)}</span>
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate text-foreground">
                  {ev.kind === "followup" ? ev.prospect_name : ev.kind === "mission" ? missionLabel(ev.mission_type) : ev.property_name}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {ev.kind === "mission"
                    ? `${format(new Date(ev.start_date), "dd MMM", { locale: fr })} · ${ev.property_name}${ev.provider_name ? ` · ${ev.provider_name}` : ""}`
                    : ev.kind === "followup"
                    ? `${format(new Date(ev.start_date), "dd MMM", { locale: fr })}${ev.followup_comment ? ` · ${ev.followup_comment}` : ""}`
                    : `${format(new Date(ev.start_date), "dd MMM", { locale: fr })} → ${format(new Date(ev.end_date), "dd MMM", { locale: fr })}${ev.guest_name ? ` · ${ev.guest_name}` : ""}`
                  }
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {isOverdue && <Badge variant="destructive" className="text-[10px] px-1.5 py-0">En retard</Badge>}
              {ev.kind === "booking" && ev.platform && <Badge variant="outline" className="text-[10px]">{ev.platform}</Badge>}
              {ev.payout_amount != null && ev.payout_amount > 0 && <Badge variant="secondary" className="text-[10px]">{ev.payout_amount}€</Badge>}
              <span className={`w-2 h-2 rounded-full ${colors.dot} shrink-0`} />
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}

/* ── Event Drawer ──────────────────────────── */

function EventDrawer({ event, missionLabel, navigate, onClose }: {
  event: CalendarEvent;
  missionLabel: (mt?: string) => string;
  navigate: (path: string) => void;
  onClose: () => void;
}) {
  const colors = EVENT_COLORS[event.kind];

  const drawerIcon = event.kind === "booking" ? User : event.kind === "mission" ? Wrench : Target;
  const DrawerIcon = drawerIcon;
  const title = event.kind === "mission"
    ? missionLabel(event.mission_type)
    : event.kind === "followup"
    ? event.prospect_name || "Relance"
    : event.guest_name || "Réservation";

  return (
    <>
      <SheetHeader>
        <SheetTitle className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-lg ${colors.bg} flex items-center justify-center`}>
            <DrawerIcon className={`w-4 h-4 ${colors.text}`} />
          </div>
          <span>{title}</span>
        </SheetTitle>
      </SheetHeader>
      <div className="space-y-5 mt-6">
        <div className="grid grid-cols-2 gap-3 text-sm">
          {event.kind !== "followup" && (
            <div><p className="text-muted-foreground text-xs mb-0.5">Bien</p><p className="font-medium">{event.property_name}</p></div>
          )}
          {event.kind === "booking" && (
            <div><p className="text-muted-foreground text-xs mb-0.5">Plateforme</p><Badge variant="outline" className="text-xs mt-0.5">{event.platform}</Badge></div>
          )}
          <div>
            <p className="text-muted-foreground text-xs mb-0.5">{event.kind === "followup" ? "Date prévue" : event.kind === "mission" ? "Date" : "Arrivée"}</p>
            <p className="font-medium">{format(new Date(event.start_date), "dd MMM yyyy", { locale: fr })}</p>
          </div>
          {event.kind === "booking" && (
            <div><p className="text-muted-foreground text-xs mb-0.5">Départ</p><p className="font-medium">{format(new Date(event.end_date), "dd MMM yyyy", { locale: fr })}</p></div>
          )}
          <div>
            <p className="text-muted-foreground text-xs mb-0.5">Type</p>
            <Badge className={`${colors.bg} ${colors.text} border-0`}>
              {event.kind === "booking" ? "Réservation" : event.kind === "mission" ? missionLabel(event.mission_type) : "Relance prospect"}
            </Badge>
          </div>
          {event.guest_name && <div><p className="text-muted-foreground text-xs mb-0.5">Voyageur</p><p className="font-medium">{event.guest_name}</p></div>}
          {event.provider_name && <div><p className="text-muted-foreground text-xs mb-0.5">Prestataire</p><p className="font-medium">{event.provider_name}</p></div>}
          {event.payout_amount != null && event.payout_amount > 0 && (
            <div><p className="text-muted-foreground text-xs mb-0.5">Montant</p><p className="font-medium">{event.payout_amount} €</p></div>
          )}
          {event.status && event.kind === "mission" && (
            <div><p className="text-muted-foreground text-xs mb-0.5">Statut</p><Badge variant="outline" className="text-xs capitalize">{event.status}</Badge></div>
          )}
          {event.kind === "followup" && event.followup_status && (
            <div><p className="text-muted-foreground text-xs mb-0.5">Statut</p><Badge variant={event.followup_status === "done" ? "secondary" : "outline"} className="text-xs">{event.followup_status === "done" ? "✅ Fait" : "À faire"}</Badge></div>
          )}
          {event.prospect_phone && (
            <div><p className="text-muted-foreground text-xs mb-0.5">Téléphone</p><a href={`tel:${event.prospect_phone}`} className="font-medium text-primary hover:underline">{event.prospect_phone}</a></div>
          )}
        </div>

        {event.instructions && (
          <div className="border-t pt-3">
            <p className="text-xs text-muted-foreground font-semibold mb-1">Instructions</p>
            <p className="text-sm whitespace-pre-wrap">{event.instructions}</p>
          </div>
        )}
        {event.followup_comment && (
          <div className="border-t pt-3">
            <p className="text-xs text-muted-foreground font-semibold mb-1">Note</p>
            <p className="text-sm">{event.followup_comment}</p>
          </div>
        )}

        <div className="border-t pt-4 space-y-2">
          <p className="text-xs text-muted-foreground font-semibold mb-2">Actions rapides</p>
          {event.kind === "booking" && (
            <Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={() => { onClose(); navigate("/dashboard/interventions"); }}>
              <Wrench className="w-3.5 h-3.5" /> Créer mission ménage checkout
            </Button>
          )}
          {event.kind === "followup" && event.prospect_phone && (
            <Button variant="outline" size="sm" className="w-full justify-start gap-2" asChild>
              <a href={`tel:${event.prospect_phone}`}><Phone className="w-3.5 h-3.5" /> Appeler</a>
            </Button>
          )}
          {event.kind === "followup" && (
            <Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={() => { onClose(); navigate("/dashboard/prospection"); }}>
              <Target className="w-3.5 h-3.5" /> Voir le prospect
            </Button>
          )}
          {event.kind !== "followup" && (
            <>
              <Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={() => { onClose(); navigate("/dashboard/finance"); }}>
                <FileText className="w-3.5 h-3.5" /> Créer facture
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={() => { onClose(); navigate(`/dashboard/logements/${event.property_id}`); }}>
                <ExternalLink className="w-3.5 h-3.5" /> Voir le bien
              </Button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
