// MODULE — Hook de monitoring iCal
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ICalCalendarMonitoring {
  id: string;
  name: string;
  url: string;
  platform: string;
  property_id: string;
  user_id: string;
  last_sync_at: string | null;
  last_sync_status: string | null;
  sync_health_score: number | null;
  consecutive_failures: number;
  is_sync_enabled: boolean;
  sync_frequency_hours: number;
  property?: { name: string } | null;
}

export interface SyncHistoryEntry {
  id: string;
  ical_calendar_id: string;
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
  status: string;
  events_fetched: number;
  events_created: number;
  events_updated: number;
  events_deleted: number;
  error_message: string | null;
  error_code: string | null;
  http_status: number | null;
  response_time_ms: number | null;
  retry_count: number;
  triggered_by: string;
  sync_metadata: any;
  ical_calendar?: { name: string; platform: string } | null;
}

export function useICalMonitoring() {
  const qc = useQueryClient();

  const calendarsQuery = useQuery({
    queryKey: ["ical-monitoring", "calendars"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("ical_calendars")
        .select("*, property:property_id(name)")
        .order("sync_health_score", { ascending: true, nullsFirst: true });
      if (error) throw error;
      return (data as ICalCalendarMonitoring[]) ?? [];
    },
    refetchInterval: 30_000,
  });

  const historyQuery = useQuery({
    queryKey: ["ical-monitoring", "history"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("ical_sync_history")
        .select("*, ical_calendar:ical_calendar_id(name, platform)")
        .order("started_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data as SyncHistoryEntry[]) ?? [];
    },
    refetchInterval: 30_000,
  });

  const syncOne = useMutation({
    mutationFn: async (calendarId: string) => {
      const { data, error } = await supabase.functions.invoke("auto-sync-ical-daily", {
        body: { calendar_id: calendarId, triggered_by: "manual" },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Synchronisation lancée");
      qc.invalidateQueries({ queryKey: ["ical-monitoring"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erreur sync"),
  });

  const syncAll = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("auto-sync-ical-daily", {
        body: { triggered_by: "manual" },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      toast.success(`Sync terminée : ${data?.summary?.success ?? 0}/${data?.summary?.total ?? 0} OK`);
      qc.invalidateQueries({ queryKey: ["ical-monitoring"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erreur sync globale"),
  });

  const toggleEnabled = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { error } = await (supabase as any)
        .from("ical_calendars")
        .update({ is_sync_enabled: enabled, consecutive_failures: enabled ? 0 : undefined })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ical-monitoring"] });
      toast.success("Préférence mise à jour");
    },
  });

  return {
    calendars: calendarsQuery.data ?? [],
    history: historyQuery.data ?? [],
    isLoading: calendarsQuery.isLoading || historyQuery.isLoading,
    syncOne,
    syncAll,
    toggleEnabled,
  };
}
