import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useIsOwner } from "@/hooks/useIsOwner";
import { useOwnerVisibleBookings } from "@/hooks/useOwnerVisibleBookings";
import { Loader2, Home, ClipboardList, Percent, ChevronLeft, ChevronRight, CalendarDays, MessageCircle } from "lucide-react";
import { motion } from "framer-motion";

interface PropertySummary {
  id: string;
  name: string;
  address: string;
  status: string;
}

const platformColors: Record<string, string> = {
  airbnb: "bg-[#FF5A5F]/10 text-[#FF5A5F] border-[#FF5A5F]/20",
  booking: "bg-[#003580]/10 text-[#003580] border-[#003580]/20",
  vrbo: "bg-[#3B5998]/10 text-[#3B5998] border-[#3B5998]/20",
  manual: "bg-muted text-muted-foreground border-border",
  other: "bg-accent/50 text-accent-foreground border-accent",
  bookings_table: "bg-primary/10 text-primary border-primary/20",
};

export default function OwnerDashboardHome() {
  const { ownerId } = useIsOwner();
  const navigate = useNavigate();
  const [properties, setProperties] = useState<PropertySummary[]>([]);
  const [propertyIds, setPropertyIds] = useState<string[]>([]);
  const [interventionsCount, setInterventionsCount] = useState(0);
  const [propertiesLoading, setPropertiesLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  useEffect(() => {
    if (!ownerId) return;
    const load = async () => {
      const { data: links } = await (supabase as any)
        .from("owner_properties").select("property_id").eq("owner_id", ownerId);
      const ids = (links || []).map((l: any) => l.property_id);
      setPropertyIds(ids);

      if (ids.length > 0) {
        const { data: props } = await (supabase as any)
          .from("properties").select("id, name, address, status").in("id", ids);
        setProperties(props || []);
      }

      const { count } = await (supabase as any)
        .from("owner_interventions").select("id", { count: "exact", head: true })
        .eq("owner_id", ownerId);
      setInterventionsCount(count || 0);
      setPropertiesLoading(false);
    };
    load();
  }, [ownerId]);

  // Use the shared hook — automatically excludes hidden reservations
  const { visibleEvents: allEvents, visibleBookingsRaw, visibleCalendarEventsRaw, loading: dataLoading } = useOwnerVisibleBookings(propertyIds);

  const loading = propertiesLoading || dataLoading;

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
    return {
      bookedNights,
      totalNights,
      occupancyPct: totalNights > 0 ? Math.round((bookedNights / totalNights) * 100) : 0,
    };
  }, [visibleBookingsRaw, visibleCalendarEventsRaw, year, month]);

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
    return allEvents.filter(e => e.start_date <= dateStr && e.end_date > dateStr);
  };

  const today = new Date();
  const isToday = (d: Date) => d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
  const monthName = currentDate.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-5 sm:space-y-6 max-w-6xl">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Bienvenue</h1>
        <p className="text-muted-foreground mt-1 text-sm sm:text-base">Votre espace propriétaire MyWelkom</p>
      </motion.div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="border-border">
            <CardContent className="p-4 sm:pt-6">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 sm:w-10 sm:h-10 rounded-xl bg-[hsl(var(--gold))]/10 flex items-center justify-center shrink-0">
                  <Home className="w-5 h-5 text-[hsl(var(--gold))]" />
                </div>
                <div className="flex-1">
                  <p className="text-2xl font-bold text-foreground">{properties.length}</p>
                  <p className="text-xs text-muted-foreground">Bien{properties.length !== 1 ? "s" : ""}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border-border">
            <CardContent className="p-4 sm:pt-6">
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 ${occupancyStats.occupancyPct >= 50 ? "bg-emerald-100" : occupancyStats.occupancyPct >= 20 ? "bg-amber-100" : "bg-red-100"}`}>
                  <Percent className={`w-5 h-5 ${occupancyStats.occupancyPct >= 50 ? "text-emerald-600" : occupancyStats.occupancyPct >= 20 ? "text-amber-600" : "text-red-600"}`} />
                </div>
                <div className="flex-1">
                  <p className={`text-2xl font-bold ${occupancyStats.occupancyPct >= 50 ? "text-emerald-600" : occupancyStats.occupancyPct >= 20 ? "text-amber-600" : "text-red-600"}`}>{occupancyStats.occupancyPct}%</p>
                  <p className="text-xs text-muted-foreground">Taux d'occupation</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="border-border">
            <CardContent className="p-4 sm:pt-6">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 sm:w-10 sm:h-10 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
                  <ClipboardList className="w-5 h-5 text-orange-600" />
                </div>
                <div className="flex-1">
                  <p className="text-2xl font-bold text-foreground">{interventionsCount}</p>
                  <p className="text-xs text-muted-foreground">Interventions</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Mini calendar */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
        <Card className="border-border">
          <CardHeader className="pb-2 px-4 sm:px-6">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-[hsl(var(--gold))]" />
                Calendrier
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-9" onClick={() => navigate("/proprietaire/calendrier")}>
                Voir tout →
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            <div className="flex items-center justify-between mb-3">
              <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setCurrentDate(new Date(year, month - 1, 1))}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm font-semibold capitalize">{monthName}</span>
              <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setCurrentDate(new Date(year, month + 1, 1))}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            <div className="grid grid-cols-7 gap-0.5 mb-0.5">
              {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
                <div key={i} className="text-center text-[10px] sm:text-[11px] font-medium text-muted-foreground py-1">{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-0.5">
              {calendarDays.map((date, i) => {
                if (!date) return <div key={`e-${i}`} className="h-10 sm:h-8" />;
                const dayEvents = getEventsForDay(date);
                const hasBooking = dayEvents.some(e => e.event_type === "reservation" || e.event_type === "booking");
                const hasBlocked = dayEvents.some(e => e.event_type !== "reservation" && e.event_type !== "booking");
                const todayCls = isToday(date) ? "ring-2 ring-primary" : "";

                return (
                  <button
                    key={date.toISOString()}
                    onClick={() => navigate("/proprietaire/calendrier")}
                    className={`h-10 sm:h-8 rounded-md text-xs sm:text-[11px] font-medium transition-colors relative ${todayCls} ${
                      hasBooking ? "bg-primary/15 text-primary font-bold" : hasBlocked ? "bg-amber-100 text-amber-700" : "hover:bg-muted/40 text-muted-foreground"
                    }`}
                  >
                    {date.getDate()}
                    {hasBooking && <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 sm:w-1 sm:h-1 rounded-full bg-primary" />}
                  </button>
                );
              })}
            </div>

            {/* Stats summary */}
            <div className="flex items-center justify-between mt-3 pt-3 border-t text-xs text-muted-foreground">
              <span>{occupancyStats.bookedNights} nuits réservées / {occupancyStats.totalNights}</span>
              <Badge variant="outline" className={`text-[10px] ${occupancyStats.occupancyPct >= 50 ? "border-emerald-300 text-emerald-700" : "border-amber-300 text-amber-700"}`}>
                {occupancyStats.occupancyPct}% occupation
              </Badge>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Properties list */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}>
        <Card className="border-border">
          <CardHeader className="px-4 sm:px-6"><CardTitle className="text-base sm:text-lg">Mes biens</CardTitle></CardHeader>
          <CardContent className="px-4 sm:px-6">
            {properties.length === 0 ? (
              <p className="text-muted-foreground text-sm">Aucun bien associé à votre compte.</p>
            ) : (
              <div className="space-y-3">
                {properties.map(p => (
                  <div key={p.id} className="flex items-center justify-between p-3 sm:p-3 rounded-lg bg-muted/50 border border-border gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{p.address}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium shrink-0 ${p.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
                      {p.status === "active" ? "Actif" : p.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Mobile floating action button */}
      <div className="fixed bottom-6 right-6 sm:hidden z-50">
        <Button
          size="lg"
          className="rounded-full w-14 h-14 shadow-lg bg-primary hover:bg-primary/90 p-0"
          onClick={() => navigate("/proprietaire/demandes")}
        >
          <MessageCircle className="w-6 h-6" />
        </Button>
      </div>
    </div>
  );
}
