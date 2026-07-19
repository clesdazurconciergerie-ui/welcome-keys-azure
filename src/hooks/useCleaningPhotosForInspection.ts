// MODULE — Récupère les photos du dernier ménage terminé pour un bien
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CleaningPhoto {
  id: string;
  url: string;
  file_path: string;
  kind: string | null;
  created_at: string;
  mission_id: string;
}

export function useCleaningPhotosForInspection(propertyId?: string, beforeDate?: string) {
  return useQuery({
    queryKey: ["cleaning-photos-for-inspection", propertyId, beforeDate],
    enabled: !!propertyId,
    queryFn: async (): Promise<{ mission_id: string | null; photos: CleaningPhoto[] }> => {
      // Trouver la dernière mission de ménage terminée sur ce bien
      let q = (supabase as any)
        .from("missions")
        .select("id, end_at, status, mission_type")
        .eq("property_id", propertyId)
        .eq("mission_type", "cleaning")
        .in("status", ["completed", "validated"])
        .order("end_at", { ascending: false })
        .limit(1);
      if (beforeDate) q = q.lte("end_at", `${beforeDate}T23:59:59`);
      const { data: missions } = await q;
      const mission = missions?.[0];
      if (!mission) return { mission_id: null, photos: [] };

      const { data: photos } = await (supabase as any)
        .from("mission_photos")
        .select("id, url, file_path, kind, created_at, mission_id")
        .eq("mission_id", mission.id)
        .order("created_at");

      // Ensure signed URLs (bucket is private)
      const enriched: CleaningPhoto[] = await Promise.all(
        (photos ?? []).map(async (p: any) => {
          if (p.url && p.url.includes("token=")) return p;
          const { data: signed } = await supabase.storage
            .from("mission-photos")
            .createSignedUrl(p.file_path, 60 * 60 * 24);
          return { ...p, url: signed?.signedUrl ?? p.url };
        }),
      );

      return { mission_id: mission.id, photos: enriched };
    },
  });
}
