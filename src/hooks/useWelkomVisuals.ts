import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface WelkomVisualsState {
  galleryUrl: string;
  tourUrl: string;
  isLoading: boolean;
  isSaving: boolean;
  updateGalleryUrl: (url: string) => Promise<void>;
  updateTourUrl: (url: string) => Promise<void>;
}

export function useWelkomVisuals(propertyId?: string): WelkomVisualsState {
  const [galleryUrl, setGalleryUrl] = useState("");
  const [tourUrl, setTourUrl] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!propertyId) {
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("properties")
        .select("nodalview_gallery_url, nodalview_tour_url")
        .eq("id", propertyId)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        toast.error("Impossible de charger les liens Nodalview");
      } else if (data) {
        setGalleryUrl((data as any).nodalview_gallery_url ?? "");
        setTourUrl((data as any).nodalview_tour_url ?? "");
      }
      setIsLoading(false);
    })();
    return () => { cancelled = true; };
  }, [propertyId]);

  const persist = useCallback(
    async (field: "nodalview_gallery_url" | "nodalview_tour_url", value: string) => {
      if (!propertyId) return;
      setIsSaving(true);
      const { error } = await supabase
        .from("properties")
        .update({ [field]: value || null } as any)
        .eq("id", propertyId);
      setIsSaving(false);
      if (error) {
        toast.error("Échec de l'enregistrement");
        throw error;
      }
      toast.success("Lien Nodalview enregistré");
    },
    [propertyId]
  );

  const updateGalleryUrl = useCallback(async (url: string) => {
    setGalleryUrl(url);
    await persist("nodalview_gallery_url", url);
  }, [persist]);

  const updateTourUrl = useCallback(async (url: string) => {
    setTourUrl(url);
    await persist("nodalview_tour_url", url);
  }, [persist]);

  return { galleryUrl, tourUrl, isLoading, isSaving, updateGalleryUrl, updateTourUrl };
}
