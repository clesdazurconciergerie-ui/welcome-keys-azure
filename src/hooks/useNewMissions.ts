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

  useEffect(() => { fetchMissions(); }, [fetchMissions]);

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
      const selectedProviderId = isOpen ? null : (data.selected_provider_id || null);
      
      const { data: newMission, error } = await (supabase as any)
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
          selected_provider_id: selectedProviderId,
          status: isOpen ? 'open' : (selectedProviderId ? 'assigned' : 'draft'),
        })
        .select(`
          *,
          property:property_id(name, address)
        `)
        .single();

      if (error) throw error;

      // Send emails based on mission type
      if (newMission) {
        try {
          const missionDate = new Date(newMission.start_at).toLocaleString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
          });

          if (isOpen) {
            // Mission ouverte: envoyer à tous les prestataires actifs
            const { data: providers } = await (supabase as any)
              .from('service_providers')
              .select('id, email, first_name, last_name')
              .eq('concierge_user_id', user.id)
              .eq('status', 'active');

            if (providers && providers.length > 0) {
              console.log(`📧 Sending emails to ${providers.length} provider(s)`);
              for (const provider of providers) {
                console.log(`Sending to: ${provider.email}`);
                const { data: emailResult, error: emailError } = await supabase.functions.invoke('send-provider-notification', {
                  body: {
                    provider_email: provider.email,
                    mission_title: newMission.title,
                    property_name: newMission.property?.name || 'Logement',
                    mission_date: missionDate,
                    mission_amount: newMission.payout_amount || 0,
                    mission_instructions: newMission.instructions,
                    mission_id: newMission.id,
                    notification_type: 'mission_available'
                  }
                });
                
                if (emailError) {
                  console.error(`❌ Email failed for ${provider.email}:`, emailError);
                } else {
                  console.log(`✅ Email sent to ${provider.email}:`, emailResult);
                }
              }
            } else {
              console.warn('⚠️ No active providers found to notify');
            }
          } else if (selectedProviderId) {
            // Mission assignée: envoyer uniquement au prestataire sélectionné
            const { data: provider } = await (supabase as any)
              .from('service_providers')
              .select('email, first_name, last_name')
              .eq('id', selectedProviderId)
              .single();

            if (provider) {
              await supabase.functions.invoke('send-provider-notification', {
                body: {
                  provider_email: provider.email,
                  mission_title: newMission.title,
                  property_name: newMission.property?.name || 'Logement',
                  mission_date: missionDate,
                  mission_amount: newMission.payout_amount || 0,
                  mission_instructions: newMission.instructions,
                  mission_id: newMission.id,
                  notification_type: 'mission_assigned'
                }
              });
            }
          }
        } catch (emailError) {
          console.error('Email sending failed:', emailError);
          // Don't block mission creation if email fails
        }
      }

      toast.success('Mission créée');
      await fetchMissions();
    } catch (err: any) {
      toast.error(err.message || 'Erreur création mission');
    }
  };

  const publishMission = async (id: string) => {
    try {
      // Get mission details before updating
      const { data: mission } = await (supabase as any)
        .from('missions')
        .select(`
          *,
          property:property_id(name, address),
          selected_provider:selected_provider_id(email, first_name, last_name)
        `)
        .eq('id', id)
        .single();

      const { error } = await (supabase as any)
        .from('missions')
        .update({ status: 'open' })
        .eq('id', id);
      if (error) throw error;

      // Send email notifications to providers
      if (mission) {
        try {
          const { data: providers } = await (supabase as any)
            .from('service_providers')
            .select('id, email, first_name, last_name')
            .eq('concierge_user_id', mission.user_id)
            .eq('status', 'active');

          if (providers && providers.length > 0) {
            // Send email to each provider
            for (const provider of providers) {
              await supabase.functions.invoke('send-provider-notification', {
                body: {
                  provider_email: provider.email,
                  mission_title: mission.title,
                  property_name: mission.property?.name || 'Logement',
                  mission_date: new Date(mission.start_at).toLocaleString('fr-FR', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                  }),
                  mission_amount: mission.payout_amount || 0,
                  mission_instructions: mission.instructions,
                  mission_id: mission.id,
                  notification_type: 'mission_available'
                }
              });
            }
          }
        } catch (emailError) {
          console.error('Email sending failed:', emailError);
          // Don't block the mission publication if emails fail
        }
      }

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
      // Get mission and provider details before updating
      const { data: mission } = await (supabase as any)
        .from('missions')
        .select(`
          *,
          property:property_id(name, address)
        `)
        .eq('id', missionId)
        .single();

      const { data: provider } = await (supabase as any)
        .from('service_providers')
        .select('email, first_name, last_name')
        .eq('id', providerId)
        .single();

      const { error: e1 } = await (supabase as any)
        .from('mission_applications')
        .update({ status: 'accepted' })
        .eq('id', applicationId);
      if (e1) throw e1;

      const { error: e2 } = await (supabase as any)
        .from('mission_applications')
        .update({ status: 'rejected' })
        .eq('mission_id', missionId)
        .neq('id', applicationId);
      if (e2) throw e2;

      const { error: e3 } = await (supabase as any)
        .from('missions')
        .update({ status: 'assigned', selected_provider_id: providerId })
        .eq('id', missionId);
      if (e3) throw e3;

      // Send email notification to assigned provider
      if (mission && provider) {
        try {
          await supabase.functions.invoke('send-provider-notification', {
            body: {
              provider_email: provider.email,
              mission_title: mission.title,
              property_name: mission.property?.name || 'Logement',
              mission_date: new Date(mission.start_at).toLocaleString('fr-FR', {
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
              }),
              mission_amount: mission.payout_amount || 0,
              mission_instructions: mission.instructions,
              mission_id: mission.id,
              notification_type: 'mission_assigned'
            }
          });
        } catch (emailError) {
          console.error('Email sending failed:', emailError);
          // Don't block the assignment if email fails
        }
      }

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

  /** Admin validates a completed mission — financial impact starts here */
  const validateMission = async (id: string) => {
    try {
      const { error } = await (supabase as any)
        .from('missions')
        .update({ status: 'validated' })
        .eq('id', id);
      if (error) throw error;
      toast.success('Mission validée — en attente de paiement');
      await fetchMissions();
    } catch { toast.error('Erreur validation'); }
  };

  /** Admin marks mission as paid to provider */
  const markAsPaid = async (id: string) => {
    try {
      const { error } = await (supabase as any)
        .from('missions')
        .update({ status: 'paid' })
        .eq('id', id);
      if (error) throw error;
      toast.success('Mission marquée comme payée');
      await fetchMissions();
    } catch { toast.error('Erreur paiement'); }
  };

  /** Legacy alias — now splits into validate */
  const approveMission = validateMission;

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
    validateMission,
    markAsPaid,
    refetch: fetchMissions,
  };
}
