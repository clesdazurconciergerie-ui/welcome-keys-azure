import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, BarChart3 } from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";
import { usePlatformStats } from "@/hooks/usePlatformStats";
import { PLATFORM_LABELS, PLATFORM_CLASSES, type BookingPlatform } from "@/lib/booking-platforms";
import { PlatformBadge } from "@/components/PlatformBadge";

interface Props {
  propertyId: string;
  /** Window start (ISO date). Defaults to 12 months back. */
  startDate?: string;
  /** Window end (ISO date). Defaults to today. */
  endDate?: string;
  /** When true, hide revenue / ADR (owner read-only mode). */
  hideRevenue?: boolean;
  /** Optional title override */
  title?: string;
}

/**
 * Reads CSS variable --platform-{key} (HSL triplet) and returns a usable HSL string.
 * Recharts requires a real color string — we resolve tokens at runtime to stay compliant
 * with the design-system rule (no hardcoded hex in components).
 */
function resolveTokenColor(platform: BookingPlatform): string {
  if (typeof window === "undefined") return "hsl(0 0% 50%)";
  const root = document.documentElement;
  const value = getComputedStyle(root).getPropertyValue(`--platform-${platform}`).trim();
  return value ? `hsl(${value})` : "hsl(0 0% 50%)";
}

export function PlatformPerformance({
  propertyId,
  startDate,
  endDate,
  hideRevenue = false,
  title = "Performance par plateforme",
}: Props) {
  // Default window: last 12 months
  const defaults = useMemo(() => {
    const end = endDate || new Date().toISOString().slice(0, 10);
    const startObj = startDate
      ? new Date(startDate)
      : (() => { const d = new Date(); d.setMonth(d.getMonth() - 12); return d; })();
    return { start: startObj.toISOString().slice(0, 10), end };
  }, [startDate, endDate]);

  const { stats, totalBookings, totalRevenue, loading } =
    usePlatformStats(propertyId, { startDate: defaults.start, endDate: defaults.end, hideRevenue });

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[hsl(var(--gold))]" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (stats.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[hsl(var(--gold))]" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            Aucune réservation sur la période. Importez un calendrier iCal ou créez une réservation manuelle.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Prepare chart data with resolved token colors
  const chartData = stats.map(s => ({
    ...s,
    name: PLATFORM_LABELS[s.platform],
    color: resolveTokenColor(s.platform),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-[hsl(var(--gold))]" />
          {title}
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          {totalBookings} réservation{totalBookings > 1 ? "s" : ""}
          {!hideRevenue && totalRevenue > 0 && ` · ${totalRevenue.toFixed(0)}€ de revenus`}
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Charts */}
        <div className={`grid grid-cols-1 ${hideRevenue ? "" : "lg:grid-cols-2"} gap-6`}>
          {/* Donut: répartition des réservations */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">Répartition des réservations</h4>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="bookings"
                  nameKey="name"
                  innerRadius={50}
                  outerRadius={85}
                  paddingAngle={2}
                >
                  {chartData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} stroke="hsl(var(--background))" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "0.5rem",
                    color: "hsl(var(--popover-foreground))",
                    fontSize: "12px",
                  }}
                  formatter={(value: any, _name: any, item: any) => [
                    `${value} (${item.payload.share.toFixed(0)}%)`,
                    item.payload.name,
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap justify-center gap-3 mt-2">
              {chartData.map(d => (
                <div key={d.platform} className="flex items-center gap-1.5 text-xs">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${PLATFORM_CLASSES[d.platform].dot}`}
                  />
                  <span className="text-muted-foreground">{d.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bar: revenu par plateforme — hidden in owner mode */}
          {!hideRevenue && (
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-3">Revenu par plateforme</h4>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "0.5rem",
                      color: "hsl(var(--popover-foreground))",
                      fontSize: "12px",
                    }}
                    formatter={(value: any) => [`${Number(value).toFixed(0)}€`, "Revenu"]}
                  />
                  <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                    {chartData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Detail table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="pb-2 font-semibold text-muted-foreground">Plateforme</th>
                <th className="pb-2 font-semibold text-muted-foreground text-right">Réservations</th>
                <th className="pb-2 font-semibold text-muted-foreground text-right">Nuits</th>
                {!hideRevenue && (
                  <>
                    <th className="pb-2 font-semibold text-muted-foreground text-right">Revenu</th>
                    <th className="pb-2 font-semibold text-muted-foreground text-right">ADR</th>
                  </>
                )}
                <th className="pb-2 font-semibold text-muted-foreground text-right">Occupation</th>
                <th className="pb-2 font-semibold text-muted-foreground text-right">%</th>
              </tr>
            </thead>
            <tbody>
              {stats.map(s => (
                <tr key={s.platform} className="border-b border-border last:border-0">
                  <td className="py-2.5"><PlatformBadge platform={s.platform} /></td>
                  <td className="py-2.5 text-right font-medium">{s.bookings}</td>
                  <td className="py-2.5 text-right text-muted-foreground">{s.nights}</td>
                  {!hideRevenue && (
                    <>
                      <td className="py-2.5 text-right font-semibold">{s.revenue.toFixed(0)}€</td>
                      <td className="py-2.5 text-right text-muted-foreground">
                        {s.adr > 0 ? `${s.adr.toFixed(0)}€` : "—"}
                      </td>
                    </>
                  )}
                  <td className="py-2.5 text-right text-muted-foreground">{s.occupancyRate.toFixed(0)}%</td>
                  <td className="py-2.5 text-right text-muted-foreground">{s.share.toFixed(0)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
