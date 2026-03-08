import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Inspection {
  id: string;
  user_id: string;
  property_id: string;
  booking_id: string | null;
  linked_inspection_id: string | null;
  inspection_type: 'entry' | 'exit';
  guest_name: string | null;
  inspection_date: string;
  occupants_count: number | null;
  meter_electricity: string | null;
  meter_water: string | null;
  meter_gas: string | null;
  general_comment: string | null;
  damage_notes: string | null;
  cleaning_photos_json: any[];
  exit_photos_json: any[];
  concierge_signature_url: string | null;
  guest_signature_url: string | null;
  pdf_url: string | null;
  status: 'draft' | 'completed';
  created_at: string;
  updated_at: string;
  property?: { name: string; address: string };
  booking?: { guest_name: string; check_in: string; check_out: string } | null;
  linked_inspection?: { id: string; inspection_type: string; inspection_date: string } | null;
}

export function useInspections(propertyId?: string) {
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchInspections = useCallback(async () => {
    try {
      setIsLoading(true);
      let query = (supabase as any)
        .from('inspections')
        .select(`
          *,
          property:property_id(name, address),
          booking:booking_id(guest_name, check_in, check_out),
          linked_inspection:linked_inspection_id(id, inspection_type, inspection_date)
        `)
        .order('inspection_date', { ascending: false });

      if (propertyId) query = query.eq('property_id', propertyId);

      const { data, error } = await query;
      if (error) throw error;
      setInspections(data || []);
    } catch (err) {
      console.error('Error fetching inspections:', err);
    } finally {
      setIsLoading(false);
    }
  }, [propertyId]);

  useEffect(() => { fetchInspections(); }, [fetchInspections]);

  const createInspection = async (values: Partial<Inspection>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non connecté');

      const { data, error } = await (supabase as any)
        .from('inspections')
        .insert({ ...values, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      toast.success('État des lieux créé');
      await fetchInspections();
      return data;
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la création');
      return null;
    }
  };

  const updateInspection = async (id: string, values: Partial<Inspection>) => {
    try {
      const { error } = await (supabase as any)
        .from('inspections')
        .update(values)
        .eq('id', id);

      if (error) throw error;
      toast.success('État des lieux mis à jour');
      await fetchInspections();
      return true;
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la mise à jour');
      return false;
    }
  };

  const deleteInspection = async (id: string) => {
    try {
      const { error } = await (supabase as any)
        .from('inspections')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('État des lieux supprimé');
      await fetchInspections();
    } catch (err) {
      toast.error('Erreur lors de la suppression');
    }
  };

  // Fetch latest cleaning photos for a property
  const fetchLatestCleaningPhotos = async (propId: string) => {
    try {
      // Get the latest completed cleaning intervention for this property
      const { data: interventions, error } = await (supabase as any)
        .from('cleaning_interventions')
        .select('id, scheduled_date, photos:cleaning_photos(*)')
        .eq('property_id', propId)
        .in('status', ['completed', 'validated'])
        .order('scheduled_date', { ascending: false })
        .limit(1);

      if (error) throw error;
      if (interventions?.length > 0 && interventions[0].photos?.length > 0) {
        return interventions[0].photos.map((p: any) => ({
          url: p.url,
          type: p.type,
          uploaded_at: p.uploaded_at,
          caption: p.caption,
        }));
      }
      return [];
    } catch (err) {
      console.error('Error fetching cleaning photos:', err);
      return [];
    }
  };

  // Upload signature to storage
  const uploadSignature = async (inspectionId: string, dataUrl: string, type: 'concierge' | 'guest') => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non connecté');

      const blob = await fetch(dataUrl).then(r => r.blob());
      const path = `${user.id}/${inspectionId}/${type}_signature_${Date.now()}.png`;

      const { error: uploadErr } = await supabase.storage
        .from('property-files')
        .upload(path, blob, { contentType: 'image/png' });

      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage
        .from('property-files')
        .getPublicUrl(path);

      return urlData.publicUrl;
    } catch (err) {
      console.error('Upload signature error:', err);
      return null;
    }
  };

  // Upload exit photo
  const uploadExitPhoto = async (inspectionId: string, file: File) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non connecté');

      const ext = file.name.split('.').pop();
      const path = `${user.id}/${inspectionId}/exit_${Date.now()}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from('property-files')
        .upload(path, file);

      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage
        .from('property-files')
        .getPublicUrl(path);

      return urlData.publicUrl;
    } catch (err) {
      toast.error("Erreur lors de l'upload de la photo");
      return null;
    }
  };

  return {
    inspections,
    isLoading,
    createInspection,
    updateInspection,
    deleteInspection,
    fetchLatestCleaningPhotos,
    uploadSignature,
    uploadExitPhoto,
    refetch: fetchInspections,
  };
}
