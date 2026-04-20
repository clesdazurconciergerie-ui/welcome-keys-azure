import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Home, TrendingUp } from "lucide-react";
import { formatEUR } from "@/lib/finance-utils";
import type { BookingKPIRow } from "@/hooks/usePerformanceBookingKPIs";

interface Props {
  perProperty: BookingKPIRow[];
  loading?: boolean;
  metric?: "gross_revenue" | "occupancy_pct" | "rev_pan";
  limit?: number;
}

const METRIC_LABEL: Record<string, string> = {
  gross_revenue: "Revenu brut",
  occupancy_pct: "Occupation",
  rev_pan: "RevPAN",
};

const RANK_STYLES = [
  "bg-gradient-to-br from-amber-400 to-amber-600 text-white",
  "bg-gradient-to-br from-slate-300 to-slate-500 text-white",
  "bg-gradient-to-br from-orange-400 to-orange-700 text-white",
];

export function TopPropertiesRanking({
  perProperty,
  loading,
  metric = "gross_revenue",
  limit = 5,
}: Props) {
  const sorted = [...perProperty]
    .filter((p) => p.bookings_count > 0)
    .sort((a, b) => (b[metric] as number) - (a[metric] as number))
    .slice(0, limit);

  const max = sorted[0]?.[metric] ? (sorted[0][metric] as number) : 1;

  const formatValue = (row: BookingKPIRow): string => {
    if (metric === "occupancy_pct") return `${row.occupancy_pct}%`;
    if (metric === "rev_pan") return `${formatEUR(row.rev_pan)} / nuit`;
    return formatEUR(row.gross_revenue);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Trophy className="w-4 h-4 text-primary" />
          Top biens par {METRIC_LABEL[metric]}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="py-12 text-center text-xs text-muted-foreground">Chargement…</div>
        ) : sorted.length === 0 ? (
          <div className="py-12 text-center">
            <Home className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium text-foreground">Aucune donnée disponible</p>
            <p className="text-xs text-muted-foreground mt-1">
              Saisissez les revenus de vos réservations pour voir le classement.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {sorted.map((row, idx) => {
              const value = row[metric] as number;
              const ratio = max > 0 ? (value / max) * 100 : 0;
              return (
                <div key={row.property_id} className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 ${
                      idx < 3 ? RANK_STYLES[idx] : "bg-muted text-muted-foreground"
                    }`}>
                      {idx + 1}
                    </div>
                    <span className="text-sm font-medium text-foreground flex-1 truncate" title={row.property_name}>
                      {row.property_name}
                    </span>
                    <span className="text-sm font-bold text-foreground tabular-nums">
                      {formatValue(row)}
                    </span>
                  </div>
                  <div className="ml-8 space-y-1">
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary/70 to-primary rounded-full transition-all duration-500"
                        style={{ width: `${ratio}%` }}
                      />
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                      <span>{row.bookings_count} résa</span>
                      <span>•</span>
                      <span>{row.nights_booked} nuits</span>
                      <span>•</span>
                      <span>{row.occupancy_pct}% occ.</span>
                      {row.adr > 0 && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-0.5">
                            <TrendingUp className="w-2.5 h-2.5" />
                            {formatEUR(row.adr)} ADR
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
