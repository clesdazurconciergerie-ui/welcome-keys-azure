import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarRange, Moon, User } from "lucide-react";
import { motion } from "framer-motion";
import { getPlatformClasses, getPlatformLabel } from "@/lib/booking-platforms";
import type { OwnerCalEvent } from "@/hooks/useOwnerVisibleBookings";

interface Props {
  events: OwnerCalEvent[];
  /** Optional map of property_id -> property_name to show context (multi-property view) */
  propertyNameById?: Record<string, string>;
  limit?: number;
  title?: string;
}

const platformColors = new Proxy({} as Record<string, string>, {
  get: (_t, key: string) => getPlatformClasses(key).badge,
});

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });

const nightsBetween = (a: string, b: string) =>
  Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000));

export function UpcomingBookingsList({ events, propertyNameById, limit = 8, title = "Prochaines réservations" }: Props) {
  const todayStr = new Date().toISOString().substring(0, 10);

  const upcoming = events
    .filter(e => e.end_date >= todayStr && (e.event_type === "reservation" || e.event_type === "booking"))
    .sort((a, b) => a.start_date.localeCompare(b.start_date))
    .slice(0, limit);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="border-border">
        <CardHeader className="pb-3 px-4 sm:px-6">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <CalendarRange className="w-5 h-5 text-black" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Aucune réservation à venir
            </p>
          ) : (
            <div className="space-y-2">
              {upcoming.map(ev => {
                const nights = nightsBetween(ev.start_date, ev.end_date);
                const platformKey = ev.source || ev.platform;
                const propName = propertyNameById && ev.property_id ? propertyNameById[ev.property_id] : undefined;
                return (
                  <div
                    key={ev.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/40 border border-border/60 hover:bg-muted/60 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <User className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-foreground text-sm truncate">
                            {ev.guest_name || ev.summary || "Réservation"}
                          </p>
                          <Badge variant="outline" className={`shrink-0 text-[9px] px-1.5 py-0 ${platformColors[platformKey] || platformColors.other}`}>
                            {getPlatformLabel(platformKey)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground flex-wrap">
                          <span className="font-medium">
                            {fmtDate(ev.start_date)} → {fmtDate(ev.end_date)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Moon className="w-3 h-3" />
                            {nights} nuit{nights !== 1 ? "s" : ""}
                          </span>
                          {propName && <span className="truncate">· {propName}</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
