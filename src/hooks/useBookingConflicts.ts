// MODULE 2 — Double-booking Detector
// Hook React Query pour lire et résoudre les conflits de réservation.

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface BookingConflict {
  id: string;
  user_id: string;
  property_id: string;
  event_a_id: string;
  event_b_id: string;
  conflict_type: string;
  overlap_start: string;
  overlap_end: string;
  severity: string;
  status: "open" | "resolved" | "ignored";
  resolved_at: string | null;
  notes: string | null;
  detected_at: string;
}

export function useBookingConflicts() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["booking-conflicts"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("booking_conflicts")
        .select("*")
        .order("status", { ascending: true })
        .order("overlap_start", { ascending: true });
      if (error) throw error;
      return (data ?? []) as BookingConflict[];
    },
  });

  const resolve = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: "resolved" | "ignored"; notes?: string }) => {
      const { error } = await (supabase as any)
        .from("booking_conflicts")
        .update({ status, resolved_at: new Date().toISOString(), notes: notes ?? null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["booking-conflicts"] });
      toast.success("Conflit mis à jour");
    },
    onError: (e: any) => toast.error(e.message ?? "Erreur"),
  });

  const rescan = useMutation({
    mutationFn: async (propertyId: string) => {
      const { error } = await (supabase as any).rpc("detect_booking_conflicts", { _property_id: propertyId });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["booking-conflicts"] });
      toast.success("Re-scan terminé");
    },
    onError: (e: any) => toast.error(e.message ?? "Erreur"),
  });

  const openConflicts = (query.data ?? []).filter((c) => c.status === "open");

  return {
    conflicts: query.data ?? [],
    openConflicts,
    openCount: openConflicts.length,
    isLoading: query.isLoading,
    resolve: resolve.mutate,
    rescan: rescan.mutate,
  };
}
