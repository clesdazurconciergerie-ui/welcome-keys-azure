import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useIsServiceProvider } from "@/hooks/useIsServiceProvider";
import { getNotificationPermission, showLocalNotification } from "@/lib/pwa";

const SEEN_KEY = "welkom-sp-last-notif-id";

interface NotifRow {
  id: string;
  title: string;
  message: string | null;
  type: string | null;
  related_id: string | null;
  created_at: string;
}

/**
 * Polls the `notifications` table every 60s for the current service-provider
 * user. When a new mission notification appears, fires a local Notification.
 */
export function useProviderPushPolling() {
  const { isServiceProvider } = useIsServiceProvider();
  const initialized = useRef(false);

  const { data } = useQuery({
    queryKey: ["sp-notifications-poll"],
    enabled: isServiceProvider,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    queryFn: async (): Promise<NotifRow[]> => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return [];
      const { data, error } = await supabase
        .from("notifications")
        .select("id, title, message, type, related_id, created_at")
        .eq("user_id", auth.user.id)
        .in("type", ["mission_available", "mission_assigned"])
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) return [];
      return (data || []) as NotifRow[];
    },
  });

  useEffect(() => {
    if (!data || data.length === 0) return;
    const lastSeen = localStorage.getItem(SEEN_KEY);
    const newest = data[0];

    // First run: just record the latest id without firing
    if (!initialized.current) {
      initialized.current = true;
      if (!lastSeen) localStorage.setItem(SEEN_KEY, newest.id);
      return;
    }

    if (lastSeen === newest.id) return;
    if (getNotificationPermission() !== "granted") {
      localStorage.setItem(SEEN_KEY, newest.id);
      return;
    }

    // Find every row newer than lastSeen and fire one notification each
    const lastIdx = lastSeen ? data.findIndex((r) => r.id === lastSeen) : data.length;
    const fresh = lastIdx === -1 ? data : data.slice(0, lastIdx);

    fresh.forEach((row) => {
      const body = row.message?.split("\n")[0] || "";
      showLocalNotification(row.title || "Nouvelle mission disponible", {
        body,
        tag: `mission-${row.related_id || row.id}`,
        url: "/prestataire/missions",
      });
    });

    localStorage.setItem(SEEN_KEY, newest.id);
  }, [data]);
}
