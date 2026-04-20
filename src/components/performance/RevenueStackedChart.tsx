import { useMemo } from "react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import { formatEUR } from "@/lib/finance-utils";
import type { MonthlyRevenueBucket } from "@/hooks/usePerformanceBookingKPIs";

interface Props {
  data: MonthlyRevenueBucket[];
  loading?: boolean;
}

const COLORS = {
  net: "hsl(var(--primary))",
  commission: "hsl(var(--accent))",
  cleaning: "hsl(var(--gold, 38 60% 55%))",
  tax: "hsl(var(--muted-foreground))",
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s: number, p: any) => s + p.value, 0);
  return (
    <div className="rounded-lg border bg-card p-3 shadow-lg min-w-[180px]">
      <p className="text-xs font-semibold text-foreground mb-2">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.dataKey} className="flex items-center gap-2 text-xs mb-1">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ background: entry.color }} />
          <span className="text-muted-foreground capitalize">{entry.name}</span>
          <span className="font-medium text-foreground ml-auto tabular-nums">
            {formatEUR(entry.value)}
          </span>
        </div>
      ))}
      <div className="border-t border-border mt-2 pt-2 flex items-center text-xs font-bold">
        <span>Total brut</span>
        <span className="ml-auto tabular-nums">{formatEUR(total)}</span>
      </div>
    </div>
  );
};

export function RevenueStackedChart({ data, loading }: Props) {
  const empty = useMemo(() => data.every((d) => d.gross === 0), [data]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <TrendingUp className="w-4 h-4 text-primary" />
          Revenus mensuels (décomposés)
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Net propriétaire · Commission · Ménage · Taxe — basé sur les réservations renseignées.
        </p>
      </CardHeader>
      <CardContent className="pt-2">
        {loading ? (
          <div className="h-[280px] flex items-center justify-center text-xs text-muted-foreground">
            Chargement…
          </div>
        ) : empty ? (
          <div className="h-[280px] flex flex-col items-center justify-center text-center">
            <p className="text-sm font-medium text-foreground">
              Aucun revenu renseigné
            </p>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs">
              Saisissez les montants de vos réservations dans <strong>Finance → Revenus à compléter</strong>.
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="label"
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tickFormatter={(v) => v === 0 ? "0" : `${(v / 1000).toFixed(0)}k`}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted) / 0.4)" }} />
              <Legend
                wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
                iconType="circle"
                iconSize={8}
              />
              <Bar dataKey="net" stackId="a" name="Net propriétaire" fill={COLORS.net} radius={[0, 0, 0, 0]} />
              <Bar dataKey="commission" stackId="a" name="Commission" fill={COLORS.commission} />
              <Bar dataKey="cleaning" stackId="a" name="Ménage" fill={COLORS.cleaning} />
              <Bar dataKey="tax" stackId="a" name="Taxe séjour" fill={COLORS.tax} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
