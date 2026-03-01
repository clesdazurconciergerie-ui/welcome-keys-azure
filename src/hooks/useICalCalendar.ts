import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ICalCalendar {
  id: string;
  property_id: string;
  name: string;
  url: string;
  platform: string;
  last_synced_at: string | null;
  sync_status: string;
  created_at: string;
}

export interface CalendarEvent {
  id: string;
  calendar_id: string;
  property_id: string;
  summary: string | null;
  start_date: string;
  end_date: string;
  guest_name: string | null;
  platform: string;
  status: string;
  ical_uid: string | null;
}

export function useICalCalendar(propertyId: string | undefined) {
  const [calendars, setCalendars] = useState<ICalCalendar[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const fetchCalendars = useCallback(async () => {
    if (!propertyId) return;
    const { data } = await (supabase as any)
      .from("ical_calendars")
      .select("*")
      .eq("property_id", propertyId)
      .order("created_at");
    setCalendars(data || []);
  }, [propertyId]);

  const fetchEvents = useCallback(async () => {
    if (!propertyId) return;
    const { data } = await (supabase as any)
      .from("calendar_events")
      .select("*")
      .eq("property_id", propertyId)
      .order("start_date");
    setEvents(data || []);
  }, [propertyId]);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([fetchCalendars(), fetchEvents()]);
    setIsLoading(false);
  }, [fetchCalendars, fetchEvents]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addCalendar = async (name: string, url: string, platform: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !propertyId) return;

    const { error } = await (supabase as any).from("ical_calendars").insert({
      property_id: propertyId,
      user_id: user.id,
      name: name.trim(),
      url: url.trim(),
      platform,
    });
    if (error) {
      toast.error("Erreur lors de l'ajout du calendrier");
      return;
    }
    toast.success("Calendrier ajouté");
    await refresh();
  };

  const removeCalendar = async (calId: string) => {
    const { error } = await (supabase as any).from("ical_calendars").delete().eq("id", calId);
    if (error) {
      toast.error("Erreur lors de la suppression");
      return;
    }
    toast.success("Calendrier supprimé");
    await refresh();
  };

  const syncCalendar = async (calId: string) => {
    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("sync-ical", {
        body: { calendar_id: calId },
      });
      if (error) throw error;
      toast.success(`${data?.count || 0} événement(s) synchronisé(s)`);
      await refresh();
    } catch (err: any) {
      toast.error(err.message || "Erreur de synchronisation");
    } finally {
      setIsSyncing(false);
    }
  };

  const syncAll = async () => {
    setIsSyncing(true);
    try {
      for (const cal of calendars) {
        await supabase.functions.invoke("sync-ical", {
          body: { calendar_id: cal.id },
        });
      }
      toast.success("Tous les calendriers synchronisés");
      await refresh();
    } catch {
      toast.error("Erreur de synchronisation");
    } finally {
      setIsSyncing(false);
    }
  };

  const addManualBlock = async (startDate: string, endDate: string, summary: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !propertyId) return;

    const { error } = await (supabase as any).from("calendar_events").insert({
      property_id: propertyId,
      user_id: user.id,
      calendar_id: calendars[0]?.id || null,
      start_date: startDate,
      end_date: endDate,
      summary: summary || "Blocage manuel",
      platform: "manual",
      status: "blocked",
    });
    if (error) {
      // If no calendar exists, create a manual one first
      if (error.message?.includes("null value")) {
        toast.error("Ajoutez d'abord un calendrier");
      } else {
        toast.error("Erreur lors du blocage");
      }
      return;
    }
    toast.success("Dates bloquées");
    await refresh();
  };

  const deleteEvent = async (eventId: string) => {
    await (supabase as any).from("calendar_events").delete().eq("id", eventId);
    await refresh();
  };

  return {
    calendars,
    events,
    isLoading,
    isSyncing,
    addCalendar,
    removeCalendar,
    syncCalendar,
    syncAll,
    addManualBlock,
    deleteEvent,
    refresh,
  };
}
