import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CleaningIntervention {
  id: string;
  property_id: string;
  service_provider_id: string | null;
  concierge_user_id: string;
  scheduled_date: string;
  scheduled_start_time: string | null;
  scheduled_end_time: string | null;
  actual_start_time: string | null;
  actual_end_time: string | null;
  completed_at: string | null;
  status: string;
  type: string;
  mission_type: string;
  notes: string | null;
  concierge_notes: string | null;
  admin_comment: string | null;
  provider_comment: string | null;
  checklist_validated: boolean;
  internal_score: number | null;
  punctuality_score: number | null;
  mission_amount: number;
  payment_done: boolean;
  created_at: string;
  updated_at: string;
  property?: { name: string; address: string };
  service_provider?: { first_name: string; last_name: string; email: string; score_global: number };
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
          service_provider:service_provider_id(first_name, last_name, email, score_global),
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

  // Realtime subscription for instant sync between dashboards
  useEffect(() => {
    const channel = supabase
      .channel('interventions-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cleaning_interventions' },
        () => { fetchInterventions(); }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cleaning_photos' },
        () => { fetchInterventions(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchInterventions]);

  const createIntervention = async (data: {
    property_id: string;
    service_provider_id: string;
    scheduled_date: string;
    type?: string;
    mission_type?: string;
    notes?: string;
    mission_amount?: number;
    scheduled_start_time?: string;
    scheduled_end_time?: string;
    concierge_notes?: string;
  }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non connecté');

      const { error } = await (supabase as any)
        .from('cleaning_interventions')
        .insert({
          property_id: data.property_id,
          service_provider_id: data.service_provider_id,
          scheduled_date: data.scheduled_date,
          concierge_user_id: user.id,
          type: data.type || 'cleaning',
          mission_type: data.mission_type || data.type || 'cleaning',
          notes: data.notes || null,
          mission_amount: data.mission_amount || 0,
          scheduled_start_time: data.scheduled_start_time || null,
          scheduled_end_time: data.scheduled_end_time || null,
          concierge_notes: data.concierge_notes || null,
        });

      if (error) throw error;
      toast.success('Mission planifiée avec succès');
      await fetchInterventions();
      return true;
    } catch (err: any) {
      console.error('Error creating intervention:', err);
      toast.error(err.message || 'Erreur lors de la création');
      return false;
    }
  };

  const updateStatus = async (id: string, status: string, adminComment?: string, internalScore?: number) => {
    try {
      const updateData: any = { status };
      if (adminComment !== undefined) updateData.admin_comment = adminComment;
      if (internalScore !== undefined) updateData.internal_score = internalScore;
      if (status === 'completed') updateData.completed_at = new Date().toISOString();

      const { error } = await (supabase as any)
        .from('cleaning_interventions')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      // Update score_global on the service provider when validating/refusing
      if (status === 'validated' || status === 'refused') {
        const intervention = interventions.find(i => i.id === id);
        if (intervention?.service_provider_id) {
          const sp = intervention.service_provider;
          if (sp) {
            let delta = 0;
            if (status === 'validated') {
              delta += 10;
              // Punctuality bonus
              if (intervention.actual_start_time && intervention.scheduled_start_time) {
                const actual = new Date(intervention.actual_start_time).getTime();
                const scheduled = new Date(intervention.scheduled_start_time).getTime();
                if (actual <= scheduled + 10 * 60 * 1000) delta += 5;
              }
              if (!adminComment) delta += 0; // no extra penalty
            } else {
              delta -= 10;
            }
            const newScore = Math.max(0, (sp.score_global || 0) + delta);
            await (supabase as any)
              .from('service_providers')
              .update({ score_global: newScore })
              .eq('id', intervention.service_provider_id);
          }
        }
      }

      toast.success('Statut mis à jour');
      await fetchInterventions();
    } catch (err) {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const markPaymentDone = async (id: string, done: boolean = true) => {
    try {
      const { error } = await (supabase as any)
        .from('cleaning_interventions')
        .update({ payment_done: done })
        .eq('id', id);

      if (error) throw error;
      toast.success(done ? 'Paiement marqué comme effectué' : 'Paiement annulé');
      await fetchInterventions();
    } catch (err) {
      toast.error('Erreur lors de la mise à jour du paiement');
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

  const completeIntervention = async (interventionId: string, providerComment?: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('complete-intervention', {
        body: { intervention_id: interventionId, provider_comment: providerComment },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success('Mission terminée ! En attente de validation.');
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
    markPaymentDone,
    uploadPhoto,
    completeIntervention,
    deleteIntervention,
    refetch: fetchInterventions,
  };
}
