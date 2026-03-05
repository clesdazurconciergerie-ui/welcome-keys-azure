import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CalendarOverride {
  id: string;
  user_id: string;
  property_id: string;
  source_event_id: string;
  override_type: string;
  reason: string | null;
  created_at: string;
}

export function useCalendarOverrides(propertyId: string | undefined) {
  const [overrides, setOverrides] = useState<CalendarOverride[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!propertyId) return;
    setLoading(true);
    const { data } = await (supabase as any)
      .from("calendar_overrides")
      .select("*")
      .eq("property_id", propertyId);
    setOverrides(data || []);
    setLoading(false);
  }, [propertyId]);

  useEffect(() => { fetch(); }, [fetch]);

  const hiddenEventIds = new Set(
    overrides.filter(o => o.override_type === "hide").map(o => o.source_event_id)
  );

  const hideEvent = async (sourceEventId: string, reason?: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !propertyId) return;
    setLoading(true);
    const { error } = await (supabase as any).from("calendar_overrides").insert({
      user_id: user.id,
      property_id: propertyId,
      source_event_id: sourceEventId,
      override_type: "hide",
      reason: reason || null,
    });
    if (error) {
      console.error("calendar_overrides insert error:", error);
      toast.error(`Erreur lors du masquage: ${error.message}`);
      setLoading(false);
      return;
    }
    toast.success("Réservation masquée pour le propriétaire");
    await fetch();
  };

  const restoreEvent = async (sourceEventId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !propertyId) return;
    setLoading(true);
    const { error } = await (supabase as any)
      .from("calendar_overrides")
      .delete()
      .eq("property_id", propertyId)
      .eq("source_event_id", sourceEventId)
      .eq("user_id", user.id);
    if (error) {
      console.error("calendar_overrides delete error:", error);
      toast.error(`Erreur lors de la restauration: ${error.message}`);
      setLoading(false);
      return;
    }
    toast.success("Réservation rétablie");
    await fetch();
  };

  return { overrides, hiddenEventIds, hideEvent, restoreEvent, loading };
}
