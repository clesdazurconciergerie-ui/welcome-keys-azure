import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface MissionPhoto {
  id: string;
  mission_id: string;
  provider_id: string;
  user_id: string;
  file_path: string;
  url: string;
  kind: string;
  created_at: string;
}

export function useMissionPhotos(missionId: string | null) {
  const [photos, setPhotos] = useState<MissionPhoto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const fetchPhotos = useCallback(async () => {
    if (!missionId) { setPhotos([]); return; }
    setIsLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('mission_photos')
        .select('*')
        .eq('mission_id', missionId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setPhotos(data || []);
    } catch (err) {
      console.error('Error fetching mission photos:', err);
    } finally {
      setIsLoading(false);
    }
  }, [missionId]);

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  // Realtime subscription
  useEffect(() => {
    if (!missionId) return;
    const channel = supabase
      .channel(`mission-photos-${missionId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'mission_photos',
        filter: `mission_id=eq.${missionId}`,
      }, () => fetchPhotos())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [missionId, fetchPhotos]);

  const uploadPhoto = async (
    file: File,
    missionUserId: string,
    providerId: string,
    kind: string = 'after',
  ): Promise<string | null> => {
    if (!missionId) {
      toast.error('ID mission manquant');
      return null;
    }
    if (!providerId) {
      toast.error('ID prestataire manquant');
      return null;
    }

    setUploading(true);
    setUploadProgress(10);

    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const timestamp = Date.now();
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const filePath = `${missionUserId}/${missionId}/${providerId}/${timestamp}_${safeName}`;

      setUploadProgress(30);

      // 1. Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('mission-photos')
        .upload(filePath, file, { contentType: file.type });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        throw new Error(`Upload échoué: ${uploadError.message}`);
      }

      setUploadProgress(70);

      // 2. Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('mission-photos')
        .getPublicUrl(filePath);

      // 3. Insert DB record
      const { error: insertError } = await (supabase as any)
        .from('mission_photos')
        .insert({
          mission_id: missionId,
          user_id: missionUserId,
          provider_id: providerId,
          file_path: filePath,
          url: publicUrl,
          kind,
        });

      if (insertError) {
        console.error('DB insert error:', insertError);
        // Cleanup uploaded file
        await supabase.storage.from('mission-photos').remove([filePath]);
        throw new Error(`Enregistrement échoué: ${insertError.message}`);
      }

      setUploadProgress(100);
      toast.success('Photo ajoutée');

      // Optimistic: add to local state immediately
      setPhotos(prev => [
        ...prev,
        {
          id: crypto.randomUUID(),
          mission_id: missionId,
          user_id: missionUserId,
          provider_id: providerId,
          file_path: filePath,
          url: publicUrl,
          kind,
          created_at: new Date().toISOString(),
        },
      ]);

      return publicUrl;
    } catch (err: any) {
      toast.error(err.message || 'Erreur upload photo');
      return null;
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 500);
    }
  };

  return {
    photos,
    isLoading,
    uploading,
    uploadProgress,
    uploadPhoto,
    refetch: fetchPhotos,
  };
}
