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

/** Strip "bk-" prefix so we always store raw UUIDs */
function normalizeEventId(id: string): string {
  return id.startsWith("bk-") ? id.slice(3) : id;
}

export function useCalendarOverrides(propertyId: string | undefined) {
  const [overrides, setOverrides] = useState<CalendarOverride[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchOverrides = useCallback(async () => {
    if (!propertyId) return;
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("calendar_overrides")
      .select("*")
      .eq("property_id", propertyId);
    if (error) {
      console.error("[CalendarOverrides] fetch error:", error);
    }
    setOverrides(data || []);
    setLoading(false);
  }, [propertyId]);

  useEffect(() => { fetchOverrides(); }, [fetchOverrides]);

  // Build a Set that contains BOTH raw ID and bk-prefixed ID for each hidden override
  // so admin calendar (which uses bk-{id}) and owner hooks (which use raw id) both match
  const hiddenEventIds = new Set<string>();
  for (const o of overrides) {
    if (o.override_type === "hide") {
      hiddenEventIds.add(o.source_event_id);
      hiddenEventIds.add(`bk-${o.source_event_id}`);
    }
  }

  const hideEvent = async (sourceEventId: string, reason?: string) => {
    const rawId = normalizeEventId(sourceEventId);
    console.log("[CalendarOverrides] hideEvent called:", { sourceEventId, rawId, propertyId });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !propertyId) return;
    setLoading(true);
    const payload = {
      user_id: user.id,
      property_id: propertyId,
      source_event_id: rawId,
      override_type: "hide",
      reason: reason || null,
    };
    console.log("[CalendarOverrides] inserting override:", payload);
    const { error } = await (supabase as any).from("calendar_overrides").insert(payload);
    if (error) {
      console.error("[CalendarOverrides] insert error:", error);
      toast.error(`Erreur lors du masquage: ${error.message}`);
      setLoading(false);
      return;
    }
    toast.success("Réservation masquée pour le propriétaire");
    await fetchOverrides();
  };

  const restoreEvent = async (sourceEventId: string) => {
    const rawId = normalizeEventId(sourceEventId);
    console.log("[CalendarOverrides] restoreEvent called:", { sourceEventId, rawId, propertyId });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !propertyId) return;
    setLoading(true);
    const { error } = await (supabase as any)
      .from("calendar_overrides")
      .delete()
      .eq("property_id", propertyId)
      .eq("source_event_id", rawId)
      .eq("user_id", user.id);
    if (error) {
      console.error("[CalendarOverrides] delete error:", error);
      toast.error(`Erreur lors de la restauration: ${error.message}`);
      setLoading(false);
      return;
    }
    toast.success("Réservation rétablie");
    await fetchOverrides();
  };

  return { overrides, hiddenEventIds, hideEvent, restoreEvent, loading, refetch: fetchOverrides };
}
