import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Calendar, Users } from "lucide-react";
import type { OccupancyDay, BookingKPIRow } from "@/hooks/usePerformanceBookingKPIs";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Props {
  occupancyDays: OccupancyDay[];
  perProperty: BookingKPIRow[];
  loading?: boolean;
}

/** Build a 90-day grid ending today. Rows = properties (or aggregated). */
export function OccupancyHeatmap({ occupancyDays, perProperty, loading }: Props) {
  const [globalView, setGlobalView] = useState(true);

  const days = useMemo(() => {
    const arr: Date[] = [];
    const end = new Date();
    end.setHours(0, 0, 0, 0);
    for (let i = 89; i >= 0; i--) {
      const d = new Date(end);
      d.setDate(d.getDate() - i);
      arr.push(d);
    }
    return arr;
  }, []);

  // Map: "YYYY-MM-DD" → Set<property_id>
  const occMap = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const o of occupancyDays) {
      if (!m.has(o.date)) m.set(o.date, new Set());
      m.get(o.date)!.add(o.property_id);
    }
    return m;
  }, [occupancyDays]);

  const totalProps = perProperty.length || 1;

  // Color intensity helper for global view (0-1 ratio of occupied props)
  const intensity = (date: string): number => {
    const set = occMap.get(date);
    if (!set) return 0;
    return set.size / totalProps;
  };

  const cellColor = (ratio: number, occupied?: boolean) => {
    if (globalView) {
      if (ratio === 0) return "bg-muted/50";
      if (ratio < 0.25) return "bg-primary/20";
      if (ratio < 0.5) return "bg-primary/40";
      if (ratio < 0.75) return "bg-primary/60";
      if (ratio < 1) return "bg-primary/80";
      return "bg-primary";
    }
    return occupied ? "bg-primary" : "bg-muted/40";
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-primary" />
            Heatmap occupation (90 derniers jours)
          </CardTitle>
          <div className="flex items-center gap-2">
            <Label htmlFor="heatmap-mode" className="text-xs text-muted-foreground cursor-pointer">
              {globalView ? "Vue globale" : "Par bien"}
            </Label>
            <Switch
              id="heatmap-mode"
              checked={!globalView}
              onCheckedChange={(c) => setGlobalView(!c)}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-[200px] flex items-center justify-center text-xs text-muted-foreground">
            Chargement…
          </div>
        ) : perProperty.length === 0 ? (
          <div className="h-[200px] flex items-center justify-center text-xs text-muted-foreground">
            Aucun bien à afficher
          </div>
        ) : globalView ? (
          // === GLOBAL VIEW: single row, intensity = % of properties booked ===
          <TooltipProvider>
            <div className="space-y-3">
              <div className="flex flex-wrap gap-[3px]">
                {days.map((d) => {
                  const dateStr = d.toISOString().slice(0, 10);
                  const ratio = intensity(dateStr);
                  const occupiedCount = occMap.get(dateStr)?.size || 0;
                  return (
                    <Tooltip key={dateStr} delayDuration={50}>
                      <TooltipTrigger asChild>
                        <div
                          className={`w-3 h-3 rounded-sm cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all ${cellColor(ratio)}`}
                        />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        <p className="font-medium">{format(d, "EEE d MMM yyyy", { locale: fr })}</p>
                        <p className="text-muted-foreground">
                          {occupiedCount} / {totalProps} bien(s) — {Math.round(ratio * 100)}%
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>{format(days[0], "d MMM", { locale: fr })}</span>
                <div className="flex items-center gap-1">
                  <span>Moins</span>
                  {[0, 0.25, 0.5, 0.75, 1].map((r) => (
                    <div key={r} className={`w-2.5 h-2.5 rounded-sm ${cellColor(r)}`} />
                  ))}
                  <span>Plus</span>
                </div>
                <span>{format(days[days.length - 1], "d MMM", { locale: fr })}</span>
              </div>
            </div>
          </TooltipProvider>
        ) : (
          // === PER-PROPERTY VIEW: one row per property ===
          <TooltipProvider>
            <div className="overflow-x-auto">
              <div className="space-y-1.5 min-w-fit">
                {perProperty.map((p) => (
                  <div key={p.property_id} className="flex items-center gap-2">
                    <div className="w-32 text-xs text-foreground truncate flex-shrink-0 flex items-center gap-1.5">
                      <Users className="w-3 h-3 text-muted-foreground shrink-0" />
                      <span className="truncate" title={p.property_name}>{p.property_name}</span>
                    </div>
                    <div className="flex gap-[2px]">
                      {days.map((d) => {
                        const dateStr = d.toISOString().slice(0, 10);
                        const occupied = occMap.get(dateStr)?.has(p.property_id) ?? false;
                        return (
                          <Tooltip key={dateStr} delayDuration={50}>
                            <TooltipTrigger asChild>
                              <div
                                className={`w-2.5 h-3 rounded-sm cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all ${cellColor(0, occupied)}`}
                              />
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs">
                              <p className="font-medium">{p.property_name}</p>
                              <p className="text-muted-foreground">
                                {format(d, "EEE d MMM", { locale: fr })} — {occupied ? "Occupé" : "Libre"}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        );
                      })}
                    </div>
                    <span className="text-[11px] text-muted-foreground tabular-nums w-10 text-right">
                      {p.occupancy_pct}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </TooltipProvider>
        )}
      </CardContent>
    </Card>
  );
}
