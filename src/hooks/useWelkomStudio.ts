import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  processImages,
  reEditPhoto,
  type ManualFilters,
  type ProcessOptions,
} from "@/lib/welkom-studio-engine";
import { runWelkomHDR } from "@/lib/welkom-hdr-runner";

export interface PropertyPhotoStudio {
  id: string;
  property_id: string;
  user_id: string;
  full_url: string;
  thumb_url: string | null;
  original_urls: string[];
  is_hdr: boolean;
  processing_time_ms: number | null;
  filters_applied: Record<string, unknown>;
  display_order: number;
  created_at: string;
  updated_at: string;
}

const BUCKET = "mission-photos";
const PREFIX = "welkom-studio";

function uuid() {
  return crypto.randomUUID();
}

async function uploadBlob(path: string, blob: Blob, contentType: string) {
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    upsert: true,
    contentType,
  });
  if (error) throw error;
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

export function useWelkomStudio(propertyId: string | undefined) {
  const { toast } = useToast();
  const [photos, setPhotos] = useState<PropertyPhotoStudio[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingLabel, setProcessingLabel] = useState("");

  const fetchPhotos = useCallback(async () => {
    if (!propertyId) return;
    setIsLoading(true);
    const { data, error } = await supabase
      .from("property_photos")
      .select("*")
      .eq("property_id", propertyId)
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false });
    setIsLoading(false);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    setPhotos(
      (data || []).map((p: any) => ({
        ...p,
        full_url: p.full_url || p.url,
        original_urls: p.original_urls || [],
        filters_applied: p.filters_applied || {},
      })) as PropertyPhotoStudio[]
    );
  }, [propertyId, toast]);

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  const processAndUpload = useCallback(
    async (files: File[], opts: ProcessOptions = {}) => {
      if (!propertyId || files.length === 0) return null;
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) {
        toast({ title: "Non authentifié", variant: "destructive" });
        return null;
      }

      setIsProcessing(true);
      setProcessingProgress(0);
      setProcessingLabel("Préparation…");

      try {
        // 1. Upload originals (so before/after works)
        const originalUrls: string[] = [];
        for (let i = 0; i < files.length; i++) {
          const f = files[i];
          const ext = (f.name.split(".").pop() || "jpg").toLowerCase();
          const path = `${PREFIX}/${propertyId}/source_${uuid()}.${ext}`;
          const url = await uploadBlob(path, f, f.type || "image/jpeg");
          originalUrls.push(url);
        }

        // 2. Run HDR pipeline
        const result = await processImages(files, {
          ...opts,
          onProgress: (pct, label) => {
            setProcessingProgress(pct);
            setProcessingLabel(label);
          },
        });

        // 3. Upload outputs
        const id = uuid();
        const fullPath = `${PREFIX}/${propertyId}/${id}.jpg`;
        const thumbPath = `${PREFIX}/${propertyId}/thumb_${id}.jpg`;
        const fullUrl = await uploadBlob(fullPath, result.fullBlob, "image/jpeg");
        const thumbUrl = await uploadBlob(thumbPath, result.thumbBlob, "image/jpeg");

        // 4. Insert DB row
        const isHdr = files.length > 1;
        const maxOrder = photos.reduce((m, p) => Math.max(m, p.display_order), -1);
        const { data: inserted, error } = await supabase
          .from("property_photos")
          .insert({
            property_id: propertyId,
            user_id: userId,
            url: fullUrl, // legacy column kept for compatibility
            full_url: fullUrl,
            thumb_url: thumbUrl,
            original_urls: originalUrls,
            is_hdr: isHdr,
            processing_time_ms: result.processingTimeMs,
            filters_applied: {
              filters: result.filtersApplied,
              exposures: result.exposures,
              source_count: files.length,
            },
            display_order: maxOrder + 1,
          } as any)
          .select()
          .single();

        if (error) throw error;

        toast({
          title: isHdr ? "Photo HDR créée ✨" : "Photo importée",
          description: `Traitée en ${(result.processingTimeMs / 1000).toFixed(1)}s`,
        });
        await fetchPhotos();
        return inserted as any;
      } catch (e: any) {
        toast({
          title: "Échec du traitement",
          description: e.message || String(e),
          variant: "destructive",
        });
        return null;
      } finally {
        setIsProcessing(false);
        setProcessingProgress(0);
        setProcessingLabel("");
      }
    },
    [propertyId, photos, toast, fetchPhotos]
  );

  const uploadSingle = useCallback(
    (file: File) => processAndUpload([file], { applySmartFilters: true }),
    [processAndUpload]
  );

  const processBatch = useCallback(
    (files: File[]) => processAndUpload(files, { applySmartFilters: true }),
    [processAndUpload]
  );

  /**
   * Pipeline HDR Laplacien complet (Web Worker, downscale 1920px).
   * Utilisé pour la capture caméra AEB et l'import HDR multi-exposition.
   */
  const processBatchLaplacian = useCallback(
    async (blobs: Blob[]) => {
      if (!propertyId || blobs.length === 0) return null;
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) {
        toast({ title: "Non authentifié", variant: "destructive" });
        return null;
      }

      setIsProcessing(true);
      setProcessingProgress(0);
      setProcessingLabel("Préparation…");
      try {
        // 1. Upload originals
        const originalUrls: string[] = [];
        for (let i = 0; i < blobs.length; i++) {
          const b = blobs[i];
          const path = `${PREFIX}/${propertyId}/source_${uuid()}.jpg`;
          const url = await uploadBlob(path, b, b.type || "image/jpeg");
          originalUrls.push(url);
        }

        // 2. Run Laplacian HDR
        const result = await runWelkomHDR(blobs, {
          maxEdge: 1920,
          quality: 0.93,
          onProgress: ({ step, percent }) => {
            setProcessingProgress(percent);
            setProcessingLabel(step);
          },
        });

        // 3. Upload outputs
        const id = uuid();
        const fullPath = `${PREFIX}/${propertyId}/${id}.jpg`;
        const thumbPath = `${PREFIX}/${propertyId}/thumb_${id}.jpg`;
        const fullUrl = await uploadBlob(fullPath, result.fullBlob, "image/jpeg");
        const thumbUrl = await uploadBlob(thumbPath, result.thumbBlob, "image/jpeg");

        const maxOrder = photos.reduce((m, p) => Math.max(m, p.display_order), -1);
        const { data: inserted, error } = await supabase
          .from("property_photos")
          .insert({
            property_id: propertyId,
            user_id: userId,
            url: fullUrl,
            full_url: fullUrl,
            thumb_url: thumbUrl,
            original_urls: originalUrls,
            is_hdr: true,
            processing_time_ms: result.processingTimeMs,
            filters_applied: {
              pipeline: "laplacian-v1",
              source_count: blobs.length,
            },
            display_order: maxOrder + 1,
          } as any)
          .select()
          .single();
        if (error) throw error;

        toast({
          title: "Photo HDR créée ✨",
          description: `Pipeline Laplacien — ${(result.processingTimeMs / 1000).toFixed(1)}s`,
        });
        await fetchPhotos();
        return inserted as any;
      } catch (e: any) {
        toast({
          title: "Échec du traitement HDR",
          description: e.message || String(e),
          variant: "destructive",
        });
        return null;
      } finally {
        setIsProcessing(false);
        setProcessingProgress(0);
        setProcessingLabel("");
      }
    },
    [propertyId, photos, toast, fetchPhotos]
  );

  const deletePhoto = useCallback(
    async (photoId: string) => {
      const { error } = await supabase.from("property_photos").delete().eq("id", photoId);
      if (error) {
        toast({ title: "Erreur", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "Photo supprimée" });
      await fetchPhotos();
    },
    [toast, fetchPhotos]
  );

  const reorderPhotos = useCallback(
    async (orderedIds: string[]) => {
      const updates = orderedIds.map((id, idx) =>
        supabase.from("property_photos").update({ display_order: idx }).eq("id", id)
      );
      await Promise.all(updates);
      await fetchPhotos();
    },
    [fetchPhotos]
  );

  const updateFilters = useCallback(
    async (photoId: string, sourceUrl: string, filters: ManualFilters) => {
      if (!propertyId) return;
      try {
        const blob = await reEditPhoto(sourceUrl, filters);
        const id = uuid();
        const path = `${PREFIX}/${propertyId}/edit_${id}.jpg`;
        const newUrl = await uploadBlob(path, blob, "image/jpeg");
        const { error } = await supabase
          .from("property_photos")
          .update({
            url: newUrl,
            full_url: newUrl,
            filters_applied: { manual: filters as any },
          } as any)
          .eq("id", photoId);
        if (error) throw error;
        toast({ title: "Retouches appliquées" });
        await fetchPhotos();
      } catch (e: any) {
        toast({ title: "Erreur", description: e.message, variant: "destructive" });
      }
    },
    [propertyId, toast, fetchPhotos]
  );

  return {
    photos,
    isLoading,
    isProcessing,
    processingProgress,
    processingLabel,
    processBatch,
    uploadSingle,
    deletePhoto,
    reorderPhotos,
    updateFilters,
    refresh: fetchPhotos,
  };
}
