import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CleaningIntervention {
  id: string;
  property_id: string;
  service_provider_id: string | null;
  concierge_user_id: string;
  scheduled_date: string;
  completed_at: string | null;
  status: string;
  type: string;
  notes: string | null;
  concierge_notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  property?: { name: string; address: string };
  service_provider?: { first_name: string; last_name: string; email: string };
  photos?: CleaningPhoto[];
}

export interface CleaningPhoto {
  id: string;
  intervention_id: string;
  url: string;
  type: string;
  caption: string | null;
  uploaded_at: string;
}

export function useCleaningInterventions(mode: 'concierge' | 'service_provider' | 'owner' = 'concierge') {
  const [interventions, setInterventions] = useState<CleaningIntervention[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchInterventions = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data, error } = await (supabase as any)
        .from('cleaning_interventions')
        .select(`
          *,
          property:property_id(name, address),
          service_provider:service_provider_id(first_name, last_name, email),
          photos:cleaning_photos(*)
        `)
        .order('scheduled_date', { ascending: false });

      if (error) throw error;
      setInterventions(data || []);
    } catch (err) {
      console.error('Error fetching interventions:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createIntervention = async (data: {
    property_id: string;
    service_provider_id: string;
    scheduled_date: string;
    type?: string;
    notes?: string;
  }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non connecté');

      const { error } = await (supabase as any)
        .from('cleaning_interventions')
        .insert({
          ...data,
          concierge_user_id: user.id,
          type: data.type || 'cleaning',
        });

      if (error) throw error;
      toast.success('Intervention planifiée');
      await fetchInterventions();
      return true;
    } catch (err: any) {
      console.error('Error creating intervention:', err);
      toast.error(err.message || 'Erreur lors de la création');
      return false;
    }
  };

  const updateStatus = async (id: string, status: string, concierge_notes?: string) => {
    try {
      const updateData: any = { status };
      if (concierge_notes !== undefined) updateData.concierge_notes = concierge_notes;
      if (status === 'completed') updateData.completed_at = new Date().toISOString();

      const { error } = await (supabase as any)
        .from('cleaning_interventions')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
      toast.success('Statut mis à jour');
      await fetchInterventions();
    } catch (err) {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const uploadPhoto = async (interventionId: string, file: File, type: string = 'after_cleaning') => {
    try {
      const ext = file.name.split('.').pop();
      const path = `${interventionId}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('cleaning-photos')
        .upload(path, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('cleaning-photos')
        .getPublicUrl(path);

      const { error: insertError } = await (supabase as any)
        .from('cleaning_photos')
        .insert({
          intervention_id: interventionId,
          url: publicUrl,
          type,
        });

      if (insertError) throw insertError;
      await fetchInterventions();
      return publicUrl;
    } catch (err: any) {
      console.error('Error uploading photo:', err);
      toast.error('Erreur lors de l\'upload');
      return null;
    }
  };

  const completeIntervention = async (interventionId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('complete-intervention', {
        body: { intervention_id: interventionId },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success('Intervention terminée ! Notifications envoyées.');
      await fetchInterventions();
      return data;
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la validation');
      return null;
    }
  };

  const deleteIntervention = async (id: string) => {
    try {
      const { error } = await (supabase as any)
        .from('cleaning_interventions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Intervention supprimée');
      await fetchInterventions();
    } catch (err) {
      toast.error('Erreur lors de la suppression');
    }
  };

  useEffect(() => {
    fetchInterventions();
  }, [fetchInterventions]);

  return {
    interventions,
    isLoading,
    createIntervention,
    updateStatus,
    uploadPhoto,
    completeIntervention,
    deleteIntervention,
    refetch: fetchInterventions,
  };
}
