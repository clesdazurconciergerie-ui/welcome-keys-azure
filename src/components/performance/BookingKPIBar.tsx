import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Coins, Bed, Percent, TrendingUp, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { formatEUR } from "@/lib/finance-utils";
import type { PerformanceBookingKPIs } from "@/hooks/usePerformanceBookingKPIs";

interface Props {
  kpis: PerformanceBookingKPIs;
  loading?: boolean;
}

export function BookingKPIBar({ kpis, loading }: Props) {
  const items = [
    {
      label: "Revenu brut résa",
      value: formatEUR(kpis.totalGross),
      icon: Coins,
      accent: "text-emerald-600",
      hint: `${kpis.totalNightsBooked} nuits réservées`,
    },
    {
      label: "Net propriétaire",
      value: formatEUR(kpis.totalOwnerNet),
      icon: TrendingUp,
      accent: "text-primary",
      hint: `Concierge: ${formatEUR(kpis.totalConciergeRevenue)}`,
    },
    {
      label: "Occupation",
      value: `${kpis.globalOccupancyPct}%`,
      icon: Percent,
      accent: kpis.globalOccupancyPct >= 60 ? "text-emerald-600" : kpis.globalOccupancyPct >= 30 ? "text-amber-600" : "text-destructive",
      hint: `${kpis.totalNightsBooked} / ${kpis.totalNightsAvailable} nuits`,
    },
    {
      label: "ADR moyen",
      value: kpis.globalAdr > 0 ? formatEUR(kpis.globalAdr) : "—",
      icon: Bed,
      accent: "text-foreground",
      hint: `RevPAN: ${formatEUR(kpis.globalRevPAN)}`,
    },
  ];

  return (
    <div className="space-y-3">
      {kpis.pendingRevenueCount > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/20">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-amber-900 dark:text-amber-200">
              {kpis.pendingRevenueCount} réservation(s) sans revenu renseigné
            </p>
            <p className="text-[11px] text-amber-700 dark:text-amber-300/80">
              Ces réservations comptent dans l'occupation mais pas dans le chiffre d'affaires.
            </p>
          </div>
          <Button asChild variant="outline" size="sm" className="border-amber-300 hover:bg-amber-100 dark:border-amber-800">
            <Link to="/dashboard/finance/revenus-a-completer">Compléter</Link>
          </Button>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {items.map((item) => (
          <Card key={item.label} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                  {item.label}
                </p>
                <item.icon className={`w-4 h-4 ${item.accent}`} />
              </div>
              <p className={`text-xl font-bold tabular-nums ${item.accent}`}>
                {loading ? "..." : item.value}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1 truncate" title={item.hint}>
                {item.hint}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
