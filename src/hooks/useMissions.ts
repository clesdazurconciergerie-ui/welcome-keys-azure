import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Mission {
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
  provider_comment: string | null;
  admin_comment: string | null;
  checklist_validated: boolean;
  internal_score: number | null;
  punctuality_score: number | null;
  mission_amount: number;
  payment_done: boolean;
  created_at: string;
  updated_at: string;
  property?: { name: string; address: string };
  service_provider?: { first_name: string; last_name: string; email: string; score_global: number };
  photos?: MissionPhoto[];
}

export interface MissionPhoto {
  id: string;
  intervention_id: string;
  url: string;
  type: string;
  caption: string | null;
  uploaded_at: string;
}

export interface ChecklistItem {
  id: string;
  property_id: string;
  task_text: string;
  is_mandatory: boolean;
  order_index: number;
}

export interface IncidentReport {
  id: string;
  intervention_id: string;
  problem_type: string;
  description: string | null;
  photo_url: string | null;
  is_urgent: boolean;
  is_resolved: boolean;
  created_at: string;
}

export interface MaterialRequest {
  id: string;
  service_provider_id: string;
  concierge_user_id: string;
  product: string;
  quantity: number;
  status: string;
  request_date: string;
  created_at: string;
}

export function useMissions(mode: 'concierge' | 'service_provider' | 'owner' = 'service_provider') {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMissions = useCallback(async () => {
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
      setMissions(data || []);
    } catch (err) {
      console.error('Error fetching missions:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const startMission = async (id: string) => {
    try {
      const { error } = await (supabase as any)
        .from('cleaning_interventions')
        .update({
          status: 'in_progress',
          actual_start_time: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
      toast.success('Mission démarrée');
      await fetchMissions();
    } catch (err) {
      toast.error('Erreur lors du démarrage');
    }
  };

  const completeMission = async (id: string, providerComment?: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('complete-intervention', {
        body: { intervention_id: id, provider_comment: providerComment },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success('Mission terminée ! En attente de validation.');
      await fetchMissions();
      return data;
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la validation');
      return null;
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
      await fetchMissions();
      return publicUrl;
    } catch (err: any) {
      toast.error('Erreur lors de l\'upload');
      return null;
    }
  };

  useEffect(() => {
    fetchMissions();
  }, [fetchMissions]);

  return {
    missions,
    isLoading,
    startMission,
    completeMission,
    uploadPhoto,
    refetch: fetchMissions,
  };
}

export function useChecklistItems(propertyId?: string) {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!propertyId) return;
    const fetch = async () => {
      setIsLoading(true);
      const { data } = await (supabase as any)
        .from('checklist_items')
        .select('*')
        .eq('property_id', propertyId)
        .order('order_index');
      setItems(data || []);
      setIsLoading(false);
    };
    fetch();
  }, [propertyId]);

  return { items, isLoading };
}

export function useMaterialRequests() {
  const [requests, setRequests] = useState<MaterialRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRequests = useCallback(async () => {
    setIsLoading(true);
    const { data } = await (supabase as any)
      .from('material_requests')
      .select('*')
      .order('created_at', { ascending: false });
    setRequests(data || []);
    setIsLoading(false);
  }, []);

  const createRequest = async (product: string, quantity: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non connecté');

      // Get SP id and concierge_user_id
      const { data: sp } = await (supabase as any)
        .from('service_providers')
        .select('id, concierge_user_id')
        .eq('auth_user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      if (!sp) throw new Error('Prestataire introuvable');

      const { error } = await (supabase as any)
        .from('material_requests')
        .insert({
          service_provider_id: sp.id,
          concierge_user_id: sp.concierge_user_id,
          product,
          quantity,
        });

      if (error) throw error;
      toast.success('Demande envoyée');
      await fetchRequests();
    } catch (err: any) {
      toast.error(err.message || 'Erreur');
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  return { requests, isLoading, createRequest, refetch: fetchRequests };
}

export function useIncidentReports(interventionId?: string) {
  const [reports, setReports] = useState<IncidentReport[]>([]);

  useEffect(() => {
    if (!interventionId) return;
    const fetch = async () => {
      const { data } = await (supabase as any)
        .from('incident_reports')
        .select('*')
        .eq('intervention_id', interventionId)
        .order('created_at', { ascending: false });
      setReports(data || []);
    };
    fetch();
  }, [interventionId]);

  const createReport = async (interventionId: string, report: {
    problem_type: string;
    description?: string;
    photo_url?: string;
    is_urgent?: boolean;
  }) => {
    try {
      const { error } = await (supabase as any)
        .from('incident_reports')
        .insert({ intervention_id: interventionId, ...report });
      if (error) throw error;
      toast.success('Signalement envoyé');
    } catch (err) {
      toast.error('Erreur lors du signalement');
    }
  };

  return { reports, createReport };
}
