import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface OwnerBlock {
  id: string;
  property_id: string;
  start_date: string;
  end_date: string;
  summary: string | null;
  platform: string;
  event_type: string;
}

/**
 * Owner-side hook to manage manual date blocks on a property.
 * Blocks are stored in calendar_events with platform='owner_block' and
 * are automatically included in the iCal export feed (so Airbnb, Booking,
 * VRBO etc. pick them up on their next sync).
 */
export function useOwnerBlocks(propertyId: string | undefined) {
  const [blocks, setBlocks] = useState<OwnerBlock[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchBlocks = useCallback(async () => {
    if (!propertyId) return;
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("calendar_events")
      .select("id, property_id, start_date, end_date, summary, platform, event_type")
      .eq("property_id", propertyId)
      .eq("platform", "owner_block")
      .order("start_date");
    if (error) console.error("[useOwnerBlocks]", error);
    setBlocks(data || []);
    setLoading(false);
  }, [propertyId]);

  useEffect(() => { fetchBlocks(); }, [fetchBlocks]);

  const addBlock = async (startDate: string, endDate: string, reason: string) => {
    if (!propertyId) return false;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("Session expirée"); return false; }

    if (endDate <= startDate) {
      toast.error("La date de fin doit être après la date de début");
      return false;
    }

    const { error } = await (supabase as any).from("calendar_events").insert({
      property_id: propertyId,
      user_id: user.id,
      calendar_id: null,
      start_date: startDate,
      end_date: endDate,
      summary: reason?.trim() || "Bloqué par le propriétaire",
      platform: "owner_block",
      event_type: "blocked",
      status: "blocked",
    });

    if (error) {
      console.error("[useOwnerBlocks] insert error", error);
      toast.error("Impossible de bloquer ces dates: " + error.message);
      return false;
    }
    toast.success("Dates bloquées — synchronisation iCal en cours");
    await fetchBlocks();
    return true;
  };

  const removeBlock = async (blockId: string) => {
    const { error } = await (supabase as any)
      .from("calendar_events")
      .delete()
      .eq("id", blockId)
      .eq("platform", "owner_block");
    if (error) {
      toast.error("Erreur lors de la suppression");
      return;
    }
    toast.success("Blocage supprimé");
    await fetchBlocks();
  };

  return { blocks, loading, addBlock, removeBlock, refresh: fetchBlocks };
}
