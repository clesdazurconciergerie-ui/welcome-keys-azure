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
          selected_provider:selected_provider_id(first_name, last_name, email, phone)
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
            const { data: providers } = await (supabase as any)
              .from('service_providers')
              .select('id, email, first_name, last_name')
              .eq('concierge_user_id', user.id)
              .eq('status', 'active');

            if (providers && providers.length > 0) {
              console.log(`📧 Sending emails to ${providers.length} provider(s)`);
              for (let i = 0; i < providers.length; i++) {
                const provider = providers[i];
                if (i > 0) await new Promise(r => setTimeout(r, 600));
                try {
                  const { error: emailError } = await supabase.functions.invoke('send-provider-notification', {
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
                  if (emailError) console.error(`❌ Email failed for ${provider.email}:`, emailError);
                  else console.log(`✅ Email sent to ${provider.email}`);
                } catch (emailErr) {
                  console.error(`❌ Email exception for ${provider.email}:`, emailErr);
                }
              }
            }
          } else if (selectedProviderId) {
            const { data: provider } = await (supabase as any)
              .from('service_providers')
              .select('email, first_name, last_name')
              .eq('id', selectedProviderId)
              .single();

            if (provider) {
              const { error: emailError } = await supabase.functions.invoke('send-provider-notification', {
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
              if (emailError) console.error(`❌ Assignment email failed:`, emailError);
            }
          }
        } catch (emailError) {
          console.error('❌ Email notification failed:', emailError);
          toast.error('Mission créée mais notification email échouée', { duration: 3000 });
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
      const { data: mission } = await (supabase as any)
        .from('missions')
        .select(`*, property:property_id(name, address)`)
        .eq('id', id)
        .single();

      const { error } = await (supabase as any)
        .from('missions')
        .update({ status: 'open' })
        .eq('id', id);
      if (error) throw error;

      if (mission) {
        try {
          const { data: providers } = await (supabase as any)
            .from('service_providers')
            .select('id, email, first_name, last_name')
            .eq('concierge_user_id', mission.user_id)
            .eq('status', 'active');

          if (providers && providers.length > 0) {
            for (const provider of providers) {
              const { error: emailError } = await supabase.functions.invoke('send-provider-notification', {
                body: {
                  provider_email: provider.email,
                  mission_title: mission.title,
                  property_name: mission.property?.name || 'Logement',
                  mission_date: new Date(mission.start_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
                  mission_amount: mission.payout_amount || 0,
                  mission_instructions: mission.instructions,
                  mission_id: mission.id,
                  notification_type: 'mission_available'
                }
              });
              if (emailError) console.error(`❌ Publish email failed for ${provider.email}:`, emailError);
            }
          }
        } catch (emailError) {
          console.error('❌ Publish email notification failed:', emailError);
          toast.error('Mission publiée mais notification email échouée', { duration: 3000 });
        }
      }

      toast.success('Mission publiée — les prestataires peuvent la prendre');
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

  // Provider: instant claim (atomic, race-condition safe)
  const claimMission = async (missionId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non connecté');

      const { data: sp } = await (supabase as any)
        .from('service_providers')
        .select('id, first_name, last_name, email')
        .eq('auth_user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      if (!sp) throw new Error('Profil prestataire introuvable');

      // Call atomic claim function
      const { data: result, error } = await supabase.rpc('claim_mission', {
        _mission_id: missionId,
        _provider_id: sp.id,
      });

      if (error) throw error;

      const claimResult = result as any;
      if (!claimResult?.success) {
        toast.error(claimResult?.error || 'Mission déjà attribuée');
        await fetchMissions();
        return;
      }

      toast.success('🎉 Mission prise ! Elle apparaît dans "Mes missions"');

      // Notify concierge via email (non-blocking)
      try {
        const mission = missions.find(m => m.id === missionId);
        if (mission) {
          await supabase.functions.invoke('send-provider-notification', {
            body: {
              provider_email: '', // Will be overridden - we notify the concierge
              mission_title: mission.title,
              property_name: mission.property?.name || 'Logement',
              mission_date: new Date(mission.start_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
              mission_amount: mission.payout_amount || 0,
              mission_id: mission.id,
              notification_type: 'mission_claimed',
              provider_name: `${sp.first_name} ${sp.last_name}`,
            }
          });
        }
      } catch (emailErr) {
        console.error('Claim notification failed (non-blocking):', emailErr);
      }

      await fetchMissions();
    } catch (err: any) {
      toast.error(err.message || 'Erreur prise de mission');
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

  const approveMission = validateMission;

  const sendMissionEmail = async (mission: NewMission): Promise<{ sent: number; failed: number; providers: string[] }> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Non connecté');

    const { data: providers, error: provErr } = await (supabase as any)
      .from('service_providers')
      .select('id, email, first_name, last_name')
      .eq('concierge_user_id', user.id)
      .eq('status', 'active');

    if (provErr) throw provErr;
    if (!providers || providers.length === 0) return { sent: 0, failed: 0, providers: [] };

    const validProviders = providers.filter((p: any) => p.email && p.email.includes('@'));
    const missionDate = new Date(mission.start_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

    let sent = 0;
    let failed = 0;
    const sentTo: string[] = [];

    for (let i = 0; i < validProviders.length; i++) {
      const provider = validProviders[i];
      if (i > 0) await new Promise(r => setTimeout(r, 600));
      try {
        const { data, error } = await supabase.functions.invoke('send-provider-notification', {
          body: {
            provider_email: provider.email,
            mission_title: mission.title,
            property_name: mission.property?.name || 'Logement',
            mission_date: missionDate,
            mission_amount: mission.payout_amount || 0,
            mission_instructions: mission.instructions || '',
            mission_id: mission.id,
            notification_type: 'mission_available',
          },
        });
        if (error) { failed++; } else if (data?.success) { sent++; sentTo.push(provider.email); } else { failed++; }
      } catch { failed++; }
    }

    return { sent, failed, providers: sentTo };
  };

  return {
    missions,
    isLoading,
    createMission,
    publishMission,
    cancelMission,
    deleteMission,
    claimMission,
    confirmMission,
    markDone,
    approveMission,
    validateMission,
    markAsPaid,
    sendMissionEmail,
    refetch: fetchMissions,
  };
}
