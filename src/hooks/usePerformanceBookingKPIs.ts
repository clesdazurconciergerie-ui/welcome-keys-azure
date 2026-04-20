import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface BookingKPIRow {
  property_id: string;
  property_name: string;
  bookings_count: number;
  nights_booked: number;
  total_nights_available: number;
  occupancy_pct: number;
  gross_revenue: number;
  cleaning_revenue: number;
  commission_paid: number;
  tourist_tax_collected: number;
  owner_net_total: number;
  concierge_revenue_total: number;
  adr: number; // average daily rate (gross / nights_booked)
  rev_pan: number; // revenue per available night
}

export interface MonthlyRevenueBucket {
  month: string; // YYYY-MM
  label: string; // "janv. 25"
  gross: number;
  cleaning: number;
  commission: number;
  tax: number;
  net: number;
}

export interface OccupancyDay {
  date: string; // YYYY-MM-DD
  property_id: string;
  occupied: boolean;
}

export interface PerformanceBookingKPIs {
  totalGross: number;
  totalCleaning: number;
  totalCommission: number;
  totalTax: number;
  totalOwnerNet: number;
  totalConciergeRevenue: number;
  totalNightsBooked: number;
  totalNightsAvailable: number;
  globalOccupancyPct: number;
  globalAdr: number;
  globalRevPAN: number;
  perProperty: BookingKPIRow[];
  monthlyBuckets: MonthlyRevenueBucket[];
  occupancyDays: OccupancyDay[];
  pendingRevenueCount: number;
}

const EMPTY: PerformanceBookingKPIs = {
  totalGross: 0, totalCleaning: 0, totalCommission: 0, totalTax: 0,
  totalOwnerNet: 0, totalConciergeRevenue: 0,
  totalNightsBooked: 0, totalNightsAvailable: 0,
  globalOccupancyPct: 0, globalAdr: 0, globalRevPAN: 0,
  perProperty: [], monthlyBuckets: [], occupancyDays: [], pendingRevenueCount: 0,
};

function nightsBetween(start: string, end: string): number {
  return Math.max(0, Math.round(
    (new Date(end).getTime() - new Date(start).getTime()) / 86400000
  ));
}

function overlapNights(ci: string, co: string, ps: string, pe: string): number {
  const s = Math.max(new Date(ci).getTime(), new Date(ps).getTime());
  const e = Math.min(new Date(co).getTime(), new Date(pe).getTime());
  return Math.max(0, Math.round((e - s) / 86400000));
}

/**
 * Computes performance KPIs from real bookings (with manually-entered revenues),
 * NOT from invoices. This is the source of truth for iCal-imported reservations.
 */
export function usePerformanceBookingKPIs(monthsBack: number = 6) {
  const [kpis, setKpis] = useState<PerformanceBookingKPIs>(EMPTY);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth() - monthsBack + 1, 1);
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const periodStartIso = periodStart.toISOString().slice(0, 10);
      const periodEndIso = periodEnd.toISOString().slice(0, 10);

      const { data: properties } = await (supabase as any)
        .from("properties")
        .select("id, name")
        .eq("user_id", user.id);
      const props = (properties || []) as any[];

      const { data: bookings } = await (supabase as any)
        .from("bookings")
        .select(`
          id, property_id, check_in, check_out,
          gross_amount, cleaning_amount, commission_amount,
          tourist_tax_amount, owner_net, concierge_revenue, price_status
        `)
        .eq("user_id", user.id)
        .lt("check_in", periodEndIso)
        .gt("check_out", periodStartIso)
        .neq("price_status", "canceled");
      const bks = (bookings || []) as any[];

      const totalNightsAvailable = props.length * nightsBetween(periodStartIso, periodEndIso);

      let totalGross = 0, totalCleaning = 0, totalCommission = 0, totalTax = 0;
      let totalOwnerNet = 0, totalConciergeRevenue = 0, totalNightsBooked = 0;
      let pendingRevenueCount = 0;

      // Per-property aggregation
      const propertyMap = new Map<string, BookingKPIRow>();
      for (const p of props) {
        propertyMap.set(p.id, {
          property_id: p.id,
          property_name: p.name,
          bookings_count: 0,
          nights_booked: 0,
          total_nights_available: nightsBetween(periodStartIso, periodEndIso),
          occupancy_pct: 0,
          gross_revenue: 0,
          cleaning_revenue: 0,
          commission_paid: 0,
          tourist_tax_collected: 0,
          owner_net_total: 0,
          concierge_revenue_total: 0,
          adr: 0,
          rev_pan: 0,
        });
      }

      for (const b of bks) {
        const row = propertyMap.get(b.property_id);
        if (!row) continue;
        const nights = overlapNights(b.check_in, b.check_out, periodStartIso, periodEndIso);
        row.bookings_count += 1;
        row.nights_booked += nights;
        totalNightsBooked += nights;

        if (b.gross_amount === null || b.gross_amount === undefined) {
          pendingRevenueCount += 1;
          continue;
        }

        const gross = Number(b.gross_amount) || 0;
        const cleaning = Number(b.cleaning_amount) || 0;
        const commission = Number(b.commission_amount) || 0;
        const tax = Number(b.tourist_tax_amount) || 0;
        const net = Number(b.owner_net) || (gross - cleaning - commission - tax);
        const conc = Number(b.concierge_revenue) || commission + cleaning;

        row.gross_revenue += gross;
        row.cleaning_revenue += cleaning;
        row.commission_paid += commission;
        row.tourist_tax_collected += tax;
        row.owner_net_total += net;
        row.concierge_revenue_total += conc;

        totalGross += gross;
        totalCleaning += cleaning;
        totalCommission += commission;
        totalTax += tax;
        totalOwnerNet += net;
        totalConciergeRevenue += conc;
      }

      // Finalize per-property metrics
      const perProperty: BookingKPIRow[] = [];
      propertyMap.forEach((row) => {
        row.occupancy_pct = row.total_nights_available > 0
          ? Math.round((row.nights_booked / row.total_nights_available) * 100)
          : 0;
        row.adr = row.nights_booked > 0
          ? Math.round((row.gross_revenue / row.nights_booked) * 100) / 100
          : 0;
        row.rev_pan = row.total_nights_available > 0
          ? Math.round((row.gross_revenue / row.total_nights_available) * 100) / 100
          : 0;
        perProperty.push(row);
      });
      perProperty.sort((a, b) => b.gross_revenue - a.gross_revenue);

      // Monthly buckets — split each booking's revenue proportionally to nights
      const monthlyBuckets: MonthlyRevenueBucket[] = [];
      for (let i = monthsBack - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = d.toISOString().slice(0, 7);
        const label = d.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
        const monthStart = `${monthKey}-01`;
        const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);

        let g = 0, c = 0, com = 0, t = 0, n = 0;
        for (const b of bks) {
          if (b.gross_amount === null || b.gross_amount === undefined) continue;
          const overlap = overlapNights(b.check_in, b.check_out, monthStart, monthEnd);
          if (overlap === 0) continue;
          const totalN = nightsBetween(b.check_in, b.check_out) || 1;
          const ratio = overlap / totalN;
          g += (Number(b.gross_amount) || 0) * ratio;
          c += (Number(b.cleaning_amount) || 0) * ratio;
          com += (Number(b.commission_amount) || 0) * ratio;
          t += (Number(b.tourist_tax_amount) || 0) * ratio;
          n += (Number(b.owner_net) || (Number(b.gross_amount) - Number(b.cleaning_amount || 0) - Number(b.commission_amount || 0) - Number(b.tourist_tax_amount || 0))) * ratio;
        }
        monthlyBuckets.push({
          month: monthKey, label,
          gross: Math.round(g * 100) / 100,
          cleaning: Math.round(c * 100) / 100,
          commission: Math.round(com * 100) / 100,
          tax: Math.round(t * 100) / 100,
          net: Math.round(n * 100) / 100,
        });
      }

      // Occupancy days for heatmap (last 90 days max for performance)
      const heatmapStart = new Date(now.getTime() - 90 * 86400000);
      const occupancyDays: OccupancyDay[] = [];
      for (const b of bks) {
        const start = new Date(Math.max(new Date(b.check_in).getTime(), heatmapStart.getTime()));
        const end = new Date(Math.min(new Date(b.check_out).getTime(), now.getTime()));
        for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
          occupancyDays.push({
            date: d.toISOString().slice(0, 10),
            property_id: b.property_id,
            occupied: true,
          });
        }
      }

      const globalOccupancyPct = totalNightsAvailable > 0
        ? Math.round((totalNightsBooked / totalNightsAvailable) * 100)
        : 0;
      const globalAdr = totalNightsBooked > 0
        ? Math.round((totalGross / totalNightsBooked) * 100) / 100
        : 0;
      const globalRevPAN = totalNightsAvailable > 0
        ? Math.round((totalGross / totalNightsAvailable) * 100) / 100
        : 0;

      setKpis({
        totalGross, totalCleaning, totalCommission, totalTax,
        totalOwnerNet, totalConciergeRevenue,
        totalNightsBooked, totalNightsAvailable,
        globalOccupancyPct, globalAdr, globalRevPAN,
        perProperty, monthlyBuckets, occupancyDays, pendingRevenueCount,
      });
    } catch (err) {
      console.error("[usePerformanceBookingKPIs] error:", err);
    } finally {
      setLoading(false);
    }
  }, [monthsBack]);

  useEffect(() => { fetch(); }, [fetch]);

  return { kpis, loading, refetch: fetch };
}
