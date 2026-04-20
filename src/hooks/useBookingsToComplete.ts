import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { BookingRevenueTarget } from "@/components/finance/BookingRevenueDialog";

export interface BookingToComplete extends BookingRevenueTarget {
  property_name: string;
  property_id: string;
}

/**
 * Returns all bookings (iCal-imported or manual) that have no gross_amount filled in yet,
 * so concierges can complete their revenue retroactively.
 *
 * Also runs a one-shot backfill on first call to create empty bookings from any orphan
 * calendar_events that were imported before the auto-trigger was in place.
 */
export function useBookingsToComplete() {
  const [bookings, setBookings] = useState<BookingToComplete[]>([]);
  const [loading, setLoading] = useState(true);
  const [backfilledCount, setBackfilledCount] = useState<number | null>(null);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { data, error } = await (supabase as any)
      .from("bookings")
      .select("id, property_id, check_in, check_out, guest_name, source, source_platform, gross_amount, cleaning_amount, commission_amount, tourist_tax_amount, property:properties(name)")
      .eq("user_id", user.id)
      .is("gross_amount", null)
      .neq("price_status", "canceled")
      .order("check_out", { ascending: false });

    if (!error && data) {
      setBookings(
        (data as any[]).map((b) => ({
          ...b,
          property_name: b.property?.name || "—",
        })),
      );
    }
    setLoading(false);
  }, []);

  /** Trigger the SQL backfill once per session. */
  const runBackfill = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;
    const { data, error } = await (supabase as any).rpc("backfill_bookings_from_calendar_events", {
      _user_id: user.id,
    });
    if (!error) {
      setBackfilledCount(data ?? 0);
      return data ?? 0;
    }
    return 0;
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  return {
    bookings,
    loading,
    refetch: fetchBookings,
    runBackfill,
    backfilledCount,
  };
}
