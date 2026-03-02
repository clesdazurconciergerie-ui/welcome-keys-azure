import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface NewMission {
  id: string;
  user_id: string;
  property_id: string;
  mission_type: string;
  title: string;
  instructions: string | null;
  start_at: string;
  end_at: string | null;
  duration_minutes: number | null;
  payout_amount: number;
  status: string;
  selected_provider_id: string | null;
  created_at: string;
  updated_at: string;
  property?: { name: string; address: string; property_photos?: Array<{ url: string; is_main: boolean | null; order_index: number | null }> };
  selected_provider?: { first_name: string; last_name: string; email: string; phone: string | null };
  applications?: MissionApplication[];
}

export interface MissionApplication {
  id: string;
  mission_id: string;
  provider_id: string;
  message: string | null;
  status: string;
  created_at: string;
  provider?: { first_name: string; last_name: string; email: string; phone: string | null; score_global: number };
}

export interface CreateMissionData {
  property_id: string;
  mission_type: string;
  title: string;
  instructions?: string;
  start_at: string;
  end_at?: string;
  duration_minutes?: number;
  payout_amount?: number;
  is_open_to_all?: boolean;
  selected_provider_id?: string | null;
}

export function useNewMissions(mode: 'concierge' | 'provider' = 'concierge') {
  const [missions, setMissions] = useState<NewMission[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMissions = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data, error } = await (supabase as any)
        .from('missions')
        .select(`
          *,
          property:property_id(name, address, property_photos(url, is_main, order_index)),
          selected_provider:selected_provider_id(first_name, last_name, email, phone),
          applications:mission_applications(*, provider:provider_id(first_name, last_name, email, phone, score_global))
        `)
        .order('start_at', { ascending: false });

      if (error) throw error;
      setMissions(data || []);
    } catch (err) {
      console.error('Error fetching missions:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMissions();
  }, [fetchMissions]);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel('new-missions-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'missions' }, () => fetchMissions())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mission_applications' }, () => fetchMissions())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchMissions]);

  const createMission = async (data: CreateMissionData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non connecté');

      const isOpen = data.is_open_to_all ?? false;
      const { error } = await (supabase as any)
        .from('missions')
        .insert({
          user_id: user.id,
          property_id: data.property_id,
          mission_type: data.mission_type,
          title: data.title,
          instructions: data.instructions || null,
          start_at: data.start_at,
          end_at: data.end_at || null,
          duration_minutes: data.duration_minutes || null,
          payout_amount: data.payout_amount || 0,
          is_open_to_all: isOpen,
          selected_provider_id: isOpen ? null : (data.selected_provider_id || null),
          status: isOpen ? 'open' : (data.selected_provider_id ? 'assigned' : 'draft'),
        });

      if (error) throw error;
      toast.success('Mission créée');
      await fetchMissions();
    } catch (err: any) {
      toast.error(err.message || 'Erreur création mission');
    }
  };

  const publishMission = async (id: string) => {
    try {
      const { error } = await (supabase as any)
        .from('missions')
        .update({ status: 'open' })
        .eq('id', id);
      if (error) throw error;
      toast.success('Mission publiée — les prestataires peuvent postuler');
      await fetchMissions();
    } catch { toast.error('Erreur publication'); }
  };

  const cancelMission = async (id: string) => {
    try {
      const { error } = await (supabase as any)
        .from('missions')
        .update({ status: 'canceled' })
        .eq('id', id);
      if (error) throw error;
      toast.success('Mission annulée');
      await fetchMissions();
    } catch { toast.error('Erreur annulation'); }
  };

  const deleteMission = async (id: string) => {
    try {
      // Delete related applications first
      const { error: appError } = await (supabase as any)
        .from('mission_applications')
        .delete()
        .eq('mission_id', id);
      if (appError) throw appError;

      const { error } = await (supabase as any)
        .from('missions')
        .delete()
        .eq('id', id);
      if (error) throw error;
      toast.success('Mission supprimée');
      await fetchMissions();
    } catch (err: any) {
      toast.error(err.message || 'Erreur suppression');
    }
  };

  const acceptApplication = async (missionId: string, applicationId: string, providerId: string) => {
    try {
      // Accept the selected application
      const { error: e1 } = await (supabase as any)
        .from('mission_applications')
        .update({ status: 'accepted' })
        .eq('id', applicationId);
      if (e1) throw e1;

      // Reject others
      const { error: e2 } = await (supabase as any)
        .from('mission_applications')
        .update({ status: 'rejected' })
        .eq('mission_id', missionId)
        .neq('id', applicationId);
      if (e2) throw e2;

      // Assign provider to mission
      const { error: e3 } = await (supabase as any)
        .from('missions')
        .update({ status: 'assigned', selected_provider_id: providerId })
        .eq('id', missionId);
      if (e3) throw e3;

      toast.success('Prestataire assigné');
      await fetchMissions();
    } catch { toast.error('Erreur assignation'); }
  };

  const rejectApplication = async (applicationId: string) => {
    try {
      const { error } = await (supabase as any)
        .from('mission_applications')
        .update({ status: 'rejected' })
        .eq('id', applicationId);
      if (error) throw error;
      toast.success('Candidature refusée');
      await fetchMissions();
    } catch { toast.error('Erreur'); }
  };

  // Provider actions
  const applyToMission = async (missionId: string, message?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non connecté');

      const { data: sp } = await (supabase as any)
        .from('service_providers')
        .select('id')
        .eq('auth_user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      if (!sp) throw new Error('Profil prestataire introuvable');

      const { error } = await (supabase as any)
        .from('mission_applications')
        .insert({
          mission_id: missionId,
          provider_id: sp.id,
          message: message || null,
        });

      if (error) {
        if (error.code === '23505') {
          toast.error('Vous avez déjà postulé à cette mission');
          return;
        }
        throw error;
      }
      toast.success('Candidature envoyée !');
      await fetchMissions();
    } catch (err: any) {
      toast.error(err.message || 'Erreur candidature');
    }
  };

  const confirmMission = async (id: string) => {
    try {
      const { error } = await (supabase as any)
        .from('missions')
        .update({ status: 'confirmed' })
        .eq('id', id);
      if (error) throw error;
      toast.success('Mission confirmée');
      await fetchMissions();
    } catch { toast.error('Erreur confirmation'); }
  };

  const markDone = async (id: string) => {
    try {
      const { error } = await (supabase as any)
        .from('missions')
        .update({ status: 'done' })
        .eq('id', id);
      if (error) throw error;
      toast.success('Mission marquée comme terminée');
      await fetchMissions();
    } catch { toast.error('Erreur'); }
  };

  const approveMission = async (id: string) => {
    try {
      const mission = missions.find(m => m.id === id);
      
      // Update mission status
      const { error } = await (supabase as any)
        .from('missions')
        .update({ status: 'approved' })
        .eq('id', id);
      if (error) throw error;

      // Create vendor payment if there's a payout amount
      if (mission && mission.payout_amount > 0 && mission.selected_provider_id) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await (supabase as any)
            .from('vendor_payments')
            .insert({
              user_id: user.id,
              provider_id: mission.selected_provider_id,
              property_id: mission.property_id,
              date: new Date().toISOString().split('T')[0],
              description: `Mission: ${mission.title}`,
              amount: mission.payout_amount,
              vat_rate: 0,
              vat_amount: 0,
              status: 'pending',
            });
        }
      }

      toast.success('Mission approuvée — paiement créé');
      await fetchMissions();
    } catch { toast.error('Erreur approbation'); }
  };

  return {
    missions,
    isLoading,
    createMission,
    publishMission,
    cancelMission,
    deleteMission,
    acceptApplication,
    rejectApplication,
    applyToMission,
    confirmMission,
    markDone,
    approveMission,
    refetch: fetchMissions,
  };
}
