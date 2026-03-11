import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface OwnerCalEvent {
  id: string;
  start_date: string;
  end_date: string;
  guest_name: string | null;
  summary: string | null;
  platform: string;
  event_type: string;
  source?: string | null;
}

/**
 * Shared hook for owner-visible bookings.
 * Fetches bookings + calendar_events for given property IDs,
 * then excludes any event hidden via calendar_overrides.
 *
 * This is the SINGLE SOURCE OF TRUTH for owner portal data.
 */
export function useOwnerVisibleBookings(propertyIds: string[]) {
  const [bookings, setBookings] = useState<any[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  const [hiddenSourceIds, setHiddenSourceIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const stableKey = propertyIds.sort().join(",");

  const fetchAll = useCallback(async () => {
    if (propertyIds.length === 0) {
      setBookings([]);
      setCalendarEvents([]);
      setHiddenSourceIds(new Set());
      setLoading(false);
      return;
    }

    setLoading(true);

    // Fetch all three in parallel
    const [bkRes, ceRes, ovRes] = await Promise.all([
      (supabase as any)
        .from("bookings")
        .select("id, check_in, check_out, guest_name, source, calendar_event_id, property_id")
        .in("property_id", propertyIds)
        .order("check_in", { ascending: false }),
      (supabase as any)
        .from("calendar_events")
        .select("id, start_date, end_date, guest_name, summary, platform, event_type, property_id")
        .in("property_id", propertyIds)
        .order("start_date", { ascending: false }),
      (supabase as any)
        .from("calendar_overrides")
        .select("source_event_id")
        .in("property_id", propertyIds)
        .eq("override_type", "hide"),
    ]);

    const rawBookings = bkRes.data || [];
    const rawEvents = ceRes.data || [];
    const overrides = ovRes.data || [];

    const hiddenIds = new Set<string>(overrides.map((o: any) => o.source_event_id));

    if (import.meta.env.DEV) {
      console.log("[OwnerVisibleBookings] raw bookings:", rawBookings.length);
      console.log("[OwnerVisibleBookings] raw calendar_events:", rawEvents.length);
      console.log("[OwnerVisibleBookings] hidden override IDs:", [...hiddenIds]);
    }

    setBookings(rawBookings);
    setCalendarEvents(rawEvents);
    setHiddenSourceIds(hiddenIds);
    setLoading(false);
  }, [stableKey]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  /**
   * Merged + filtered events.
   * A booking is hidden if:
   *   - its own id is in hiddenSourceIds, OR
   *   - its calendar_event_id is in hiddenSourceIds
   * A calendar_event is hidden if its id is in hiddenSourceIds.
   */
  const visibleEvents: OwnerCalEvent[] = useMemo(() => {
    const bkEvents: OwnerCalEvent[] = bookings
      .filter((b: any) => {
        // Check raw id, prefixed id, and linked calendar_event_id
        if (hiddenSourceIds.has(b.id)) return false;
        if (hiddenSourceIds.has(`bk-${b.id}`)) return false;
        if (b.calendar_event_id && hiddenSourceIds.has(b.calendar_event_id)) return false;
        return true;
      })
      .map((b: any) => ({
        id: `bk-${b.id}`,
        start_date: b.check_in,
        end_date: b.check_out,
        guest_name: b.guest_name,
        summary: b.guest_name || "Réservation",
        platform: "bookings_table",
        event_type: "booking",
        source: b.source,
      }));

    const ceEvents: OwnerCalEvent[] = calendarEvents
      .filter((e: any) => !hiddenSourceIds.has(e.id))
      .map((e: any) => ({
        id: e.id,
        start_date: e.start_date,
        end_date: e.end_date,
        guest_name: e.guest_name,
        summary: e.summary,
        platform: e.platform,
        event_type: e.event_type || "unknown",
      }));

    const result = [...bkEvents, ...ceEvents];

    if (import.meta.env.DEV) {
      const hiddenCount = (bookings.length + calendarEvents.length) - result.length;
      console.log("[OwnerVisibleBookings] hidden excluded:", hiddenCount, "| visible:", result.length);
    }

    return result;
  }, [bookings, calendarEvents, hiddenSourceIds]);

  /**
   * Only visible bookings (real reservations, not blocked) for occupancy.
   * Returns raw booking rows that passed the hidden filter.
   */
  const visibleBookingsRaw = useMemo(() => {
    return bookings.filter((b: any) => {
      if (hiddenSourceIds.has(b.id)) return false;
      if (hiddenSourceIds.has(`bk-${b.id}`)) return false;
      if (b.calendar_event_id && hiddenSourceIds.has(b.calendar_event_id)) return false;
      return true;
    });
  }, [bookings, hiddenSourceIds]);

  const visibleCalendarEventsRaw = useMemo(() => {
    return calendarEvents.filter((e: any) => !hiddenSourceIds.has(e.id));
  }, [calendarEvents, hiddenSourceIds]);

  return {
    visibleEvents,
    visibleBookingsRaw,
    visibleCalendarEventsRaw,
    loading,
    refetch: fetchAll,
  };
}
