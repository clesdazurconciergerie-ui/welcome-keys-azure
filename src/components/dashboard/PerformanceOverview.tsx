import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, DollarSign, Briefcase, Calendar } from "lucide-react";
import { usePropertyPerformance } from "@/hooks/usePropertyPerformance";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface PerformanceOverviewProps {
  startDate: string;
  endDate: string;
}

export function PerformanceOverview({ startDate, endDate }: PerformanceOverviewProps) {
  const { data, loading, globalMetrics } = usePropertyPerformance(startDate, endDate);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-12 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const metrics = [
    {
      label: "Taux d'occupation",
      value: `${globalMetrics.total_occupancy.toFixed(1)}%`,
      icon: TrendingUp,
      color: "text-emerald-600",
    },
    {
      label: "Revenus estimés",
      value: `${globalMetrics.total_revenue.toFixed(0)}€`,
      icon: DollarSign,
      color: "text-[hsl(var(--gold))]",
    },
    {
      label: "Missions",
      value: globalMetrics.total_missions.toString(),
      icon: Briefcase,
      color: "text-primary",
    },
    {
      label: "Logements",
      value: globalMetrics.total_properties.toString(),
      icon: Calendar,
      color: "text-violet-600",
    },
  ];

  return (
    <div className="space-y-4">
      {/* Global Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">{metric.label}</p>
                  <p className="text-2xl font-bold mt-1">{metric.value}</p>
                </div>
                <metric.icon className={`w-8 h-8 ${metric.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Property Performance Table */}
      {data.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Performance par logement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-3 font-semibold text-muted-foreground">Logement</th>
                    <th className="pb-3 font-semibold text-muted-foreground text-right">Occupation</th>
                    <th className="pb-3 font-semibold text-muted-foreground text-right">Revenus</th>
                    <th className="pb-3 font-semibold text-muted-foreground text-right">Missions</th>
                    <th className="pb-3 font-semibold text-muted-foreground">Prochain check-out</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((prop) => (
                    <tr key={prop.property_id} className="border-b border-border last:border-0">
                      <td className="py-3 font-medium">{prop.property_name}</td>
                      <td className="py-3 text-right">
                        <Badge variant={prop.occupancy_rate > 70 ? "default" : "secondary"}>
                          {prop.occupancy_rate.toFixed(0)}%
                        </Badge>
                      </td>
                      <td className="py-3 text-right font-semibold">
                        {prop.estimated_revenue.toFixed(0)}€
                      </td>
                      <td className="py-3 text-right">{prop.missions_count}</td>
                      <td className="py-3 text-muted-foreground text-sm">
                        {prop.next_checkout
                          ? format(new Date(prop.next_checkout), "dd MMM", { locale: fr })
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
