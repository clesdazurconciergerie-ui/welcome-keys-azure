import { useState, useMemo, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useIsOwner } from "@/hooks/useIsOwner";
import { useOwnerVisibleBookings, OwnerCalEvent } from "@/hooks/useOwnerVisibleBookings";
import { Loader2, ChevronLeft, ChevronRight, CalendarCheck, Moon, Calendar } from "lucide-react";
import { motion } from "framer-motion";

const platformColors: Record<string, string> = {
  airbnb: "bg-[#FF5A5F]/10 text-[#FF5A5F] border-[#FF5A5F]/20",
  booking: "bg-[#003580]/10 text-[#003580] border-[#003580]/20",
  abritel: "bg-[#1F5AA6]/10 text-[#1F5AA6] border-[#1F5AA6]/20",
  vrbo: "bg-[#3B5998]/10 text-[#3B5998] border-[#3B5998]/20",
  manual: "bg-muted text-muted-foreground border-border",
  other: "bg-accent/50 text-accent-foreground border-accent",
  bookings_table: "bg-primary/10 text-primary border-primary/20",
};

const platformLabels: Record<string, string> = {
  airbnb: "Airbnb", booking: "Booking.com", abritel: "Abritel", vrbo: "VRBO", manual: "Manuel", other: "Autre", bookings_table: "Réservation",
};

export default function OwnerCalendarPage() {
  const { ownerId } = useIsOwner();
  const [properties, setProperties] = useState<{ id: string; name: string }[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<string>("");
  const [propertiesLoading, setPropertiesLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Load properties
  useEffect(() => {
    if (!ownerId) return;
    const load = async () => {
      const { data: links } = await (supabase as any)
        .from("owner_properties").select("property_id").eq("owner_id", ownerId);
      const ids = (links || []).map((l: any) => l.property_id);
      if (ids.length > 0) {
        const { data } = await (supabase as any)
          .from("properties").select("id, name").in("id", ids);
        setProperties(data || []);
        if (data?.length) setSelectedProperty(data[0].id);
      }
      setPropertiesLoading(false);
    };
    load();
  }, [ownerId]);

  // Use the shared hook — filters out hidden reservations automatically
  const propertyIds = useMemo(() => selectedProperty ? [selectedProperty] : [], [selectedProperty]);
  const { visibleEvents: allEvents, visibleBookingsRaw, visibleCalendarEventsRaw, loading: dataLoading } = useOwnerVisibleBookings(propertyIds);

  const loading = propertiesLoading || dataLoading;

  // Calendar grid
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startOffset = (firstDay.getDay() + 6) % 7;
    const days: (Date | null)[] = [];
    for (let i = 0; i < startOffset; i++) days.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(year, month, d));
    return days;
  }, [year, month]);

  const getEventsForDay = (date: Date) => {
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    const dayEvents = allEvents.filter(e => e.start_date <= dateStr && e.end_date > dateStr);
    const reservations = dayEvents.filter(e => e.event_type === "reservation" || e.event_type === "booking");
    const blocked = dayEvents.filter(e => e.event_type !== "reservation" && e.event_type !== "booking");
    if (reservations.length > 0) return reservations;
    return blocked.length > 0 ? [blocked[0]] : [];
  };

  // Occupancy stats — uses ONLY visible bookings
  const occupancyStats = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const totalNights = lastDay.getDate();
    let bookedNights = 0;
    for (const b of visibleBookingsRaw) {
      const s = Math.max(new Date(b.check_in).getTime(), firstDay.getTime());
      const e = Math.min(new Date(b.check_out).getTime(), lastDay.getTime() + 86400000);
      bookedNights += Math.max(0, Math.round((e - s) / 86400000));
    }
    for (const ev of visibleCalendarEventsRaw) {
      if (ev.event_type === "reservation") {
        const s = Math.max(new Date(ev.start_date).getTime(), firstDay.getTime());
        const e = Math.min(new Date(ev.end_date).getTime(), lastDay.getTime() + 86400000);
        bookedNights += Math.max(0, Math.round((e - s) / 86400000));
      }
    }
    bookedNights = Math.min(bookedNights, totalNights);
    return { bookedNights, emptyDays: totalNights - bookedNights, occupancyPct: Math.round((bookedNights / totalNights) * 100), totalNights };
  }, [visibleBookingsRaw, visibleCalendarEventsRaw, year, month]);

  const today = new Date();
  const isToday = (d: Date) => d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
  const monthName = currentDate.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Calendrier</h1>
            <p className="text-muted-foreground mt-1">Réservations et disponibilités de vos biens</p>
          </div>
          {properties.length > 1 && (
            <Select value={selectedProperty} onValueChange={setSelectedProperty}>
              <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
              <SelectContent>
                {properties.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card><CardContent className="p-3 flex items-center gap-2">
          <CalendarCheck className="h-4 w-4 text-primary" />
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Nuits réservées</p>
            <p className="text-sm font-bold text-foreground">{occupancyStats.bookedNights} / {occupancyStats.totalNights}</p>
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-3 flex items-center gap-2">
          <div className={`h-4 w-4 rounded-full flex items-center justify-center text-[10px] font-bold ${occupancyStats.occupancyPct >= 50 ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>%</div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Occupation</p>
            <p className={`text-sm font-bold ${occupancyStats.occupancyPct >= 50 ? "text-emerald-600" : "text-amber-600"}`}>{occupancyStats.occupancyPct}%</p>
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-3 flex items-center gap-2">
          <Moon className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Jours vides</p>
            <p className="text-sm font-bold text-foreground">{occupancyStats.emptyDays}</p>
          </div>
        </CardContent></Card>
      </div>

      {/* Calendar */}
      <Card>
        <CardContent className="pt-5">
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" size="icon" onClick={() => setCurrentDate(new Date(year, month - 1, 1))}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <h2 className="text-lg font-semibold capitalize">{monthName}</h2>
            <Button variant="ghost" size="icon" onClick={() => setCurrentDate(new Date(year, month + 1, 1))}>
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-1">
            {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map(d => (
              <div key={d} className="text-center text-[11px] font-medium text-muted-foreground py-1.5">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((date, i) => {
              if (!date) return <div key={`e-${i}`} className="min-h-[72px]" />;
              const dayEvents = getEventsForDay(date);
              const todayCls = isToday(date) ? "ring-2 ring-primary ring-offset-1" : "";
              return (
                <div key={date.toISOString()} className={`min-h-[72px] p-1 rounded-xl border border-border/40 ${todayCls} hover:bg-muted/20 transition-colors`}>
                  <p className={`text-[11px] font-medium mb-0.5 ${isToday(date) ? "text-primary font-bold" : "text-muted-foreground"}`}>{date.getDate()}</p>
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 2).map(ev => {
                      const isBlocked = ev.event_type !== "reservation" && ev.event_type !== "booking";
                      const colorCls = isBlocked ? "bg-amber-100 text-amber-700 border-amber-300 border-dashed" : (platformColors[ev.platform] || platformColors.other);
                      return (
                        <div key={ev.id} className={`text-[9px] leading-tight px-1.5 py-0.5 rounded-md truncate border ${colorCls}`}
                          title={isBlocked ? "Date bloquée" : (ev.guest_name || ev.summary || "Réservation")}>
                          {isBlocked ? "Bloqué" : (ev.guest_name || ev.summary || "Réservation")}
                        </div>
                      );
                    })}
                    {dayEvents.length > 2 && <p className="text-[9px] text-muted-foreground text-center">+{dayEvents.length - 2}</p>}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 mt-4 pt-3 border-t">
            {Object.entries(platformLabels).filter(([k]) => allEvents.some(e => e.platform === k)).map(([key, label]) => (
              <div key={key} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span className={`w-3 h-3 rounded-sm border ${platformColors[key]}`} />
                {label}
              </div>
            ))}
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className="w-3 h-3 rounded-sm border border-dashed bg-amber-100 border-amber-300" />
              Date bloquée
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upcoming bookings list */}
      {allEvents.filter(e => e.end_date >= new Date().toISOString().substring(0, 10) && (e.event_type === "reservation" || e.event_type === "booking")).length > 0 && (
        <Card>
          <CardContent className="pt-5">
            <h3 className="text-sm font-semibold text-foreground mb-3">Réservations à venir</h3>
            <div className="space-y-2">
              {allEvents
                .filter(e => e.end_date >= new Date().toISOString().substring(0, 10) && (e.event_type === "reservation" || e.event_type === "booking"))
                .sort((a, b) => a.start_date.localeCompare(b.start_date))
                .slice(0, 10)
                .map(ev => (
                  <div key={ev.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 border border-border/40">
                    <div className="flex items-center gap-3 min-w-0">
                      <Badge variant="outline" className={`shrink-0 text-[9px] ${platformColors[ev.platform] || platformColors.other}`}>
                        {platformLabels[ev.platform] || ev.platform}
                      </Badge>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{ev.guest_name || ev.summary || "Réservation"}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {new Date(ev.start_date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} → {new Date(ev.end_date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
