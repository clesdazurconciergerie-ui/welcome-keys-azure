import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { resolveBookingPlatform, type BookingPlatform, BOOKING_PLATFORMS } from "@/lib/booking-platforms";

export interface PlatformStat {
  platform: BookingPlatform;
  bookings: number;
  revenue: number;
  nights: number;
  adr: number; // Average Daily Rate
  occupancyRate: number; // % over the analysed window
  share: number; // % of total bookings
}

export interface PlatformStatsResult {
  stats: PlatformStat[];
  totalBookings: number;
  totalRevenue: number;
  totalNights: number;
  windowDays: number;
}

interface Options {
  /** ISO date inclusive */
  startDate?: string;
  /** ISO date inclusive */
  endDate?: string;
  /** When true (owner mode) revenue is omitted from the result */
  hideRevenue?: boolean;
}

const dayMs = 1000 * 60 * 60 * 24;

function diffNights(checkIn: string, checkOut: string): number {
  const a = new Date(checkIn).getTime();
  const b = new Date(checkOut).getTime();
  if (Number.isNaN(a) || Number.isNaN(b) || b <= a) return 0;
  return Math.max(1, Math.round((b - a) / dayMs));
}

/**
 * Aggregate booking + iCal calendar event statistics grouped by source platform
 * for a single property.
 */
export function usePlatformStats(propertyId?: string, options: Options = {}) {
  const { startDate, endDate, hideRevenue = false } = options;
  const [data, setData] = useState<PlatformStatsResult>({
    stats: [],
    totalBookings: 0,
    totalRevenue: 0,
    totalNights: 0,
    windowDays: 0,
  });
  const [loading, setLoading] = useState(true);

  const compute = useCallback(async () => {
    if (!propertyId) {
      setLoading(false);
      return;
    }
    setLoading(true);

    // 1) Manual / direct bookings
    let bookingsQuery = (supabase as any)
      .from("bookings")
      .select("source, source_platform, gross_amount, check_in, check_out, calendar_event_id")
      .eq("property_id", propertyId);
    if (startDate) bookingsQuery = bookingsQuery.gte("check_out", startDate);
    if (endDate) bookingsQuery = bookingsQuery.lte("check_in", endDate);
    const { data: bookings } = await bookingsQuery;

    // 2) iCal events (reservations only) — exclude those already mirrored as bookings
    let eventsQuery = (supabase as any)
      .from("calendar_events")
      .select("id, source_platform, source_name, platform, summary, start_date, end_date, event_type")
      .eq("property_id", propertyId)
      .eq("event_type", "reservation");
    if (startDate) eventsQuery = eventsQuery.gte("end_date", startDate);
    if (endDate) eventsQuery = eventsQuery.lte("start_date", endDate);
    const { data: events } = await eventsQuery;

    const linkedEventIds = new Set(
      ((bookings || []) as any[]).map(b => b.calendar_event_id).filter(Boolean)
    );

    // Aggregate per platform
    const buckets = new Map<BookingPlatform, { bookings: number; revenue: number; nights: number }>();
    BOOKING_PLATFORMS.forEach(p => buckets.set(p, { bookings: 0, revenue: 0, nights: 0 }));

    (bookings || []).forEach((b: any) => {
      const platform = resolveBookingPlatform({
        platform: b.source_platform,
        source: b.source,
      });
      const bucket = buckets.get(platform)!;
      bucket.bookings += 1;
      bucket.revenue += Number(b.gross_amount || 0);
      bucket.nights += diffNights(b.check_in, b.check_out);
    });

    (events || []).forEach((e: any) => {
      if (linkedEventIds.has(e.id)) return; // avoid double-count
      const platform = resolveBookingPlatform({
        platform: e.source_platform || e.platform,
        source: e.source_name,
        summary: e.summary,
      });
      const bucket = buckets.get(platform)!;
      bucket.bookings += 1;
      bucket.nights += diffNights(e.start_date, e.end_date);
      // No revenue available from raw iCal events
    });

    // Compute window length
    let windowDays = 0;
    if (startDate && endDate) {
      const s = new Date(startDate).getTime();
      const e = new Date(endDate).getTime();
      windowDays = Math.max(1, Math.round((e - s) / dayMs));
    }

    const totalBookings = Array.from(buckets.values()).reduce((sum, x) => sum + x.bookings, 0);
    const totalRevenue = Array.from(buckets.values()).reduce((sum, x) => sum + x.revenue, 0);
    const totalNights = Array.from(buckets.values()).reduce((sum, x) => sum + x.nights, 0);

    const stats: PlatformStat[] = BOOKING_PLATFORMS
      .map(platform => {
        const b = buckets.get(platform)!;
        const adr = b.nights > 0 ? b.revenue / b.nights : 0;
        const occupancyRate = windowDays > 0 ? (b.nights / windowDays) * 100 : 0;
        const share = totalBookings > 0 ? (b.bookings / totalBookings) * 100 : 0;
        return {
          platform,
          bookings: b.bookings,
          revenue: hideRevenue ? 0 : b.revenue,
          nights: b.nights,
          adr: hideRevenue ? 0 : adr,
          occupancyRate,
          share,
        };
      })
      .filter(s => s.bookings > 0);

    setData({
      stats,
      totalBookings,
      totalRevenue: hideRevenue ? 0 : totalRevenue,
      totalNights,
      windowDays,
    });
    setLoading(false);
  }, [propertyId, startDate, endDate, hideRevenue]);

  useEffect(() => {
    compute();
  }, [compute]);

  return { ...data, loading, refetch: compute };
}
