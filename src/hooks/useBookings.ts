import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Booking {
  id: string;
  property_id: string;
  user_id: string;
  check_in: string;
  check_out: string;
  source: string;
  guest_name: string | null;
  gross_amount: number | null;
  commission_amount: number;
  cleaning_amount: number;
  checkin_amount: number;
  maintenance_amount: number;
  other_deductions: number;
  owner_net: number;
  concierge_revenue: number;
  price_status: string;
  financial_status: string;
  notes: string | null;
  calendar_event_id: string | null;
  created_at: string;
  property?: { name: string };
}

export function useBookings(propertyId?: string) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBookings = useCallback(async () => {
    let query = supabase
      .from("bookings" as any)
      .select("*, property:properties(name)")
      .order("check_in", { ascending: false });
    if (propertyId) query = query.eq("property_id", propertyId);
    const { data, error } = await query;
    if (!error) setBookings((data as any) || []);
    setLoading(false);
  }, [propertyId]);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  const createBooking = async (values: Partial<Booking>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase
      .from("bookings" as any)
      .insert({ ...values, user_id: user.id });
    if (error) { toast.error("Erreur création réservation"); return; }
    toast.success("Réservation créée");
    await fetchBookings();
  };

  const updateBooking = async (id: string, values: Partial<Booking>) => {
    const { error } = await supabase
      .from("bookings" as any)
      .update(values)
      .eq("id", id);
    if (error) { toast.error("Erreur mise à jour"); return; }
    toast.success("Réservation mise à jour");
    await fetchBookings();
  };

  const deleteBooking = async (id: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Find the booking to check for linked calendar_event
    const target = bookings.find(b => b.id === id);

    const { error } = await supabase
      .from("bookings" as any)
      .delete()
      .eq("id", id);
    if (error) { toast.error("Erreur suppression"); return; }

    // Hide linked calendar_event from owner portal so it doesn't reappear
    if (target?.calendar_event_id && target.property_id) {
      await (supabase as any).from("calendar_overrides").upsert({
        user_id: user.id,
        property_id: target.property_id,
        source_event_id: target.calendar_event_id,
        override_type: "hide",
        reason: "booking_deleted",
      }, { onConflict: "user_id,property_id,source_event_id" }).then(() => {});
    }

    toast.success("Réservation supprimée");
    await fetchBookings();
  };

  return { bookings, loading, createBooking, updateBooking, deleteBooking, refetch: fetchBookings };
}
